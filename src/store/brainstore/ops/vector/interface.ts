import type {
  VectorFilter as MastraVectorFilter,
  QueryResult,
} from "@mastra/core/vector";
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { VectorMetadata } from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;
export type VectorQueryResult = QueryResult;
export type VectorFilter = MastraVectorFilter;

export interface VectorQueryInput {
  indexName: string;
  queryVector: number[];
  topK: number;
  filter?: VectorFilter;
}

export interface VectorUpsertInput {
  indexName: string;
  vectors: number[][];
  ids: string[];
  metadata: VectorMetadata[];
}

export interface VectorDeleteInput {
  indexName: string;
  ids?: string[];
  filter?: VectorFilter;
}

export interface VectorCreateIndexInput {
  indexName: string;
  dimension: number;
  metric?: "cosine" | "euclidean" | "dotproduct";
}

export interface VectorProviderService {
  query(input: VectorQueryInput): EngineEffect<VectorQueryResult[]>;
  upsert(input: VectorUpsertInput): EngineEffect<void>;
  deleteVectors(input: VectorDeleteInput): EngineEffect<void>;
  createIndex(input: VectorCreateIndexInput): EngineEffect<void>;
  dispose(): EngineEffect<void>;
}

export interface VectorProviderClient {
  query(input: VectorQueryInput): Promise<VectorQueryResult[]>;
  upsert(input: VectorUpsertInput): Promise<unknown>;
  deleteVectors(input: VectorDeleteInput): Promise<void>;
  createIndex(input: VectorCreateIndexInput): Promise<void>;
}

export class VectorProvider extends Context.Service<
  VectorProvider,
  VectorProviderService
>()("@yui-agent/brain-mastra/BrainStoreTree/ops/vector") {}
