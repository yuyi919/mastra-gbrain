import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { hybridSearch } from "../search/hybrid.js";
import type { EmbeddingProvider, StoreProvider } from "../store/interface.js";

export function createSearchTool(
  store: StoreProvider,
  embedder: EmbeddingProvider
) {
  const searchTool = createTool({
    id: "search",
    description:
      "Search the knowledge base using semantic hybrid search (vector + keyword).",
    inputSchema: z.object({
      query: z.string().describe("The natural language query to search for."),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default 5)."),
    }),
    execute: async (inputData) => {
      // Public tool compatibility accepts the facade store; hybridSearch itself
      // uses the BrainStore runtime path when the facade provides one.
      const results = await hybridSearch(store, inputData.query, {
        embedder,
        limit: inputData.limit || 5,
      });

      return {
        query: inputData.query,
        results,
      };
    },
  });

  return searchTool;
}
