import type { 
  ChunkInput, 
  PageRecord, 
  SearchResult,
  LinkRecord,
  TimelineEntry,
  RawDataRecord,
  FileRecord,
  ConfigRecord,
  IngestLog,
  AccessToken,
  McpRequestLog,
  DatabaseHealth,
  StaleChunk
} from '../types.ts';

export interface IngestionStore {
  // Core content
  getPage(slug: string): Promise<{ content_hash: string } | null>;
  getPageContent(slug: string): Promise<PageRecord | null>;
  listPages(options?: { type?: string, tag?: string }): Promise<{ slug: string, title: string, type: string }[]>;
  getTags(slug: string): Promise<string[]>;
  createVersion(slug: string): Promise<void>;
  putPage(slug: string, page: Omit<PageRecord, 'slug' | 'tags'>): Promise<void>;
  deletePage(slug: string): Promise<boolean>;
  
  // Tags
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;
  
  // Chunks
  upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>;
  deleteChunks(slug: string): Promise<void>;
  
  // Transaction
  transaction?<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T>;
}

export interface SearchOpts {
  limit?: number;
  offset?: number;
  type?: string;
  exclude_slugs?: string[];
  detail?: 'low' | 'high';
  dedupe?: boolean; // Return best chunk per page
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
  // Links
  addLink(fromSlug: string, toSlug: string, linkType?: string, context?: string): Promise<void>;
  removeLink(fromSlug: string, toSlug: string): Promise<void>;
  getOutgoingLinks(slug: string): Promise<LinkRecord[]>;
  getBacklinks(slug: string): Promise<LinkRecord[]>;

  // Timeline
  upsertTimelineEntries(slug: string, entries: Omit<TimelineEntry, 'id' | 'page_id' | 'created_at'>[]): Promise<void>;
  getTimelineEntries(slug: string): Promise<TimelineEntry[]>;

  // Raw Data
  putRawData(slug: string, source: string, data: any): Promise<void>;
  getRawData(slug: string, source: string): Promise<RawDataRecord | null>;

  // Files
  upsertFile(file: Omit<FileRecord, 'id' | 'page_id' | 'created_at'>): Promise<void>;
  getFile(storagePath: string): Promise<FileRecord | null>;

  // Config & Logs
  getConfig(key: string): Promise<string | null>;
  setConfig(key: string, value: string): Promise<void>;
  addIngestLog(log: Omit<IngestLog, 'id' | 'created_at'>): Promise<void>;
  verifyAccessToken(tokenHash: string): Promise<AccessToken | null>;
  logMcpRequest(log: Omit<McpRequestLog, 'id' | 'created_at'>): Promise<void>;

  // Lifecycle
  init(): Promise<void>;
  dispose(): Promise<void>;

  // Health and Maintenance Methods
  getHealthReport(): Promise<DatabaseHealth>;
  getStaleChunks(): Promise<StaleChunk[]>;
  upsertVectors(vectors: { id: string, vector: number[], metadata: any }[]): Promise<void>;
  markChunksEmbedded(chunkIds: number[]): Promise<void>;
}