import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime } from "effect";
import {
  BrainStoreEmbedding,
  BrainStoreSearch,
} from "../../src/store/BrainStore.js";
import { makeCompatBrainStore } from "../../src/store/brainstore/compat/index.js";
import { ContentChunks } from "../../src/store/brainstore/content/chunks/index.js";
import { ContentPages } from "../../src/store/brainstore/content/pages/index.js";
import { GraphLinks } from "../../src/store/brainstore/graph/links/index.js";
import { GraphTimeline } from "../../src/store/brainstore/graph/timeline/index.js";
import { OpsInternal } from "../../src/store/brainstore/ops/internal/index.js";
import { OpsLifecycle } from "../../src/store/brainstore/ops/lifecycle/index.js";
import { RetrievalEmbedding } from "../../src/store/brainstore/retrieval/embedding/index.js";
import { RetrievalSearch } from "../../src/store/brainstore/retrieval/search/index.js";
import {
  BrainStoreTree,
  makeComposedLayer,
} from "../../src/store/brainstore/tree/index.js";

const createTreeRuntime = () =>
  ManagedRuntime.make(
    makeComposedLayer.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(ContentPages, ContentPages.of({} as any)),
          Layer.succeed(ContentChunks, ContentChunks.of({} as any)),
          Layer.succeed(GraphLinks, GraphLinks.of({} as any)),
          Layer.succeed(GraphTimeline, GraphTimeline.of({} as any)),
          Layer.succeed(RetrievalSearch, BrainStoreSearch.of({} as any)),
          Layer.succeed(RetrievalEmbedding, BrainStoreEmbedding.of({} as any)),
          Layer.succeed(OpsLifecycle, OpsLifecycle.of({} as any)),
          Layer.succeed(OpsInternal, OpsInternal.of({} as any))
        )
      )
    )
  );

describe("brainstore tree scaffolding", () => {
  test("defines BrainStoreTree before compat projection", async () => {
    const runtime = createTreeRuntime();
    const tree = await runtime.runPromise(BrainStoreTree.use(Effect.succeed));
    const compat = makeCompatBrainStore(tree, {} as any);
    expect(tree).toHaveProperty("content");
    expect(tree).toHaveProperty("retrieval");
    expect(compat).toBeDefined();
  });
});
