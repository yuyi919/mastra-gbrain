import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { StoreProvider } from '../store/interface.ts';

export function createListPagesTool(store: StoreProvider) {
  const listPagesTool = createTool({
    id: 'list-pages',
    description: 'List all pages in the knowledge base. Can be optionally filtered by type or tag.',
    inputSchema: z.object({
      type: z.string().optional().describe('Filter pages by a specific type (e.g. concept, person).'),
      tag: z.string().optional().describe('Filter pages by a specific tag.')
    }),
    execute: async (inputData) => {
      const pages = await store.listPages({
        type: inputData.type,
        tag: inputData.tag
      });
      
      return {
        count: pages.length,
        pages
      };
    }
  });
  return listPagesTool;
}