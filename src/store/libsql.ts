import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { LibSQLVector } from "@mastra/libsql";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { alias } from "drizzle-orm/sqlite-core";
import { pick } from "effect/Struct";
import { extractWordsForSearch } from "../segmenter.js";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  Chunk,
  ChunkInput,
  ChunkSource,
  DatabaseHealth,
  FileRecord,
  GraphNode,
  IngestLogEntry,
  IngestLogInput,
  Link,
  McpRequestLog,
  PageFilters,
  PageInput,
  PageVersion,
  RawData,
  SearchOpts,
  SearchResult,
  StaleChunk,
  TimelineEntry,
  TimelineInput,
  TimelineOpts,
  VectorMetadata,
} from "../types.js";
import { Page } from "./effect-schema.js";
import type { StoreProvider, TimelineBatchInput } from "./interface.js";
import * as SqlBuilder from "./SqlBuilder.js";
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

export interface LibSQLStoreOptions {
  url: string;
  vectorUrl?: string;
  authToken?: string;
  dimension?: number;
  db?: Database;
  vectorStore?: LibSQLVector;
}

export class LibSQLStore implements StoreProvider {
  private db: Database;
  private drizzleDb: BunSQLiteDatabase<{ pages: typeof pages }>;
  public vectorStore: LibSQLVector;
  public indexName = "gbrain_chunks";
  public readonly url: string;
  public readonly vectorUrl: string;
  public readonly authToken?: string;
  public readonly dimension: number;

  constructor(options: LibSQLStoreOptions) {
    this.url = options.url;
    this.vectorUrl = options.vectorUrl ?? this.url.replace(".db", "-vector.db");
    this.authToken = options.authToken;
    this.dimension = options.dimension ?? 1536; // Default to OpenAI dimension

    if (options.db && options.vectorStore) {
      this.db = options.db;
      this.vectorStore = options.vectorStore;
    } else {
      const filename = this.url.replace(/^file:/, "");
      if (filename !== ":memory:" && filename !== "" && !isAbsolute(filename)) {
        const dir = dirname(filename);
        if (dir !== "." && dir !== "") {
          mkdirSync(dir, { recursive: true });
        }
      }
      this.db = new Database(filename);
      this.vectorStore = new LibSQLVector({
        id: "gbrain",
        url: this.vectorUrl,
        authToken: this.authToken,
      });
    }

    // Initialize Drizzle ORM instance wrapping the Bun SQLite Database
    this.drizzleDb = drizzle(this.db, {
      schema: { pages },
    });
  }

  private get _inTransaction() {
    return this.db.inTransaction;
  }

  async init() {
    if (this._inTransaction) return; // Don't init schema in a sub-transaction

    // Create tables
    this.db.exec(
      (await import("./init.sql", { with: { type: "text" } })).default
    );

    // Create vector index using LibSQLVector
    await this.vectorStore.createIndex({
      indexName: this.indexName,
      dimension: this.dimension, // Use configured dimension
      metric: "cosine",
    });
  }

  async getPage(slug: string): Promise<Page | null> {
    const result = await this.drizzleDb
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (result.length === 0) return null;

    return Page.decodeUnsafe(result[0]);
  }

  async listPages(filters: PageFilters = {}): Promise<Page[]> {
    const result = await SqlBuilder.listPages(this.drizzleDb, filters).all();
    return result.map(Page.decodeUnsafe);
  }

  async deletePage(slug: string): Promise<void> {
    // const pageResult = await this.drizzleDb
    //   .select({ id: pages.id })
    //   .from(pages)
    //   .where(eq(pages.slug, slug))
    //   .limit(1);
    // if (pageResult.length === 0) throw new Error("Page not found");

    // const page_id = pageResult[0].id;

    // // Delete chunks (FTS and Vector store)
    // await this.deleteChunks(slug);

    // Delete from pages. Due to ON DELETE CASCADE in schema, this should also clean up:
    // tags, content_chunks, links, timeline_entries, raw_data, page_versions
    await Promise.all([
      this.drizzleDb.delete(pages).where(eq(pages.slug, slug)),
      this._deleteVectorsBySlug(slug),
    ]);
  }

