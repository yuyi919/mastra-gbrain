import * as Eff from "@tslibs/effect/effect-next";
import { Context } from "effect";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  Chunk,
  ChunkInput,
  DatabaseHealth,
  FileRecord,
  GraphNode,
  GraphPath,
  IngestLogEntry,
  IngestLogInput,
  Link,
  McpRequestLog,
  Page,
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
} from "../types.js";

export interface LinkBatchInput {
  from_slug: string;
  to_slug: string;
  link_type?: string;
  context?: string;
}

export interface TimelineBatchInput {
  slug: string;
  date: string;
  source?: string;
  summary: string;
  detail?: string;
}

export interface IngestionStore {
  // Core content
  getPage(slug: string): Eff.Effect<Page | null>;
  listPages(filters?: PageFilters): Eff.Effect<Page[]>;
  resolveSlugs(partial: string): Eff.Effect<string[]>;
  getTags(slug: string): Eff.Effect<string[]>;
  // Versions
  createVersion(slug: string): Eff.Effect<PageVersion>;
  getVersions(slug: string): Eff.Effect<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): Eff.Effect<void>;

  putPage(slug: string, page: PageInput): Eff.Effect<Page>;
  deletePage(slug: string): Eff.Effect<void>;

  // Tags
  addTag(slug: string, tag: string): Eff.Effect<void>;
  removeTag(slug: string, tag: string): Eff.Effect<void>;

  // Chunks
  upsertChunks(slug: string, chunks: ChunkInput[]): Eff.Effect<void>;
  deleteChunks(slug: string): Eff.Effect<void>;
  getChunks(slug: string): Eff.Effect<Chunk[]>;
  getChunksWithEmbeddings(slug: string): Eff.Effect<Chunk[]>;
  getEmbeddingsByChunkIds(ids: number[]): Eff.Effect<Map<number, Float32Array>>;

  // Transaction
  transaction?<T>(fn: (tx: BrainStoreService) => Eff.Effect<T>): Eff.Effect<T>;
}

export interface HybridSearchBackend {
  searchKeyword(query: string, opts?: SearchOpts): Eff.Effect<SearchResult[]>;
  searchVector(
    embedding: number[],
    opts?: SearchOpts
  ): Eff.Effect<SearchResult[]>;
}

export interface EmbeddingService {
  embedQuery(text: string): Eff.Effect<number[]>;
  embedBatch(texts: string[]): Eff.Effect<number[][]>;
  readonly dimension: number;
}

export interface BrainStoreService extends IngestionStore, HybridSearchBackend {
  // Links
  addLink(
    fromSlug: string,
    toSlug: string,
    linkType?: string,
    context?: string
  ): Eff.Effect<void>;
  addLinksBatch?(links: LinkBatchInput[]): Eff.Effect<number>;
  removeLink(fromSlug: string, toSlug: string): Eff.Effect<void>;
  getLinks(slug: string): Eff.Effect<Link[]>;
  getBacklinks(slug: string): Eff.Effect<Link[]>;
  traverseGraph(slug: string, depth?: number): Eff.Effect<GraphNode[]>;
  traversePaths?(
    slug: string,
    opts?: {
      depth?: number;
      linkType?: string;
      direction?: "in" | "out" | "both";
    }
  ): Eff.Effect<GraphPath[]>;
  getBacklinkCounts?(slugs: string[]): Eff.Effect<Map<string, number>>;

  // Timeline
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): Eff.Effect<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): Eff.Effect<number>;
  getTimeline(slug: string, opts?: TimelineOpts): Eff.Effect<TimelineEntry[]>;

  // Raw Data
  putRawData(slug: string, source: string, data: any): Eff.Effect<void>;
  getRawData(slug: string, source?: string): Eff.Effect<RawData[]>;

  // Files
  upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): Eff.Effect<void>;
  getFile(storagePath: string): Eff.Effect<FileRecord | null>;

  // Config & Logs
  getConfig(key: string): Eff.Effect<string | null>;
  setConfig(key: string, value: string): Eff.Effect<void>;
  logIngest(log: IngestLogInput): Eff.Effect<void>;
  verifyAccessToken(tokenHash: string): Eff.Effect<AccessToken | null>;
  logMcpRequest(
    log: Omit<McpRequestLog, "id" | "created_at">
  ): Eff.Effect<void>;

  // Lifecycle
  init(): Eff.Effect<void>;
  dispose(): Eff.Effect<void>;

  // Health and Maintenance Methods
  getHealthReport(): Eff.Effect<DatabaseHealth>;
  getStats(): Eff.Effect<BrainStats>;
  getHealth(): Eff.Effect<BrainHealth>;
  getStaleChunks(): Eff.Effect<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: any }[]
  ): Eff.Effect<void>;
  markChunksEmbedded(chunkIds: number[]): Eff.Effect<void>;
  getIngestLog(opts?: { limit?: number }): Eff.Effect<IngestLogEntry[]>;
  updateSlug(oldSlug: string, newSlug: string): Eff.Effect<void>;
  rewriteLinks(oldSlug: string, newSlug: string): Eff.Effect<void>;
}

