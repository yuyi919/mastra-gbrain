import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Effect, Layer, ManagedRuntime } from "effect";
import {
  createIngestionWorkflow,
  type IngestionWorkflowStore,
} from "../../src/ingest/workflow.js";
import { parseMarkdown } from "../../src/markdown.js";
import { ContentChunks } from "../../src/store/brainstore/content/chunks/index.js";
import { ContentPages } from "../../src/store/brainstore/content/pages/index.js";
import { GraphTimeline } from "../../src/store/brainstore/graph/timeline/index.js";
import type { EmbeddingProvider } from "../../src/store/interface.js";
import { Page, type PageInput } from "../../src/types.js";

type MockStore = IngestionWorkflowStore & {
  _calls: { method: string; args: unknown[] }[];
};

type MockStoreOverrides = Partial<{
  getPage: IngestionWorkflowStore["getPage"];
  createVersion: IngestionWorkflowStore["createVersion"];
  putPage: IngestionWorkflowStore["putPage"];
  getTags: IngestionWorkflowStore["getTags"];
  addTag: IngestionWorkflowStore["addTag"];
  removeTag: IngestionWorkflowStore["removeTag"];
  upsertChunks: IngestionWorkflowStore["upsertChunks"];
  deleteChunks: IngestionWorkflowStore["deleteChunks"];
  addTimelineEntriesBatch: IngestionWorkflowStore["addTimelineEntriesBatch"];
  transaction: NonNullable<IngestionWorkflowStore["transaction"]>;
}>;

function mockStore(overrides: MockStoreOverrides = {}): MockStore {
  const calls: { method: string; args: unknown[] }[] = [];
  const store: MockStore = {
    _calls: calls,
    getPage: async (slug) => {
      calls.push({ method: "getPage", args: [slug] });
      return overrides.getPage ? overrides.getPage(slug) : null;
    },
    createVersion: async (slug) => {
      calls.push({ method: "createVersion", args: [slug] });
      return overrides.createVersion?.(slug);
    },
    putPage: async (slug, page) => {
      calls.push({ method: "putPage", args: [slug, page] });
      return overrides.putPage?.(slug, page);
    },
    getTags: async (slug) => {
      calls.push({ method: "getTags", args: [slug] });
      return overrides.getTags ? overrides.getTags(slug) : [];
    },
    addTag: async (slug, tag) => {
      calls.push({ method: "addTag", args: [slug, tag] });
      await overrides.addTag?.(slug, tag);
    },
    removeTag: async (slug, tag) => {
      calls.push({ method: "removeTag", args: [slug, tag] });
      await overrides.removeTag?.(slug, tag);
    },
    upsertChunks: async (slug, chunks) => {
      calls.push({ method: "upsertChunks", args: [slug, chunks] });
      await overrides.upsertChunks?.(slug, chunks);
    },
    deleteChunks: async (slug) => {
      calls.push({ method: "deleteChunks", args: [slug] });
      await overrides.deleteChunks?.(slug);
    },
    addTimelineEntriesBatch: async (entries) => {
      calls.push({ method: "addTimelineEntriesBatch", args: [entries] });
      await overrides.addTimelineEntriesBatch?.(entries);
    },
    transaction: async (fn) => {
      return overrides.transaction ? overrides.transaction(fn) : fn(store);
    },
  };
  return store;
}

