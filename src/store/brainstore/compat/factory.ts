import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type {
  BrainStoreFeatureTree,
  BrainStoreService,
  IngestionStore,
} from "../../BrainStore.js";
import { BrainStoreTree, type BrainStoreTreeService } from "../tree/index.js";
import { BrainStoreCompat, type BrainStoreCompatService } from "./interface.js";

export const makeCompatBrainStore = (
  tree: BrainStoreTreeService,
  compat: BrainStoreService
): BrainStoreCompatService => {
  const ingestion: IngestionStore = {
    getPage: tree.content.pages.getPage,
    listPages: tree.content.pages.listPages,
    resolveSlugs: tree.content.pages.resolveSlugs,
    getTags: tree.content.pages.getTags,
    createVersion: compat.createVersion,
    getVersions: tree.content.pages.getVersions,
    revertToVersion: tree.content.pages.revertToVersion,
    putPage: compat.putPage,
    updateSlug: tree.content.pages.updateSlug,
    deletePage: tree.content.pages.deletePage,
    addTag: tree.content.pages.addTag,
    removeTag: tree.content.pages.removeTag,
    upsertChunks: tree.content.chunks.upsertChunks,
    deleteChunks: tree.content.chunks.deleteChunks,
    getChunks: tree.content.chunks.getChunks,
    getChunksWithEmbeddings: compat.getChunksWithEmbeddings,
    getEmbeddingsByChunkIds: tree.retrieval.embedding.getEmbeddingsByChunkIds,
  };
  const features: BrainStoreFeatureTree = {
    ingestion,
    links: tree.graph.links,
    search: tree.retrieval.search,
    timeline: tree.graph.timeline,
    ext: compat,
    lifecycle: tree.ops.lifecycle,
    unsafe: tree.ops.internal,
  };
  const service: BrainStoreCompatService = {
    ...compat,
    ...tree.retrieval.search,
    ...tree.graph.links,
    ...ingestion,
    getChunksWithEmbeddings: compat.getChunksWithEmbeddings,
    getEmbeddingsByChunkIds: tree.retrieval.embedding.getEmbeddingsByChunkIds,
    ...tree.graph.timeline,
    ...tree.ops.lifecycle,
    ...tree.ops.internal,
    tree,
    features,
  };
  return service;
};

export const makeLayer = (
  tree: BrainStoreTreeService,
  compat: BrainStoreService
) =>
  Layer.merge(
    Layer.succeed(BrainStoreTree, tree),
    Layer.succeed(BrainStoreCompat, makeCompatBrainStore(tree, compat))
  );

// Transitional compat-over-tree adapter only. Runtime behavior still migrates later.
export const transitionalCompat = makeCompatBrainStore;
