import type { SearchResult } from "../types.js";

export function rrfFusion(
  lists: SearchResult[][],
  opts?: { k?: number; keyFn?: (r: SearchResult) => string }
): SearchResult[] {
  const k = opts?.k ?? 60;
  const keyFn =
    opts?.keyFn ?? ((r) => `${r.slug}:${r.chunk_text.slice(0, 50)}`);
  const scores = new Map<string, { result: SearchResult; score: number }>();
  for (const list of lists) {
    for (let rank = 0; rank < list.length; rank++) {
      const r = list[rank];
      const key = keyFn(r);
      const existing = scores.get(key);
      const score = 1 / (k + rank);
      if (existing) {
        existing.score += score;
      } else {
        scores.set(key, { result: r, score });
      }
    }
  }
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({ ...result, score }));
}
