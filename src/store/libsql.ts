import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { LibSQLVector } from "@mastra/libsql";
import * as Effect from "@yuyi919/tslibs-effect/effect-next";
import { ManagedRuntime } from "effect";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  Chunk,
  ChunkInput,
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
import { BrainStore, type BrainStoreRuntime } from "./BrainStore.js";
import type { GraphNode, Page, PageVersion } from "./effect-schema.js";
import type { StoreProvider, TimelineBatchInput } from "./interface.js";
import { makeLayer as makeLibSQLStoreLayer } from "./libsql-store.js";

export interface LibSQLStoreOptions {
  url: string;
  vectorUrl?: string;
  authToken?: string;
  dimension?: number;
  // db?: Database;
  vectorStore?: LibSQLVector;
}

export class LibSQLStore implements StoreProvider {
  /**
   * @deprecated
   */
  public db: unknown = void 0;
  public vectorStore!: LibSQLVector;
  public indexName = "gbrain_chunks";
  public readonly url: string;
  public readonly vectorUrl: string;
  public readonly authToken?: string;
  public readonly dimension: number;
  public _brainStore:
    | ManagedRuntime.ManagedRuntime<BrainStoreRuntime, never>
    | undefined = undefined;

  get brainStore(): ManagedRuntime.ManagedRuntime<BrainStoreRuntime, never> {
    if (!this._brainStore) {
      if (this.options.vectorStore) {
        this.vectorStore = this.options.vectorStore;
      } else {
        const filename = this.url.replace(/^file:/, "");
        if (
          filename !== ":memory:" &&
          filename !== "" &&
          !isAbsolute(filename)
        ) {
          const dir = dirname(filename);
          if (dir !== "." && dir !== "") {
            mkdirSync(dir, { recursive: true });
          }
        }
        this.vectorStore = new LibSQLVector({
          id: "gbrain",
          url: this.vectorUrl,
          authToken: this.authToken,
        });
      }

      const layer = makeLibSQLStoreLayer({
        url: this.url,
        vectorUrl: this.vectorUrl,
        authToken: this.authToken,
        dimension: this.dimension,
        vectorStore: this.vectorStore,
      });
      this._brainStore = ManagedRuntime.make(layer);
    }
    return this._brainStore!;
  }

  constructor(private options: LibSQLStoreOptions) {
    this.url = options.url;
    this.vectorUrl = options.vectorUrl ?? this.url.replace(".db", "-vector.db");
    this.authToken = options.authToken;
    this.dimension = options.dimension ?? 1536; // Default to OpenAI dimension
  }

  exec(sql: string, ...params: unknown[]) {
    return this.run((store) => store.run(sql, params));
  }

  get<A>(sql: string, ...params: unknown[]) {
    return this.run((store) => store.get<A>(sql, params));
  }

  query<A>(sql: string, ...params: unknown[]) {
    return this.run((store) => store.query<A>(sql, params));
  }

  async runFlatten<
    A,
    E = never,
    E2 = never,
    R extends BrainStoreRuntime = never,
  >(
    fn: (
      store: BrainStore.Service
    ) => Effect.Effect<Effect.Effect<A, E2, R>, E, BrainStore>
  ): Promise<A> {
    return this.brainStore.runPromise(
      BrainStore.use((store) => fn(store).pipe(Effect.flatten))
    );
  }

  async run<A, E = never>(
    fn: (store: BrainStore.Service) => Effect.Effect<A, E, BrainStore>
  ): Promise<A> {
    return this.brainStore.runPromise(BrainStore.use(fn));
  }

  async init() {
    await this.run((_) => _.init());
  }

  async getPage(slug: string): Promise<Page | null> {
    return this.run((store) => store.getPage(slug));
  }

  async listPages(filters: PageFilters = {}): Promise<Page[]> {
    return this.run((store) => store.listPages(filters));
  }

  async deletePage(slug: string): Promise<void> {
    return this.run((store) => store.deletePage(slug));
  }

  async getTags(slug: string): Promise<string[]> {
    return this.run((store) => store.getTags(slug));
  }

  async createVersion(slug: string): Promise<PageVersion> {
    return this.runFlatten((store) => store.createVersion(slug));
  }

  async getVersions(slug: string): Promise<PageVersion[]> {
    return this.run((store) => store.getVersions(slug));
  }

  async revertToVersion(slug: string, versionId: number): Promise<void> {
    return this.run((store) => store.revertToVersion(slug, versionId));
  }

  async putPage(slug: string, page: PageInput): Promise<Page> {
    return this.runFlatten((store) => store.putPage(slug, page));
  }

  async addTag(slug: string, tag: string): Promise<void> {
    return this.run((store) => store.addTag(slug, tag));
  }

  async removeTag(slug: string, tag: string): Promise<void> {
    return this.run((store) => store.removeTag(slug, tag));
  }

  async upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void> {
    return this.run((store) =>
      store.transaction(store.upsertChunks(slug, chunks))
    );
  }

  async deleteChunks(slug: string): Promise<void> {
    return this.run((store) => store.deleteChunks(slug));
  }

  // --- Links Management ---
  async addLink(
    fromSlug: string,
    toSlug: string,
    linkType: string = "references",
    context: string = ""
  ): Promise<void> {
    return this.run((store) =>
      store.addLink(fromSlug, toSlug, linkType, context)
    );
  }

  async removeLink(fromSlug: string, toSlug: string): Promise<void> {
    return this.run((store) => store.removeLink(fromSlug, toSlug));
  }

