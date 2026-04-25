import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createIngestionWorkflow,
  type IngestionWorkflowStore,
} from "../ingest/workflow.js";
import type { EmbeddingProvider } from "../store/interface.js";

export function createIngestTool(
  store: IngestionWorkflowStore,
  embedder: EmbeddingProvider
) {
  const ingestTool = createTool({
    id: "ingest",
    description: "Ingest a markdown page into the local knowledge base.",
    inputSchema: z.object({
      relativePath: z
        .string()
        .describe(
          "The file path or unique identifier (e.g. concepts/framework.md)"
        ),
      content: z.string().describe("The full markdown content to ingest"),
    }),
    execute: async (inputData) => {
      const workflow = createIngestionWorkflow({ store, embedder });
      const run = await workflow.createRun();
      const res = await run.start({
        inputData: {
          relativePath: inputData.relativePath,
          content: inputData.content,
          noEmbed: false,
        },
      });

      if (res.status === "success" && "result" in res) {
        return res.result;
      } else {
        const errorMsg =
          "error" in res ? (res as any).error?.message : "Unknown error";
        throw new Error(`Ingestion failed: ${errorMsg}`);
      }
    },
  });

  return ingestTool;
}
