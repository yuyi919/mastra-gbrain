import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { StoreProvider } from "../store/interface.js";

export function createPageTools(store: StoreProvider) {
  const readPageTool = createTool({
    id: "read-page",
    description:
      "Read the full compiled content and frontmatter of a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
    }),
    execute: async (inputData) => {
      const page = await store.getPageContent(inputData.slug);
      if (!page) {
        return { error: "Page not found" };
      }
      return {
        slug: page.slug,
        type: page.type,
        title: page.title,
        tags: page.tags,
        frontmatter: page.frontmatter,
        compiled_truth: page.compiled_truth,
        updated_at: page.updated_at,
      };
    },
  });

  const deletePageTool = createTool({
    id: "delete-page",
    description: "Delete a page and cascade all its relationships and chunks.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page to delete."),
    }),
    execute: async (inputData) => {
      const success = await store.deletePage(inputData.slug);
      if (!success) {
        return { error: "Page not found" };
      }
      return { success: true, message: `Page '${inputData.slug}' deleted.` };
    },
  });

  const pageInfoTool = createTool({
    id: "get-page-info",
    description: "Get basic information and tags for a specific page by slug.",
    inputSchema: z.object({
      slug: z
        .string()
        .describe("The unique slug of the page to retrieve info for."),
    }),
    execute: async (inputData) => {
      const page = await store.getPage(inputData.slug);
      if (!page) {
        return { error: "Page not found" };
      }
      const tags = await store.getTags(inputData.slug);
      return {
        slug: inputData.slug,
        content_hash: page.content_hash,
        tags,
      };
    },
  });

  const addTagTool = createTool({
    id: "add-tag",
    description: "Add a tag to a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
      tag: z.string().describe("The tag to add."),
    }),
    execute: async (inputData) => {
      await store.addTag(inputData.slug, inputData.tag);
      return {
        success: true,
        message: `Tag '${inputData.tag}' added to '${inputData.slug}'`,
      };
    },
  });

  const removeTagTool = createTool({
    id: "remove-tag",
    description: "Remove a tag from a specific page.",
    inputSchema: z.object({
      slug: z.string().describe("The unique slug of the page."),
      tag: z.string().describe("The tag to remove."),
    }),
    execute: async (inputData) => {
      await store.removeTag(inputData.slug, inputData.tag);
      return {
        success: true,
        message: `Tag '${inputData.tag}' removed from '${inputData.slug}'`,
      };
    },
  });

  return {
    readPageTool,
    deletePageTool,
    pageInfoTool,
    addTagTool,
    removeTagTool,
  };
}
