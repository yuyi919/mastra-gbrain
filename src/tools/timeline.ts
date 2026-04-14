import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { StoreProvider } from '../store/interface.ts';

export function createTimelineTool(store: StoreProvider) {
  const timelineTool = createTool({
    id: 'get-timeline',
    description: 'Retrieve all chronological timeline entries for a specific page.',
    inputSchema: z.object({
      slug: z.string().describe('The unique slug of the page.')
    }),
    execute: async (inputData) => {
      const entries = await store.getTimelineEntries(inputData.slug);
      return {
        slug: inputData.slug,
        timeline: entries
      };
    }
  });
  return timelineTool;
}