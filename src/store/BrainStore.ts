import type { LibSQLVector } from "@mastra/libsql";
import type * as Eff from "@tslibs/effect/effect-next";
import { Context } from "@tslibs/effect/effect-next";
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
  getPage(slug: string): Eff.Effect<Page | null, StoreError>;
  listPages(filters?: PageFilters): Eff.Effect<Page[], StoreError>;
  resolveSlugs(partial: string): Eff.Effect<string[]>;
  getTags(slug: string): Eff.Effect<string[]>;
  // Versions
  createVersion(slug: string): Eff.Effect<PageVersion>;
  getVersions(slug: string): Eff.Effect<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): Eff.Effect<void>;

  putPage(slug: string, page: PageInput): Eff.Effect<Page>;
  updateSlug(oldSlug: string, newSlug: string): Eff.Effect<void, StoreError>;
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

export interface LinkService {
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
  rewriteLinks(oldSlug: string, newSlug: string): Eff.Effect<void>;
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
}
export interface TimelineService {
  // Timeline
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): Eff.Effect<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): Eff.Effect<number>;
  getTimeline(slug: string, opts?: TimelineOpts): Eff.Effect<TimelineEntry[]>;
}
export interface ExtService {
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
}
export interface BrainStoreService
  extends LinkService,
    IngestionStore,
    HybridSearchBackend,
    TimelineService,
    ExtService {}

export declare namespace BrainStore {
  export type Service = BrainStoreService;
  export type Link = LinkService;
  export type Ingestion = IngestionStore;
  export type HybridSearch = HybridSearchBackend;
  export type Timeline = TimelineService;
  export type Ext = ExtService;
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
