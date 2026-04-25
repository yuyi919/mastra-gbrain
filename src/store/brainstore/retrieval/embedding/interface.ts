import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type {
  SearchOpts,
  SearchResult,
  StaleChunk,
  VectorMetadata,
} from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface RetrievalEmbeddingLookup {
  getEmbeddingsByChunkIds(
    ids: number[]
  ): EngineEffect<Map<number, Float32Array>>;
}

export interface RetrievalEmbeddingService extends RetrievalEmbeddingLookup {
  searchVector(
    embedding: number[],
    opts?: SearchOpts & { slug?: string }
  ): EngineEffect<SearchResult[]>;
  getStaleChunks(): EngineEffect<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): EngineEffect<void>;
  markChunksEmbedded(chunkIds: number[]): EngineEffect<void>;
}

export class RetrievalEmbeddingLookupService extends Context.Service<
  RetrievalEmbeddingLookupService,
  RetrievalEmbeddingLookup
>()("@yui-agent/brain-mastra/BrainStoreTree/retrieval/embedding/lookup") {}

export class RetrievalEmbedding extends Context.Service<
  RetrievalEmbedding,
  RetrievalEmbeddingService
>()("@yui-agent/brain-mastra/BrainStoreTree/retrieval/embedding") {}
