import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import { hybridSearch, hybridSearchEffect } from "../../src/search/hybrid.js";
import {
  BrainStoreSearch,
  type RetrievalSearchService,
} from "../../src/store/BrainStore.js";
import type { SearchOpts, SearchResult } from "../../src/types.js";

const result = (
  slug: string,
  chunk_text: string,
  score: number,
  chunk_id = 1
) =>
  ({
    page_id: 1,
    title: slug,
    type: "concept",
    slug,
    chunk_id,
    chunk_index: 0,
    chunk_text,
    chunk_source: "compiled_truth",
    score,
    stale: false,
  }) satisfies SearchResult;

function makeSearchRuntime(service: RetrievalSearchService) {
  return ManagedRuntime.make(
    Layer.succeed(BrainStoreSearch, BrainStoreSearch.of(service))
  );
}

interface LegacyHybridSearchCompatBackend {
  searchKeyword(query: string, opts?: SearchOpts): Promise<SearchResult[]>;
  searchVector(embedding: number[], opts?: SearchOpts): Promise<SearchResult[]>;
}

describe("hybridSearch", () => {
  test("hybrid wrapper does not type its dependency as broad store", async () => {
    const source = await Bun.file("src/search/hybrid.ts").text();
    const forbidden = "Store" + "Provider";
    expect(source).not.toContain(forbidden);
  });

  test("keyword-only when embed is missing", async () => {
    const backend: LegacyHybridSearchCompatBackend = {
      searchKeyword: async () => [
        result("a", "alpha", 1),
        result("b", "beta", 0.9, 2),
      ],
      searchVector: async () => [],
    };
    const results = await hybridSearch(backend, "q", { limit: 10 });
    expect(results.map((r) => r.slug)).toEqual(["a", "b"]);
  });

  test("fuses vector + keyword via RRF", async () => {
    const backend: LegacyHybridSearchCompatBackend = {
      searchKeyword: async () => [
        result("k1", "k", 100),
        result("shared", "s", 90, 2),
      ],
      searchVector: async () => [
        result("shared", "s", 0.9, 2),
        result("v1", "v", 0.8, 3),
      ],
    };
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

  test("hybridSearch delegates to a branch-only runtime when available", async () => {
    const runtime = makeSearchRuntime({
      searchKeyword: () =>
        Effect.succeed([result("runtime", "branch result", 1)]),
      searchVector: () => Effect.succeed([]),
      getBacklinkCounts: () => Effect.succeed(new Map([["runtime", 0]])),
      getEmbeddingsByChunkIds: () => Effect.succeed(new Map()),
    });

    const results = await hybridSearch(
      {
        brainStore: runtime,
      },
      "q",
      { limit: 10 }
    );

    expect(results.map((item) => item.slug)).toEqual(["runtime"]);
  });

  test("hybridSearchEffect only requires BrainStoreSearch", async () => {
    const runtime = makeSearchRuntime({
      searchKeyword: () => Effect.succeed([result("a", "alpha", 1)]),
      searchVector: () => Effect.succeed([]),
      getBacklinkCounts: () => Effect.succeed(new Map([["a", 0]])),
      getEmbeddingsByChunkIds: () => Effect.succeed(new Map()),
    });

    const results = await runtime.runPromise(
      hybridSearchEffect("q", { limit: 10 })
    );
    expect(results.map((item) => item.slug)).toEqual(["a"]);
  });
});
