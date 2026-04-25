import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { TimelineEntry, TimelineOpts } from "../types.js";

export interface TimelineToolDeps {
  getTimeline(slug: string, opts?: TimelineOpts): Promise<TimelineEntry[]>;
}

export function createTimelineTool(store: TimelineToolDeps) {
  const timelineTool = createTool({
    id: "get-timeline",
    description:
      "Retrieve all chronological timeline entries for a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
      opts: z
        .object({
          limit: z
            .number()
            .describe("The maximum number of entries to return.")
            .optional(),
          after: z
            .string()
            .describe("The date after which to start entries.")
            .optional(),
          before: z
            .string()
            .describe("The date before which to end entries.")
            .optional(),
          asc: z
            .boolean()
            .describe("Whether to return entries in ascending order.")
            .optional(),
        })
        .optional(),
    }),
    execute: async (inputData) => {
      const entries = await store.getTimeline(inputData.slug, inputData.opts);
      return {
        slug: inputData.slug,
        timeline: entries,
      };
    },
  });
  return timelineTool;
}
