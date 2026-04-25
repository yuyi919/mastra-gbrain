import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { SearchOpts, SearchResult } from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";
import type { GraphBacklinkCounts } from "../../graph/links/interface.js";
import type { RetrievalEmbeddingLookup } from "../embedding/interface.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface RetrievalSearchBackend {
  searchKeyword(query: string, opts?: SearchOpts): EngineEffect<SearchResult[]>;
  searchVector(
    embedding: number[],
    opts?: SearchOpts
  ): EngineEffect<SearchResult[]>;
}

export interface RetrievalSearchService
  extends RetrievalSearchBackend,
    GraphBacklinkCounts,
    RetrievalEmbeddingLookup {}

export class RetrievalSearch extends Context.Service<
  RetrievalSearch,
  RetrievalSearchService
>()("@yui-agent/brain-mastra/BrainStoreTree/retrieval/search") {}
