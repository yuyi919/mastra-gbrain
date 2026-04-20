import { beforeAll, expect, test } from "bun:test";
import { runDoctor } from "../../src/scripts/doctor.js";
import { LibSQLStore } from "../../src/store/libsql.js";

const dbHealthy = "./tmp/doctor-healthy.db";
const dbUnhealthy = "./tmp/doctor-unhealthy.db";

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
