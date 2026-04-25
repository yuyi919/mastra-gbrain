import type { ManagedRuntime } from "effect";
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
  VectorMetadata,
} from "../types.js";
import type { BrainStoreRuntime } from "./BrainStore.js";

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
  getPage(slug: string): Promise<Page | null>;
  listPages(filters?: PageFilters): Promise<Page[]>;
  resolveSlugs(partial: string): Promise<string[]>;
  getTags(slug: string): Promise<string[]>;
  // Versions
  createVersion(slug: string): Promise<PageVersion>;
  getVersions(slug: string): Promise<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): Promise<void>;

  putPage(slug: string, page: PageInput): Promise<Page>;
  deletePage(slug: string): Promise<void>;

  // Tags
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;

  // Chunks
  upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>;
  deleteChunks(slug: string): Promise<void>;
  getChunks(slug: string): Promise<Chunk[]>;
  getChunksWithEmbeddings(slug: string): Promise<Chunk[]>;
  getEmbeddingsByChunkIds(ids: number[]): Promise<Map<number, Float32Array>>;

  // Transaction
  transaction?<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T>;
}

export interface HybridSearchBackend {
  searchKeyword(query: string, opts?: SearchOpts): Promise<SearchResult[]>;
  searchVector(embedding: number[], opts?: SearchOpts): Promise<SearchResult[]>;
}

export interface EmbeddingProvider {
  embedQuery(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  readonly dimension: number;
}

export interface StoreProvider extends IngestionStore, HybridSearchBackend {
  // Effect
  brainStore: ManagedRuntime.ManagedRuntime<BrainStoreRuntime, never>;

  // Links
  addLink(
    fromSlug: string,
    toSlug: string,
    linkType?: string,
    context?: string
  ): Promise<void>;
  addLinksBatch?(links: LinkBatchInput[]): Promise<number>;
  removeLink(fromSlug: string, toSlug: string): Promise<void>;
  getLinks(slug: string): Promise<Link[]>;
  getBacklinks(slug: string): Promise<Link[]>;
  traverseGraph(slug: string, depth?: number): Promise<GraphNode[]>;
  traversePaths?(
    slug: string,
    opts?: {
      depth?: number;
      linkType?: string;
      direction?: "in" | "out" | "both";
    }
  ): Promise<GraphPath[]>;
  getBacklinkCounts?(slugs: string[]): Promise<Map<string, number>>;

  // Timeline
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): Promise<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): Promise<number>;
  getTimeline(slug: string, opts?: TimelineOpts): Promise<TimelineEntry[]>;

  // Raw Data
  putRawData(slug: string, source: string, data: any): Promise<void>;
  getRawData(slug: string, source?: string): Promise<RawData[]>;

  // Files
  upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): Promise<void>;
  getFile(storagePath: string): Promise<FileRecord | null>;

  // Config & Logs
  getConfig(key: string): Promise<string | null>;
  setConfig(key: string, value: string): Promise<void>;
  logIngest(log: IngestLogInput): Promise<void>;
  verifyAccessToken(tokenHash: string): Promise<AccessToken | null>;
  logMcpRequest(log: Omit<McpRequestLog, "id" | "created_at">): Promise<void>;

  // Lifecycle
  init(): Promise<void>;
  dispose(): Promise<void>;

  // Health and Maintenance Methods
  getHealthReport(): Promise<DatabaseHealth>;
  getStats(): Promise<BrainStats>;
  getHealth(): Promise<BrainHealth>;
  getStaleChunks(): Promise<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): Promise<void>;
  markChunksEmbedded(chunkIds: number[]): Promise<void>;
  getIngestLog(opts?: { limit?: number }): Promise<IngestLogEntry[]>;
  updateSlug(oldSlug: string, newSlug: string): Promise<void>;
  rewriteLinks(oldSlug: string, newSlug: string): Promise<void>;
}
