import type { LibSQLVector } from "@mastra/libsql";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { SqlClient as SqlClientTag } from "effect/unstable/sql";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { StoreError } from "../../../BrainStoreError.js";
import { Mappers } from "../../../Mappers.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import { OpsInternal, type OpsInternalService } from "./interface.js";

export interface OpsInternalDependencies {
  sql: SqlClient;
  mappers: SqlBuilder;
  vectorStore?: LibSQLVector;
}

export interface OpsInternalLayerOptions {
  vectorStore?: LibSQLVector;
}

export const makeOpsInternal = (
  deps: OpsInternalDependencies
): OpsInternalService => ({
  sql: deps.sql,
  mappers: deps.mappers,
  vectorStore: deps.vectorStore,
  query: <T>(text: string, params?: ReadonlyArray<unknown>) =>
    deps.sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      StoreError.catch,
      Eff.map((rows: ReadonlyArray<object>) => rows as T[])
    ),
  get: <T>(text: string, params?: ReadonlyArray<unknown>) =>
    deps.sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      StoreError.catch,
      Eff.map((rows: ReadonlyArray<object>) => rows[0] as T)
    ),
  run: (text, params) =>
    deps.sql
      .unsafe(text, params)
      .raw.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
        StoreError.catch,
        Eff.asVoid
      ),
});

function isDependencies(
  service:
    | OpsInternalService
    | OpsInternalDependencies
    | OpsInternalLayerOptions
): service is OpsInternalDependencies {
  return "mappers" in service && "sql" in service && !("query" in service);
}

function isService(
  service:
    | OpsInternalService
    | OpsInternalDependencies
    | OpsInternalLayerOptions
): service is OpsInternalService {
  return "query" in service;
}

export const makeLayer = (
  service:
    | OpsInternalService
    | OpsInternalDependencies
    | OpsInternalLayerOptions
) => {
  if (isService(service)) {
    return Layer.succeed(OpsInternal, service);
  }
  if (isDependencies(service)) {
    return Layer.succeed(OpsInternal, makeOpsInternal(service));
  }
  return Layer.effect(
    OpsInternal,
    Eff.gen(function* () {
      const sql = yield* SqlClientTag.SqlClient;
      const mappers = yield* Mappers;
      return makeOpsInternal({
        sql,
        mappers,
        vectorStore: service.vectorStore,
      });
    })
  );
};
