import { describe, expect, test } from "bun:test";
import { hybridSearch } from "../../src/search/hybrid.js";
import type { StoreProvider } from "../../src/store/interface.js";

describe("hybridSearch", () => {
  test("keyword-only when embed is missing", async () => {
    const r = (slug: string, chunk_text: string, score: number) => ({
      page_id: 1,
      title: slug,
      type: "concept" as const,
      slug,
      chunk_index: 0,
      chunk_text,
      chunk_source: "compiled_truth" as const,
      token_count: 1,
      score,
      stale: false,
    });
    const backend = {
      searchKeyword: async () => [r("a", "alpha", 1), r("b", "beta", 0.9)],
      searchVector: async () => [],
    } as unknown as StoreProvider;
    const results = await hybridSearch(backend, "q", { limit: 10 });
    expect(results.map((r) => r.slug)).toEqual(["a", "b"]);
  });

  test("fuses vector + keyword via RRF", async () => {
    const r = (slug: string, chunk_text: string, score: number) => ({
      page_id: 1,
      title: slug,
      type: "concept" as const,
      slug,
      chunk_index: 0,
      chunk_text,
      chunk_source: "compiled_truth" as const,
      token_count: 1,
      score,
      stale: false,
    });
    const backend = {
      searchKeyword: async () => [r("k1", "k", 100), r("shared", "s", 90)],
      searchVector: async () => [r("shared", "s", 0.9), r("v1", "v", 0.8)],
    } as unknown as StoreProvider;
    const embed = async () => [0.1, 0.2];
    const results = await hybridSearch(backend, "q", { embed, limit: 10 });
    expect(results[0]?.slug).toBe("shared");
  });
});
