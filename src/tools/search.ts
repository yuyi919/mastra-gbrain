import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { StoreProvider, EmbeddingProvider } from '../store/interface.ts';
import { hybridSearch } from '../search/hybrid.ts';

export function createSearchTool(store: StoreProvider, embedder: EmbeddingProvider) {
  const searchTool = createTool({
    id: 'search',
    description: 'Search the knowledge base using semantic hybrid search (vector + keyword).',
    inputSchema: z.object({
      query: z.string().describe('The natural language query to search for.'),
      limit: z.number().optional().describe('Maximum number of results to return (default 5).')
    }),
    execute: async (inputData) => {
      // In a real system, you would convert inputData.query to an embedding here
      // For now, we mock the embedding part or rely on the hybridSearch internals if they do it
      // HybridSearch uses store.searchKeyword and store.searchVector. 
      // If we don't have the real embedding, we can just do keyword search or dummy vector.
      const queryVector = await embedder.embedQuery(inputData.query);
      
      const results = await hybridSearch(store, inputData.query, {
        limit: inputData.limit || 5
      }, queryVector);
      
      return {
        query: inputData.query,
        results
      };
    }
  });

  return searchTool;
}