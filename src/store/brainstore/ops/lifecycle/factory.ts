import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { SqlClient, type SqlError } from "effect/unstable/sql";
import { StoreError } from "../../../BrainStoreError.js";
import { VectorProvider, type VectorProviderService } from "../vector/index.js";
import { OpsLifecycle, type OpsLifecycleService } from "./interface.js";

export type OpsLifecycleVectorProvider = Pick<
  VectorProviderService,
  "createIndex" | "dispose"
>;

export interface OpsLifecycleDependencies {
  sql: {
    withTransaction<A, E = never, R = never>(
      effect: Eff.Effect<A, E, R>
    ): Eff.Effect<A, E | SqlError.SqlError, R>;
    unsafe(sqlText: string): { raw: Eff.Effect<unknown, SqlError.SqlError> };
  };
  initSql: string;
  initialized: Eff.Ref.Ref<boolean>;
  vectors: OpsLifecycleVectorProvider;
  indexName: string;
  dimension: number;
}

export interface OpsLifecycleLayerOptions {
  initSql: string;
  indexName: string;
  dimension: number;
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
          deps.vectors.createIndex({
            indexName: deps.indexName,
            dimension: deps.dimension,
            metric: "cosine",
          }),
          { concurrent: true }
        )
      );
      yield* Eff.Ref.set(deps.initialized, true);
    }, catchStoreError),
    dispose: Eff.fn("ops.lifecycle.dispose")(function* () {
      yield* deps.vectors.dispose();
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
      const vectors = yield* VectorProvider;
      const initialized = yield* Eff.Ref.make(false);
      return makeOpsLifecycle({
        sql,
        vectors,
        initialized,
        initSql: service.initSql,
        indexName: service.indexName,
        dimension: service.dimension,
      });
    })
  );
};
