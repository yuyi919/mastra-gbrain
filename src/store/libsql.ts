import { Database } from "bun:sqlite";
import { LibSQLVector } from "@mastra/libsql";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { extractWordsForSearch } from "../segmenter.js";
import type {
  AccessToken,
  ChunkInput,
  ChunkSource,
  DatabaseHealth,
  FileRecord,
  IngestLog,
  LinkRecord,
  McpRequestLog,
  PageRecord,
  RawDataRecord,
  SearchResult,
  StaleChunk,
  TimelineEntry,
} from "../types.js";
import type { SearchOpts, StoreProvider } from "./interface.js";
import {
  access_tokens,
  chunks_fts,
  config,
  content_chunks,
  files,
  ingest_log,
  LATEST_VERSION,
  links,
  mcp_request_log,
  page_versions,
  pages,
  raw_data,
  tags,
  timeline_entries,
} from "./schema.js";

// --- Deduplication Logic moved to src/search/hybrid.ts ---

export interface LibSQLStoreOptions {
  url: string;
  authToken?: string;
  dimension?: number;
  db?: Database;
  vectorStore?: LibSQLVector;
}

export class LibSQLStore implements StoreProvider {
  private db: Database;
  private drizzleDb: BunSQLiteDatabase;
  public vectorStore: LibSQLVector;
  private inTransaction = false;
  public indexName = "gbrain_chunks";
  public readonly url: string;
  public readonly authToken?: string;
  public readonly dimension: number;

  constructor(options: LibSQLStoreOptions) {
    this.url = options.url;
    this.authToken = options.authToken;
    this.dimension = options.dimension ?? 1536; // Default to OpenAI dimension

    if (options.db && options.vectorStore) {
      this.db = options.db;
      this.inTransaction = true;
      this.vectorStore = options.vectorStore;
    } else {
      const filename = this.url.replace(/^file:/, "");
      this.db = new Database(filename);
      this.vectorStore = new LibSQLVector({
        id: "gbrain",
        url: this.url,
        authToken: this.authToken,
      });
    }

    // Initialize Drizzle ORM instance wrapping the Bun SQLite Database
    this.drizzleDb = drizzle(this.db);
  }

