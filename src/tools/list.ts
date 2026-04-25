import { createTool } from "@mastra/core/tools";
import * as typia from "typia";
import z from "zod";
import type { Page, PageFilters } from "../types.js";

export interface ListPagesToolDeps {
  listPages(filters?: PageFilters): Promise<Page[]>;
}

export function createListPagesTool(store: ListPagesToolDeps) {
  const listPagesTool = createTool({
    id: "list-pages",
    description:
      "List all pages in the knowledge base. Can be optionally filtered by type or tag.",
    inputSchema: z.custom<PageFilters>(typia.createIs<PageFilters>()),
    execute: async (inputData) => {
      const pages = await store.listPages(inputData);
      return {
        count: pages.length,
        pages,
      };
    },
  });
  return listPagesTool;
}
