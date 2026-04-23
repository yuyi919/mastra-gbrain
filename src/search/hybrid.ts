import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Console } from "effect";
import { BrainStore } from "../store/BrainStore.js";
import type { StoreError } from "../store/BrainStoreError.js";
import type { EmbeddingProvider, StoreProvider } from "../store/interface.js";
import type { SearchOpts, SearchResult } from "../types.js";
import { dedupResults } from "./dedup.js";
import { autoDetectDetail } from "./intent.js";
import { rrfFusion } from "./rrf.js";

export interface HybridSearchOpts extends SearchOpts {
  embedder?: EmbeddingProvider;
  keyFn?: (r: SearchResult) => string;

  /** Override default RRF K constant (default: 60). Lower values boost top-ranked results more. */
  rrfK?: number;
  /** Override dedup pipeline parameters. */
  dedupOpts?: {
    cosineThreshold?: number;
    maxTypeRatio?: number;
    maxPerPage?: number;
  };

  expansion?: boolean;
  expandFn?: (query: string) => Promise<string[]>;
  /**
   * @deprecated Use expandFn instead of queryVariants
   */
  queryVariants?: string[];
}

/** Maximum results returned by search operations. Internal bulk operations (listPages) are not clamped. */
const MAX_SEARCH_LIMIT = 100;
const RRF_K = 60;

export function hybridSearchEffect(
  query: string,
  opts: HybridSearchOpts = {},
  queryVector?: number[]
): Eff.Effect<SearchResult[], StoreError, BrainStore> {
  return Eff.gen(function* () {
    const engine = yield* BrainStore;
    const limit = opts?.limit || 20;
    const offset = opts?.offset || 0;
    const innerLimit = Math.min(limit * 2, MAX_SEARCH_LIMIT);
    // Auto-detect detail level from query intent when caller doesn't specify
    const detail = opts?.detail ?? autoDetectDetail(query) ?? "high";

    const searchOpts: SearchOpts = { limit: innerLimit, detail };
    const DEBUG = yield* Eff.FiberRef.currentMinimumLogLevel.useSync((level) =>
      Eff.LogLevel.isLessThanOrEqualTo(level, "Debug")
    );
    if (DEBUG) {
      yield* Eff.logDebug(`auto-detail=${detail} for query="${query}"`);
    }

    const keywordResults = yield* engine.searchKeyword(query, searchOpts);
    yield* Eff.log("keywordResults", keywordResults);
    if (!opts.embedder && !queryVector) {
      return dedupResults(keywordResults, opts.dedupOpts).slice(
        offset,
        offset + limit
      );
    }

    let queryEmbedding: Float32Array | null = null;
    const vectorResults: SearchResult[][] = yield* Eff.gen(function* () {
      if (queryVector) {
        queryEmbedding = new Float32Array(queryVector);
        return [yield* engine.searchVector(queryVector, searchOpts)];
      } else if (opts.embedder) {
        // Determine query variants (optionally with expansion)
        // expandQuery already includes the original query in its return value,
        // so we use it directly instead of prepending query again
        let queries = [query];
        if (opts.expansion && opts.expandFn) {
          queries = yield* Eff.promise(() => opts.expandFn!(query)).pipe(
            Eff.orElseSucceed(() => [query])
          );
        }
        return yield* Eff.from(() => opts.embedder!.embedBatch(queries))
          .pipe(
            Eff.tap((batchedVector) =>
              Eff.sync(() => {
                queryEmbedding ??= new Float32Array(batchedVector[0]);
              })
            )
          )
          .pipe(
            Eff.flatMap(Eff.forEach((_) => engine.searchVector(_, searchOpts)))
          );
      } else {
        return [];
      }
    }).pipe(Eff.orElseSucceed(() => []));

    yield* Eff.logDebug("vectorResults", vectorResults);

    if (vectorResults.length === 0) {
      return dedupResults(keywordResults, opts.dedupOpts).slice(
        offset,
        offset + limit
      );
    }

    /**
     * Merge all result lists via RRF (includes normalization + boost)
     * Skip boost for detail=high (temporal/event queries want natural ranking)
     */
    let fused = yield* rrfFusion(
      [...vectorResults, keywordResults],
      opts.rrfK ?? RRF_K,
      detail !== "high"
    );
    if (queryVector) {
      fused = yield* cosineReScore(fused, queryVector, DEBUG);
    }
    // Apply backlink boost AFTER cosine re-score so the boost survives normalization,
    // and BEFORE dedup so it influences which chunks per page survive deduplication.
    // One DB query for the whole result set (not N+1).
    if (fused.length > 0) {
      try {
        const slugs = Array.from(new Set(fused.map((r) => r.slug)));
        const counts = yield* engine.getBacklinkCounts(slugs);
        yield* Eff.logDebug("BacklinkCounts").pipe(
          Eff.annotateLogs(Object.fromEntries(counts.entries()))
        );
        yield* applyBacklinkBoost(fused, counts);
        fused.sort((a, b) => b.score - a.score);
      } catch {
        // Boost failure is non-fatal: keep blended cosine ranking.
      }
    }
    const deduped = dedupResults(fused, opts.dedupOpts);
    // Auto-escalate: if detail=low returned 0, retry with high
    if (deduped.length === 0 && opts?.detail === "low") {
      return yield* hybridSearchEffect(query, { ...opts, detail: "high" });
    }
    yield* Console.log(deduped.slice(offset, offset + limit));
    return deduped.slice(offset, offset + limit);
  }).pipe(Eff.withLogSpan("HybridSearch"));
}