  async getOutgoingLinks(slug: string): Promise<Link[]> {
    const links = await this.run((store) => store.getLinks(slug));
    const unique = new Map<string, Link>();
    for (const link of links) {
      if (link.from_slug !== slug) continue;
      unique.set(
        `${link.from_slug}|${link.to_slug}|${link.link_type}|${link.context}`,
        link
      );
    }
    return [...unique.values()];
  }

  async getBacklinks(slug: string): Promise<Link[]> {
    return this.run((store) => store.getBacklinks(slug));
  }

  async getLinks(slug: string): Promise<Link[]> {
    return this.run((store) => store.getLinks(slug));
  }

  // --- Timeline Management ---
  async addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): Promise<void> {
    return this.run((store) => store.addTimelineEntry(slug, entry, opts));
  }

  async addTimelineEntriesBatch(
    entries: TimelineBatchInput[]
  ): Promise<number> {
    return this.run((store) => store.addTimelineEntriesBatch(entries));
  }

  async getTimeline(
    slug: string,
    opts?: TimelineOpts
  ): Promise<TimelineEntry[]> {
    return this.run((store) => store.getTimeline(slug, opts));
  }

  // --- Raw Data Management ---
  async putRawData(slug: string, source: string, data: any): Promise<void> {
    return this.run((store) => store.putRawData(slug, source, data));
  }

  async getRawData(slug: string, source?: string): Promise<RawData[]> {
    return this.run((store) => store.getRawData(slug, source));
  }

  // --- Files Management ---
  async upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): Promise<void> {
    return this.run((store) => store.upsertFile(file));
  }

  async getFile(storagePath: string): Promise<FileRecord | null> {
    return this.run((store) => store.getFile(storagePath));
  }

  // --- Config & Logs Management ---
  async getConfig(key: string): Promise<string | null> {
    return this.run((store) => store.getConfig(key));
  }

  async setConfig(key: string, value: string): Promise<void> {
    return this.run((store) => store.setConfig(key, value));
  }

  async logIngest(log: IngestLogInput): Promise<void> {
    return this.run((store) => store.logIngest(log));
  }

  async getIngestLog(opts?: { limit?: number }): Promise<IngestLogEntry[]> {
    return this.run((store) => store.getIngestLog(opts));
  }

  async updateSlug(oldSlug: string, newSlug: string): Promise<void> {
    return this.run((store) => store.updateSlug(oldSlug, newSlug));
  }

  async rewriteLinks(oldSlug: string, newSlug: string): Promise<void> {
    return this.run((store) => store.rewriteLinks(oldSlug, newSlug));
  }

  async verifyAccessToken(tokenHash: string): Promise<AccessToken | null> {
    return this.run((store) => store.verifyAccessToken(tokenHash));
  }

  async logMcpRequest(
    log: Omit<McpRequestLog, "id" | "created_at">
  ): Promise<void> {
    return this.run((store) => store.logMcpRequest(log));
  }

  // --- Lifecycle Management ---
  async dispose(): Promise<void> {
    await this._brainStore?.dispose();
  }

  async cleanVector() {
    await this.vectorStore?.deleteIndex({ indexName: this.indexName });
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
          // await Bun.file(this.db.filename).unlink();
        } catch (error: any) {
          // if (error?.code !== "ENOENT") throw error;
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
    return this.run((store) => store.markChunksEmbedded(chunkIds));
  }

  async getStats(): Promise<BrainStats> {
    return this.run((store) => store.getStats());
  }

  async getHealth(): Promise<BrainHealth> {
    return this.run((store) => store.getHealth());
  }

  async getHealthReport(): Promise<DatabaseHealth> {
    return this.run((store) => store.getHealthReport());
  }

  async getStaleChunks(): Promise<StaleChunk[]> {
    return this.run((store) => store.getStaleChunks());
  }

  async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
    // SQLite transaction across different connections (bun:sqlite and effect-sql)
    // causes SQLITE_BUSY_SNAPSHOT. Since we are migrating to BrainStore,
    // we just execute the callback without a wrapper transaction.
    // Individual operations like putPage are transaction-wrapped internally.
    // return this.run((store) =>
    //   store.transaction(Effect.promise(() => fn(this)))
    // );
    return fn(this);
  }

  // Expose vector search and keyword search directly on the store
  async resolveSlugs(partial: string): Promise<string[]> {
    return this.run((store) => store.resolveSlugs(partial));
  }

  async searchKeyword(
    query: string,
    opts?: SearchOpts
  ): Promise<SearchResult[]> {
    return this.run((store) => store.searchKeyword(query, opts));
  }

  async searchVector(
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ): Promise<SearchResult[]> {
    return this.run((store) => store.searchVector(queryVector, opts));
  }

  async getEmbeddingsByChunkIds(
    ids: number[]
  ): Promise<Map<number, Float32Array>> {
    return this.run((store) => store.getEmbeddingsByChunkIds(ids));
  }

  async getChunks(slug: string): Promise<Chunk[]> {
    return this.run((store) => store.getChunks(slug));
  }

  async getChunksWithEmbeddings(slug: string): Promise<Chunk[]> {
    return this.run((store) => store.getChunksWithEmbeddings(slug));
  }

  async traverseGraph(slug: string, depth: number = 5): Promise<GraphNode[]> {
    return this.run((store) => store.traverseGraph(slug, depth));
  }

  async upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): Promise<void> {
    return this.run((store) => store.upsertVectors(vectors));
  }
}
