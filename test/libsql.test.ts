import { afterAll, beforeAll, expect, test } from "bun:test";
import { LibSQLStore } from "../src/store/libsql.js";
import type { ChunkInput } from "./types.js";

let store: LibSQLStore;

beforeAll(async () => {
  store = new LibSQLStore({
    url: "file:./tmp/libsql.test.db",
    dimension: 1536,
  });
  await store.init();
});

afterAll(async () => {
  await store.cleanDBFile();
});

test("LibSQLStore getPage and listPages", async () => {
  await store.putPage("test-list-1", {
    type: "concept",
    title: "List Page 1",
    frontmatter: {},
    compiled_truth: "Truth 1",
    timeline: "",
    content_hash: "hash-list-1",
  });
  await store.putPage("test-list-2", {
    type: "person",
    title: "List Page 2",
    frontmatter: {},
    compiled_truth: "Truth 2",
    timeline: "",
    content_hash: "hash-list-2",
  });
  await store.addTag("test-list-1", "ai");

  const content = await store.getPage("test-list-1");
  expect(content).not.toBeNull();
  expect(content?.title).toBe("List Page 1");
  expect(content?.compiled_truth).toBe("Truth 1");
  const tags = await store.getTags("test-list-1");
  expect(tags).toContain("ai");

  const allPages = await store.listPages();
  expect(allPages.length).toBeGreaterThanOrEqual(2);

  const conceptPages = await store.listPages({ type: "concept" });
  expect(conceptPages.some((p) => p.slug === "test-list-1")).toBe(true);
  expect(conceptPages.some((p) => p.slug === "test-list-2")).toBe(false);

  const aiPages = await store.listPages({ tag: "ai" });
  expect(aiPages.length).toBe(1);
  expect(aiPages[0].slug).toBe("test-list-1");

  const aiPages2 = await store.listPages({ tags: ["ai"], tag:"any" });
  expect(aiPages2.length).toBe(1);
  expect(aiPages2[0].slug).toBe("test-list-1");
});

test("LibSQLStore deletePage", async () => {
  await store.putPage("test-delete", {
    type: "concept",
    title: "Delete Me",
    frontmatter: {},
    compiled_truth: "Delete truth",
    timeline: "",
    content_hash: "delhash",
  });

  await store.upsertChunks("test-delete", [
    {
      chunk_index: 0,
      chunk_text: "Delete text",
      chunk_source: "compiled_truth",
    },
  ]);

  const beforeContent = await store.getPage("test-delete");
  expect(beforeContent).not.toBeNull();

  await store.deletePage("test-delete");

  const afterContent = await store.getPage("test-delete");
  expect(afterContent).toBeNull();
  const chunks = await store.getChunks("test-delete");
  expect(chunks).toBeArrayOfSize(0);
});

test("LibSQLStore can put and get page", async () => {
  await store.putPage("test-slug", {
    type: "concept",
    title: "Test Page",
    frontmatter: { tags: ["a", "b"] },
    compiled_truth: "This is truth",
    timeline: "This is timeline",
    content_hash: "hash123",
  });

  const page = await store.getPage("test-slug");
  expect(page).not.toBeNull();
  expect(page?.content_hash).toBe("hash123");
});

test("LibSQLStore can handle tags", async () => {
  await store.addTag("test-slug", "test-tag");
  let tags = await store.getTags("test-slug");
  expect(tags).toContain("test-tag");

  await store.removeTag("test-slug", "test-tag");
  tags = await store.getTags("test-slug");
  expect(tags).not.toContain("test-tag");
});

test("LibSQLStore transaction works", async () => {
  await store.transaction(async (tx) => {
    await tx.putPage("tx-slug", {
      type: "concept",
      title: "Tx Page",
      frontmatter: {},
      compiled_truth: "Tx truth",
      timeline: "",
      content_hash: "txhash",
    });
    await tx.addTag("tx-slug", "tx-tag");
  });

  const page = await store.getPage("tx-slug");
  expect(page).not.toBeNull();
  expect(page?.content_hash).toBe("txhash");

  const tags = await store.getTags("tx-slug");
  expect(tags).toContain("tx-tag");
});

test("LibSQLStore transaction rollback", async () => {
  try {
    await store.transaction(async (tx) => {
      await tx.putPage("fail-slug", {
        type: "concept",
        title: "Fail Page",
        frontmatter: {},
        compiled_truth: "Fail truth",
        timeline: "",
        content_hash: "failhash",
      });
      throw new Error("Rollback");
    });
  } catch (e) {
    // expected
  }

  const page = await store.getPage("fail-slug");
  expect(page).toBeNull();
});

test("LibSQLStore upsert and delete chunks", async () => {
  const chunks: ChunkInput[] = [
    {
      chunk_index: 0,
      chunk_text: "Hello world",
      chunk_source: "compiled_truth" as const,
      token_count: 2,
      embedding: new Float32Array(1536).fill(0.1), // Dummy vector
    },
    {
      chunk_index: 1,
      chunk_text: "这是一个中文测试",
      chunk_source: "compiled_truth" as const,
      token_count: 5,
      embedding: new Float32Array(1536).fill(0.2),
    },
    {
      chunk_index: 2,
      chunk_text: "これは日本語のテストです。",
      chunk_source: "compiled_truth" as const,
      token_count: 6,
      embedding: new Float32Array(1536).fill(0.3),
    },
    {
      chunk_index: 3,
      chunk_text: "Это русский текст.",
      chunk_source: "compiled_truth" as const,
      token_count: 4,
      embedding: new Float32Array(1536).fill(0.4),
    },
  ];

  await store.putPage("chunk-slug", {
    type: "concept",
    title: "Chunk Test Page",
    frontmatter: {},
    compiled_truth: "",
    timeline: "",
    content_hash: "chunkhash",
  });

  await store.upsertChunks("chunk-slug", chunks);

  const keywordResults = await store.searchKeyword("Hello", { limit: 10 });
  expect(keywordResults.length).toBeGreaterThan(0);
  expect(keywordResults[0].slug).toBe("chunk-slug");
  expect(keywordResults[0].chunk_text).toBe("Hello world");

  // Test Chinese full-text search
  const chineseResults = await store.searchKeyword("中文", { limit: 10 });
  expect(chineseResults.length).toBeGreaterThan(0);
  expect(chineseResults[0].chunk_text).toBe("这是一个中文测试");

  // Test Japanese full-text search
  const jpResults = await store.searchKeyword("日本語", { limit: 10 });
  expect(jpResults.length).toBeGreaterThan(0);
  expect(jpResults[0].chunk_text).toBe("これは日本語のテストです。");

  // Test Russian full-text search
  const ruResults = await store.searchKeyword("русский", { limit: 10 });
  expect(ruResults.length).toBeGreaterThan(0);
  expect(ruResults[0].chunk_text).toBe("Это русский текст.");

  // Skip vector test if vector index wasn't created properly in sqlite memory
  const vectorResults = await store.searchVector(new Array(1536).fill(0.1), {
    slug: "chunk-slug",
  });
  expect(vectorResults.length).toBeGreaterThan(0);
  expect(vectorResults[0].slug).toBe("chunk-slug");

  await store.deleteChunks("chunk-slug");
  const emptyResults = await store.searchKeyword("Hello", { limit: 10 });
  const emptyVectorResults = await store._queryVectors(
    new Array(1536).fill(0.1),
    { slug: "chunk-slug" }
  );
  expect(emptyVectorResults.length).toBe(0);
  expect(emptyResults.length).toBe(0);
});
