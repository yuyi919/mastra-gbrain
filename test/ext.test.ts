import { afterAll, beforeAll, expect, test } from "bun:test";
import { LibSQLStore } from "../src/store/libsql.js";

let store: LibSQLStore;

beforeAll(async () => {
  const tempStore = new LibSQLStore({
    url: "file:./tmp/test-ext.db",
    dimension: 1536,
  });
  await tempStore.cleanDBFile(true);
  store = new LibSQLStore({ url: "file:./tmp/test-ext.db", dimension: 1536 });
  await store.init();

  // Create base pages for testing
  await store.putPage("page-a", {
    type: "concept",
    title: "Page A",
    frontmatter: {},
    compiled_truth: "Original truth A",
    timeline: "",
    content_hash: "a",
  });
  await store.putPage("page-b", {
    type: "person",
    title: "Page B Person",
    frontmatter: {},
    compiled_truth: "Original truth B",
    timeline: "",
    content_hash: "b",
  });
  await store.putPage("page-c", {
    type: "concept",
    title: "Page C",
    frontmatter: {},
    compiled_truth: "Original truth C",
    timeline: "",
    content_hash: "c",
  });

  await store.addTag("page-a", "tag1");
  await store.addTag("page-c", "tag1");
  await store.addTag("page-c", "tag2");
});

afterAll(async () => {
  await store.cleanDBFile();
});

test("listPages supports filters and pagination", async () => {
  const pages = await store.listPages();
  expect(pages.length).toBeGreaterThanOrEqual(3);

  const conceptPages = await store.listPages({ type: "concept" });
  expect(conceptPages.every((p) => p.type === "concept")).toBe(true);
  expect(conceptPages.length).toBe(2); // page-a, page-c

  const tag1Pages = await store.listPages({ tag: "tag1" });
  expect(tag1Pages.length).toBe(2);

  const conceptTag1 = await store.listPages({ type: "concept", tag: "tag1" });
  expect(conceptTag1.length).toBe(2);

  const paginated = await store.listPages({ limit: 1, offset: 1 });
  expect(paginated.length).toBe(1);
});

test("resolveSlugs supports exact and fuzzy matching", async () => {
  const exact = await store.resolveSlugs("page-a");
  expect(exact).toEqual(["page-a"]);

  const fuzzy = await store.resolveSlugs("Page");
  expect(fuzzy.length).toBeGreaterThanOrEqual(3);
  expect(fuzzy).toContain("page-a");
  expect(fuzzy).toContain("page-b");
  expect(fuzzy).toContain("page-c");

  const fuzzyPerson = await store.resolveSlugs("Person");
  expect(fuzzyPerson).toContain("page-b");
});

test("upsertChunks preserves embedded_at when text does not change", async () => {
  // 1. Upsert initial chunks with embedding
  await store.upsertChunks("page-a", [
    {
      chunk_index: 0,
      chunk_text: "Chunk 0 text",
      chunk_source: "compiled_truth",
      embedding: new Float32Array(1536).fill(0.1),
    },
    {
      chunk_index: 1,
      chunk_text: "Chunk 1 text",
      chunk_source: "compiled_truth",
      embedding: new Float32Array(1536).fill(0.2),
    },
  ]);

  let chunks = await store.getChunks("page-a");
  expect(chunks.length).toBe(2);
  const embeddedAt0 = chunks[0].embedded_at;
  const embeddedAt1 = chunks[1].embedded_at;
  expect(embeddedAt0).toBeTruthy();

  // 2. Wait a tiny bit to ensure timestamp would be different if updated
  await new Promise((resolve) => setTimeout(resolve, 10));

  // 3. Upsert again: Chunk 0 text unchanged (no embedding provided), Chunk 1 text changed
  await store.upsertChunks("page-a", [
    {
      chunk_index: 0,
      chunk_text: "Chunk 0 text",
      chunk_source: "compiled_truth",
    }, // Text unchanged
    {
      chunk_index: 1,
      chunk_text: "Chunk 1 changed",
      chunk_source: "compiled_truth",
    }, // Text changed
  ]);

  chunks = await store.getChunks("page-a");
  expect(chunks[0].embedded_at).toEqual(embeddedAt0); // Should be preserved
  expect(chunks[1].embedded_at).toBeNull(); // Should be reset because text changed and no embedding provided

  // 4. Test getChunksWithEmbeddings (should just return chunks in this mock since LibSQLVector handles embeddings)
  const chunksWithEmbeddings = await store.getChunksWithEmbeddings("page-a");
  expect(chunksWithEmbeddings.length).toBe(2);
});

