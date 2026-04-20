import { afterAll, beforeAll, expect, test } from "bun:test";
import { resolve } from "node:path";
import { bulkImport } from "../src/scripts/import.js";
import { createDefaultEmbedder } from "../src/store/index.js";
import { LibSQLStore } from "../src/store/libsql.js";
import { createLinksTools } from "../src/tools/links.js";
import { createListPagesTool } from "../src/tools/list.js";
import { createPageTools } from "../src/tools/page.js";
import { createSearchTool } from "../src/tools/search.js";
import { createTimelineTool } from "../src/tools/timeline.js";

let testStore: LibSQLStore;
const embedder = await createDefaultEmbedder();
beforeAll(async () => {
  await testStore?.dispose();
  // Use a specific test database for integration
  testStore = new LibSQLStore({
    url: "file:./tmp/test-integration.db",
    dimension: embedder.dimension,
  });
  await testStore.init();
  console.log("beforeAll");
});

afterAll(
  async () => {
    console.log("afterAll");
    await testStore.cleanVector();
    await testStore.cleanDBFile();
  },
  { timeout: 10000 }
);

test("Bulk import and Extended Tools Integration", async () => {
  const docsDir = resolve(__dirname, "fixtures/docs");

  const searchTool = createSearchTool(testStore, embedder);
  const { pageInfoTool, readPageTool } = createPageTools(testStore);
  const timelineTool = createTimelineTool(testStore);
  const { addLinkTool, linksTool } = createLinksTools(testStore);
  const listPagesTool = createListPagesTool(testStore);
  const { imported, skipped, failed } = await bulkImport(
    docsDir,
    testStore,
    embedder
  );

  // We expect 3 files: mastra.md, gbrain.md, garry.md
  expect(failed).toBe(0);
  expect(imported).toBeGreaterThanOrEqual(3);

  // 2. Test searchTool (Hybrid Search)
  const searchResult: any = await searchTool.execute!(
    { query: "Mastra", limit: 5 },
    {} as any
  );
  expect(searchResult.results.length).toBeGreaterThan(0);
  expect(searchResult.results[0].slug).toBe("concepts/mastra");

  // 3. Test page tools (pageInfo, readPage, listPages)
  const pageInfo: any = await pageInfoTool.execute!(
    { slug: "concepts/gbrain" },
    {} as any
  );
  expect(pageInfo.slug).toBe("concepts/gbrain");
  expect(pageInfo.tags).toContain("architecture");
  expect(pageInfo.tags).toContain("storage");

  const pageContent: any = await readPageTool.execute!(
    { slug: "concepts/gbrain" },
    {} as any
  );
  expect(pageContent.compiled_truth).toContain(
    "GBrain 是一个先进的个人知识库系统"
  );
  expect(pageContent.title).toBe("GBrain Architecture");

  const allConceptPages: any = await listPagesTool.execute!(
    { type: "concept" },
    {} as any
  );
  expect(allConceptPages.pages.length).toBe(2);
  expect(
    allConceptPages.pages.some((p: any) => p.slug === "concepts/mastra")
  ).toBe(true);

  // 4. Test timelineTool
  const timeline: any = await timelineTool.execute!(
    { slug: "people/garry", opts: { asc: true } },
    {} as any
  );
  expect(timeline.slug).toBe("people/garry");
  expect(timeline.timeline.length).toBeGreaterThanOrEqual(3);
  expect(timeline.timeline[0].date).toBe("2008");
  expect(timeline.timeline[0].summary).toBe("Cofounded Posterous.");

  // 5. Test linksTool (Add and Get)
  await addLinkTool.execute!(
    {
      fromSlug: "concepts/gbrain",
      toSlug: "people/garry",
      linkType: "created_by",
    },
    {} as any
  );

  const links: any = await linksTool.execute!(
    { slug: "people/garry" },
    {} as any
  );
  expect(links.slug).toBe("people/garry");
  expect(links.backlinks.length).toBe(1);
  expect(links.backlinks[0].from_slug).toBe("concepts/gbrain");
  expect(links.backlinks[0].link_type).toBe("created_by");
});
