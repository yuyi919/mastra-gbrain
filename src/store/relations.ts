import { relations } from "drizzle-orm/relations";
import {
  content_chunks,
  files,
  links,
  page_versions,
  pages,
  raw_data,
  tags,
  timeline_entries,
} from "./schema.js";

export const content_chunksRelations = relations(content_chunks, ({ one }) => ({
  page: one(pages, {
    fields: [content_chunks.page_id],
    references: [pages.id],
  }),
}));

export const pagesRelations = relations(pages, ({ many }) => ({
  content_chunks: many(content_chunks),
  files: many(files),
  links_to_page_id: many(links, {
    relationName: "links_to_page_id_pages_id",
  }),
  links_from_page_id: many(links, {
    relationName: "links_from_page_id_pages_id",
  }),
  page_versions: many(page_versions),
  raw_data: many(raw_data),
  tags: many(tags),
  timeline_entries: many(timeline_entries),
}));

export const filesRelations = relations(files, ({ one }) => ({
  page: one(pages, {
    fields: [files.page_id],
    references: [pages.id],
  }),
}));

export const linksRelations = relations(links, ({ one }) => ({
  page_to_page_id: one(pages, {
    fields: [links.to_page_id],
    references: [pages.id],
    relationName: "links_to_page_id_pages_id",
  }),
  page_from_page_id: one(pages, {
    fields: [links.from_page_id],
    references: [pages.id],
    relationName: "links_from_page_id_pages_id",
  }),
}));

export const page_versionsRelations = relations(page_versions, ({ one }) => ({
  page: one(pages, {
    fields: [page_versions.page_id],
    references: [pages.id],
  }),
}));

export const raw_dataRelations = relations(raw_data, ({ one }) => ({
  page: one(pages, {
    fields: [raw_data.page_id],
    references: [pages.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  page: one(pages, {
    fields: [tags.page_id],
    references: [pages.id],
  }),
}));

export const timeline_entriesRelations = relations(
  timeline_entries,
  ({ one }) => ({
    page: one(pages, {
      fields: [timeline_entries.page_id],
      references: [pages.id],
    }),
  })
);
