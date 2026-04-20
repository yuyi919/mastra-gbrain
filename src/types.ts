import { Page } from "./store/effect-schema.js";

export type PageType =
  | "person"
  | "company"
  | "deal"
  | "project"
  | "source"
  | "media"
  | "yc"
  | "civic"
  | "concept"
  | "writing"
  | "analysis"
  | "guide"
  | "hardware"
  | "architecture";

export { Page };

export interface PageInput {
  type: PageType;
  title: string;
  compiled_truth: string;
  timeline?: string;
  frontmatter?: Record<string, unknown>;
  content_hash: string;
}

export interface PageFilters {
  type?: PageType;
  tag?: string;
  limit?: number;
  offset?: number;
  /** ISO date string (YYYY-MM-DD or full ISO timestamp). Filter to pages updated_at > value. */
  updated_after?: string;
}

export type VectorMetadata = {
  page_id?: number;
  slug: string;
  title: string;
  type: PageType;
  chunk_index: number;
  chunk_source: string;
  chunk_text: string;
  token_count: number;
};

// Chunks
export interface Chunk {
  id: number;
  page_id: number;
  chunk_index: number;
  chunk_text: string;
  chunk_source: "compiled_truth" | "timeline";
  embedding: Float32Array | null;
  model: string;
  token_count: number | null;
  embedded_at: Date | null;
}

export interface ChunkInput {
  chunk_index: number;
  chunk_text: string;
  chunk_source: "compiled_truth" | "timeline";
  embedding?: Float32Array;
  model?: string;
  token_count?: number;
}

// Search
export interface SearchResult {
  slug: string;
  page_id: number;
  title: string;
  type: PageType;
  chunk_text: string;
  chunk_source: "compiled_truth" | "timeline";
  chunk_id: number;
  chunk_index: number;
  score: number;
  stale: boolean;
}

export interface SearchOpts {
  limit?: number;
  offset?: number;
  type?: PageType;
  exclude_slugs?: string[];
  detail?: "low" | "medium" | "high";
  /**
   * Return best chunk per page
   */
  dedupe?: boolean;
}

// Links
export interface Link {
  from_slug: string;
  to_slug: string;
  link_type: string;
  context: string;
}

export interface GraphNode {
  slug: string;
  title: string;
  type: PageType;
  depth: number;
  links: { to_slug: string; link_type: string }[];
}

export interface GraphPath {
  from_slug: string;
  to_slug: string;
  link_type: string;
  context: string;
  /** Depth of `to_slug` from the root (1 for direct neighbors). */
  depth: number;
}

// Timeline
export interface TimelineEntry {
  id: number;
  page_id: number;
  date: string;
  source: string;
  summary: string;
  detail: string;
  created_at: Date;
}

export interface TimelineInput {
  date: string;
  source?: string;
  summary: string;
  detail?: string;
}

export interface TimelineOpts {
  limit?: number;
  after?: string;
  before?: string;
  asc?: boolean;
}

// Raw data
export interface RawData {
  source: string;
  data: Record<string, unknown>;
  fetched_at: Date;
}

// Versions
export interface PageVersion {
  id: number;
  page_id: number;
  compiled_truth: string;
  frontmatter: Record<string, unknown>;
  snapshot_at: Date;
}

// Stats + Health
export interface BrainStats {
  page_count: number;
  chunk_count: number;
  embedded_count: number;
  link_count: number;
  tag_count: number;
  timeline_entry_count: number;
  pages_by_type: Record<string, number>;
}

export interface BrainHealth {
  page_count: number;
  embed_coverage: number;
  stale_pages: number;
  /** Pages with zero inbound links. Definition aligned across PGLite and Postgres. */
  orphan_pages: number;
  missing_embeddings: number;
  /** Composite quality score (0-10). Computed from coverage, staleness, orphans. */
  brain_score: number;
  /** Fraction of entity pages (person/company) with >= 1 inbound link. */
  link_coverage: number;
  /** Fraction of entity pages (person/company) with >= 1 structured timeline entry. */
  timeline_coverage: number;
  /** Top 5 entities by total link count (in + out). */
  most_connected: Array<{ slug: string; link_count: number }>;
}

// Ingest log
export interface IngestLogEntry {
  id: number;
  source_type: string;
  source_ref: string;
  pages_updated: string[];
  summary: string;
  created_at: Date;
}

export interface IngestLogInput {
  source_type: string;
  source_ref: string;
  pages_updated: string[];
  summary: string;
}

// Config
export interface EngineConfig {
  database_url?: string;
  database_path?: string;
  engine?: "postgres" | "pglite";
}

// Errors
export class GBrainError extends Error {
  constructor(
    public problem: string,
    public cause_description: string,
    public fix: string,
    public docs_url?: string
  ) {
    super(`${problem}: ${cause_description}. Fix: ${fix}`);
    this.name = "GBrainError";
  }
}

// Below are specific types for mastra-gbrain implementation

export type ChunkSource = "compiled_truth" | "timeline";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  compiled_truth: string;
  timeline: string;
  slug: string;
  type: PageType;
  title: string;
  tags: string[];
}

export interface TextChunk {
  text: string;
  index: number;
}

export interface DatabaseHealth {
  connectionOk: boolean;
  tablesOk: boolean;
  ftsOk: boolean;
  tableDetails: Record<string, { ok: boolean; rows?: number; error?: string }>;
  vectorCoverage: { total: number; embedded: number };
  schemaVersion?: { current: number; latest: number; ok: boolean };
}

export interface StaleChunk {
  id: number;
  slug: string;
  chunk_index: number;
  chunk_text: string;
  chunk_source: ChunkSource;
}

export interface FileRecord {
  id?: number;
  page_id?: number;
  page_slug?: string;
  filename: string;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  content_hash: string;
  metadata: Record<string, any>;
  created_at?: string | Date;
}

export interface ConfigRecord {
  key: string;
  value: string;
}

export interface AccessToken {
  id: string;
  name: string;
  token_hash: string;
  scopes: string[];
  created_at?: string | Date;
  last_used_at?: string | Date;
  revoked_at?: string | Date;
}

export interface McpRequestLog {
  id?: number;
  token_name?: string;
  operation: string;
  latency_ms?: number;
  status: string;
  created_at?: string | Date;
}
