import type { LibSQLVector } from "@mastra/libsql";
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Schema } from "effect";
import type { SchemaError } from "effect/Schema";
import type { SqlError } from "effect/unstable/sql";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type {
  Chunk,
  ChunkInput,
  GraphNode,
  GraphPath,
  Link,
  Page,
  PageFilters,
  PageInput,
  PageVersion,
  SearchOpts,
  SearchResult,
  TimelineEntry,
  TimelineInput,
  TimelineOpts,
} from "../types.js";
import type { StoreError } from "./BrainStoreError.js";
import type { SqlBuilder } from "./SqlBuilder.js";
import {
  ContentChunks,
  type ContentChunksService,
} from "./brainstore/content/chunks/index.js";
import {
  ContentPages,
  type ContentPagesService,
} from "./brainstore/content/pages/index.js";
import {
  GraphLinks as BrainStoreGraphLinks,
  type GraphBacklinkCounts,
  type GraphLinksService,
} from "./brainstore/graph/links/index.js";
import {
  GraphTimeline as BrainStoreGraphTimeline,
  type GraphTimelineService,
} from "./brainstore/graph/timeline/index.js";
import {
  RetrievalEmbedding as BrainStoreEmbedding,
  type RetrievalEmbeddingLookup,
  RetrievalEmbeddingLookupService,
  type RetrievalEmbeddingService,
} from "./brainstore/retrieval/embedding/index.js";
import {
  RetrievalSearch as BrainStoreSearch,
  type RetrievalSearchService,
} from "./brainstore/retrieval/search/index.js";
import { BrainStoreCompat } from "./brainstore/compat/interface.js";
import {
  BrainStoreExt,
  type ExtService,
} from "./brainstore/ext/index.js";

/**
 * `Eff.Effect<T, StoreError>` 的别名。
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

/**
 * Transitional flat ingestion contract kept for `StoreProvider` compatibility.
 * Tree-first callers should prefer `BrainStoreTree["content"]`.
 */
export interface IngestionStore {
  getPage(slug: string): EngineEffect<Page | null>;
  listPages(filters?: PageFilters): EngineEffect<Page[]>;
  resolveSlugs(partial: string): EngineEffect<string[]>;
  getTags(slug: string): EngineEffect<string[]>;
  createVersion(slug: string): EngineEffect<PutReturning<PageVersion>>;
  getVersions(slug: string): EngineEffect<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): EngineEffect<void>;
  putPage(slug: string, page: PageInput): EngineEffect<PutReturning<Page>>;
  updateSlug(oldSlug: string, newSlug: string): EngineEffect<void>;
  deletePage(slug: string): EngineEffect<void>;
  addTag(slug: string, tag: string): EngineEffect<void>;
  removeTag(slug: string, tag: string): EngineEffect<void>;
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

export type SearchStore = RetrievalSearchService;

export interface LinkService extends GraphBacklinkCounts {
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
}

export interface TimelineService {
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): EngineEffect<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): EngineEffect<number>;
  getTimeline(slug: string, opts?: TimelineOpts): EngineEffect<TimelineEntry[]>;
}

