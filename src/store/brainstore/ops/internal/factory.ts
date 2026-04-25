import type { LibSQLVector } from "@mastra/libsql";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { StoreError } from "../../../BrainStoreError.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import { OpsInternal, type OpsInternalService } from "./interface.js";

export interface OpsInternalDependencies {
  sql: SqlClient;
  mappers: SqlBuilder;
  vectorStore?: LibSQLVector;
}

export const makeOpsInternal = (
  deps: OpsInternalDependencies
): OpsInternalService => ({
  sql: deps.sql,
  mappers: deps.mappers,
  vectorStore: deps.vectorStore,
  query: (text, params) =>
    deps.sql
      .unsafe(text, params)
      .unprepared.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
        StoreError.catch,
        Eff.unsafeCoerce<any, any>
      ),
  get: (text, params) =>
    deps.sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      StoreError.catch,
      Eff.map((rows: ReadonlyArray<object>) => rows[0]),
      Eff.unsafeCoerce<any, any>
    ),
  run: (text, params) =>
    deps.sql
      .unsafe(text, params)
      .raw.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
        StoreError.catch,
        Eff.unsafeCoerce<any, any>
      ),
});

export const makeLayer = (
  service: OpsInternalService | OpsInternalDependencies
) =>
  Layer.succeed(
    OpsInternal,
    "mappers" in service && "sql" in service && !("query" in service)
      ? makeOpsInternal(service)
      : service
  );
