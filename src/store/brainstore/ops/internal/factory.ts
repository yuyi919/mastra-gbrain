import type { LibSQLVector } from "@mastra/libsql";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { OpsInternal, type OpsInternalService } from "./interface.js";

export interface OpsInternalDependencies {
  sql: any;
  mappers: any;
  vectorStore?: LibSQLVector;
}

export const makeOpsInternal = (
  deps: OpsInternalDependencies
): OpsInternalService => ({
  sql: deps.sql as any,
  mappers: deps.mappers as any,
  vectorStore: deps.vectorStore,
  query: (text, params) =>
    deps.sql
      .unsafe(text, params)
      .unprepared.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
        Eff.unsafeCoerce<any, any>
      ),
  get: (text, params) =>
    deps.sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      Eff.map((rows: any[]) => rows[0]),
      Eff.unsafeCoerce<any, any>
    ),
  run: (text, params) =>
    deps.sql
      .unsafe(text, params)
      .raw.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
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
      : (service as OpsInternalService)
  );