test("getEmbeddingsByChunkIds handles gracefully", async () => {
  const result = await store.getEmbeddingsByChunkIds([1, 2]);
  expect(result instanceof Map).toBe(true);
});

test("searchVector supports metadata filters", async () => {
  // First, make sure we have vector coverage for tests
  await store.upsertChunks("page-c", [
    {
      chunk_index: 0,
      chunk_text: "Vector search test",
      chunk_source: "compiled_truth",
      embedding: new Float32Array(1536).fill(0.5),
    },
  ]);

  // Note: searchVector depends on LibSQLVector under the hood. Since we are testing LibSQLStore's query logic,
  // we can at least ensure it doesn't throw. Full E2E with local vectors needs the LibSQLVector to respond.
  // We'll mock the vectorStore.query response to test the DB join and filter logic.

  const originalQuery = store.vectorStore.query.bind(store.vectorStore);
  store.vectorStore.query = async () => [
    {
      id: "page-a::0",
      score: 0.9,
      metadata: { slug: "page-a", chunk_index: 0 },
    },
    {
      id: "page-c::0",
      score: 0.8,
      metadata: { slug: "page-c", chunk_index: 0 },
    },
  ];

  try {
    // 1. Without filters
    const results = await store.searchVector(new Array(1536).fill(0.5));
    expect(results.length).toBe(2);

    // 2. With type filter
    const conceptResults = await store.searchVector(new Array(1536).fill(0.5), {
      type: "concept",
    });
    expect(conceptResults.length).toBe(2); // both are concept

    // 3. With exclude_slugs
    const excludedResults = await store.searchVector(
      new Array(1536).fill(0.5),
      { exclude_slugs: ["page-a"] }
    );
    expect(excludedResults.length).toBe(1);
    expect(excludedResults[0].slug).toBe("page-c");
  } finally {
    store.vectorStore.query = originalQuery;
  }
});

test("Graph traversal and Links", async () => {
  await store.addLink("page-a", "page-b", "references", "context a to b");
  await store.addLink("page-b", "page-c", "mentions", "context b to c");

  const graph = await store.traverseGraph("page-a", 2);
  expect(graph).toEqual([
    {
      depth: 0,
      links: [
        {
          link_type: "references",
          to_slug: "page-b",
        },
      ],
      slug: "page-a",
      title: "Page A",
      type: "concept",
    },
    {
      depth: 1,
      links: [
        {
          link_type: "mentions",
          to_slug: "page-c",
        },
      ],
      slug: "page-b",
      title: "Page B Person",
      type: "person",
    },
    {
      depth: 2,
      links: [],
      slug: "page-c",
      title: "Page C",
      type: "concept",
    },
  ]);
  expect(graph.length).toBe(3); // a (depth 0), b (depth 1), c (depth 2)

  const aNode = graph.find((n) => n.slug === "page-a");
  expect(aNode?.depth).toBe(0);
  expect(aNode?.links.length).toBe(1);
  expect(aNode?.links[0].to_slug).toBe("page-b");
  expect(aNode?.links[0].link_type).toBe("references");

  const bNode = graph.find((n) => n.slug === "page-b");
  expect(bNode?.depth).toBe(1);

  await store.removeLink("page-a", "page-b");
  await store.removeLink("page-b", "page-c");
});

