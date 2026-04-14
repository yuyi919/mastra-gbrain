import { Agent } from '@mastra/core/agent';
import { createIngestTool } from '../tools/ingest.ts';
import { createSearchTool } from '../tools/search.ts';
import { createPageTools } from '../tools/page.ts';
import { createLinksTools } from '../tools/links.ts';
import { createTimelineTool } from '../tools/timeline.ts';
import { createConfigTools } from '../tools/config.ts';
import { createListPagesTool } from '../tools/list.ts';
import { createRawDataTools } from '../tools/raw.ts';
import { createBulkImportTool } from '../tools/import.ts';
import type { StoreProvider, EmbeddingProvider } from '../store/interface.ts';

export function createGBrainAgent(store: StoreProvider, embedder: EmbeddingProvider) {
  const { pageInfoTool, readPageTool, deletePageTool, addTagTool, removeTagTool } = createPageTools(store);
  const { linksTool, addLinkTool, removeLinkTool } = createLinksTools(store);
  const { configTool, setConfigTool } = createConfigTools(store);
  const { getRawDataTool, putRawDataTool } = createRawDataTools(store);

  return new Agent({
    id: 'gbrain',
    name: 'GBrain Agent',
    instructions: `
You are the GBrain AI Assistant, a local-first personal knowledge management system.
You have access to a SQLite-backed vector and full-text search database.

Your core capabilities:
1. Search the knowledge base using the 'searchTool' (hybrid search combining vector and FTS).
2. Ingest new markdown content using the 'ingestTool', or recursively bulk import from a local folder using 'bulkImportTool'.
3. Read the full content of any page using 'readPageTool', or view all pages with 'listPagesTool'.
4. Inspect and manage page metadata using 'pageInfoTool', 'addTagTool', 'removeTagTool'.
5. Explore relationships using 'linksTool', 'addLinkTool', 'removeLinkTool'.
6. Review history using 'timelineTool'.
7. Check or update global settings using 'configTool' and 'setConfigTool'.
8. Read and write external raw data (like fetched HTML or JSON) using 'getRawDataTool' and 'putRawDataTool'.
9. Delete deprecated pages using 'deletePageTool'.

When answering questions, always base your responses on the retrieved chunks or metadata from the database. Be concise and precise.
    `,
    model: 'openai/gpt-4o-mini',
    tools: {
      searchTool: createSearchTool(store, embedder),
      ingestTool: createIngestTool(store, embedder),
      bulkImportTool: createBulkImportTool(store, embedder),
      listPagesTool: createListPagesTool(store),
      readPageTool,
      deletePageTool,
      pageInfoTool,
      addTagTool,
      removeTagTool,
      linksTool,
      addLinkTool,
      removeLinkTool,
      timelineTool: createTimelineTool(store),
      configTool,
      setConfigTool,
      getRawDataTool,
      putRawDataTool
    },
  });
}