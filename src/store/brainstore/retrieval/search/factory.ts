import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { extractWordsForSearch } from "../../../../segmenter.js";
import { StoreError } from "../../../BrainStoreError.js";
import { RetrievalSearch, type RetrievalSearchService } from "./interface.js";

export interface RetrievalSearchDependencies {
  mappers: any;
  backlinks: Pick<RetrievalSearchService, "getBacklinkCounts">;
  embeddings: Pick<RetrievalSearchService, "getEmbeddingsByChunkIds">;
  vectorSearch: Pick<RetrievalSearchService, "searchVector">;
}

export const makeRetrievalSearch = (
  deps: RetrievalSearchDependencies
): RetrievalSearchService => {
  const catchStoreError = StoreError.catch;
  return {
    searchKeyword: Eff.fn("retrieval.search.searchKeyword")(function* (
      query,
      opts
    ) {
      const segmentedQuery = extractWordsForSearch(query);
      const rows = yield* deps.mappers.searchKeyword(segmentedQuery, opts);
      return rows.map((row: any) => {
        const score = Math.abs(row.score) / (1 + Math.abs(row.score));
        return { ...row, score };
      });
    }, catchStoreError) as RetrievalSearchService["searchKeyword"],
    searchVector: Eff.fn("retrieval.search.searchVector")(function* (
      embedding,
      opts
    ) {
      return yield* deps.vectorSearch.searchVector(embedding, opts as any);
    }, catchStoreError) as RetrievalSearchService["searchVector"],
    getBacklinkCounts: Eff.fn("retrieval.search.getBacklinkCounts")(function* (
      slugs
    ) {
      return yield* deps.backlinks.getBacklinkCounts(slugs);
    }, catchStoreError) as RetrievalSearchService["getBacklinkCounts"],
    getEmbeddingsByChunkIds: Eff.fn("retrieval.search.getEmbeddingsByChunkIds")(
      function* (ids) {
        return yield* deps.embeddings.getEmbeddingsByChunkIds(ids);
      },
      catchStoreError
    ) as RetrievalSearchService["getEmbeddingsByChunkIds"],
  } as RetrievalSearchService;
};

export const makeLayer = (
  service: RetrievalSearchService | RetrievalSearchDependencies
) =>
  Layer.succeed(
    RetrievalSearch,
    "mappers" in service ? makeRetrievalSearch(service) : service
  );
