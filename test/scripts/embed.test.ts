import { afterAll, beforeAll, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { embedStale } from "../../src/scripts/embed.js";
import { LibSQLStore } from "../../src/store/libsql.js";

const dbPath = resolve(__dirname, "../../tmp/embed-stale.db");

beforeAll(async () => {
  rmSync(dbPath, { force: true });
  const store = new LibSQLStore({ url: `file:${dbPath}`, dimension: 1536 });
  await store.init();

  // Create a page
  await store.putPage("stale-slug", {
    type: "concept",
    title: "Stale Page",
    frontmatter: {},
    compiled_truth: "Stale truth",
    timeline: "",
    content_hash: "hash-stale",
  });

  // Insert two chunks manually without embeddings
  const db = store;
  const pageResult = await db.get<{ id: number }>(
    "SELECT id FROM pages WHERE slug = ?",
    "stale-slug"
  );
  const pageId = pageResult.id;

  db.exec(
    `INSERT INTO content_chunks (page_id, chunk_index, chunk_text, chunk_source, token_count) 
            VALUES (?, 0, 'First stale chunk', 'compiled_truth', 3)`,
    pageId
  );
  db.exec(
    `INSERT INTO content_chunks (page_id, chunk_index, chunk_text, chunk_source, token_count) 
            VALUES (?, 1, 'Second stale chunk', 'compiled_truth', 3)`,
    pageId
  );

  await store.dispose();
});

afterAll(() => {
  new LibSQLStore({ url: `file:${dbPath}`, dimension: 1536 }).cleanDBFile();
});

test("embedStale processes un-embedded chunks", async () => {
  const store = new LibSQLStore({ url: `file:${dbPath}`, dimension: 1536 });
  await store.init();

  // Running embedStale should process the 2 chunks
  const processedCount = await embedStale(10, store);
  expect(processedCount).toBe(2);

  // Check if they were embedded by verifying embedded_at is not null
  const db = store;
  const chunks = await db.query<{ embedded_at: string | null }>(
    "SELECT embedded_at FROM content_chunks WHERE chunk_text LIKE ?",
    "%stale chunk%"
  );

  expect(chunks.length).toBe(2);
  for (const chunk of chunks) {
    expect(chunk.embedded_at).not.toBeNull();
  }

  // Running it again should find 0 chunks
  const processedAgain = await embedStale(10, store);
  expect(processedAgain).toBe(0);

  await store.cleanDBFile();
});
