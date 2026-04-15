import { describe, expect, test } from "bun:test";
import { hybridSearch } from "../../src/search/hybrid.js";
import type { StoreProvider } from "../../src/store/interface.js";

describe("hybridSearch", () => {
  test("keyword-only when embed is missing", async () => {
    const backend = {
      searchKeyword: async () => [
        { slug: "a", chunk_text: "alpha", score: 1 },
        { slug: "b", chunk_text: "beta", score: 0.9 },
      ],
      searchVector: async () => [],
    } as unknown as StoreProvider;
    const results = await hybridSearch(backend, "q", { limit: 10 });
    expect(results.map((r) => r.slug)).toEqual(["a", "b"]);
  });

  test("fuses vector + keyword via RRF", async () => {
    const backend = {
      searchKeyword: async () => [
        { slug: "k1", chunk_text: "k", score: 100 },
        { slug: "shared", chunk_text: "s", score: 90 },
      ],
      searchVector: async () => [
        { slug: "shared", chunk_text: "s", score: 0.9 },
        { slug: "v1", chunk_text: "v", score: 0.8 },
      ],
    } as unknown as StoreProvider;
    const embed = async () => [0.1, 0.2];
    const results = await hybridSearch(backend, "q", { embed, limit: 10 });
    expect(results[0]?.slug).toBe("shared");
  });
});
