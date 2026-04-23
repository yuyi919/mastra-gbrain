import { afterAll, beforeAll, expect, test } from "bun:test";
import { LibSQLStore } from "../src/store/libsql.js";

let store: LibSQLStore;

beforeAll(async () => {
  const tempStore = new LibSQLStore({
    url: "file:./tmp/test-ext-2.db",
    dimension: 1536,
  });
  await tempStore.cleanDBFile(true);
  store = new LibSQLStore({ url: "file:./tmp/test-ext-2.db", dimension: 1536 });
  await store.init();

  // Create base pages for testing
  await store.putPage("page-a", {
    type: "concept",
    title: "Page A",
    frontmatter: {},
    compiled_truth: "",
    timeline: "",
    content_hash: "a",
  });
  await store.putPage("page-b", {
    type: "concept",
    title: "Page B",
    frontmatter: {},
    compiled_truth: "",
    timeline: "",
    content_hash: "b",
  });
});

afterAll(async () => {
  await store.cleanDBFile();
});

test("Links management", async () => {
  await store.addLink("page-a", "page-b", "references", "context a to b");

  const outgoing = await store.getOutgoingLinks("page-a");
  expect(outgoing.length).toBe(1);
  expect(outgoing[0].to_slug).toBe("page-b");
  expect(outgoing[0].link_type).toBe("references");

  const backlinks = await store.getBacklinks("page-b");
  expect(backlinks.length).toBe(1);
  expect(backlinks[0].from_slug).toBe("page-a");

  await store.removeLink("page-a", "page-b");
  const empty = await store.getOutgoingLinks("page-a");
  expect(empty.length).toBe(0);
});

test("Timeline entries management", async () => {
  await store.putPage("test-timeline-ext", {
    type: "concept",
    title: "Timeline Ext Test",
    compiled_truth: "Ext truth",
    frontmatter: {},
    content_hash: "hash-timeline",
  });
  await store.addTimelineEntriesBatch([
    {
      slug: "test-timeline-ext",
      date: "2025-01-01",
      source: "test",
      summary: "New year",
      detail: "Started 2025",
    },
  ]);

  const entries = await store.getTimeline("test-timeline-ext");
  expect(entries.length).toBe(1);
  expect(entries[0].date).toBe("2025-01-01");
  expect(entries[0].summary).toBe("New year");
});

test("Raw data management", async () => {
  await store.putRawData("page-a", "github", { repo: "gbrain" });
  const data = await store.getRawData("page-a", "github");

  expect(Array.isArray(data)).toBe(true);
  expect(data[0].source).toBe("github");
  expect(data[0].data).toEqual({ repo: "gbrain" });
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

test("Config and Logs", async () => {
  await store.setConfig("test-key", "test-value");
  const val = await store.getConfig("test-key");
  expect(val).toBe("test-value");

  await store.logIngest({
    source_type: "markdown",
    source_ref: "file.md",
    pages_updated: ["page-a"],
    summary: "success",
  });
});