  async init() {
    if (this.inTransaction) return; // Don't init schema in a sub-transaction

    // Create pages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        compiled_truth TEXT NOT NULL DEFAULT '',
        timeline TEXT NOT NULL DEFAULT '',
        frontmatter TEXT NOT NULL DEFAULT '{}',
        content_hash TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create chunks full-text search table
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        page_id UNINDEXED,
        chunk_index UNINDEXED,
        chunk_text UNINDEXED,
        chunk_source UNINDEXED,
        token_count UNINDEXED,
        chunk_text_segmented
      )
    `);

    // Create content_chunks table (real data)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        chunk_source TEXT NOT NULL DEFAULT 'compiled_truth',
        model TEXT NOT NULL DEFAULT 'text-embedding-3-large',
        token_count INTEGER,
        embedded_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, chunk_index)
      )
    `);

    // Create tags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        UNIQUE(page_id, tag)
      )
    `);

    // Create page_versions table for history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS page_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        compiled_truth TEXT NOT NULL,
        frontmatter TEXT NOT NULL DEFAULT '{}',
        snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create links table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        to_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        link_type TEXT NOT NULL DEFAULT '',
        context TEXT NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_page_id, to_page_id)
      )
    `);

    // Create timeline_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS timeline_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create raw_data table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS raw_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        data TEXT NOT NULL,
        fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, source)
      )
    `);

    // Create files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
        filename TEXT NOT NULL,
        storage_path TEXT NOT NULL UNIQUE,
        mime_type TEXT,
        size_bytes INTEGER,
        content_hash TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create config table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create ingest_log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ingest_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_ref TEXT NOT NULL,
        pages_updated TEXT NOT NULL DEFAULT '[]',
        summary TEXT NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create access_tokens table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS access_tokens (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        scopes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        revoked_at DATETIME
      )
    `);

    // Create mcp_request_log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_request_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_name TEXT,
        operation TEXT NOT NULL,
        latency_ms INTEGER,
        status TEXT NOT NULL DEFAULT 'success',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vector index using LibSQLVector
    try {
      await this.vectorStore.createIndex({
        indexName: this.indexName,
        dimension: this.dimension, // Use configured dimension
        metric: "cosine",
      });
    } catch (err) {
      // Ignore if index already exists
    }
  }

  async getPage(slug: string): Promise<{ content_hash: string } | null> {
    const result = await this.drizzleDb
      .select({ content_hash: pages.content_hash })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (result.length === 0 || !result[0].content_hash) return null;
    return { content_hash: result[0].content_hash };
  }

  async getPageContent(slug: string): Promise<PageRecord | null> {
    const result = await this.drizzleDb
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (result.length === 0) return null;

    const tags = await this.getTags(slug);

    return {
      id: result[0].id,
      slug: result[0].slug,
      type: result[0].type as any,
      title: result[0].title,
      tags,
      frontmatter:
        typeof result[0].frontmatter === "string"
          ? JSON.parse(result[0].frontmatter)
          : result[0].frontmatter,
      compiled_truth: result[0].compiled_truth,
      timeline: result[0].timeline,
      content_hash: result[0].content_hash || "",
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
    };
  }

  async listPages(options?: {
    type?: string;
    tag?: string;
  }): Promise<{ slug: string; title: string; type: string }[]> {
    let query = this.drizzleDb
      .select({
        slug: pages.slug,
        title: pages.title,
        type: pages.type,
      })
      .from(pages)
      .$dynamic();

    if (options?.tag) {
      query = this.drizzleDb
        .select({
          slug: pages.slug,
          title: pages.title,
          type: pages.type,
        })
        .from(pages)
        .innerJoin(tags, eq(pages.id, tags.page_id))
        .where(eq(tags.tag, options.tag))
        .$dynamic();
    }

    const result = await query;
    let filtered = result;

    if (options?.type) {
      filtered = result.filter((r) => r.type === options.type);
    }

    return filtered;
  }

  async deletePage(slug: string): Promise<boolean> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return false;

    const page_id = pageResult[0].id;

    // Delete chunks (FTS and Vector store)
    await this.deleteChunks(slug);

    // Delete from pages. Due to ON DELETE CASCADE in schema, this should also clean up:
    // tags, content_chunks, links, timeline_entries, raw_data, page_versions
    await this.drizzleDb.delete(pages).where(eq(pages.id, page_id));

    return true;
  }

  async getTags(slug: string): Promise<string[]> {
    const result = await this.drizzleDb
      .select({ tag: tags.tag })
      .from(tags)
      .innerJoin(pages, eq(tags.page_id, pages.id))
      .where(eq(pages.slug, slug));

    return result.map((r) => r.tag || "").filter(Boolean);
  }

  async createVersion(slug: string): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({
        id: pages.id,
        compiled_truth: pages.compiled_truth,
        frontmatter: pages.frontmatter,
      })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (pageResult.length > 0) {
      await this.drizzleDb.insert(page_versions).values({
        page_id: pageResult[0].id,
        compiled_truth: pageResult[0].compiled_truth || "",
        frontmatter: pageResult[0].frontmatter || "{}",
      });
    }
  }

  async putPage(
    slug: string,
    page: Omit<PageRecord, "slug" | "tags">
  ): Promise<void> {
    await this.drizzleDb
      .insert(pages)
      .values({
        slug,
        type: page.type ?? "concept",
        title: page.title ?? slug,
        frontmatter: page.frontmatter ? JSON.stringify(page.frontmatter) : "{}",
        compiled_truth: page.compiled_truth ?? "",
        timeline: page.timeline ?? "",
        content_hash: page.content_hash ?? null,
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          type: page.type ?? "concept",
          title: page.title ?? slug,
          frontmatter: page.frontmatter
            ? JSON.stringify(page.frontmatter)
            : "{}",
          compiled_truth: page.compiled_truth ?? "",
          timeline: page.timeline ?? "",
          content_hash: page.content_hash ?? null,
          updated_at: sql`CURRENT_TIMESTAMP`,
        },
      });

    await this.createVersion(slug);
  }

  async addTag(slug: string, tag: string): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;

    await this.drizzleDb
      .insert(tags)
      .values({ page_id: pageResult[0].id, tag })
      .onConflictDoNothing();
  }

  async removeTag(slug: string, tag: string): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;

    await this.drizzleDb
      .delete(tags)
      .where(and(eq(tags.page_id, pageResult[0].id), eq(tags.tag, tag)));
  }

  async upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;

    // First delete existing chunks
    await this.deleteChunks(slug);

    if (chunks.length > 0) {
      // Insert into content_chunks (real data)
      await this.drizzleDb.insert(content_chunks).values(
        chunks.map((chunk) => ({
          page_id,
          chunk_index: chunk.chunk_index,
          chunk_text: chunk.chunk_text,
          chunk_source: chunk.chunk_source,
          token_count: chunk.token_count ?? 0,
          embedded_at: chunk.embedding ? sql`CURRENT_TIMESTAMP` : null,
        }))
      );

      // Then insert new chunks into FTS5 using Drizzle
      await this.drizzleDb.insert(chunks_fts).values(
        chunks.map((chunk) => ({
          page_id,
          chunk_index: chunk.chunk_index,
          chunk_text: chunk.chunk_text,
          chunk_source: chunk.chunk_source,
          token_count: chunk.token_count ?? 0,
          chunk_text_segmented: extractWordsForSearch(chunk.chunk_text),
        }))
      );
    }

    // Now upsert embeddings using LibSQLVector
    // We only use LibSQLVector if embeddings are provided
    const vectorData = chunks
      .filter((c) => c.embedding)
      .map((c) => ({
        id: `${slug}::${c.chunk_index}`,
        vector: c.embedding!,
        metadata: {
          slug,
          chunk_index: c.chunk_index,
          chunk_source: c.chunk_source,
          chunk_text: c.chunk_text,
          token_count: c.token_count ?? 0,
        },
      }));

    if (vectorData.length > 0) {
      const upsertParams = {
        indexName: this.indexName,
        vectors: vectorData.map((v) => v.vector),
        ids: vectorData.map((v) => v.id),
        metadata: vectorData.map((v) => v.metadata),
      };

      await this.vectorStore.upsert(upsertParams);
    }
  }

  async deleteChunks(slug: string): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;

    // Delete from FTS5
    await this.drizzleDb
      .delete(chunks_fts)
      .where(eq(chunks_fts.page_id, page_id));

    // Delete from real table
    await this.drizzleDb
      .delete(content_chunks)
      .where(eq(content_chunks.page_id, page_id));

    // Delete from LibSQLVector
    try {
      await this.vectorStore.deleteVectors({
        indexName: this.indexName,
        filter: { slug: { $eq: slug } },
      });
    } catch (err) {
      // May fail if filter delete isn't fully supported or index doesn't exist
    }
  }

  // --- Links Management ---
  async addLink(
    fromSlug: string,
    toSlug: string,
    linkType: string = "",
    context: string = ""
  ): Promise<void> {
    const fromPage = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, fromSlug))
      .limit(1);
    const toPage = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, toSlug))
      .limit(1);

    if (fromPage.length === 0 || toPage.length === 0) return;

    await this.drizzleDb
      .insert(links)
      .values({
        from_page_id: fromPage[0].id,
        to_page_id: toPage[0].id,
        link_type: linkType,
        context: context,
      })
      .onConflictDoNothing();
  }

  async removeLink(fromSlug: string, toSlug: string): Promise<void> {
    const fromPage = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, fromSlug))
      .limit(1);
    const toPage = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, toSlug))
      .limit(1);

    if (fromPage.length === 0 || toPage.length === 0) return;

    await this.drizzleDb
      .delete(links)
      .where(
        and(
          eq(links.from_page_id, fromPage[0].id),
          eq(links.to_page_id, toPage[0].id)
        )
      );
  }

  async getOutgoingLinks(slug: string): Promise<LinkRecord[]> {
    const result = await this.drizzleDb
      .select({
        id: links.id,
        from_page_id: links.from_page_id,
        to_page_id: links.to_page_id,
        to_slug: pages.slug,
        link_type: links.link_type,
        context: links.context,
        created_at: links.created_at,
      })
      .from(links)
      .innerJoin(pages, eq(links.to_page_id, pages.id))
      .where(
        eq(
          links.from_page_id,
          this.drizzleDb
            .select({ id: pages.id })
            .from(pages)
            .where(eq(pages.slug, slug))
            .limit(1)
        )
      );

    return result.map((r) => ({
      id: r.id,
      from_slug: slug,
      to_slug: r.to_slug,
      link_type: r.link_type,
      context: r.context,
      created_at: r.created_at,
    }));
  }

  async getBacklinks(slug: string): Promise<LinkRecord[]> {
    const result = await this.drizzleDb
      .select({
        id: links.id,
        from_page_id: links.from_page_id,
        to_page_id: links.to_page_id,
        from_slug: pages.slug,
        link_type: links.link_type,
        context: links.context,
        created_at: links.created_at,
      })
      .from(links)
      .innerJoin(pages, eq(links.from_page_id, pages.id))
      .where(
        eq(
          links.to_page_id,
          this.drizzleDb
            .select({ id: pages.id })
            .from(pages)
            .where(eq(pages.slug, slug))
            .limit(1)
        )
      );

    return result.map((r) => ({
      id: r.id,
      from_slug: r.from_slug,
      to_slug: slug,
      link_type: r.link_type,
      context: r.context,
      created_at: r.created_at,
    }));
  }

  // --- Timeline Management ---
  async upsertTimelineEntries(
    slug: string,
    entries: Omit<TimelineEntry, "id" | "page_id" | "created_at">[]
  ): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;

    // Delete existing timeline entries for this page to replace them
    await this.drizzleDb
      .delete(timeline_entries)
      .where(eq(timeline_entries.page_id, page_id));

    if (entries.length > 0) {
      await this.drizzleDb.insert(timeline_entries).values(
        entries.map((e) => ({
          page_id,
          date: e.date,
          source: e.source,
          summary: e.summary,
          detail: e.detail,
        }))
      );
    }
  }

  async getTimelineEntries(slug: string): Promise<TimelineEntry[]> {
    const result = await this.drizzleDb
      .select({
        id: timeline_entries.id,
        page_id: timeline_entries.page_id,
        slug: pages.slug,
        date: timeline_entries.date,
        source: timeline_entries.source,
        summary: timeline_entries.summary,
        detail: timeline_entries.detail,
        created_at: timeline_entries.created_at,
      })
      .from(timeline_entries)
      .innerJoin(pages, eq(timeline_entries.page_id, pages.id))
      .where(eq(pages.slug, slug))
      .orderBy(timeline_entries.date);

    return result;
  }

  // --- Raw Data Management ---
  async putRawData(slug: string, source: string, data: any): Promise<void> {
    const pageResult = await this.drizzleDb
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;

    await this.drizzleDb
      .insert(raw_data)
      .values({
        page_id: pageResult[0].id,
        source: source,
        data: JSON.stringify(data),
      })
      .onConflictDoUpdate({
        target: [raw_data.page_id, raw_data.source],
        set: {
          data: JSON.stringify(data),
          fetched_at: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  async getRawData(
    slug: string,
    source: string
  ): Promise<RawDataRecord | null> {
    const result = await this.drizzleDb
      .select({
        id: raw_data.id,
        page_id: raw_data.page_id,
        slug: pages.slug,
        source: raw_data.source,
        data: raw_data.data,
        fetched_at: raw_data.fetched_at,
      })
      .from(raw_data)
      .innerJoin(pages, eq(raw_data.page_id, pages.id))
      .where(and(eq(pages.slug, slug), eq(raw_data.source, source)))
      .limit(1);

    if (result.length === 0) return null;
    return {
      ...result[0],
      data:
        typeof result[0].data === "string"
          ? JSON.parse(result[0].data)
          : result[0].data,
    };
  }

  // --- Files Management ---
  async upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): Promise<void> {
    let page_id = null;
    if (file.page_slug) {
      const pageResult = await this.drizzleDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, file.page_slug))
        .limit(1);
      if (pageResult.length > 0) {
        page_id = pageResult[0].id;
      }
    }

    await this.drizzleDb
      .insert(files)
      .values({
        page_id,
        filename: file.filename,
        storage_path: file.storage_path,
        mime_type: file.mime_type ?? null,
        size_bytes: file.size_bytes ?? null,
        content_hash: file.content_hash,
        metadata: JSON.stringify(file.metadata),
      })
      .onConflictDoUpdate({
        target: files.storage_path,
        set: {
          page_id,
          filename: file.filename,
          mime_type: file.mime_type ?? null,
          size_bytes: file.size_bytes ?? null,
          content_hash: file.content_hash,
          metadata: JSON.stringify(file.metadata),
        },
      });
  }

  async getFile(storagePath: string): Promise<FileRecord | null> {
    const result = await this.drizzleDb
      .select({
        id: files.id,
        page_id: files.page_id,
        page_slug: pages.slug,
        filename: files.filename,
        storage_path: files.storage_path,
        mime_type: files.mime_type,
        size_bytes: files.size_bytes,
        content_hash: files.content_hash,
        metadata: files.metadata,
        created_at: files.created_at,
      })
      .from(files)
      .leftJoin(pages, eq(files.page_id, pages.id))
      .where(eq(files.storage_path, storagePath))
      .limit(1);

    if (result.length === 0) return null;
    return {
      ...result[0],
      page_slug: result[0].page_slug ?? undefined,
      mime_type: result[0].mime_type ?? undefined,
      size_bytes: result[0].size_bytes ?? undefined,
      metadata:
        typeof result[0].metadata === "string"
          ? JSON.parse(result[0].metadata)
          : result[0].metadata,
      page_id: result[0].page_id ?? undefined,
    };
  }

  // --- Config & Logs Management ---
  async getConfig(key: string): Promise<string | null> {
    const result = await this.drizzleDb
      .select({ value: config.value })
      .from(config)
      .where(eq(config.key, key))
      .limit(1);

    return result.length > 0 ? result[0].value : null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    await this.drizzleDb
      .insert(config)
      .values({ key, value })
      .onConflictDoUpdate({
        target: config.key,
        set: { value },
      });
  }

  async addIngestLog(log: Omit<IngestLog, "id" | "created_at">): Promise<void> {
    await this.drizzleDb.insert(ingest_log).values({
      source_type: log.source_type,
      source_ref: log.source_ref,
      pages_updated: JSON.stringify(log.pages_updated),
      summary: log.summary,
    });
  }

  async verifyAccessToken(tokenHash: string): Promise<AccessToken | null> {
    const result = await this.drizzleDb
      .select()
      .from(access_tokens)
      .where(
        and(
          eq(access_tokens.token_hash, tokenHash),
          sql`${access_tokens.revoked_at} IS NULL`
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    // Update last_used_at
    await this.drizzleDb
      .update(access_tokens)
      .set({ last_used_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(access_tokens.id, result[0].id));

    return {
      ...result[0],
      created_at: result[0].created_at ?? undefined,
      last_used_at: result[0].last_used_at ?? undefined,
      revoked_at: result[0].revoked_at ?? undefined,
      scopes:
        typeof result[0].scopes === "string"
          ? JSON.parse(result[0].scopes)
          : result[0].scopes || [],
    };
  }

  async logMcpRequest(
    log: Omit<McpRequestLog, "id" | "created_at">
  ): Promise<void> {
    await this.drizzleDb.insert(mcp_request_log).values({
      token_name: log.token_name ?? null,
      operation: log.operation,
      latency_ms: log.latency_ms ?? null,
      status: log.status,
    });
  }

  // --- Lifecycle Management ---
  async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }

  async markChunksEmbedded(chunkIds: number[]): Promise<void> {
    if (chunkIds.length === 0) return;
    await this.drizzleDb
      .update(content_chunks)
      .set({ embedded_at: sql`CURRENT_TIMESTAMP` })
      .where(sql`${content_chunks.id} IN (${sql.join(chunkIds, sql`, `)})`);
  }

  async getHealthReport(): Promise<DatabaseHealth> {
    const report: DatabaseHealth = {
      connectionOk: false,
      tablesOk: true,
      ftsOk: false,
      tableDetails: {},
      vectorCoverage: { total: 0, embedded: 0 },
      schemaVersion: { current: 0, latest: LATEST_VERSION, ok: false },
    };

    try {
      const dbTest = this.db.query("SELECT 1 as result").get() as
        | { result: number }
        | undefined;
      if (dbTest && dbTest.result === 1) {
        report.connectionOk = true;
      }
    } catch (e) {
      report.connectionOk = false;
    }

    const tables = [
      "pages",
      "content_chunks",
      "links",
      "timeline_entries",
      "tags",
      "chunks_fts",
    ];
    for (const table of tables) {
      try {
        const res = this.db
          .query(`SELECT count(*) as count FROM ${table}`)
          .get() as { count: number };
        report.tableDetails[table] = { ok: true, rows: res?.count };
      } catch (e: any) {
        report.tableDetails[table] = { ok: false, error: e.message };
        report.tablesOk = false;
      }
    }

    try {
      this.db
        .query(`INSERT INTO chunks_fts(chunks_fts) VALUES('integrity-check')`)
        .run();
      report.ftsOk = true;
    } catch (e: any) {
      report.ftsOk = false;
    }

    try {
      const chunkCount = this.db
        .query(`SELECT count(*) as count FROM content_chunks`)
        .get() as { count: number };
      report.vectorCoverage.total = chunkCount?.count || 0;

      const embeddedCount = this.db
        .query(
          `SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL`
        )
        .get() as { count: number };
      report.vectorCoverage.embedded = embeddedCount?.count || 0;
    } catch (e) {}

    try {
      const versionStr = await this.getConfig("version");
      const v = parseInt(versionStr || "0", 10);
      report.schemaVersion!.current = v;
      report.schemaVersion!.ok = v >= LATEST_VERSION;
    } catch (e) {
      report.schemaVersion!.ok = false;
    }

    return report;
  }

  async getStaleChunks(): Promise<StaleChunk[]> {
    const rows = await this.drizzleDb
      .select({
        id: content_chunks.id,
        slug: pages.slug,
        chunk_index: content_chunks.chunk_index,
        chunk_text: content_chunks.chunk_text,
        chunk_source: content_chunks.chunk_source,
      })
      .from(content_chunks)
      .innerJoin(pages, sql`${content_chunks.page_id} = ${pages.id}`)
      .where(sql`${content_chunks.embedded_at} IS NULL`);
    return rows as StaleChunk[];
  }

  async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return fn(this); // already in transaction
    }

    // Start transaction
    this.db.exec("BEGIN TRANSACTION");
    const txStore = new LibSQLStore({
      url: this.url,
      authToken: this.authToken,
      dimension: this.dimension,
      db: this.db,
      vectorStore: this.vectorStore,
    });
    try {
      const result = await fn(txStore);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Expose vector search and keyword search directly on the store
  async searchKeyword(
    query: string,
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    const MAX_SEARCH_LIMIT = 100;
    const limit = Math.min(opts?.limit ?? 10, MAX_SEARCH_LIMIT);
    const offset = opts?.offset ?? 0;
    const dedupe = opts?.dedupe ?? true;

    const segmentedQuery = extractWordsForSearch(query);

    const ftsQuery = this.drizzleDb
      .select({
        page_id: chunks_fts.page_id,
        chunk_index: chunks_fts.chunk_index,
        score: sql<number>`bm25(${chunks_fts})`.as("score"),
      })
      .from(chunks_fts)
      .where(sql`${chunks_fts} MATCH ${segmentedQuery}`)
      .orderBy(sql`score ASC`)
      .limit(10000)
      .as("r");

    const conditions = [];
    if (opts?.type) {
      conditions.push(eq(pages.type, opts.type));
    }
    if (opts?.detail === "low") {
      conditions.push(eq(content_chunks.chunk_source, "compiled_truth"));
    }
    if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
      conditions.push(notInArray(pages.slug, opts.exclude_slugs));
    }

    const mainQuery = this.drizzleDb
      .select({
        page_id: pages.id,
        title: pages.title,
        type: pages.type,
        slug: pages.slug,
        chunk_index: content_chunks.chunk_index,
        chunk_text: content_chunks.chunk_text,
        chunk_source: content_chunks.chunk_source,
        token_count: content_chunks.token_count,
        score: ftsQuery.score,
        stale:
          sql<boolean>`(${content_chunks.embedded_at} IS NULL OR ${pages.updated_at} > ${content_chunks.embedded_at})`.as(
            "stale"
          ),
      })
      .from(ftsQuery)
      .innerJoin(
        content_chunks,
        and(
          eq(content_chunks.page_id, ftsQuery.page_id),
          eq(content_chunks.chunk_index, ftsQuery.chunk_index)
        )
      )
      .innerJoin(pages, eq(pages.id, content_chunks.page_id))
      .orderBy(sql`${ftsQuery.score} ASC`);

    if (conditions.length > 0) {
      mainQuery.where(and(...conditions));
    }

    if (dedupe) {
      // We fetch more results to allow for deduplication in code (handled by caller like hybridSearch)
      mainQuery.limit((offset + limit) * 5);
    } else {
      mainQuery.limit(limit).offset(offset);
    }

    const rows = await mainQuery.execute();

    const searchResults = rows.map((r) => ({
      page_id: r.page_id as number,
      title: r.title as string,
      type: r.type as string,
      slug: r.slug as string,
      chunk_index: r.chunk_index as number,
      chunk_text: r.chunk_text as string,
      chunk_source: r.chunk_source as any,
      token_count: r.token_count as number,
      score: r.score as number,
      stale: !!r.stale,
    }));

    return searchResults;
  }

  async searchVector(
    queryVector: number[],
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    const limit = Math.min(opts?.limit ?? 10, 100);

    const vectorResults = await this.vectorStore.query({
      indexName: this.indexName,
      queryVector,
      topK: limit,
    });

    const results = [];
    for (const match of vectorResults) {
      if (match.metadata) {
        results.push({
          slug: match.metadata.slug as string,
          chunk_index: match.metadata.chunk_index as number,
          chunk_text: match.metadata.chunk_text as string,
          chunk_source: match.metadata.chunk_source as ChunkSource,
          token_count: match.metadata.token_count as number,
          score: match.score,
          stale: false, // vector results always have an embedding
        });
      }
    }
    return results;
  }

  async upsertVectors(
    vectors: { id: string; vector: number[]; metadata: any }[]
  ): Promise<void> {
    await this.vectorStore.upsert({
      indexName: this.indexName,
      vectors: vectors.map((v) => v.vector),
      ids: vectors.map((v) => v.id),
      metadata: vectors.map((v) => v.metadata),
    });
  }
}
