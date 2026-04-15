import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { StoreProvider } from "../store/interface.js";

export function createLinksTools(store: StoreProvider) {
  const linksTool = createTool({
    id: "get-links",
    description: "Get all outgoing links and backlinks for a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
    }),
    execute: async (inputData) => {
      const outgoing = await store.getOutgoingLinks(inputData.slug);
      const backlinks = await store.getBacklinks(inputData.slug);
      return {
        slug: inputData.slug,
        outgoing,
        backlinks,
      };
    },
  });

  const addLinkTool = createTool({
    id: "add-link",
    description: "Add a bidirectional link between two pages.",
    inputSchema: z.object({
      fromSlug: z
        .string()
        .describe("The slug of the page where the link originates."),
      toSlug: z.string().describe("The slug of the target page."),
      linkType: z
        .string()
        .optional()
        .describe("The type of relationship (e.g. reference, mention)."),
      context: z
        .string()
        .optional()
        .describe("The context in which the link was made."),
    }),
    execute: async (inputData) => {
      await store.addLink(
        inputData.fromSlug,
        inputData.toSlug,
        inputData.linkType || "",
        inputData.context || ""
      );
      return {
        success: true,
        message: `Linked '${inputData.fromSlug}' to '${inputData.toSlug}'`,
      };
    },
  });

  const removeLinkTool = createTool({
    id: "remove-link",
    description: "Remove a link between two pages.",
    inputSchema: z.object({
      fromSlug: z
        .string()
        .describe("The slug of the page where the link originates."),
      toSlug: z.string().describe("The slug of the target page."),
    }),
    execute: async (inputData) => {
      await store.removeLink(inputData.fromSlug, inputData.toSlug);
      return {
        success: true,
        message: `Removed link from '${inputData.fromSlug}' to '${inputData.toSlug}'`,
      };
    },
  });

  return { linksTool, addLinkTool, removeLinkTool };
}
