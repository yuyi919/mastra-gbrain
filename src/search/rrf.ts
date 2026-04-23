import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import type { SearchResult } from "../types.js";

const COMPILED_TRUTH_BOOST = 2.0;
/**
 * Reciprocal Rank Fusion: merge multiple ranked lists.
 * Each result gets score = sum(1 / (K + rank)) across all lists it appears in.
 * After accumulation: normalize to 0-1, then boost compiled_truth chunks.
 */
export function rrfFusion(
  lists: SearchResult[][],
  k: number,
  applyBoost = true
) {
  return Eff.gen(function* () {
    const DEBUG = yield* Eff.FiberRef.currentMinimumLogLevel.useSync((level) =>
      Eff.LogLevel.isLessThanOrEqualTo(level, "Debug")
    );
    const scores = new Map<string, { result: SearchResult; score: number }>();

    for (const list of lists) {
      for (let rank = 0; rank < list.length; rank++) {
        const r = list[rank];
        const key = `${r.slug}:${r.chunk_id ?? r.chunk_text.slice(0, 50)}`;
        const existing = scores.get(key);
        const rrfScore = 1 / (k + rank);

        if (existing) {
          existing.score += rrfScore;
        } else {
          scores.set(key, { result: r, score: rrfScore });
        }
      }
    }

    const entries = Array.from(scores.values());
    if (entries.length === 0) return [];

    // Normalize to 0-1 by dividing by observed max
    const maxScore = Math.max(...entries.map((e) => e.score));
    if (maxScore > 0) {
      for (const e of entries) {
        const rawScore = e.score;
        e.score = e.score / maxScore;

        let boost = 1;
        // Apply compiled truth boost after normalization (skip for detail=high)
        if (applyBoost && e.result.chunk_source === "compiled_truth") {
          boost = COMPILED_TRUTH_BOOST;
          e.score *= COMPILED_TRUTH_BOOST;
        }

        if (!DEBUG) continue;
        yield* Eff.logDebug(`${e.result.slug}:${e.result.chunk_id}`).pipe(
          Eff.annotateLogs({
            debug: Bun.inspect(
              {
                rrf_raw: +rawScore.toFixed(4),
                rrf_norm: +(rawScore / maxScore).toFixed(4),
                boost,
                boosted: +e.score.toFixed(4),
                source: e.result.chunk_source,
              },
              { compact: true, colors: true }
            ),
          })
        );
      }
    }

    // Sort by boosted score descending
    return entries
      .sort((a, b) => b.score - a.score)
      .map(({ result, score }) => ({ ...result, score }));
  }).pipe(Eff.withLogSpan("RRFusion"));
}
