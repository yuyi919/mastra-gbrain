import type { DrizzleConfig } from "drizzle-orm";
import { TypedQueryBuilder } from "drizzle-orm/query-builders/query-builder";
import { QueryPromise } from "drizzle-orm/query-promise";
import type { SQLiteSession } from "drizzle-orm/sqlite-core";
import { SQLiteCountBuilder } from "drizzle-orm/sqlite-core/query-builders/count";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { flow } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Client from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";
import { makeRemoteCallback, patch } from "./internal/patch.js";

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  TSchema extends Record<string, unknown> = Record<string, never>,
>(
  config?: Omit<DrizzleConfig<TSchema>, "logger">
): Effect.Effect<SqliteRemoteDatabase<TSchema>, never, Client.SqlClient> =>
  Effect.gen(function* () {
    const db = drizzle(yield* makeRemoteCallback, config);
    return db;
  });

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWithConfig: (
  config: DrizzleConfig
) => Effect.Effect<SqliteRemoteDatabase, never, Client.SqlClient> = (config) =>
  Effect.gen(function* () {
    const db = drizzle(yield* makeRemoteCallback, config);
    return db;
  });

/**
 * @since 1.0.0
 * @category tags
 */
export class DB extends Context.Service<DB, SqliteRemoteDatabase<any>>()(
  "@effect/sql-drizzle/Sqlite"
) {}

/**
 * @since 1.0.0
 * @category layers
 */
export const makeLayer: <
  TSchema extends Record<string, unknown> = Record<string, never>,
>(
  config?: Omit<DrizzleConfig<TSchema>, "logger">
) => Layer.Layer<DB, never, Client.SqlClient> = (config) =>
  Layer.effect(DB, make(config));

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithConfig: (
  config: DrizzleConfig
) => Layer.Layer<DB, never, Client.SqlClient> = flow(
  makeWithConfig,
  Layer.effect(DB)
);

// biome-ignore lint/suspicious/noConfusingVoidType: Returning in Effect
type ExcludeUnknown<T> = [unknown] extends [T] ? void : T;
// patch
declare module "drizzle-orm" {
  export interface QueryPromise<T>
    extends Effect.Yieldable<
      Effect.Effect<ExcludeUnknown<T>, SqlError>,
      ExcludeUnknown<T>,
      SqlError
    > {}
}
// declare module "drizzle-orm/sqlite-core/query-builders/update" {
//   export interface SQLiteUpdateBase extends Effect.Effect<void, SqlError> {}
// }
declare module "drizzle-orm/sqlite-core/query-builders/count" {
  export interface SQLiteCountBuilder<
    TSession extends SQLiteSession<any, any, any, any>,
  > extends Effect.Yieldable<
      Effect.Effect<number, SqlError>,
      number,
      SqlError
    > {}
}
patch(QueryPromise.prototype);
patch(TypedQueryBuilder.prototype);
patch(SQLiteCountBuilder.prototype);
Effect.isEffect;
