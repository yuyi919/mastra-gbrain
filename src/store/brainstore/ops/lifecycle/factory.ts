import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { SqlClient, type SqlError } from "effect/unstable/sql";
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

export interface OpsLifecycleLayerOptions {
  initSql: string;
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

function isDependencies(
  service:
    | OpsLifecycleService
    | OpsLifecycleDependencies
    | OpsLifecycleLayerOptions
): service is OpsLifecycleDependencies {
  return "initialized" in service;
}

function isService(
  service:
    | OpsLifecycleService
    | OpsLifecycleDependencies
    | OpsLifecycleLayerOptions
): service is OpsLifecycleService {
  return "init" in service && "dispose" in service && "transaction" in service;
}

export const makeLayer = (
  service:
    | OpsLifecycleService
    | OpsLifecycleDependencies
    | OpsLifecycleLayerOptions
) => {
  if (isService(service)) {
    return Layer.succeed(OpsLifecycle, service);
  }
  if (isDependencies(service)) {
    return Layer.succeed(OpsLifecycle, makeOpsLifecycle(service));
  }
  return Layer.effect(
    OpsLifecycle,
    Eff.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const initialized = yield* Eff.Ref.make(false);
      return makeOpsLifecycle({
        sql,
        initialized,
        initSql: service.initSql,
        createIndex: service.createIndex,
        disposeVector: service.disposeVector,
      });
    })
  );
};
