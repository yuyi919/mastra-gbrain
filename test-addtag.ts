import { LibSQLStore } from "./src/store/libsql.js";

async function main() {
  const store = new LibSQLStore({
    url: "file:./tmp/libsql.test.db",
    dimension: 1536,
  });
  await store.init();
  
  await store.putPage("test-slug", {
    type: "concept",
    title: "Test Page",
    frontmatter: {},
    compiled_truth: "This is truth",
    timeline: "",
    content_hash: "hash123",
  });

  await store.addTag("test-slug", "test-tag");
  console.log("SUCCESS!");
}
main().catch(console.error);
