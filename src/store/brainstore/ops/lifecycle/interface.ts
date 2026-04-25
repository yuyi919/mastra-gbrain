import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Schema } from "effect";
import type { SqlError } from "effect/unstable/sql";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

// The assembled store keeps acquireRelease ownership here while branches depend
// on init/dispose/transaction through this single lifecycle contract.
export interface OpsLifecycleService {
  init(): EngineEffect<void>;
  dispose(): EngineEffect<void>;
  transaction<T, E = never, R = never>(
    effect: Eff.Effect<T, E, R>
  ): Eff.Effect<
    T,
    StoreError | Exclude<E, SqlError.SqlError | Schema.SchemaError>,
    R
  >;
}

export class OpsLifecycle extends Context.Service<
  OpsLifecycle,
  OpsLifecycleService
>()("@yui-agent/brain-mastra/BrainStoreTree/ops/lifecycle") {}
