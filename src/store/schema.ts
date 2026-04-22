import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import type { ChunkSource, PageType } from "../types.js";

export const LATEST_VERSION = 1;

const timestamp = () => text().notNull().default(sql`CURRENT_TIMESTAMP`);
const timestampAllowNull = () => text();

export const pages = sqliteTable("pages", {
  id: integer().primaryKey({ autoIncrement: true }),
  slug: text().notNull().unique(),
  type: text().$type<PageType>().notNull(),
  title: text().notNull(),
  compiled_truth: text().notNull().default(""),
  timeline: text().notNull().default(""),
  frontmatter: text({ mode: "json" }).notNull().default("{}").$type<string>(),
  content_hash: text().notNull(),
  created_at: timestamp(),
  updated_at: timestamp(),
});

export const pagesRelations = relations(pages, ({ many }) => ({
  tags: many(tags),
}));

export const content_chunks = sqliteTable(
  "content_chunks",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    chunk_index: integer().notNull(),
    chunk_text: text().notNull(),
    chunk_source: text()
      .$type<ChunkSource>()
      .notNull()
      .default("compiled_truth"),
    model: text().notNull().default("text-embedding-3-large"),
    token_count: integer(),
    embedded_at: timestampAllowNull(),
    created_at: timestamp(),
  },
  (t) => [
    unique().on(t.page_id, t.chunk_index),
    index("idx_chunks_page").on(t.page_id),
  ]
);

export const chunks_fts = sqliteTable("chunks_fts", {
  page_id: integer(),
  chunk_index: integer(),
  chunk_text: text(),
  chunk_source: text(),
  token_count: integer(),
  chunk_text_segmented: text(),
});

export const links = sqliteTable(
  "links",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    from_page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    to_page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    link_type: text().notNull().default(""),
    context: text().notNull().default(""),
    created_at: timestamp(),
  },
  (t) => [
    unique().on(t.from_page_id, t.to_page_id),
    index("idx_links_from").on(t.from_page_id),
    index("idx_links_to").on(t.to_page_id),
  ]
);

export const tags = sqliteTable(
  "tags",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    tag: text().notNull(),
  },
  (t) => [
    unique().on(t.page_id, t.tag),
    index("idx_tags_tag").on(t.tag),
    index("idx_tags_page_id").on(t.page_id),
  ]
);

export const tagsRelations = relations(tags, ({ one }) => ({
  author: one(pages, { fields: [tags.page_id], references: [pages.id] }),
}));

export const raw_data = sqliteTable(
  "raw_data",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    source: text().notNull(),
    data: text({ mode: "json" }).notNull(),
    fetched_at: timestamp(),
  },
  (t) => [
    unique().on(t.page_id, t.source),
    index("idx_raw_data_page").on(t.page_id),
  ]
);

export const timeline_entries = sqliteTable(
  "timeline_entries",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    date: text().notNull(),
    source: text().notNull().default(""),
    summary: text().notNull(),
    detail: text().notNull().default(""),
    created_at: timestamp(),
  },
  (t) => [
    index("idx_timeline_page").on(t.page_id),
    index("idx_timeline_date").on(t.date),
  ]
);

export const page_versions = sqliteTable(
  "page_versions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer()
      .notNull()
      .references(() => pages.id, { onDelete: "restrict" }),
    compiled_truth: text().notNull(),
    frontmatter: text({ mode: "json" }).notNull().default("{}").$type<string>(),
    snapshot_at: timestamp(),
  },
  (t) => [index("idx_versions_page").on(t.page_id)]
);

export const ingest_log = sqliteTable("ingest_log", {
  id: integer().primaryKey({ autoIncrement: true }),
  source_type: text().notNull(),
  source_ref: text().notNull(),
  pages_updated: text({ mode: "json" }).notNull().default("[]").$type<string>(),
  summary: text().notNull().default(""),
  created_at: timestamp(),
});

export const config = sqliteTable("config", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export const access_tokens = sqliteTable("access_tokens", {
  id: text().primaryKey(), // UUID
  name: text().notNull(),
  token_hash: text().notNull().unique(),
  scopes: text({ mode: "json" }), // Array of strings
  created_at: timestamp(),
  last_used_at: text(),
  revoked_at: text(),
});

export const mcp_request_log = sqliteTable("mcp_request_log", {
  id: integer().primaryKey({ autoIncrement: true }),
  token_name: text(),
  operation: text().notNull(),
  latency_ms: integer(),
  status: text().notNull().default("success"),
  created_at: timestamp(),
});

export const files = sqliteTable(
  "files",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    page_id: integer().references(() => pages.id, {
      onDelete: "set null",
    }),
    filename: text().notNull(),
    storage_path: text().notNull().unique(),
    mime_type: text(),
    size_bytes: integer(),
    content_hash: text().notNull(),
    metadata: text({ mode: "json" }).notNull().default("{}"),
    created_at: timestamp(),
  },
  (t) => [
    index("idx_files_page").on(t.page_id),
    index("idx_files_hash").on(t.content_hash),
  ]
);

export const Schemas = {
  pages,
  content_chunks,
  chunks_fts,
  links,
  tags,
  tagsRelations,
  raw_data,
  timeline_entries,
  page_versions,
  ingest_log,
  config,
  access_tokens,
  mcp_request_log,
  files,
  pagesRelations,
};
export type Schemas = typeof Schemas;

export type Relations = typeof import("./relations.js");
