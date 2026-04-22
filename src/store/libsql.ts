import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { LibSQLVector } from "@mastra/libsql";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
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
import { SqlBuilder } from "./SqlBuilder.js";
import { LATEST_VERSION, Schemas } from "./schema.js";
import { UnsafeSql } from "./UnsafeSql.js";

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
  private drizzleDb: BunSQLiteDatabase<Schemas>;
  private mappers: SqlBuilder<"sync">;
  private unsafeSql: UnsafeSql;
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
      // logger: true,
      schema: Schemas,
    });
    this.mappers = new SqlBuilder(this.drizzleDb);
    this.unsafeSql = new UnsafeSql(this.drizzleDb);
  }

  private get _inTransaction() {
    return this.db.inTransaction;
  }

  async init() {
    if (this._inTransaction) return;

    // Create tables
    for (const sql of (
      await import("./init.sql", { with: { type: "text" } })
    ).default
      .split(";\n")
      .filter(Boolean)) {
      this.drizzleDb.run(sql);
    }

    // Create vector index using LibSQLVector
    await this.vectorStore.createIndex({
      indexName: this.indexName,
      dimension: this.dimension, // Use configured dimension
      metric: "cosine",
    });
  }

  async getPage(slug: string): Promise<Page | null> {
    const result = await this.mappers.getPageBySlug(slug);

    if (result.length === 0) return null;

    return Page.decodeUnsafe(result[0]);
  }

  async listPages(filters: PageFilters = {}): Promise<Page[]> {
    const result = await this.mappers.listPages(filters).all();
    return result.map(Page.decodeUnsafe);
  }

  async deletePage(slug: string): Promise<void> {
    // Delete from pages. Due to ON DELETE CASCADE in schema, this should also clean up:
    // tags, content_chunks, links, timeline_entries, raw_data, page_versions
    await Promise.all([
      this.mappers.deletePageBySlug(slug),
      this._deleteVectorsBySlug(slug),
    ]);
  }

  async getTags(slug: string): Promise<string[]> {
    const result = await this.mappers.getTagsBySlug(slug);

    return result.map((r) => r.tag);
  }

  async createVersion(slug: string): Promise<PageVersion> {
    const pageResult = await this.mappers.getPageForVersionBySlug(slug);

    if (pageResult.length > 0) {
      const res = await this.mappers.insertPageVersion({
        page_id: pageResult[0].id,
        compiled_truth: pageResult[0].compiled_truth || "",
        frontmatter: pageResult[0].frontmatter || "{}",
      });

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
    const result = await this.mappers.getVersionsBySlug(slug);

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
    await this.mappers.revertToVersionBySlug(slug, versionId);
  }

  async putPage(slug: string, page: PageInput): Promise<Page> {
    const record = await this.mappers.upsertPage(slug, page);

    await this.createVersion(slug);

    const result = await this.getPage(slug);
    if (!result) throw new Error(`Failed to return putPage result for ${slug}`);
    return Page.decodeUnsafe(record[0]);
  }

  async addTag(slug: string, tag: string): Promise<void> {
    const pageResult = await this.mappers.getPageIdBySlug(slug);
    if (pageResult.length === 0) return;

    await this.mappers.insertTag(pageResult[0].id, tag);
  }

  async removeTag(slug: string, tag: string): Promise<void> {
    const pageResult = await this.mappers.getPageIdBySlug(slug);
    if (pageResult.length === 0) return;

    await this.mappers.deleteTag(pageResult[0].id, tag);
  }

  async upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void> {
    const pageResult = await this.mappers.getPageBasicBySlug(slug);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;
    const page_title = pageResult[0].title;
    const page_type = pageResult[0].type;

    const newIndices = chunks.map((c) => c.chunk_index);

    // Delete chunks that no longer exist
    if (newIndices.length > 0) {
      await this.mappers.deleteContentChunksNotIn(page_id, newIndices);
      await this.mappers.deleteFtsChunksNotIn(page_id, newIndices);
    } else {
      await this.deleteChunks(slug);
      return;
    }

    if (chunks.length > 0) {
      // Upsert into content_chunks (real data)
      for (const chunk of chunks) {
        await this.mappers.upsertContentChunk(page_id, chunk);
      }

      // FTS5 doesn't support UPSERT, so delete and insert
      await this.mappers.deleteFtsByPageId(page_id);
      await this.mappers.insertFtsChunks(
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
    const pageResult = await this.mappers.getPageIdBySlug(slug);
    if (pageResult.length === 0) return;
    const page_id = pageResult[0].id;

    // Delete from FTS5
    await this.mappers.deleteFtsByPageId(page_id);

    // Delete from real table
    await this.mappers.deleteContentChunksByPageId(page_id);

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
    const fromPage = await this.mappers.getPageIdBySlug(fromSlug);
    const toPage = await this.mappers.getPageIdBySlug(toSlug);

    if (fromPage.length === 0 || toPage.length === 0) return;

    await this.mappers.insertLink({
      from_page_id: fromPage[0].id,
      to_page_id: toPage[0].id,
      link_type: linkType,
      context,
    });
  }

  async removeLink(fromSlug: string, toSlug: string): Promise<void> {
    const fromPage = await this.mappers.getPageIdBySlug(fromSlug);
    const toPage = await this.mappers.getPageIdBySlug(toSlug);

    if (fromPage.length === 0 || toPage.length === 0) return;

    await this.mappers.deleteLink(fromPage[0].id, toPage[0].id);
  }

  async getOutgoingLinks(slug: string): Promise<Link[]> {
    const result = await this.mappers.getOutgoingLinksBySlug(slug);

    return result.map((r) => ({
      from_slug: slug,
      to_slug: r.to_slug,
      link_type: r.link_type || "",
      context: r.context || "",
    }));
  }

  async getBacklinks(slug: string): Promise<Link[]> {
    const rows = await this.mappers.getBacklinksBySlug(slug);

    return rows.map((r) => ({
      from_slug: r.from_slug,
      to_slug: r.to_slug,
      link_type: r.link_type || "",
      context: r.context || "",
    }));
  }

  async getLinks(slug: string): Promise<Link[]> {
    const outgoing = await this.mappers.getLinksOutgoingBySlug(slug);

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
      const pageResult = await this.mappers.getPageIdBySlug(slug);
      if (pageResult.length === 0) return; // skip
      page_id = pageResult[0].id;
    } else {
      const pageResult = await this.mappers.getPageIdBySlug(slug);
      if (pageResult.length === 0)
        throw new Error(`addTimelineEntry failed: page "${slug}" not found`);
      page_id = pageResult[0].id;
    }

    await this.mappers.insertTimelineEntry(page_id, entry);
  }

  async addTimelineEntriesBatch(
    entries: TimelineBatchInput[]
  ): Promise<number> {
    if (entries.length === 0) return 0;
    let count = 0;
    for (const entry of entries) {
      const pageResult = await this.mappers.getPageIdBySlug(entry.slug);
      if (pageResult.length === 0) continue;

      const res = await this.mappers.insertTimelineEntryReturningId(
        pageResult[0].id,
        entry
      );

      if (res.length > 0) count++;
    }
    return count;
  }

  async getTimeline(
    slug: string,
    opts?: TimelineOpts
  ): Promise<TimelineEntry[]> {
    const result = await this.mappers.getTimeline(slug, opts).execute();
    return result.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    }));
  }

  // --- Raw Data Management ---
  async putRawData(slug: string, source: string, data: any): Promise<void> {
    const pageResult = await this.mappers.getPageIdBySlug(slug);
    if (pageResult.length === 0) return;

    await this.mappers.upsertRawData(
      pageResult[0].id,
      source,
      JSON.stringify(data)
    );
  }

  async getRawData(slug: string, source?: string): Promise<RawData[]> {
    const result = await this.mappers.getRawData(slug, source).execute();

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
      const pageResult = await this.mappers.getPageIdBySlug(file.page_slug);
      if (pageResult.length > 0) {
        page_id = pageResult[0].id;
      }
    }

    await this.mappers.upsertFile({
      page_id,
      filename: file.filename,
      storage_path: file.storage_path,
      mime_type: file.mime_type ?? null,
      size_bytes: file.size_bytes ?? null,
      content_hash: file.content_hash,
      metadata: JSON.stringify(file.metadata),
    });
  }

  async getFile(storagePath: string): Promise<FileRecord | null> {
    const result = await this.mappers.getFileByStoragePath(storagePath);

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
    const result = await this.mappers.getConfigByKey(key);

    return result.length > 0 ? result[0].value : null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    await this.mappers.upsertConfig(key, value);
  }

  async logIngest(log: IngestLogInput): Promise<void> {
    await this.mappers.insertIngestLog(log);
  }

  async getIngestLog(opts?: { limit?: number }): Promise<IngestLogEntry[]> {
    const limit = opts?.limit ?? 50;
    const result = await this.mappers.getIngestLog(limit);

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
    await this.mappers.updateSlug(oldSlug, newSlug);
  }

  async rewriteLinks(oldSlug: string, newSlug: string): Promise<void> {
    // SQLite doesn't strictly need to rewrite foreign keys because they use page_id.
    // But text compiled_truth might contain [[oldSlug]] which could be updated,
    // though postgres-engine.ts stubs this out and says it's done by maintain skill.
    // We will just stub it like postgres-engine.ts.
  }

  async verifyAccessToken(tokenHash: string): Promise<AccessToken | null> {
    const result = await this.mappers.getValidAccessTokenByHash(tokenHash);

    if (result.length === 0) return null;

    // Update last_used_at
    await this.mappers.updateAccessTokenLastUsedAt(result[0].id);

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
    await this.mappers.insertMcpRequestLog(log);
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
        try {
          await Bun.file(this.db.filename).unlink();
        } catch (error: any) {
          if (error?.code !== "ENOENT") throw error;
        }
        try {
          await Bun.file(this.vectorUrl.replace("file:", "")).unlink();
        } catch (error: any) {
          if (error?.code !== "ENOENT") throw error;
        }
        break;
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? (error as any).code
            : undefined;
        if (i < 100) await Bun.sleep(20);
        else if (code === "EBUSY" || code === "EPERM") break;
        else console.warn(error instanceof Error ? error.message : error);
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
    await this.mappers.markChunksEmbeddedByIds(chunkIds);
  }

  async getStats(): Promise<BrainStats> {
    const [
      page_count,
      chunk_count,
      embedded_count,
      link_count,
      timeline_entry_count,
      tagCountRow,
      types,
    ] = await Promise.all([
      this.mappers.countPages(),
      this.mappers.countContentChunks(),
      this.mappers.countContentChunks(true),
      this.mappers.countLinks(),
      this.mappers.countTimelineEntries(),
      this.mappers.countDistinctTags(),
      this.mappers.getPageTypeCounts(),
    ]);

    const pages_by_type: Record<string, number> = {};
    for (const t of types) {
      pages_by_type[t.type] = t.count;
    }

    return {
      page_count,
      chunk_count,
      embedded_count,
      link_count,
      tag_count: tagCountRow[0]?.count ?? 0,
      timeline_entry_count,
      pages_by_type,
    };
  }

  async getHealth(): Promise<BrainHealth> {
    const [
      pageCount,
      chunkCount,
      embeddedCount,
      stalePagesRow,
      orphanPagesRow,
      deadLinksRow,
      linkCount,
      pagesWithTimelineRow,
      entityCount,
      entityWithLinksRow,
      entityWithTimelineRow,
      mostConnectedRows,
    ] = await Promise.all([
      this.mappers.countPages(),
      this.mappers.countContentChunks(),
      this.mappers.countContentChunks(true),
      this.mappers.countStalePages(),
      this.mappers.countOrphanPages(),
      this.mappers.countDeadLinks(),
      this.mappers.countLinks(),
      this.mappers.countPagesWithTimeline(),
      this.mappers.countEntities(),
      this.mappers.countEntitiesWithLinks(),
      this.mappers.countEntitiesWithTimeline(),
      this.mappers.getMostConnectedPages(),
    ]);

    const stalePages = stalePagesRow[0]?.count ?? 0;
    const orphanPages = orphanPagesRow[0]?.count ?? 0;
    const deadLinks = deadLinksRow[0]?.count ?? 0;
    const pagesWithTimeline = pagesWithTimelineRow[0]?.count ?? 0;
    const entityWithLinks = entityWithLinksRow[0]?.count ?? 0;
    const entityWithTimeline = entityWithTimelineRow[0]?.count ?? 0;

    const missingEmbeddings = chunkCount - embeddedCount;
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
      await this.mappers.countPages();
      report.connectionOk = true;
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
        const rows =
          table === "pages"
            ? await this.mappers.countPages()
            : table === "content_chunks"
              ? await this.mappers.countContentChunks()
              : table === "links"
                ? await this.mappers.countLinks()
                : table === "timeline_entries"
                  ? await this.mappers.countTimelineEntries()
                  : table === "tags"
                    ? await this.mappers.countTags()
                    : await this.mappers.countChunksFts();
        report.tableDetails[table] = { ok: true, rows };
      } catch (e: any) {
        report.tableDetails[table] = { ok: false, error: e.message };
        report.tablesOk = false;
      }
    }

    this.unsafeSql.checkFtsIntegrity();
    try {
      report.ftsOk = true;
    } catch (e: any) {
      report.ftsOk = false;
    }

    try {
      const embedded = await this.mappers.countContentChunks(true);
      const total = await this.mappers.countContentChunks();
      report.vectorCoverage = { total, embedded };
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
    const rows = await this.mappers.getStaleChunks();
    return rows as StaleChunk[];
  }

  async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
    if (this._inTransaction) {
      return fn(this); // already in transaction
    }
    // Start transaction
    try {
      this.db.run("BEGIN TRANSACTION");
      const txStore = new LibSQLStore({
        url: this.url,
        authToken: this.authToken,
        dimension: this.dimension,
        db: this.db,
        vectorStore: this.vectorStore,
      });
      const result = await fn(txStore);
      this.db.run("COMMIT");
      return result;
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    }
  }

  // Expose vector search and keyword search directly on the store
  async resolveSlugs(partial: string): Promise<string[]> {
    // Try exact match first
    const exact = await this.mappers.resolveSlugExact(partial);

    if (exact) return [exact.slug];

    // Fuzzy match using LIKE
    const fuzzy = await this.mappers.resolveSlugFuzzy(partial);

    return fuzzy.map((r) => r.slug);
  }

  async searchKeyword(
    query: string,
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    const segmentedQuery = extractWordsForSearch(query);
    const rows = await this.mappers
      .searchKeyword(segmentedQuery, opts)
      .execute();

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
    const rows = await this.mappers
      .searchVectorRows(slugs, chunkIndexes, opts)
      .execute();

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
      const rows = this.unsafeSql.queryVectorStoreByIds(ids);
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
    const rows = await this.mappers.getChunksBySlug(slug);

    return rows.map((r) => ({
      ...r,
      chunk_source: r.chunk_source,
      embedding: null,
      model: r.model,
      embedded_at: r.embedded_at ? new Date(r.embedded_at) : null,
    }));
  }

  async getChunksWithEmbeddings(slug: string): Promise<Chunk[]> {
    return this.getChunks(slug); // We don't return raw embeddings here due to vectorStore separation
  }

  async traverseGraph(slug: string, depth: number = 5): Promise<GraphNode[]> {
    try {
      const rows = this.unsafeSql.traverseGraph(slug, depth);
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