test("updateSlug and rewriteLinks", async () => {
  await store.putPage("page-rename-src", {
    type: "concept",
    title: "Rename Me",
    compiled_truth: "Rename truth",
    frontmatter: {},
    content_hash: "rename-hash",
  });
  await store.updateSlug("page-rename-src", "page-renamed-new");

  const oldPage = await store.getPage("page-rename-src");
  expect(oldPage).toBeNull();

  const newPage = await store.getPage("page-renamed-new");
  expect(newPage).not.toBeNull();
  expect(newPage?.title).toBe("Rename Me");

  await store.rewriteLinks("page-rename-src", "page-renamed-new"); // Should not throw
});

test("Timeline entries advanced management", async () => {
  await store.putPage("test-timeline-page", {
    type: "concept",
    title: "Timeline Test Page",
    compiled_truth: "Test timeline",
    timeline: "",
    frontmatter: {},
    content_hash: "test-hash",
  });

  await store.addTimelineEntriesBatch([
    {
      slug: "test-timeline-page",
      date: "2025-01-01",
      source: "test",
      summary: "New year",
      detail: "Started 2025",
    },
  ]);

  await store.addTimelineEntry("test-timeline-page", {
    date: "2025-02-01",
    source: "manual",
    summary: "Feb update",
    detail: "",
  });

  const entries = await store.getTimeline("test-timeline-page", {
    after: "2025-01-15",
  });
  expect(entries.length).toBe(1);
  expect(entries[0].date).toBe("2025-02-01");

  const allEntries = await store.getTimeline("test-timeline-page");
  expect(allEntries.length).toBe(2);
  expect(allEntries[0].date).toBe("2025-02-01"); // DESC order
});

test("Raw data management array format", async () => {
  await store.putRawData("page-a", "github", { repo: "gbrain" });
  await store.putRawData("page-a", "twitter", { tweets: 10 });

  const githubData = await store.getRawData("page-a", "github");
  expect(Array.isArray(githubData)).toBe(true);
  expect(githubData.length).toBe(1);
  expect(githubData[0].source).toBe("github");
  expect(githubData[0].data).toEqual({ repo: "gbrain" });

  const allData = await store.getRawData("page-a");
  expect(Array.isArray(allData)).toBe(true);
  expect(allData.length).toBe(2);
  const sources = allData.map((d) => d.source).sort();
  expect(sources).toEqual(["github", "twitter"]);
});

test("Files management", async () => {
  await store.upsertFile({
    page_slug: "page-a",
    filename: "test.png",
    storage_path: "/files/test.png",
    content_hash: "hash-file",
    metadata: { size: 123 },
  });

  const file = await store.getFile("/files/test.png");
  expect(file).not.toBeNull();
  expect(file?.filename).toBe("test.png");
  expect(file?.page_slug).toBe("page-a");
});

