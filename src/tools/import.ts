import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { IngestionWorkflowStore } from "../ingest/workflow.js";
import { bulkImport } from "../scripts/import.js";
import type { EmbeddingProvider } from "../store/interface.js";

export function createBulkImportTool(
  store: IngestionWorkflowStore,
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : undefined;
        return {
          success: false,
          error: message || "Unknown error occurred during bulk import",
        };
      }
    },
  });

  return bulkImportTool;
}
