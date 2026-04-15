import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { bulkImport } from "../scripts/import.js";
import type { EmbeddingProvider, StoreProvider } from "../store/interface.js";

export function createBulkImportTool(
  store: StoreProvider,
  embedder: EmbeddingProvider
) {
  const bulkImportTool = createTool({
    id: "bulk-import",
    description:
      "Bulk ingest a local directory of Markdown files recursively into the knowledge base.",
    inputSchema: z.object({
      directoryPath: z
        .string()
        .describe(
          "The absolute or relative path to the local directory containing .md files."
        ),
    }),
    execute: async (inputData) => {
      try {
        const summary = await bulkImport(
          inputData.directoryPath,
          store,
          embedder
        );
        return {
          success: true,
          message: `Successfully processed directory: ${inputData.directoryPath}`,
          summary,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Unknown error occurred during bulk import",
        };
      }
    },
  });

  return bulkImportTool;
}
