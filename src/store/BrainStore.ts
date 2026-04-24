import type { LibSQLVector } from "@mastra/libsql";
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Schema } from "effect";
import type { SchemaError } from "effect/Schema";
import type { SqlError } from "effect/unstable/sql";
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
import type { StoreError } from "./BrainStoreError.js";

/**
 * `Eff.Effect<T, StoreError>`的别名
 * @description 用于表示数据库操作的 Effect 类型，包含 StoreError 类型的错误
 */
export type EngineEffect<T> = Eff.Effect<T, StoreError>;
export type PutReturning<T> = Eff.Effect<T, SchemaError>;

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
  getPage(slug: string): EngineEffect<Page | null>;
  listPages(filters?: PageFilters): EngineEffect<Page[]>;
  resolveSlugs(partial: string): EngineEffect<string[]>;
  getTags(slug: string): EngineEffect<string[]>;
  // Versions
  createVersion(slug: string): EngineEffect<PutReturning<PageVersion>>;
  getVersions(slug: string): EngineEffect<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): EngineEffect<void>;

  putPage(slug: string, page: PageInput): EngineEffect<PutReturning<Page>>;
  updateSlug(oldSlug: string, newSlug: string): EngineEffect<void>;
  deletePage(slug: string): EngineEffect<void>;

  // Tags
  addTag(slug: string, tag: string): EngineEffect<void>;
  removeTag(slug: string, tag: string): EngineEffect<void>;

  // Chunks
  upsertChunks(slug: string, chunks: ChunkInput[]): EngineEffect<void>;
  deleteChunks(slug: string): EngineEffect<void>;
  getChunks(slug: string): EngineEffect<Chunk[]>;
  getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>;
  getEmbeddingsByChunkIds(
    ids: number[]
  ): EngineEffect<Map<number, Float32Array>>;
}

export interface HybridSearchBackend {
  searchKeyword(query: string, opts?: SearchOpts): EngineEffect<SearchResult[]>;
  searchVector(
    embedding: number[],
    opts?: SearchOpts
  ): EngineEffect<SearchResult[]>;
}

export interface LinkService {
  // Links
  addLink(
    fromSlug: string,
    toSlug: string,
    linkType?: string,
    context?: string
  ): EngineEffect<void>;
  addLinksBatch?(links: LinkBatchInput[]): EngineEffect<number>;
  removeLink(fromSlug: string, toSlug: string): EngineEffect<void>;
  getLinks(slug: string): EngineEffect<Link[]>;
  getBacklinks(slug: string): EngineEffect<Link[]>;
  rewriteLinks(oldSlug: string, newSlug: string): EngineEffect<void>;
  traverseGraph(slug: string, depth?: number): EngineEffect<GraphNode[]>;
  traversePaths?(
    slug: string,
    opts?: {
      depth?: number;
      linkType?: string;
      direction?: "in" | "out" | "both";
    }
  ): EngineEffect<GraphPath[]>;

  /**
   * For a list of slugs, return how many inbound links each has.
   * Used by hybrid search backlink boost. Single SQL query, not N+1.
   * Slugs with zero inbound links are present in the map with value 0.
   */
  getBacklinkCounts(slugs: string[]): EngineEffect<Map<string, number>>;
}
export interface TimelineService {
  // Timeline
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): EngineEffect<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): EngineEffect<number>;
  getTimeline(slug: string, opts?: TimelineOpts): EngineEffect<TimelineEntry[]>;
}
export interface ExtService {
  // Raw Data
  putRawData(slug: string, source: string, data: any): EngineEffect<void>;
  getRawData(slug: string, source?: string): EngineEffect<RawData[]>;

  // Files
  upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): EngineEffect<void>;
  getFile(storagePath: string): EngineEffect<FileRecord | null>;

  // Config & Logs
  getConfig(key: string): EngineEffect<string | null>;
  setConfig(key: string, value: string): EngineEffect<void>;
  logIngest(log: IngestLogInput): EngineEffect<void>;
  verifyAccessToken(tokenHash: string): EngineEffect<AccessToken | null>;
  logMcpRequest(
    log: Omit<McpRequestLog, "id" | "created_at">
  ): EngineEffect<void>;

  // Health and Maintenance Methods
  getHealthReport(): EngineEffect<DatabaseHealth>;
  getStats(): EngineEffect<BrainStats>;
  getHealth(): EngineEffect<BrainHealth>;
  getStaleChunks(): EngineEffect<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: any }[]
  ): EngineEffect<void>;
  markChunksEmbedded(chunkIds: number[]): EngineEffect<void>;
  getIngestLog(opts?: { limit?: number }): EngineEffect<IngestLogEntry[]>;
}
export interface BrainStoreLifecycle {
  init(): EngineEffect<void>;
  dispose(): Eff.Effect<void>;
  // Transaction
  transaction<T, E = never, R extends BrainStore = BrainStore>(
    fn: Eff.Effect<T, E, R>
  ): Eff.Effect<
    T,
    StoreError | Exclude<E, SqlError.SqlError | Schema.SchemaError>,
    R
  >;
}

export interface EmbeddingService {
  embedQuery(text: string): EngineEffect<number[]>;
  embedBatch(texts: string[]): EngineEffect<number[][]>;
  readonly dimension: number;
}

export interface UnsafeDBService {
  query<T>(text: string, params?: ReadonlyArray<unknown>): EngineEffect<T[]>;
  get<T>(text: string, params?: ReadonlyArray<unknown>): EngineEffect<T>;
  run(text: string, params?: ReadonlyArray<unknown>): EngineEffect<void>;
}

export interface BrainStoreService
  extends LinkService,
    IngestionStore,
    HybridSearchBackend,
    TimelineService,
    ExtService,
    BrainStoreLifecycle,
    UnsafeDBService {}

export declare namespace BrainStore {
  export type Service = BrainStoreService;
  export type Link = LinkService;
  export type Ingestion = IngestionStore;
  export type HybridSearch = HybridSearchBackend;
  export type Timeline = TimelineService;
  export type Ext = ExtService;
  export type Lifecycle = BrainStoreLifecycle;
  export type UnsafeDB = UnsafeDBService;
  export type Options = {
    vectorUrl?: string;
    authToken?: string;
    dimension?: number;
    vectorStore?: LibSQLVector;
  };
}
export class BrainStore extends Context.Service<
  BrainStore,
  BrainStore.Service
>()("@yui-agent/brain-mastra/BrainStore") {}
