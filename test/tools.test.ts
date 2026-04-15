import { afterAll, beforeAll, expect, test } from "bun:test";
import { DummyEmbeddingProvider } from "../src/store/dummy-embedder.js";
import { LibSQLStore } from "../src/store/libsql.js";
import { createIngestTool } from "../src/tools/ingest.js";
import { createSearchTool } from "../src/tools/search.js";

let testStore: LibSQLStore;
let ingestTool: any;
let searchTool: any;

beforeAll(async () => {
  testStore = new LibSQLStore({
    url: "file:./tmp/test-tools.db",
    dimension: 1536,
  });
  await testStore.init();
  const embedder = new DummyEmbeddingProvider(1536);
  ingestTool = createIngestTool(testStore, embedder);
  searchTool = createSearchTool(testStore, embedder);
});

afterAll(async () => {
  await testStore.dispose();
  import("node:fs").then((fs) => {
    try {
      fs.unlinkSync("./tmp/test-tools.db");
    } catch (e) {}
  });
});

test("Ingest Tool imports content", async () => {
  const result = await ingestTool.execute!(
    {
      content: `---
type: concept
title: Test Tool
tags: [tool]
---
Tool truth.
`,
      relativePath: "concepts/test-tool.md",
      noEmbed: true,
    },
    {} as any
  );

  expect(result).toHaveProperty("status");
  if (result && typeof result === "object" && "status" in result) {
    expect((result as any).status).toBe("imported");
    expect((result as any).slug).toBe("concepts/test-tool");
    expect((result as any).chunks).toBe(1);
  }
});

test("Search Tool finds ingested content", async () => {
  const result = await searchTool.execute!(
    { query: "Tool truth", limit: 5 },
    {} as any
  );

  expect(result).toHaveProperty("results");
  if (result && typeof result === "object" && "results" in result) {
    const resArr = (result as any).results;
    expect(resArr).toBeDefined();
    expect(resArr.length).toBeGreaterThan(0);
    expect(resArr[0].slug).toBe("concepts/test-tool");
    expect(resArr[0].chunk_text).toContain("Tool truth");
  }
});
