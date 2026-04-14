export type PageType =
  | 'person'
  | 'company'
  | 'deal'
  | 'project'
  | 'source'
  | 'media'
  | 'yc'
  | 'civic'
  | 'concept';

export type ChunkSource = 'compiled_truth' | 'timeline';

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

export interface ChunkInput {
  chunk_index: number;
  chunk_text: string;
  chunk_source: ChunkSource;
  embedding?: number[];
  token_count?: number;
}

export interface PageRecord {
  id?: number;
  slug: string;
  type: PageType;
  title: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  compiled_truth: string;
  timeline: string;
  content_hash: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface SearchResult {
  id?: number;
  page_id?: number;
  slug: string;
  chunk_text: string;
  score: number;
  chunk_source?: ChunkSource;
  stale?: boolean;
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

export interface LinkRecord {
  id?: number;
  from_page_id?: number;
  to_page_id?: number;
  from_slug?: string;
  to_slug?: string;
  link_type: string;
  context: string;
  created_at?: string | Date;
}

export interface TimelineEntry {
  id?: number;
  page_id?: number;
  slug?: string;
  date: string;
  source: string;
  summary: string;
  detail: string;
  created_at?: string | Date;
}

export interface RawDataRecord {
  id?: number;
  page_id?: number;
  slug?: string;
  source: string;
  data: any;
  fetched_at?: string | Date;
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

export interface IngestLog {
  id?: number;
  source_type: string;
  source_ref: string;
  pages_updated: string[];
  summary: string;
  created_at?: string | Date;
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

