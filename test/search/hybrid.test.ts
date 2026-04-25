import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import { hybridSearch, hybridSearchEffect } from "../../src/search/hybrid.js";
import { BrainStoreSearch } from "../../src/store/BrainStore.js";
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
    const embed = () => [0.1, 0.2];
    const results = await hybridSearch(
      backend,
      "q",
      {
        limit: 10,
      },
      embed()
    );
    expect(results[0]?.slug).toBe("shared");
  });

  test("hybridSearchEffect only requires BrainStoreSearch", async () => {
    const r = (
      slug: string,
      chunk_text: string,
      score: number,
      chunk_id = 1
    ) => ({
      page_id: 1,
      title: slug,
      type: "concept" as const,
      slug,
      chunk_id,
      chunk_index: 0,
      chunk_text,
      chunk_source: "compiled_truth" as const,
      token_count: 1,
      score,
      stale: false,
    });
    const runtime = ManagedRuntime.make(
      Layer.succeed(
        BrainStoreSearch,
        BrainStoreSearch.of({
          searchKeyword: () => Effect.succeed([r("a", "alpha", 1)] as any),
          searchVector: () => Effect.succeed([] as any),
          getBacklinkCounts: () => Effect.succeed(new Map([["a", 0]]) as any),
          getEmbeddingsByChunkIds: () => Effect.succeed(new Map() as any),
        } as any)
      )
    );

    const results = await runtime.runPromise(
      hybridSearchEffect("q", { limit: 10 })
    );
    expect(results.map((item) => item.slug)).toEqual(["a"]);
  });
});
