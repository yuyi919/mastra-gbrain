import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createIngestionWorkflow } from "../../src/ingest/workflow.js";
import { parseMarkdown } from "../../src/markdown.js";
import type {
  EmbeddingProvider,
  StoreProvider,
} from "../../src/store/interface.js";

function mockStore(
  overrides: Partial<Record<string, any>> = {}
): StoreProvider & { _calls: any[] } {
  const calls: { method: string; args: any[] }[] = [];
  const track =
    (method: string) =>
    async (...args: any[]) => {
      calls.push({ method, args });
      if (overrides[method]) return overrides[method](...args);
      if (method === "getPage") return null;
      if (method === "getTags") return [];
    };
  const store = new Proxy({} as any, {
    get(_, prop: string) {
      if (prop === "_calls") return calls;
      if (prop === "transaction") {
        return overrides.transaction || (async (fn: any) => fn(store));
      }
      return track(prop);
    },
  });
  return store;
}

function mockEmbedder(): EmbeddingProvider {
  return {
    dimension: 768,
    embedQuery: async (text: string) => [0.1, 0.2, 0.3],
    embedBatch: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
}

describe("ingestion workflow", () => {
  test("imports valid markdown content (noEmbed)", async () => {
    const store = mockStore();
    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: {
        relativePath: "concepts/test-page.md",
        content: `---
type: concept
title: Test Page
tags: [alpha, beta]
---
This is the compiled truth.
---
- 2024-01-01: Something happened.
`,
        noEmbed: true,
      },
    });
    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("imported");
    }
    const calls = (store as any)._calls;
    expect(calls.some((c: any) => c.method === "putPage")).toBe(true);
    expect(calls.filter((c: any) => c.method === "addTag")).toHaveLength(2);
    expect(calls.some((c: any) => c.method === "upsertChunks")).toBe(true);
  });

  test("skips when content hash matches", async () => {
    const content = `---
type: concept
title: Same
---
Same content.
`;
    const parsed = parseMarkdown(content, "concepts/same.md");
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          title: parsed.title,
          type: parsed.type,
          compiled_truth: parsed.compiled_truth,
          timeline: parsed.timeline,
          frontmatter: parsed.frontmatter,
          tags: parsed.tags.slice().sort(),
        })
      )
      .digest("hex");
    const store = mockStore({
      getPage: async () => ({ content_hash: hash }),
    });
    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: { relativePath: "concepts/same.md", content, noEmbed: true },
    });
    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("skipped");
    }
    expect((store as any)._calls.some((c: any) => c.method === "putPage")).toBe(
      false
    );
  });

  test("rejects frontmatter slug mismatch as skipped", async () => {
    const store = mockStore();
    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: {
        relativePath: "notes/random.md",
        content: `---
type: person
title: Elon
slug: people/elon
---
Poisoned content
`,
        noEmbed: true,
      },
    });
    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("skipped");
      expect((res.result as any).error).toContain("Frontmatter slug");
    }
    expect((store as any)._calls.length).toBe(0);
  });

  test("rejects oversized content as skipped", async () => {
    const store = mockStore();
    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
      maxBytes: 10,
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: {
        slug: "big",
        content: "x".repeat(200),
        noEmbed: true,
      },
    });
    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("skipped");
      expect((res.result as any).error).toContain("Content too large");
    }
    expect((store as any)._calls.length).toBe(0);
  });

  test("embeds when embedBatch is provided", async () => {
    const store = mockStore();
    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: {
        relativePath: "concepts/embed.md",
        content: `---
type: concept
title: Embed
---
${"word ".repeat(400).trim()}
`,
      },
    });
    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("imported");
    }
    const upsert = (store as any)._calls.find(
      (c: any) => c.method === "upsertChunks"
    );
    const chunks = upsert.args[1];
    expect(chunks.some((c: any) => c.embedding instanceof Float32Array)).toBe(
      true
    );
  });
});