export class BrainStore extends Context.Service<
  BrainStore,
  BrainStoreService
>()("BrainStore", {
  make: Eff.gen(function* () {
    const store: BrainStoreService = {
      addLink: Eff.fn(function* (
        fromSlug: string,
        toSlug: string,
        linkType?: string,
        context?: string
      ) {
        throw new Error("Function not implemented.");
      }),
      removeLink: Eff.fn(function* (fromSlug: string, toSlug: string) {
        throw new Error("Function not implemented.");
      }),
      getLinks: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      getBacklinks: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      traverseGraph: Eff.fn(function* (slug: string, depth?: number) {
        throw new Error("Function not implemented.");
      }),
      addTimelineEntry: Eff.fn(function* (
        slug: string,
        entry: TimelineInput,
        opts?: { skipExistenceCheck?: boolean }
      ) {
        throw new Error("Function not implemented.");
      }),
      addTimelineEntriesBatch: Eff.fn(function* (
        entries: TimelineBatchInput[]
      ) {
        throw new Error("Function not implemented.");
      }),
      getTimeline: Eff.fn(function* (slug: string, opts?: TimelineOpts) {
        throw new Error("Function not implemented.");
      }),
      putRawData: Eff.fn(function* (slug: string, source: string, data: any) {
        throw new Error("Function not implemented.");
      }),
      getRawData: Eff.fn(function* (slug: string, source?: string) {
        throw new Error("Function not implemented.");
      }),
      upsertFile: Eff.fn(function* (
        file: Omit<FileRecord, "id" | "page_id" | "created_at">
      ) {
        throw new Error("Function not implemented.");
      }),
      getFile: Eff.fn(function* (storagePath: string) {
        throw new Error("Function not implemented.");
      }),
      getConfig: Eff.fn(function* (key: string) {
        throw new Error("Function not implemented.");
      }),
      setConfig: Eff.fn(function* (key: string, value: string) {
        throw new Error("Function not implemented.");
      }),
      logIngest: Eff.fn(function* (log: IngestLogInput) {
        throw new Error("Function not implemented.");
      }),
      verifyAccessToken: Eff.fn(function* (tokenHash: string) {
        throw new Error("Function not implemented.");
      }),
      logMcpRequest: Eff.fn(function* (
        log: Omit<McpRequestLog, "id" | "created_at">
      ) {
        throw new Error("Function not implemented.");
      }),
      init: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      dispose: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      getHealthReport: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      getStats: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      getHealth: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      getStaleChunks: Eff.fn(function* () {
        throw new Error("Function not implemented.");
      }),
      upsertVectors: Eff.fn(function* (
        vectors: { id: string; vector: number[]; metadata: any }[]
      ) {
        throw new Error("Function not implemented.");
      }),
      markChunksEmbedded: Eff.fn(function* (chunkIds: number[]) {
        throw new Error("Function not implemented.");
      }),
      getIngestLog: Eff.fn(function* (opts?: { limit?: number }) {
        throw new Error("Function not implemented.");
      }),
      updateSlug: Eff.fn(function* (oldSlug: string, newSlug: string) {
        throw new Error("Function not implemented.");
      }),
      rewriteLinks: Eff.fn(function* (oldSlug: string, newSlug: string) {
        throw new Error("Function not implemented.");
      }),
      getPage: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      listPages: Eff.fn(function* (filters?: PageFilters) {
        throw new Error("Function not implemented.");
      }),
      resolveSlugs: Eff.fn(function* (partial: string) {
        throw new Error("Function not implemented.");
      }),
      getTags: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      createVersion: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      getVersions: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      revertToVersion: Eff.fn(function* (slug: string, versionId: number) {
        throw new Error("Function not implemented.");
      }),
      putPage: Eff.fn(function* (slug: string, page: PageInput) {
        throw new Error("Function not implemented.");
      }),
      deletePage: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      addTag: Eff.fn(function* (slug: string, tag: string) {
        throw new Error("Function not implemented.");
      }),
      removeTag: Eff.fn(function* (slug: string, tag: string) {
        throw new Error("Function not implemented.");
      }),
      upsertChunks: Eff.fn(function* (slug: string, chunks: ChunkInput[]) {
        throw new Error("Function not implemented.");
      }),
      deleteChunks: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      getChunks: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      getChunksWithEmbeddings: Eff.fn(function* (slug: string) {
        throw new Error("Function not implemented.");
      }),
      getEmbeddingsByChunkIds: Eff.fn(function* (ids: number[]) {
        throw new Error("Function not implemented.");
      }),
      searchKeyword: Eff.fn(function* (query: string, opts?: SearchOpts) {
        throw new Error("Function not implemented.");
      }),
      searchVector: Eff.fn(function* (embedding: number[], opts?: SearchOpts) {
        throw new Error("Function not implemented.");
      }),
    };
    return store;
  }),
}) {}
