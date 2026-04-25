import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { extractWordsForSearch } from "../../../../segmenter.js";
import { StoreError } from "../../../BrainStoreError.js";
import { Mappers } from "../../../Mappers.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import { GraphBacklinkCountsService } from "../../graph/links/interface.js";
import {
  RetrievalEmbedding,
  RetrievalEmbeddingLookupService,
} from "../embedding/interface.js";
import { RetrievalSearch, type RetrievalSearchService } from "./interface.js";

export type RetrievalSearchMappers = Pick<SqlBuilder, "searchKeyword">;

export interface RetrievalSearchDependencies {
  mappers: RetrievalSearchMappers;
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
      return rows.map((row) => {
        const score = Math.abs(row.score) / (1 + Math.abs(row.score));
        return { ...row, score };
      });
    }, catchStoreError),
    searchVector: Eff.fn("retrieval.search.searchVector")(function* (
      embedding,
      opts
    ) {
      return yield* deps.vectorSearch.searchVector(embedding, opts);
    }, catchStoreError),
    getBacklinkCounts: Eff.fn("retrieval.search.getBacklinkCounts")(function* (
      slugs
    ) {
      return yield* deps.backlinks.getBacklinkCounts(slugs);
    }, catchStoreError),
    getEmbeddingsByChunkIds: Eff.fn("retrieval.search.getEmbeddingsByChunkIds")(
      function* (ids) {
        return yield* deps.embeddings.getEmbeddingsByChunkIds(ids);
      },
      catchStoreError
    ),
  };
};

export const makeLayer = (
  service?: RetrievalSearchService | RetrievalSearchDependencies
) => {
  if (service) {
    return Layer.succeed(
      RetrievalSearch,
      "mappers" in service ? makeRetrievalSearch(service) : service
    );
  }
  return Layer.effect(
    RetrievalSearch,
    Eff.gen(function* () {
      const mappers = yield* Mappers;
      const backlinks = yield* GraphBacklinkCountsService;
      const embeddings = yield* RetrievalEmbeddingLookupService;
      const vectorSearch = yield* RetrievalEmbedding;
      return makeRetrievalSearch({
        mappers,
        backlinks,
        embeddings,
        vectorSearch,
      });
    })
  );
};