function mockEmbedder(): EmbeddingProvider {
  return {
    dimension: 768,
    embedQuery: async (text: string) => [0.1, 0.2, 0.3],
    embedBatch: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
}

function mockPage(content_hash: string): Page {
  return Page.decodeUnsafe({
    id: 1,
    slug: "concepts/same",
    type: "concept",
    title: "Same",
    compiled_truth: "Same content.",
    timeline: "",
    frontmatter: "{}",
    content_hash,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
}

describe("ingestion workflow", () => {
  test("declares a workflow-local store contract", () => {
    const source = readFileSync("src/ingest/workflow.ts", "utf-8");
    expect(source).toContain("export interface IngestionWorkflowStore");
    expect(source).not.toContain("Store" + "Provider");
  });

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
    const calls = store._calls;
    expect(calls.some((c) => c.method === "putPage")).toBe(true);
    expect(calls.filter((c) => c.method === "addTag")).toHaveLength(2);
    expect(calls.some((c) => c.method === "upsertChunks")).toBe(true);
  });

  test("uses branch services through brainStore runtime when available", async () => {
    const calls: { method: string; args: unknown[] }[] = [];
    const pages = ContentPages.of({
      getPage: (slug) => {
        calls.push({ method: "getPage", args: [slug] });
        return Effect.succeed(null);
      },
      listPages: () => Effect.succeed([]),
      resolveSlugs: () => Effect.succeed([]),
      getTags: (slug) => {
        calls.push({ method: "getTags", args: [slug] });
        return Effect.succeed(["old"]);
      },
      createVersion: (slug) => {
        calls.push({ method: "createVersion", args: [slug] });
        return Effect.succeed(Effect.succeed({} as never));
      },
      getVersions: () => Effect.succeed([]),
      revertToVersion: () => Effect.succeed(undefined),
      putPage: (slug: string, page: PageInput) => {
        calls.push({ method: "putPage", args: [slug, page] });
        return Effect.succeed(Effect.succeed({} as never));
      },
      updateSlug: () => Effect.succeed(undefined),
      deletePage: () => Effect.succeed(undefined),
      addTag: (slug, tag) => {
        calls.push({ method: "addTag", args: [slug, tag] });
        return Effect.succeed(undefined);
      },
      removeTag: (slug, tag) => {
        calls.push({ method: "removeTag", args: [slug, tag] });
        return Effect.succeed(undefined);
      },
    });
    const chunks = ContentChunks.of({
      upsertChunks: (slug, chunkInputs) => {
        calls.push({ method: "upsertChunks", args: [slug, chunkInputs] });
        return Effect.succeed(undefined);
      },
      deleteChunks: (slug) => {
        calls.push({ method: "deleteChunks", args: [slug] });
        return Effect.succeed(undefined);
      },
      getChunks: () => Effect.succeed([]),
      getChunksWithEmbeddings: () => Effect.succeed([]),
    });
    const timeline = GraphTimeline.of({
      addTimelineEntry: () => Effect.succeed(undefined),
      addTimelineEntriesBatch: (entries) => {
        calls.push({ method: "addTimelineEntriesBatch", args: [entries] });
        return Effect.succeed(entries.length);
      },
      getTimeline: () => Effect.succeed([]),
    });
    const brainStore = ManagedRuntime.make(
      Layer.mergeAll(
        Layer.succeed(ContentPages, pages),
        Layer.succeed(ContentChunks, chunks),
        Layer.succeed(GraphTimeline, timeline)
      )
    );
    const fail = async () => {
      throw new Error("Promise compatibility method should not be used");
    };
    const store = {
      brainStore,
      getPage: fail,
      createVersion: fail,
      putPage: fail,
      getTags: fail,
      addTag: fail,
      removeTag: fail,
      upsertChunks: fail,
      deleteChunks: fail,
      addTimelineEntriesBatch: fail,
    } satisfies IngestionWorkflowStore;

    const workflow = createIngestionWorkflow({
      store,
      embedder: mockEmbedder(),
    });
    const run = await workflow.createRun();
    const res = await run.start({
      inputData: {
        relativePath: "concepts/runtime.md",
        content: `---
type: concept
title: Runtime
tags: [new]
---
Runtime compiled truth.
---
- 2024-02-03: Runtime event.
`,
        noEmbed: true,
      },
    });

    expect(res.status).toBe("success");
    if (res.status === "success" && "result" in res) {
      expect((res.result as any).status).toBe("imported");
    }
    expect(calls.map((c) => c.method)).toEqual([
      "getPage",
      "putPage",
      "getTags",
      "removeTag",
      "addTag",
      "upsertChunks",
      "addTimelineEntriesBatch",
    ]);
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
      getPage: async () => mockPage(hash),
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
    expect(store._calls.some((c) => c.method === "putPage")).toBe(false);
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
    expect(store._calls.length).toBe(0);
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
    expect(store._calls.length).toBe(0);
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
    const upsert = store._calls.find((c) => c.method === "upsertChunks");
    const chunks = upsert?.args[1];
    if (!Array.isArray(chunks)) throw new Error("Expected upsert chunks");
    expect(
      chunks.some(
        (c) =>
          c !== null &&
          typeof c === "object" &&
          "embedding" in c &&
          c.embedding instanceof Float32Array
      )
    ).toBe(true);
  });
});
