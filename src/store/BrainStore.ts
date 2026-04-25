import type { LibSQLVector } from "@mastra/libsql";
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Chunk } from "../types.js";
import type { StoreError } from "./BrainStoreError.js";
import type { BrainStoreCompat } from "./brainstore/compat/interface.js";
import {
  ContentChunks,
  type ContentChunksService,
} from "./brainstore/content/chunks/index.js";
import {
  ContentPages,
  type ContentPagesService,
} from "./brainstore/content/pages/index.js";
import { BrainStoreExt, type ExtService } from "./brainstore/ext/index.js";
import {
  GraphLinks as BrainStoreGraphLinks,
  type GraphBacklinkCounts,
  type GraphLinksService,
} from "./brainstore/graph/links/index.js";
import {
  GraphTimeline as BrainStoreGraphTimeline,
  type GraphTimelineService,
} from "./brainstore/graph/timeline/index.js";
import type {
  OpsInternal,
  UnsafeDBService,
} from "./brainstore/ops/internal/index.js";
import type {
  OpsLifecycle,
  OpsLifecycleService,
} from "./brainstore/ops/lifecycle/index.js";
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
import type {
  BrainStoreTree,
  BrainStoreTreeService,
} from "./brainstore/tree/index.js";

/**
 * `Eff.Effect<T, StoreError>` 的别名。
 */
export type EngineEffect<T> = Eff.Effect<T, StoreError>;

/**
 * Transitional flat ingestion contract kept for `StoreProvider` compatibility.
 * Tree-first callers should prefer `BrainStoreTree["content"]`.
 */
export interface IngestionStore
  extends ContentPagesService,
    ContentChunksService,
    RetrievalEmbeddingLookup {
  getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>;
}

export type HybridSearchBackend = RetrievalSearchService;
export type SearchStore = RetrievalSearchService;
export type LinkService = GraphLinksService;
export type TimelineService = GraphTimelineService;
export type BrainStoreLifecycle = OpsLifecycleService;

export type BrainStoreContentTree = BrainStoreTreeService["content"];
export type BrainStoreGraphTree = BrainStoreTreeService["graph"];
export type BrainStoreRetrievalTree = BrainStoreTreeService["retrieval"];
export type BrainStoreOpsTree = BrainStoreTreeService["ops"];

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
  readonly tree?: BrainStoreTreeService;
  readonly features: BrainStoreFeatureTree;
}

export class BrainStore extends Context.Service<
  BrainStore,
  BrainStore.Service
>()("@yui-agent/brain-mastra/BrainStore") {}

export type BrainStoreRuntime =
  | BrainStore
  | BrainStoreCompat
  | BrainStoreTree
  | ContentPages
  | ContentChunks
  | BrainStoreGraphLinks
  | BrainStoreGraphTimeline
  | BrainStoreEmbedding
  | RetrievalEmbeddingLookupService
  | BrainStoreSearch
  | BrainStoreExt
  | OpsLifecycle
  | OpsInternal;

export declare namespace BrainStore {
  export type Service = BrainStoreService;
  export type Tree = BrainStoreTreeService;
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
