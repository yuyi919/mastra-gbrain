import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const LATEST_VERSION = 1;

export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  compiled_truth: text('compiled_truth').notNull().default(''),
  timeline: text('timeline').notNull().default(''),
  frontmatter: text('frontmatter', { mode: 'json' }).notNull().default('{}'),
  content_hash: text('content_hash'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const content_chunks = sqliteTable('content_chunks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  chunk_index: integer('chunk_index').notNull(),
  chunk_text: text('chunk_text').notNull(),
  chunk_source: text('chunk_source').notNull().default('compiled_truth'),
  model: text('model').notNull().default('text-embedding-3-large'),
  token_count: integer('token_count'),
  embedded_at: text('embedded_at'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pageIndexUnq: unique().on(t.page_id, t.chunk_index),
  pageIdx: index('idx_chunks_page').on(t.page_id),
}));

export const chunks_fts = sqliteTable('chunks_fts', {
  page_id: integer('page_id'),
  chunk_index: integer('chunk_index'),
  chunk_text: text('chunk_text'),
  chunk_source: text('chunk_source'),
  token_count: integer('token_count'),
  chunk_text_segmented: text('chunk_text_segmented'),
});

export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from_page_id: integer('from_page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  to_page_id: integer('to_page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  link_type: text('link_type').notNull().default(''),
  context: text('context').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  unq: unique().on(t.from_page_id, t.to_page_id),
  fromIdx: index('idx_links_from').on(t.from_page_id),
  toIdx: index('idx_links_to').on(t.to_page_id),
}));

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, (t) => ({
  unq: unique().on(t.page_id, t.tag),
  tagIdx: index('idx_tags_tag').on(t.tag),
  pageIdx: index('idx_tags_page_id').on(t.page_id),
}));

export const raw_data = sqliteTable('raw_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  fetched_at: text('fetched_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  unq: unique().on(t.page_id, t.source),
  pageIdx: index('idx_raw_data_page').on(t.page_id),
}));

export const timeline_entries = sqliteTable('timeline_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  source: text('source').notNull().default(''),
  summary: text('summary').notNull(),
  detail: text('detail').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pageIdx: index('idx_timeline_page').on(t.page_id),
  dateIdx: index('idx_timeline_date').on(t.date),
}));

export const page_versions = sqliteTable('page_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  compiled_truth: text('compiled_truth').notNull(),
  frontmatter: text('frontmatter', { mode: 'json' }).notNull().default('{}'),
  snapshot_at: text('snapshot_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pageIdx: index('idx_versions_page').on(t.page_id),
}));

export const ingest_log = sqliteTable('ingest_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source_type: text('source_type').notNull(),
  source_ref: text('source_ref').notNull(),
  pages_updated: text('pages_updated', { mode: 'json' }).notNull().default('[]'),
  summary: text('summary').notNull().default(''),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const access_tokens = sqliteTable('access_tokens', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  token_hash: text('token_hash').notNull().unique(),
  scopes: text('scopes', { mode: 'json' }), // Array of strings
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  last_used_at: text('last_used_at'),
  revoked_at: text('revoked_at'),
});

export const mcp_request_log = sqliteTable('mcp_request_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token_name: text('token_name'),
  operation: text('operation').notNull(),
  latency_ms: integer('latency_ms'),
  status: text('status').notNull().default('success'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: integer('page_id').references(() => pages.id, { onDelete: 'set null' }),
  filename: text('filename').notNull(),
  storage_path: text('storage_path').notNull().unique(),
  mime_type: text('mime_type'),
  size_bytes: integer('size_bytes'),
  content_hash: text('content_hash').notNull(),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pageIdx: index('idx_files_page').on(t.page_id),
  hashIdx: index('idx_files_hash').on(t.content_hash),
}));
