import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { RawData } from "../types.js";

export interface RawDataToolDeps {
  getRawData(slug: string, source?: string): Promise<RawData[]>;
  putRawData(slug: string, source: string, data: unknown): Promise<void>;
}

export function createRawDataTools(store: RawDataToolDeps) {
  const getRawDataTool = createTool({
    id: "get-raw-data",
    description:
      "Get raw external data (like fetched HTML or JSON API responses) stored for a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
      source: z
        .string()
        .describe("The source identifier (e.g. github, twitter, wikipedia)."),
    }),
    execute: async (inputData) => {
      const rawData = await store.getRawData(inputData.slug, inputData.source);
      if (!rawData) {
        return {
          error: `Raw data for source '${inputData.source}' not found on page '${inputData.slug}'`,
        };
      }
      return {
        slug: inputData.slug,
        source:
          Array.isArray(rawData) && rawData.length > 0
            ? rawData[0].source
            : undefined,
        data:
          Array.isArray(rawData) && rawData.length > 0
            ? rawData[0].data
            : undefined,
        fetched_at:
          Array.isArray(rawData) && rawData.length > 0
            ? rawData[0].fetched_at
            : undefined,
      };
    },
  });

  const putRawDataTool = createTool({
    id: "put-raw-data",
    description:
      "Store raw external data (like fetched HTML or JSON API responses) for a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
      source: z
        .string()
        .describe("The source identifier (e.g. github, twitter, wikipedia)."),
      data: z.any().describe("The raw data payload (JSON object)."),
    }),
    execute: async (inputData) => {
      await store.putRawData(inputData.slug, inputData.source, inputData.data);
      return {
        success: true,
        message: `Stored raw data from '${inputData.source}' for page '${inputData.slug}'.`,
      };
    },
  });

  return { getRawDataTool, putRawDataTool };
}
