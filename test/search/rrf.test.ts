import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { rrfFusion } from "../../src/search/rrf.js";

describe("rrfFusion", () => {
  test("merges ranked lists and assigns scores", async () => {
    const r = (slug: string, chunk_text: string, score: number) => ({
      page_id: 1,
      title: slug,
      type: "concept" as const,
      slug,
      chunk_id: 1,
      chunk_index: 0,
      chunk_text,
      chunk_source: "compiled_truth" as const,
      token_count: 1,
      score,
      stale: false,
    });
    const listA = [r("a", "x", 10), r("b", "y", 9)];
    const listB = [r("b", "y", 100), r("c", "z", 99)];
    const fused = await Effect.runPromise(rrfFusion([listA, listB], 60));
    expect(fused.map((r) => r.slug)).toEqual(["b", "a", "c"]);
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });
});