test("Access token verification and MCP request logging", async () => {
  store.exec(`
    INSERT OR REPLACE INTO access_tokens
      (id, name, token_hash, scopes, created_at, revoked_at)
    VALUES
      ('token-active', 'active-token', 'hash-active', '["search","ingest"]', CURRENT_TIMESTAMP, NULL),
      ('token-revoked', 'revoked-token', 'hash-revoked', '["search"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const active = await store.verifyAccessToken("hash-active");
  expect(active).not.toBeNull();
  expect(active?.name).toBe("active-token");
  expect(active?.scopes).toEqual(["search", "ingest"]);

  const lastUsedAt = await store.get<{ last_used_at: string | null }>(
    "SELECT last_used_at FROM access_tokens WHERE token_hash = 'hash-active'"
  );
  expect(lastUsedAt.last_used_at).toBeTruthy();

  const revoked = await store.verifyAccessToken("hash-revoked");
  expect(revoked).toBeNull();

  await store.logMcpRequest({
    token_name: "active-token",
    operation: "search",
    latency_ms: 12,
    status: "success",
  });

  const requestLog = await store.get<{
    token_name: string;
    operation: string;
    latency_ms: number;
    status: string;
  }>(
    "SELECT token_name, operation, latency_ms, status FROM mcp_request_log ORDER BY id DESC LIMIT 1"
  );
  expect(requestLog).toEqual({
    token_name: "active-token",
    operation: "search",
    latency_ms: 12,
    status: "success",
  });
});

test("Versions management", async () => {
  // Already has initial version from putPage
  const versionsBefore = await store.getVersions("page-a");
  expect(versionsBefore.length).toBeGreaterThanOrEqual(1);

  // Update page
  await store.putPage("page-a", {
    type: "concept",
    title: "Page A",
    frontmatter: {},
    compiled_truth: "Updated truth A",
    timeline: "",
    content_hash: "a2",
  });

  const versionsAfter = await store.getVersions("page-a");
  expect(versionsAfter.length).toBe(versionsBefore.length + 1);

  const pageAfter = await store.getPage("page-a");
  expect(pageAfter?.compiled_truth).toBe("Updated truth A");

  // Revert to first version
  const oldVersionId = versionsBefore[versionsBefore.length - 1].id;
  await store.revertToVersion("page-a", oldVersionId as number);

  const revertedPage = await store.getPage("page-a");
  expect(revertedPage?.compiled_truth).toBe("Original truth A");
});

test("Stats and Health and Logs", async () => {
  await store.logIngest({
    source_type: "markdown",
    source_ref: "file.md",
    pages_updated: ["page-a"],
    summary: "success",
  });

  const logs = await store.getIngestLog({ limit: 5 });
  expect(logs.length).toBeGreaterThanOrEqual(1);
  expect(logs[0].source_type).toBe("markdown");
  expect(logs[0].pages_updated).toEqual(["page-a"]);

  const stats = await store.getStats();
  expect(stats.page_count).toBeGreaterThanOrEqual(3);
  expect(stats.pages_by_type.concept).toBeGreaterThanOrEqual(2);

  const health = await store.getHealth();
  expect(health.page_count).toBe(stats.page_count);
  expect(health.brain_score).toBeGreaterThanOrEqual(0);
});

test("Maintenance helpers route through runtime-backed services", async () => {
  await store.upsertChunks("page-b", [
    {
      chunk_index: 0,
      chunk_text: "Page B stale chunk",
      chunk_source: "compiled_truth",
    },
  ]);

  const staleBefore = await store.getStaleChunks();
  const staleChunk = staleBefore.find(
    (chunk) => chunk.slug === "page-b" && chunk.chunk_index === 0
  );
  expect(staleChunk).toBeTruthy();

  await store.markChunksEmbedded([staleChunk!.id]);

  const staleAfter = await store.getStaleChunks();
  expect(
    staleAfter.some(
      (chunk) => chunk.slug === "page-b" && chunk.chunk_index === 0
    )
  ).toBe(false);

  const healthReport = await store.getHealthReport();
  expect(healthReport.connectionOk).toBe(true);
  expect(healthReport.tablesOk).toBe(true);
  expect(healthReport.tableDetails.pages?.ok).toBe(true);

  const originalUpsert = store.vectorStore.upsert.bind(store.vectorStore);
  const calls: Array<{
    ids: string[];
    vectors: number[][];
    metadata: Array<Record<string, unknown>>;
  }> = [];
  store.vectorStore.upsert = async (payload: any) => {
    calls.push({
      ids: payload.ids,
      vectors: payload.vectors,
      metadata: payload.metadata,
    });
    return undefined as never;
  };

  try {
    await store.upsertVectors([
      {
        id: "page-b::9",
        vector: new Array(1536).fill(0.25),
        metadata: {
          slug: "page-b",
          chunk_index: 9,
          title: "Page B Person",
          type: "person",
          page_id: 2,
          chunk_source: "compiled_truth",
          chunk_text: "vector payload",
          token_count: 2,
        },
      },
    ]);
  } finally {
    store.vectorStore.upsert = originalUpsert;
  }

  expect(calls).toHaveLength(1);
  expect(calls[0].ids).toEqual(["page-b::9"]);
  expect(calls[0].vectors).toHaveLength(1);
  expect(calls[0].metadata[0]).toMatchObject({
    slug: "page-b",
    chunk_index: 9,
  });
});
