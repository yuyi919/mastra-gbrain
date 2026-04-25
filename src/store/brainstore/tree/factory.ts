import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { ContentChunks } from "../content/chunks/index.js";
import { ContentPages } from "../content/pages/index.js";
import { GraphLinks } from "../graph/links/index.js";
import { GraphTimeline } from "../graph/timeline/index.js";
import { OpsInternal } from "../ops/internal/index.js";
import { OpsLifecycle } from "../ops/lifecycle/index.js";
import { RetrievalEmbedding } from "../retrieval/embedding/index.js";
import { RetrievalSearch } from "../retrieval/search/index.js";
import { BrainStoreTree, type BrainStoreTreeService } from "./interface.js";

export const makeBrainStoreTree = (
  tree: BrainStoreTreeService
): BrainStoreTreeService => tree;

export const makeLayer = (tree: BrainStoreTreeService) =>
  Layer.succeed(BrainStoreTree, makeBrainStoreTree(tree));

export const mergeBranchLayers = Layer.mergeAll;

export const makeComposedLayer = Layer.effect(
  BrainStoreTree,
  Eff.gen(function* () {
    return makeBrainStoreTree({
      content: {
        pages: yield* ContentPages,
        chunks: yield* ContentChunks,
      },
      graph: {
        links: yield* GraphLinks,
        timeline: yield* GraphTimeline,
      },
      retrieval: {
        search: yield* RetrievalSearch,
        embedding: yield* RetrievalEmbedding,
      },
      ops: {
        lifecycle: yield* OpsLifecycle,
        internal: yield* OpsInternal,
      },
    });
  })
);