  async getTags(slug: string): Promise<string[]> {
    const result = await this.drizzleDb
      .select({ tag: tags.tag })
      .from(tags)
      .innerJoin(pages, eq(tags.page_id, pages.id))
      .where(eq(pages.slug, slug));

    return result.map((r) => r.tag);
  }

  async createVersion(slug: string): Promise<PageVersion> {
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
      const res = await this.drizzleDb
        .insert(page_versions)
        .values({
          page_id: pageResult[0].id,
          compiled_truth: pageResult[0].compiled_truth || "",
          frontmatter: pageResult[0].frontmatter || "{}",
        })
        .returning();

      return {
        id: res[0].id,
        page_id: res[0].page_id,
        compiled_truth: res[0].compiled_truth,
        frontmatter:
          typeof res[0].frontmatter === "string"
            ? JSON.parse(res[0].frontmatter)
            : res[0].frontmatter,
        snapshot_at: new Date(res[0].snapshot_at),
      };
    }
    throw new Error(`Page ${slug} not found`);
  }

  async getVersions(slug: string): Promise<PageVersion[]> {
    const result = await this.drizzleDb
      .select({
        ...pick(page_versions, [
          "id",
          "page_id",
          "compiled_truth",
          "frontmatter",
          "snapshot_at",
        ]),
        slug: pages.slug,
      })
      .from(page_versions)
      .innerJoin(pages, eq(page_versions.page_id, pages.id))
      .where(eq(pages.slug, slug))
      .orderBy(sql`${page_versions.snapshot_at} DESC`);

    return result.map((r) => ({
      id: r.id,
      page_id: r.page_id,
      compiled_truth: r.compiled_truth,
      frontmatter:
        typeof r.frontmatter === "string"
          ? JSON.parse(r.frontmatter)
          : r.frontmatter,
      snapshot_at: new Date(r.snapshot_at),
    }));
  }

  async revertToVersion(slug: string, versionId: number): Promise<void> {
    const pv = alias(page_versions, "pv");
    const excute = this.drizzleDb
      .update(pages)
      .set({
        ...pick(pv, ["compiled_truth", "frontmatter"]),
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .from(pv)
      .where(
        and(
          eq(pages.slug, sql.placeholder("slug")),
          eq(pv.id, sql.placeholder("versionId")),
          eq(pv.page_id, pages.id)
        )
      )
      .limit(sql.placeholder("limit"));
    //   .returning();
    // console.log(excute.toSQL());
    // console.log(
    excute.prepare().run({
      slug,
      limit: 1,
      versionId,
    });
    // );
    // const versionResult = await this.drizzleDb
    //   .select({
    //     compiled_truth: page_versions.compiled_truth,
    //     frontmatter: page_versions.frontmatter,
    //     page_id: page_versions.page_id,
    //   })
    //   .from(page_versions)
    //   .innerJoin(pages, eq(page_versions.page_id, pages.id))
    //   .where(and(eq(pages.slug, slug), eq(page_versions.id, versionId)))
    //   .limit(1);
    // if (versionResult.length > 0) {
    //   await this.drizzleDb
    //     .update(pages)
    //     .set({
    //       compiled_truth: versionResult[0].compiled_truth,
    //       frontmatter: versionResult[0].frontmatter,
    //       updated_at: sql`CURRENT_TIMESTAMP`,
    //     })
    //     .where(eq(pages.id, versionResult[0].page_id));
    // }
  }

  async putPage(slug: string, page: PageInput): Promise<Page> {
    const record = await this.drizzleDb
      .insert(pages)
      .values({
        slug,
        type: page.type ?? "concept",
        title: page.title ?? slug,
        frontmatter: page.frontmatter ? JSON.stringify(page.frontmatter) : "{}",
        compiled_truth: page.compiled_truth ?? "",
        timeline: page.timeline ?? "",
        content_hash: page.content_hash,
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
          content_hash: page.content_hash,
          updated_at: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    await this.createVersion(slug);

    const result = await this.getPage(slug);
    if (!result) throw new Error(`Failed to return putPage result for ${slug}`);
    return Page.decodeUnsafe(record[0]);
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
      .select(pick(pages, ["id", "title", "type"]))
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;
    const page_title = pageResult[0].title;
    const page_type = pageResult[0].type;

    const newIndices = chunks.map((c) => c.chunk_index);

    // Delete chunks that no longer exist
    if (newIndices.length > 0) {
      await this.drizzleDb
        .delete(content_chunks)
        .where(
          and(
            eq(content_chunks.page_id, page_id),
            notInArray(content_chunks.chunk_index, newIndices)
          )
        );

      await this.drizzleDb
        .delete(chunks_fts)
        .where(
          and(
            eq(chunks_fts.page_id, page_id),
            notInArray(chunks_fts.chunk_index, newIndices)
          )
        );
    } else {
      await this.deleteChunks(slug);
      return;
    }

    if (chunks.length > 0) {
      // Upsert into content_chunks (real data)
      for (const chunk of chunks) {
        await this.drizzleDb
          .insert(content_chunks)
          .values({
            page_id,
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            chunk_source: chunk.chunk_source,
            token_count: chunk.token_count ?? 0,
            embedded_at: chunk.embedding ? sql`CURRENT_TIMESTAMP` : null,
          })
          .onConflictDoUpdate({
            target: [content_chunks.page_id, content_chunks.chunk_index],
            set: {
              chunk_text: chunk.chunk_text,
              chunk_source: chunk.chunk_source,
              token_count: chunk.token_count ?? 0,
              embedded_at: sql`CASE
                WHEN EXCLUDED.chunk_text != ${content_chunks.chunk_text} THEN EXCLUDED.embedded_at 
                ELSE COALESCE(EXCLUDED.embedded_at, ${content_chunks.embedded_at}) 
              END`,
            },
          });
      }

      // FTS5 doesn't support UPSERT, so delete and insert
      await this.drizzleDb
        .delete(chunks_fts)
        .where(eq(chunks_fts.page_id, page_id));
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
        vector: Array.from(c.embedding!),
        metadata: {
          page_id,
          slug,
          title: page_title,
          type: page_type,
          chunk_index: c.chunk_index,
          chunk_source: c.chunk_source,
          chunk_text: c.chunk_text,
          token_count: c.token_count ?? 0,
        } satisfies VectorMetadata,
      }));

    if (vectorData.length > 0) {
      await this.vectorStore.upsert({
        indexName: this.indexName,
        vectors: vectorData.map((v) => v.vector),
        ids: vectorData.map((v) => v.id),
        metadata: vectorData.map((v) => v.metadata),
        deleteFilter: { slug: { $eq: slug } },
      });
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

    // Delete from LibSQLVector (since vector IDs are `slug::chunk_index`)
    try {
      await this._deleteVectorsBySlug(slug);
    } catch (err) {
      // Fallback: we cannot reliably delete if the driver lacks it
      console.warn(`Could not delete vectors for ${slug}:`, err);
    }
  }

  // --- Links Management ---
  async addLink(
    fromSlug: string,
    toSlug: string,
    linkType: string = "references",
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

  async getOutgoingLinks(slug: string): Promise<Link[]> {
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
      from_slug: slug,
      to_slug: r.to_slug,
      link_type: r.link_type || "",
      context: r.context || "",
    }));
  }

  async getBacklinks(slug: string): Promise<Link[]> {
    const rows = await this.drizzleDb
      .select({
        from_slug: pages.slug,
        to_slug: sql<string>`${slug}`,
        link_type: links.link_type,
        context: links.context,
      })
      .from(links)
      .innerJoin(pages, eq(pages.id, links.from_page_id))
      .where(
        eq(
          links.to_page_id,
          sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`
        )
      );

    return rows.map((r) => ({
      from_slug: r.from_slug,
      to_slug: r.to_slug,
      link_type: r.link_type || "",
      context: r.context || "",
    }));
  }

  async getLinks(slug: string): Promise<Link[]> {
    const outgoing = await this.drizzleDb
      .select({
        from_slug: sql<string>`${slug}`,
        to_slug: pages.slug,
        link_type: links.link_type,
        context: links.context,
      })
      .from(links)
      .innerJoin(pages, eq(pages.id, links.to_page_id))
      .where(
        eq(
          links.from_page_id,
          sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`
        )
      );

    const incoming = await this.getBacklinks(slug);

    return [
      ...outgoing.map((r) => ({
        from_slug: r.from_slug,
        to_slug: r.to_slug,
        link_type: r.link_type || "",
        context: r.context || "",
      })),
      ...incoming,
    ];
  }

  // --- Timeline Management ---
  async addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): Promise<void> {
    let page_id: number;
    if (opts?.skipExistenceCheck) {
      // In a real implementation we might just do a sub-select directly on insert.
      // But Drizzle doesn't easily support INSERT ... SELECT returning id for sqlite in a clean way without raw SQL sometimes.
      const pageResult = await this.drizzleDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, slug))
        .limit(1);
      if (pageResult.length === 0) return; // skip
      page_id = pageResult[0].id;
    } else {
      const pageResult = await this.drizzleDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, slug))
        .limit(1);
      if (pageResult.length === 0)
        throw new Error(`addTimelineEntry failed: page "${slug}" not found`);
      page_id = pageResult[0].id;
    }

    await this.drizzleDb
      .insert(timeline_entries)
      .values({
        page_id,
        date: entry.date,
        source: entry.source ?? "",
        summary: entry.summary,
        detail: entry.detail ?? "",
      })
      .onConflictDoNothing();
  }

  async addTimelineEntriesBatch(
    entries: TimelineBatchInput[]
  ): Promise<number> {
    if (entries.length === 0) return 0;
    let count = 0;
    for (const entry of entries) {
      const pageResult = await this.drizzleDb
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, entry.slug))
        .limit(1);
      if (pageResult.length === 0) continue;

      const res = await this.drizzleDb
        .insert(timeline_entries)
        .values({
          page_id: pageResult[0].id,
          date: entry.date,
          source: entry.source ?? "",
          summary: entry.summary,
          detail: entry.detail ?? "",
        })
        .onConflictDoNothing()
        .returning({ id: timeline_entries.id });

      if (res.length > 0) count++;
    }
    return count;
  }

  async getTimeline(
    slug: string,
    opts?: TimelineOpts
  ): Promise<TimelineEntry[]> {
    const result = await SqlBuilder.getTimeline(
      this.drizzleDb,
      slug,
      opts
    ).execute();
    return result.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    }));
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

  async getRawData(slug: string, source?: string): Promise<RawData[]> {
    const result = await SqlBuilder.getRawData(
      this.drizzleDb,
      slug,
      source
    ).execute();

    return result.map((r) => ({
      source: r.source,
      data:
        typeof r.data === "string"
          ? JSON.parse(r.data)
          : (r.data as Record<string, unknown>),
      fetched_at: new Date(r.fetched_at),
    }));
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

  async logIngest(log: IngestLogInput): Promise<void> {
    await this.drizzleDb.insert(ingest_log).values({
      source_type: log.source_type,
      source_ref: log.source_ref,
      pages_updated: JSON.stringify(log.pages_updated),
      summary: log.summary,
    });
  }

  async getIngestLog(opts?: { limit?: number }): Promise<IngestLogEntry[]> {
    const limit = opts?.limit ?? 50;
    const result = await this.drizzleDb
      .select()
      .from(ingest_log)
      .orderBy(sql`${ingest_log.created_at} DESC`)
      .limit(limit);

    return result.map((r) => ({
      ...r,
      pages_updated:
        typeof r.pages_updated === "string"
          ? JSON.parse(r.pages_updated)
          : r.pages_updated,
      created_at: new Date(r.created_at),
    }));
  }

  async updateSlug(oldSlug: string, newSlug: string): Promise<void> {
    await this.drizzleDb
      .update(pages)
      .set({ slug: newSlug, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(pages.slug, oldSlug));
  }

  async rewriteLinks(oldSlug: string, newSlug: string): Promise<void> {
    // SQLite doesn't strictly need to rewrite foreign keys because they use page_id.
    // But text compiled_truth might contain [[oldSlug]] which could be updated,
    // though postgres-engine.ts stubs this out and says it's done by maintain skill.
    // We will just stub it like postgres-engine.ts.
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
      // @ts-expect-error
      await this.vectorStore.turso.close();
      await Promise.resolve();
    }
  }

  async cleanVector() {
    await this.vectorStore.deleteIndex({ indexName: this.indexName });
  }

  [Symbol.asyncDispose]() {
    return this.dispose();
  }
  [Symbol.dispose]() {
    return this.dispose();
  }

  async dropDBFile() {
    await this.dispose();
    let i = 0;
    while (i++ < 100) {
      try {
        await Bun.file(this.db.filename).unlink();
        await Bun.file(this.vectorUrl.replace("file:", "")).unlink();
        break;
      } catch (error) {
        if (i < 100) await Bun.sleep(20);
        else {
          console.warn(error instanceof Error ? error.message : error);
        }
      }
    }
  }

  async cleanDBFile(drop = false) {
    await Promise.all([
      this.cleanVector(),
      drop ? this.dropDBFile() : this.dispose(),
    ]);
  }

  async markChunksEmbedded(chunkIds: number[]): Promise<void> {
    if (chunkIds.length === 0) return;
    await this.drizzleDb
      .update(content_chunks)
      .set({ embedded_at: sql`CURRENT_TIMESTAMP` })
      .where(sql`${content_chunks.id} IN (${sql.join(chunkIds, sql`, `)})`);
  }

  async getStats(): Promise<BrainStats> {
    const pageCount = this.db
      .query("SELECT count(*) as count FROM pages")
      .get() as { count: number };
    const chunkCount = this.db
      .query("SELECT count(*) as count FROM content_chunks")
      .get() as { count: number };
    const embeddedCount = this.db
      .query(
        "SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL"
      )
      .get() as { count: number };
    const linkCount = this.db
      .query("SELECT count(*) as count FROM links")
      .get() as { count: number };
    const tagCount = this.db
      .query("SELECT count(DISTINCT tag) as count FROM tags")
      .get() as { count: number };
    const timelineEntryCount = this.db
      .query("SELECT count(*) as count FROM timeline_entries")
      .get() as { count: number };

    const types = this.db
      .query(
        "SELECT type, count(*) as count FROM pages GROUP BY type ORDER BY count DESC"
      )
      .all() as { type: string; count: number }[];
    const pages_by_type: Record<string, number> = {};
    for (const t of types) {
      pages_by_type[t.type] = t.count;
    }

    return {
      page_count: pageCount.count,
      chunk_count: chunkCount.count,
      embedded_count: embeddedCount.count,
      link_count: linkCount.count,
      tag_count: tagCount.count,
      timeline_entry_count: timelineEntryCount.count,
      pages_by_type,
    };
  }

  async getHealth(): Promise<BrainHealth> {
    const pageCount = (
      this.db.query("SELECT count(*) as count FROM pages").get() as {
        count: number;
      }
    ).count;
    const chunkCount = (
      this.db.query("SELECT count(*) as count FROM content_chunks").get() as {
        count: number;
      }
    ).count;
    const embeddedCount = (
      this.db
        .query(
          "SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL"
        )
        .get() as { count: number }
    ).count;
    const stalePages = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM pages p
      WHERE (p.compiled_truth != '' OR p.timeline != '')
        AND NOT EXISTS (SELECT 1 FROM content_chunks cc WHERE cc.page_id = p.id)
    `
        )
        .get() as { count: number }
    ).count;
    const orphanPages = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM pages p
      WHERE NOT EXISTS (SELECT 1 FROM links l WHERE l.to_page_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM links l WHERE l.from_page_id = p.id)
    `
        )
        .get() as { count: number }
    ).count;
    const deadLinks = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM links l
      WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = l.to_page_id)
    `
        )
        .get() as { count: number }
    ).count;
    const missingEmbeddings = chunkCount - embeddedCount;
    const linkCount = (
      this.db.query("SELECT count(*) as count FROM links").get() as {
        count: number;
      }
    ).count;
    const pagesWithTimeline = (
      this.db
        .query("SELECT count(DISTINCT page_id) as count FROM timeline_entries")
        .get() as { count: number }
    ).count;
    const entityCount = (
      this.db
        .query(
          "SELECT count(*) as count FROM pages WHERE type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;
    const entityWithLinks = (
      this.db
        .query(
          "SELECT count(DISTINCT to_page_id) as count FROM links l JOIN pages p ON p.id = l.to_page_id WHERE p.type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;
    const entityWithTimeline = (
      this.db
        .query(
          "SELECT count(DISTINCT page_id) as count FROM timeline_entries t JOIN pages p ON p.id = t.page_id WHERE p.type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;

    const embedCoverage = chunkCount > 0 ? embeddedCount / chunkCount : 1;
    const linkDensity = pageCount > 0 ? Math.min(linkCount / pageCount, 1) : 0;
    const timelineCoverage =
      pageCount > 0 ? Math.min(pagesWithTimeline / pageCount, 1) : 0;
    const noOrphans = pageCount > 0 ? 1 - orphanPages / pageCount : 1;
    const noDeadLinks =
      pageCount > 0 ? 1 - Math.min(deadLinks / pageCount, 1) : 1;

    const brainScore =
      pageCount === 0
        ? 0
        : Math.round(
            (embedCoverage * 0.35 +
              linkDensity * 0.25 +
              timelineCoverage * 0.15 +
              noOrphans * 0.15 +
              noDeadLinks * 0.1) *
              100
          );

    const mostConnectedRows = this.db
      .query(
        `
      SELECT p.slug, 
             (SELECT count(*) FROM links WHERE from_page_id = p.id OR to_page_id = p.id) as link_count
      FROM pages p
      ORDER BY link_count DESC
      LIMIT 5
    `
      )
      .all() as { slug: string; link_count: number }[];

    return {
      page_count: pageCount,
      embed_coverage: embedCoverage,
      stale_pages: stalePages,
      orphan_pages: orphanPages,
      missing_embeddings: missingEmbeddings,
      brain_score: brainScore,
      link_coverage: entityCount > 0 ? entityWithLinks / entityCount : 1,
      timeline_coverage: entityCount > 0 ? entityWithTimeline / entityCount : 1,
      most_connected: mostConnectedRows,
    };
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
      .innerJoin(pages, eq(content_chunks.page_id, pages.id))
      .where(sql`${content_chunks.embedded_at} IS NULL`);
    return rows as StaleChunk[];
  }

  async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
    if (this._inTransaction) {
      return fn(this); // already in transaction
    }
    // Start transaction
    try {
      this.db.exec("BEGIN TRANSACTION");
      const txStore = new LibSQLStore({
        url: this.url,
        authToken: this.authToken,
        dimension: this.dimension,
        db: this.db,
        vectorStore: this.vectorStore,
      });
      const result = await fn(txStore);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Expose vector search and keyword search directly on the store
  async resolveSlugs(partial: string): Promise<string[]> {
    // Try exact match first
    const exact = await SqlBuilder.resolveSlugExact(this.drizzleDb, partial);

    if (exact.length > 0) return [exact[0].slug];

    // Fuzzy match using LIKE
    const fuzzy = await SqlBuilder.resolveSlugFuzzy(this.drizzleDb, partial);

    return fuzzy.map((r) => r.slug);
  }

  async searchKeyword(
    query: string,
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    const segmentedQuery = extractWordsForSearch(query);
    const rows = await SqlBuilder.searchKeyword(
      this.drizzleDb,
      segmentedQuery,
      opts
    ).execute();

    const searchResults = rows.map((r) => ({
      page_id: r.page_id as number,
      title: r.title as string,
      type: r.type as any,
      slug: r.slug as string,
      chunk_id: r.chunk_id as number,
      chunk_index: r.chunk_index as number,
      chunk_text: r.chunk_text as string,
      chunk_source: r.chunk_source as ChunkSource,
      token_count: Number(r.token_count ?? 0),
      score: r.score as number,
      stale: !!r.stale,
    }));

    return searchResults;
  }

  async _deleteVectorsBySlug(slug: string) {
    return await this.vectorStore.deleteVectors({
      indexName: this.indexName,
      filter: { slug: { $eq: slug } },
    });
  }
  async _queryVectors(
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ) {
    const limit = opts?.limit ?? 10;

    // Apply metadata filters if supported by vectorStore, but we'll also filter in the SQL layer
    // to be completely sure.
    const filter: Record<string, any> = {};
    if (opts?.type) filter.type = { $eq: opts.type };
    if (opts?.detail === "low") filter.chunk_source = { $eq: "compiled_truth" };
    if (opts?.slug) {
      filter.slug = { $eq: opts.slug };
    } else if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
      filter.slug = { $nin: opts.exclude_slugs };
    }

    const vectorResults = await this.vectorStore.query({
      indexName: this.indexName,
      queryVector: Array.from(queryVector) as any,
      topK: limit * 2, // Fetch more to account for post-filtering if vectorStore doesn't support all filters
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    return vectorResults;
  }

  async searchVector(
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ): Promise<SearchResult[]> {
    const limit = opts?.limit ?? 10;
    const vectorResults = await this._queryVectors(queryVector, opts);

    const hits = vectorResults
      .map((match) => ({
        score: match.score as number,
        slug: (match.metadata?.slug ??
          (typeof match.id === "string"
            ? match.id.split("::")[0]
            : undefined)) as string | undefined,
        chunk_index: (match.metadata?.chunk_index ??
          (typeof match.id === "string"
            ? Number(match.id.split("::")[1])
            : undefined)) as number | undefined,
      }))
      .filter(
        (h): h is { score: number; slug: string; chunk_index: number } =>
          !!h.slug && Number.isFinite(h.chunk_index)
      );

    const slugs = Array.from(new Set(hits.map((h) => h.slug)));
    const chunkIndexes = Array.from(new Set(hits.map((h) => h.chunk_index)));
    if (slugs.length === 0 || chunkIndexes.length === 0) return [];
    const rows = await SqlBuilder.searchVectorRows(
      this.drizzleDb,
      slugs,
      chunkIndexes,
      opts
    ).execute();

    const byKey = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      byKey.set(`${r.slug}::${r.chunk_index}`, r);
    }

    const out: SearchResult[] = [];
    for (const h of hits) {
      const row = byKey.get(`${h.slug}::${h.chunk_index}`);
      if (!row) continue;
      out.push({
        page_id: row.page_id,
        title: row.title,
        type: row.type as any,
        slug: row.slug,
        chunk_id: row.chunk_id,
        chunk_index: row.chunk_index,
        chunk_text: row.chunk_text,
        chunk_source: row.chunk_source as ChunkSource,
        score: h.score,
        stale: !!row.stale,
      } as SearchResult);
      if (out.length >= limit) break;
    }

    return out;
  }

  async getEmbeddingsByChunkIds(
    ids: number[]
  ): Promise<Map<number, Float32Array>> {
    if (ids.length === 0) return new Map();
    // Since LibSQLVector abstracts embeddings and we don't store raw vectors in SQLite,
    // we would need to query LibSQLVector. However, LibSQLVector doesn't have a direct "get by ID"
    // method for multiple IDs returning vectors natively without a workaround or extending the wrapper.
    // If the vector store is on Turso, we might be able to query it if it's the same DB.
    // Assuming vectorStore is not easily queryable for raw vectors here without modifying LibSQLVector,
    // we'll return an empty map for now.
    // Alternatively, if LibSQLStore options.db has the vector data (e.g. vector_store table):
    const result = new Map<number, Float32Array>();
    try {
      const rows = this.db
        .query(
          `SELECT id, vector FROM vector_store WHERE id IN (${ids.map((id) => `'${id}'`).join(",")})`
        )
        .all() as any[];
      for (const row of rows) {
        const idStr = row.id as string;
        // id format is slug::chunk_index, but this function takes chunk_ids...
        // Wait, in postgres, content_chunks has an id column.
        // Here, content_chunks has an id column, but the vector id is `${slug}::${chunk_index}`.
        // We need to join content_chunks to get the slug and chunk_index.
      }
    } catch (e) {
      // Ignore if vector_store table doesn't exist locally
    }
    return result;
  }

  async getChunks(slug: string): Promise<Chunk[]> {
    const rows = await this.drizzleDb
      .select({
        id: content_chunks.id,
        page_id: content_chunks.page_id,
        chunk_index: content_chunks.chunk_index,
        chunk_text: content_chunks.chunk_text,
        chunk_source: content_chunks.chunk_source,
        model: content_chunks.model,
        token_count: content_chunks.token_count,
        embedded_at: content_chunks.embedded_at,
        created_at: content_chunks.created_at,
      })
      .from(content_chunks)
      .innerJoin(pages, eq(pages.id, content_chunks.page_id))
      .where(eq(pages.slug, slug))
      .orderBy(content_chunks.chunk_index);

    return rows.map((r) => ({
      ...r,
      chunk_source: r.chunk_source as "compiled_truth" | "timeline",
      embedding: null,
      model: r.model,
      embedded_at: r.embedded_at ? new Date(r.embedded_at) : null,
    }));
  }

  async getChunksWithEmbeddings(slug: string): Promise<Chunk[]> {
    return this.getChunks(slug); // We don't return raw embeddings here due to vectorStore separation
  }

  async traverseGraph(slug: string, depth: number = 5): Promise<GraphNode[]> {
    // We use a recursive CTE to traverse the graph and use json_group_array(json_object(...))
    // to safely serialize links without raw string concatenation risks.
    const sqlQuery = `
      WITH RECURSIVE graph AS (
        SELECT p.id, p.slug, p.title, p.type, 0 as depth
        FROM pages p WHERE p.slug = ?
        
        UNION
        
        SELECT p2.id, p2.slug, p2.title, p2.type, g.depth + 1
        FROM graph g
        JOIN links l ON l.from_page_id = g.id
        JOIN pages p2 ON p2.id = l.to_page_id
        WHERE g.depth < ?
      )
      SELECT DISTINCT g.slug, g.title, g.type, g.depth,
        (
          SELECT json_group_array(json_object('to_slug', p3.slug, 'link_type', l2.link_type))
          FROM links l2
          JOIN pages p3 ON p3.id = l2.to_page_id
          WHERE l2.from_page_id = g.id
        ) as links_json
      FROM graph g
      ORDER BY g.depth, g.slug
    `;

    try {
      const rows = this.db.query(sqlQuery).all(slug, depth) as any[];
      return rows.map((r) => ({
        slug: r.slug as string,
        title: r.title as string,
        type: r.type as any,
        depth: r.depth as number,
        links:
          r.links_json && r.links_json !== "[]" ? JSON.parse(r.links_json) : [],
      }));
    } catch (e) {
      console.error("traverseGraph failed:", e);
      return [];
    }
  }

  async upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): Promise<void> {
    if (vectors.length === 0) return;
    // LibSQLVector internally expects number[] array of arrays (in this specific mastra version)
    await this.vectorStore.upsert({
      indexName: this.indexName,
      vectors: vectors.map((_) => _.vector),
      ids: vectors.map((_) => _.id),
      metadata: vectors.map((_) => _.metadata),
    });
  }
}
