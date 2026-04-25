import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { StoreError } from "../../../BrainStoreError.js";
import {
  VectorProvider,
  type VectorProviderClient,
  type VectorProviderService,
} from "./interface.js";

export interface VectorProviderDependencies {
  vectorStore?: VectorProviderClient;
  disposeVector?: () => Promise<void> | void;
}

export const makeNoopVectorProvider = (): VectorProviderService =>
  VectorProvider.of({
    query: () => Eff.succeed([]),
    upsert: () => Eff.void,
    deleteVectors: () => Eff.void,
    createIndex: () => Eff.void,
    dispose: () => Eff.void,
  });

export const makeVectorProvider = (
  deps: VectorProviderDependencies = {}
): VectorProviderService => {
  const catchStoreError = StoreError.catch;
  const { vectorStore, disposeVector } = deps;
  if (!vectorStore) return makeNoopVectorProvider();

  return VectorProvider.of({
    query: Eff.fn("ops.vector.query")(function* (input) {
      return yield* Eff.promise(() => vectorStore.query(input));
    }, catchStoreError),
    upsert: Eff.fn("ops.vector.upsert")(function* (input) {
      if (input.vectors.length === 0) return;
      yield* Eff.promise(() => vectorStore.upsert(input));
    }, catchStoreError),
    deleteVectors: Eff.fn("ops.vector.deleteVectors")(function* (input) {
      yield* Eff.promise(() => vectorStore.deleteVectors(input));
    }, catchStoreError),
    createIndex: Eff.fn("ops.vector.createIndex")(function* (input) {
      yield* Eff.promise(() => vectorStore.createIndex(input));
    }, catchStoreError),
    dispose: Eff.fn("ops.vector.dispose")(function* () {
      yield* Eff.from(() => disposeVector?.());
    }, catchStoreError),
  });
};

function isService(
  service: VectorProviderService | VectorProviderDependencies
): service is VectorProviderService {
  return "query" in service && "upsert" in service;
}

export const makeLayer = (
  service: VectorProviderService | VectorProviderDependencies = {}
) => {
  if (isService(service)) {
    return Layer.succeed(VectorProvider, service);
  }
  return Layer.succeed(VectorProvider, makeVectorProvider(service));
};
