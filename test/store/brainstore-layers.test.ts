import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import { BrainStoreSearch } from "../../src/store/BrainStore.js";
import {
  ContentChunks,
  makeContentChunks,
} from "../../src/store/brainstore/content/chunks/index.js";
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

  test("content chunks owns getChunksWithEmbeddings through service injection", async () => {
    const chunks = makeContentChunks({
      mappers: {
        getChunksBySlug: () =>
          Effect.succeed([
            {
              id: 1,
              page_id: 1,
              chunk_index: 0,
              chunk_text: "branch-owned chunk",
              chunk_source: "compiled_truth",
              token_count: 2,
              model: null,
              embedded_at: null,
            },
          ]),
      } as any,
    });
    const runtime = ManagedRuntime.make(
      Layer.succeed(ContentChunks, ContentChunks.of(chunks))
    );

    const resolved = await runtime.runPromise(
      ContentChunks.use((service) => service.getChunksWithEmbeddings("page-a"))
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0].chunk_text).toBe("branch-owned chunk");
  });
});
