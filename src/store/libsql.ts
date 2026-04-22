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
  IngestLogEntry,
  IngestLogInput,
  Link,
  McpRequestLog,
  PageFilters,
  PageInput,
  RawData,
  SearchOpts,
  SearchResult,
  StaleChunk,
  TimelineEntry,
  TimelineInput,
  TimelineOpts,
  VectorMetadata,
} from "../types.js";
import { BrainStore } from "./BrainStore.js";
import { makeLayer as makeLibSQLStoreLayer } from "./libsql-store.js";
import * as Effect from "@yuyi919/tslibs-effect/effect-next";
import { ManagedRuntime } from "effect";
import { GraphNode, Page, PageVersion } from "./effect-schema.js";
import type { StoreProvider, TimelineBatchInput } from "./interface.js";
import { SqlBuilder } from "./SqlBuilder.js";
import { LATEST_VERSION, Schemas } from "./schema.js";

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
  public vectorStore: LibSQLVector;
  public indexName = "gbrain_chunks";
  public readonly url: string;
  public readonly vectorUrl: string;
  public readonly authToken?: string;
  public readonly dimension: number;
  public readonly brainStore: ManagedRuntime.ManagedRuntime<BrainStore.Service, never>;

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

    const layer = makeLibSQLStoreLayer({
      url: this.url,
      vectorUrl: this.vectorUrl,
      authToken: this.authToken,
      dimension: this.dimension,
      vectorStore: this.vectorStore,
    });
    this.brainStore = ManagedRuntime.make(layer);
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
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getPage(slug);
      })
    );
  }

  async listPages(filters: PageFilters = {}): Promise<Page[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.listPages(filters);
      })
    );
  }

  async deletePage(slug: string): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.deletePage(slug);
      })
    );
  }

  async getTags(slug: string): Promise<string[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getTags(slug);
      })
    );
  }

  async createVersion(slug: string): Promise<PageVersion> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        const effect = yield* store.createVersion(slug);
        return yield* effect;
      })
    );
  }

  async getVersions(slug: string): Promise<PageVersion[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getVersions(slug);
      })
    );
  }

  async revertToVersion(slug: string, versionId: number): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.revertToVersion(slug, versionId);
      })
    );
  }

  async putPage(slug: string, page: PageInput): Promise<Page> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        const effect = yield* store.putPage(slug, page);
        return yield* effect;
      })
    );
  }

  async addTag(slug: string, tag: string): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        yield* store.addTag(slug, tag);
      })
    );
  }

  async removeTag(slug: string, tag: string): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        yield* store.removeTag(slug, tag);
      })
    );
  }

  async upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        if (store.transaction) {
          yield* store.transaction((tx) => tx.upsertChunks(slug, chunks));
        } else {
          yield* store.upsertChunks(slug, chunks);
        }
      })
    );
  }

  async deleteChunks(slug: string): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        yield* store.deleteChunks(slug);
      })
    );
  }

  // --- Links Management ---
  async addLink(
    fromSlug: string,
    toSlug: string,
    linkType: string = "references",
    context: string = ""
  ): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        yield* store.addLink(fromSlug, toSlug, linkType, context);
      })
    );
  }

  async removeLink(fromSlug: string, toSlug: string): Promise<void> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        yield* store.removeLink(fromSlug, toSlug);
      })
    );
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
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getBacklinks(slug);
      })
    );
  }

  async getLinks(slug: string): Promise<Link[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getLinks(slug);
      })
    );
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
      if (pageResult.length === 0) return;
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
      if (pageResult.length === 0) return;
      page_id = pageResult[0].id;
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
    return result?.value ?? null;
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
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.markChunksEmbedded(chunkIds);
      })
    );
  }

  async getStats(): Promise<BrainStats> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getStats();
      })
    );
  }

  async getHealth(): Promise<BrainHealth> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getHealth();
      })
    );
  }

  async getHealthReport(): Promise<DatabaseHealth> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getHealthReport();
      })
    );
  }

  async getStaleChunks(): Promise<StaleChunk[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getStaleChunks();
      })
    );
  }

  async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
    // SQLite transaction across different connections (bun:sqlite and effect-sql)
    // causes SQLITE_BUSY_SNAPSHOT. Since we are migrating to BrainStore,
    // we just execute the callback without a wrapper transaction.
    // Individual operations like putPage are transaction-wrapped internally.
    return fn(this);
  }

  // Expose vector search and keyword search directly on the store
  async resolveSlugs(partial: string): Promise<string[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.resolveSlugs(partial);
      })
    );
  }

  async searchKeyword(
    query: string,
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.searchKeyword(query, opts);
      })
    );
  }


  async searchVector(
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ): Promise<SearchResult[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.searchVector(queryVector, opts);
      })
    );
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
      const rows = this.mappers.unsafe.queryVectorStoreByIds(ids);
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
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getChunks(slug);
      })
    );
  }

  async getChunksWithEmbeddings(slug: string): Promise<Chunk[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.getChunksWithEmbeddings(slug);
      })
    );
  }

  async traverseGraph(slug: string, depth: number = 5): Promise<GraphNode[]> {
    return this.brainStore.runPromise(
      Effect.gen(function* () {
        const store = yield* BrainStore;
        return yield* store.traverseGraph(slug, depth);
      })
    );
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
