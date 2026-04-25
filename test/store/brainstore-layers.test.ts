import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import { BrainStoreSearch } from "../../src/store/BrainStore.js";
import { makeRetrievalSearch } from "../../src/store/brainstore/retrieval/search/index.js";

describe("brainstore branch-only scaffolding", () => {
  test("supports branch-only injection with Layer.succeed", async () => {
    const search = makeRetrievalSearch({
      mappers: {
        searchKeyword: () =>
          ({
            asEffect: () => Effect.succeed([]),
          }) as any,
      },
      backlinks: {
        getBacklinkCounts: () => Effect.succeed(new Map()),
      },
      embeddings: {
        getEmbeddingsByChunkIds: () => Effect.succeed(new Map()),
      },
      vectorSearch: {
        searchVector: () => Effect.succeed([] as any),
      },
    });
    const runtime = ManagedRuntime.make(
      Layer.succeed(BrainStoreSearch, BrainStoreSearch.of(search as any))
    );

    const resolved = await runtime.runPromise(BrainStoreSearch.asEffect());
    expect(resolved).toHaveProperty("searchKeyword");
    expect(resolved).toHaveProperty("getEmbeddingsByChunkIds");
  });
});
