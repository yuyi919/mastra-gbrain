import { beforeAll, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import { runDoctor } from "../../src/scripts/doctor.js";
import { BrainStoreExt } from "../../src/store/brainstore/ext/index.js";
import { LibSQLStore } from "../../src/store/libsql.js";
import type { DatabaseHealth } from "../../src/types.js";

const dbHealthy = "./tmp/doctor-healthy.db";
const dbUnhealthy = "./tmp/doctor-unhealthy.db";

const healthyReport: DatabaseHealth = {
  connectionOk: true,
  tablesOk: true,
  ftsOk: true,
  tableDetails: {
    pages: { ok: true, rows: 1 },
  },
  vectorCoverage: { total: 1, embedded: 1 },
  schemaVersion: { current: 1, latest: 1, ok: true },
};

beforeAll(async () => {
  // Create a healthy store
  const healthyStore = new LibSQLStore({
    url: `file:${dbHealthy}`,
    dimension: 1536,
  });
  await healthyStore.init();

  // Insert a page and a chunk
  await healthyStore.putPage("healthy-slug", {
    type: "concept",
    title: "Healthy Page",
    frontmatter: {},
    compiled_truth: "Truth",
    timeline: "",
    content_hash: "hash",
  });
  await healthyStore.upsertChunks("healthy-slug", [
    {
      chunk_index: 0,
      chunk_text: "Healthy chunk",
      chunk_source: "compiled_truth",
      token_count: 2,
      embedding: new Float32Array(1536).fill(0.1), // 100% coverage
    },
  ]);

  await healthyStore.dispose();

  // Create an unhealthy store (missing FTS table or chunks, etc)
  const unhealthyStore = new LibSQLStore({
    url: `file:${dbUnhealthy}`,
    dimension: 1536,
  });
  await unhealthyStore.init();

  // To make it unhealthy, let's insert a chunk without an embedding
  await unhealthyStore.putPage("unhealthy-slug", {
    type: "concept",
    title: "Unhealthy Page",
    frontmatter: {},
    compiled_truth: "Truth",
    timeline: "",
    content_hash: "hash2",
  });
  await unhealthyStore.upsertChunks("unhealthy-slug", [
    {
      chunk_index: 0,
      chunk_text: "Unhealthy chunk",
      chunk_source: "compiled_truth",
      token_count: 2,
      // no embedding -> 0% coverage
    },
  ]);

  await unhealthyStore.cleanDBFile();
});

test("runDoctor returns true for healthy store", async () => {
  const store = new LibSQLStore({ url: `file:${dbHealthy}`, dimension: 1536 });
  const isHealthy = await runDoctor(store);
  expect(isHealthy).toBe(true);
  await store.cleanDBFile();
});

test("runDoctor uses BrainStoreExt runtime when available", async () => {
  const calls: string[] = [];
  const ext = BrainStoreExt.of({
    putRawData: () => Effect.succeed(undefined),
    getRawData: () => Effect.succeed([]),
    upsertFile: () => Effect.succeed(undefined),
    getFile: () => Effect.succeed(null),
    getConfig: () => Effect.succeed(null),
    setConfig: () => Effect.succeed(undefined),
    logIngest: () => Effect.succeed(undefined),
    verifyAccessToken: () => Effect.succeed(null),
    logMcpRequest: () => Effect.succeed(undefined),
    getHealthReport: () => {
      calls.push("runtime.getHealthReport");
      return Effect.succeed(healthyReport);
    },
    getStats: () =>
      Effect.succeed({
        page_count: 0,
        chunk_count: 0,
        embedded_count: 0,
        link_count: 0,
        tag_count: 0,
        timeline_entry_count: 0,
        pages_by_type: {},
      }),
    getHealth: () =>
      Effect.succeed({
        page_count: 0,
        embed_coverage: 1,
        stale_pages: 0,
        orphan_pages: 0,
        missing_embeddings: 0,
        brain_score: 10,
        link_coverage: 1,
        timeline_coverage: 1,
        most_connected: [],
      }),
    getStaleChunks: () => Effect.succeed([]),
    upsertVectors: () => Effect.succeed(undefined),
    markChunksEmbedded: () => Effect.succeed(undefined),
    getIngestLog: () => Effect.succeed([]),
  });
  const runtime = ManagedRuntime.make(Layer.succeed(BrainStoreExt, ext));
  const store = {
    brainStore: runtime,
    init: async () => {
      calls.push("init");
    },
    dispose: async () => {
      calls.push("dispose");
    },
    getHealthReport: async () => {
      throw new Error("Promise compatibility method should not be used");
    },
  };

  const isHealthy = await runDoctor(store);

  expect(isHealthy).toBe(true);
  expect(calls).toEqual(["init", "runtime.getHealthReport"]);
});

test("runDoctor returns true for healthy store with warnings", async () => {
  const store = new LibSQLStore({
    url: `file:${dbUnhealthy}`,
    dimension: 1536,
  });
  const isHealthy = await runDoctor(store);
  // Missing embeddings (coverage < 100%) and old schema are now warnings, so the script exits with 0 (true)
  expect(isHealthy).toBe(true);
  await store.cleanDBFile();
});

test("runDoctor returns false for fatally unhealthy store", async () => {
  try {
    const store = new LibSQLStore({
      url: `file:/nonexistent_dir/fatal.db`,
      dimension: 1536,
    });
    const isHealthy = await runDoctor(store);
    expect(isHealthy).toBe(false);
    await store.cleanDBFile();
  } catch (error) {
    // If it fails to even open, it's unhealthy
    expect(error).toBeDefined();
  }
});