export async function hybridSearch(
  backend: StoreProvider,
  query: string,
  opts: HybridSearchOpts,
  queryVector?: number[]
): Promise<SearchResult[]> {
  return backend.brainStore.runPromise(
    hybridSearchEffect(query, opts, queryVector)
  );
}
/**
 * Backlink boost coefficient. Score is multiplied by (1 + BACKLINK_BOOST_COEF * log(1 + count)).
 * - 0 backlinks: factor = 1.0 (no boost).
 * - 1 backlink:  factor ~= 1.035.
 * - 10 backlinks: factor ~= 1.12.
 * - 100 backlinks: factor ~= 1.23.
 * Applied AFTER cosine re-score so it survives normalization, BEFORE dedup so the
 * boosted ranking determines which chunks per page are kept.
 */
const BACKLINK_BOOST_COEF = 0.05;
/**
 * Apply backlink boost to a result list in place. Mutates each result's score
 * by (1 + BACKLINK_BOOST_COEF * log(1 + count)). Pure data transform; no DB call.
 * Caller fetches counts via engine.getBacklinkCounts.
 */
export const applyBacklinkBoost = Eff.fn("applyBacklinkBoost")(function* (
  results: SearchResult[],
  counts: Map<string, number>
) {
  for (const r of results) {
    const count = counts.get(r.slug) ?? 0;
    if (count > 0) {
      r.score *= 1.0 + BACKLINK_BOOST_COEF * Math.log(1 + count);
    }
  }
});

/**
 * Cosine re-scoring: blend RRF score with query-chunk cosine similarity.
 * Runs before dedup so semantically better chunks survive.
 */
const cosineReScore = Eff.fn("cosineReScore")(function* (
  results: SearchResult[],
  queryEmbedding: ArrayLike<number>,
  DEBUG: boolean
) {
  const engine = yield* BrainStore;

  const chunkIds = results
    .map((r) => r.chunk_id)
    .filter((id): id is number => id != null);

  if (chunkIds.length === 0) return results;

  let embeddingMap: Map<number, Float32Array>;
  try {
    embeddingMap = yield* engine.getEmbeddingsByChunkIds(chunkIds);
  } catch {
    // DB error is non-fatal, return results without re-scoring
    return results;
  }

  if (embeddingMap.size === 0) return results;

  // Normalize RRF scores to 0-1 for blending
  const maxRrf = Math.max(...results.map((r) => r.score));

  return (yield* Eff.forEach(
    results,
    Eff.fn(function* (r) {
      const chunkEmb =
        r.chunk_id != null ? embeddingMap.get(r.chunk_id) : undefined;
      if (!chunkEmb) return r;

      const cosine = cosineSimilarity(queryEmbedding, chunkEmb);
      const normRrf = maxRrf > 0 ? r.score / maxRrf : 0;
      const blended = 0.7 * normRrf + 0.3 * cosine;

      if (DEBUG)
        yield* Eff.logDebug(
          `${r.slug}:${r.chunk_id} cosine=${cosine.toFixed(4)} norm_rrf=${normRrf.toFixed(4)} blended=${blended.toFixed(4)}`
        );
      return { ...r, score: blended };
    })
  )).sort((a, b) => b.score - a.score);
});

export function cosineSimilarity(
  a: ArrayLike<number>,
  b: ArrayLike<number>
): number {
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