export interface BrainStoreLifecycle {
  init(): EngineEffect<void>;
  dispose(): Eff.Effect<void>;
  transaction<T, E = never, R = never>(
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

export interface BrainStoreContentTree {
  pages: ContentPagesService;
  chunks: ContentChunksService;
}

export interface BrainStoreGraphTree {
  links: GraphLinksService;
  timeline: GraphTimelineService;
}

export interface BrainStoreRetrievalTree {
  search: RetrievalSearchService;
  embedding: RetrievalEmbeddingService;
}

export interface BrainStoreOpsTree {
  lifecycle: BrainStoreLifecycle;
  internal: UnsafeDBService & {
    readonly sql: SqlClient;
    readonly mappers: SqlBuilder;
    readonly vectorStore?: LibSQLVector;
  };
}

export interface BrainStoreTree {
  content: BrainStoreContentTree;
  graph: BrainStoreGraphTree;
  retrieval: BrainStoreRetrievalTree;
  ops: BrainStoreOpsTree;
}

/**
 * Transitional flat feature projection kept until compat-over-tree wiring lands.
 */
export interface BrainStoreFeatureTree {
  ingestion: IngestionStore;
  links: LinkService;
  search: SearchStore;
  timeline: TimelineService;
  ext: ExtService;
  lifecycle: BrainStoreLifecycle;
  unsafe: UnsafeDBService;
}

export interface BrainStoreService
  extends LinkService,
    IngestionStore,
    SearchStore,
    TimelineService,
    ExtService,
    BrainStoreLifecycle,
    UnsafeDBService {
  readonly tree?: BrainStoreTree;
  readonly features: BrainStoreFeatureTree;
}

export class BrainStoreIngestion extends Context.Service<
  BrainStoreIngestion,
  IngestionStore
>()("@yui-agent/brain-mastra/BrainStore/Ingestion") {}

export class BrainStoreLinks extends Context.Service<
  BrainStoreLinks,
  LinkService
>()("@yui-agent/brain-mastra/BrainStore/Links") {}

export class BrainStoreTimeline extends Context.Service<
  BrainStoreTimeline,
  TimelineService
>()("@yui-agent/brain-mastra/BrainStore/Timeline") {}

export class BrainStoreLifecycleService extends Context.Service<
  BrainStoreLifecycleService,
  BrainStoreLifecycle
>()("@yui-agent/brain-mastra/BrainStore/Lifecycle") {}

export class BrainStoreUnsafeDB extends Context.Service<
  BrainStoreUnsafeDB,
  UnsafeDBService
>()("@yui-agent/brain-mastra/BrainStore/UnsafeDB") {}

export class BrainStore extends Context.Service<
  BrainStore,
  BrainStore.Service
>()("@yui-agent/brain-mastra/BrainStore") {}

export type BrainStoreRuntime =
  | BrainStore
  | BrainStoreCompat
  | BrainStoreIngestion
  | BrainStoreLinks
  | BrainStoreSearch
  | BrainStoreTimeline
  | BrainStoreExt
  | BrainStoreLifecycleService
  | BrainStoreUnsafeDB;

export declare namespace BrainStore {
  export type Service = BrainStoreService;
  export type Tree = BrainStoreTree;
  export type Features = BrainStoreFeatureTree;
  export type Content = BrainStoreContentTree;
  export type Graph = BrainStoreGraphTree;
  export type Retrieval = BrainStoreRetrievalTree;
  export type Ops = BrainStoreOpsTree;
  export type Link = LinkService;
  export type Ingestion = IngestionStore;
  export type HybridSearch = HybridSearchBackend;
  export type Search = SearchStore;
  export type Embedding = RetrievalEmbeddingService;
  export type EmbeddingLookup = RetrievalEmbeddingLookup;
  export type Timeline = TimelineService;
  export type Ext = ExtService;
  export type Lifecycle = BrainStoreLifecycle;
  export type UnsafeDB = UnsafeDBService;
  export type Runtime = BrainStoreRuntime;
  export type Options = {
    vectorUrl?: string;
    authToken?: string;
    dimension?: number;
    vectorStore?: LibSQLVector;
  };
}

export type {
  ContentChunksService,
  ContentPagesService,
  GraphBacklinkCounts,
  GraphLinksService,
  GraphTimelineService,
  RetrievalEmbeddingLookup,
  RetrievalEmbeddingService,
  RetrievalSearchService,
};
export {
  BrainStoreEmbedding,
  BrainStoreExt,
  BrainStoreGraphLinks,
  BrainStoreGraphTimeline,
  BrainStoreSearch,
  ContentChunks,
  ContentPages,
  RetrievalEmbeddingLookupService,
};
