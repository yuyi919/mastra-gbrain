import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Chunk, ChunkInput } from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

// Vector lookup/write ownership moves to retrieval.embedding; this branch
// stays focused on chunk and FTS-facing responsibilities.
export interface ContentChunksService {
  upsertChunks(slug: string, chunks: ChunkInput[]): EngineEffect<void>;
  deleteChunks(slug: string): EngineEffect<void>;
  getChunks(slug: string): EngineEffect<Chunk[]>;
  getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>;
}

export class ContentChunks extends Context.Service<
  ContentChunks,
  ContentChunksService
>()("@yui-agent/brain-mastra/BrainStoreTree/content/chunks") {}
