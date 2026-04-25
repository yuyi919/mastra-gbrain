import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type { SqlError } from "effect/unstable/sql";
import { StoreError } from "../../../BrainStoreError.js";
import { OpsLifecycle, type OpsLifecycleService } from "./interface.js";

export interface OpsLifecycleDependencies {
  sql: {
    withTransaction<A, E = never, R = never>(
      effect: Eff.Effect<A, E, R>
    ): Eff.Effect<A, E | SqlError.SqlError, R>;
    unsafe(sqlText: string): { raw: Eff.Effect<unknown, SqlError.SqlError> };
  };
  initSql: string;
  initialized: Eff.Ref.Ref<boolean>;
  createIndex?: () => Promise<void> | void;
  disposeVector?: () => Promise<void> | void;
}

export const makeOpsLifecycle = (
  deps: OpsLifecycleDependencies
): OpsLifecycleService => {
  const catchStoreError = StoreError.catch;
  return {
    init: Eff.fn("ops.lifecycle.init")(function* () {
      if (yield* Eff.Ref.get(deps.initialized)) return;
      yield* Eff.forEach(deps.initSql.split(";\n").filter(Boolean), (rawSQL) =>
        deps.sql.unsafe(rawSQL).raw.pipe(Eff.tapError(Eff.logError))
      ).pipe(
        Eff.zipRight(
          Eff.from(() => deps.createIndex?.()),
          { concurrent: true }
        )
      );
      yield* Eff.Ref.set(deps.initialized, true);
    }, catchStoreError),
    dispose: Eff.fn("ops.lifecycle.dispose")(function* () {
      yield* Eff.from(() => deps.disposeVector?.());
    }, Eff.tapDefect(Eff.logError)),
    transaction: (effect) =>
      deps.sql.withTransaction(effect).pipe(catchStoreError),
  };
};

export const makeLayer = (
  service: OpsLifecycleService | OpsLifecycleDependencies
) =>
  Layer.succeed(
    OpsLifecycle,
    "initialized" in service ? makeOpsLifecycle(service) : service
  );
