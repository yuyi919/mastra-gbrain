import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type { BrainStoreService } from "../../BrainStore.js";
import { BrainStoreTree, type BrainStoreTreeService } from "../tree/index.js";
import { BrainStoreCompat, type BrainStoreCompatService } from "./interface.js";

export const makeCompatBrainStore = (
  tree: BrainStoreTreeService,
  compat: BrainStoreService
): BrainStoreCompatService => {
  void tree;
  return compat;
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
