/** biome-ignore-all lint/complexity/noUselessUndefinedInitialization: skip */
/** biome-ignore-all lint/complexity/useLiteralKeys: effect-hack */

import type { QueryPromise } from "drizzle-orm/query-promise";
import type { Context } from "effect/Context";
import * as Effect from "effect/Effect";
import * as Client from "effect/unstable/sql/SqlClient";
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError";

let currentRuntime: any = undefined;

const effectId = `~effect/Effect`;

const Patch: Effect.YieldableClass<any, SqlError> = {
  [Symbol.iterator]: Effect.YieldableClass.prototype[Symbol.iterator] as any,
  asEffect(
    this: QueryPromise<any> & {
      readonly prepare: () => any;
      readonly dialect: any;
      readonly toSQL: () => { sql: string; params: Array<any> };
    }
  ) {
    return Effect.context<never>().pipe(
      Effect.flatMap((context) =>
        Effect.tryPromise({
          try: () => {
            const pre = currentRuntime;
            currentRuntime = context;
            const out = this.execute?.() ?? this;
            currentRuntime = pre;
            return out;
          },
          catch: (cause) =>
            new SqlError({
              reason: new UnknownError({
                cause,
                message:
                  "Failed to execute QueryPromise(" +
                  (cause && typeof cause === "object" && "message" in cause
                    ? cause.message
                    : "Unknown Error") +
                  ")",
              }),
            }),
        })
      )
    );
  },
};
/** @internal */
export const patch = (prototype: any) => {
  if (effectId in prototype) {
    return;
  }
  Object.assign(prototype, Patch);
};
/** @internal */
export const makeRemoteCallback = Effect.gen(function* () {
  const client = yield* Client.SqlClient;
  const constructionRuntime = yield* Effect.context<never>();
  return (
    sql: string,
    params: Array<any>,
    method: "all" | "execute" | "get" | "values" | "run"
  ) => {
    const runPromise = Effect.runPromiseWith(
      (currentRuntime as Context<any>) ? currentRuntime : constructionRuntime
    );
    const statement = client.unsafe(sql, params);
    if (method === "execute") {
      return runPromise(
        Effect.result(
          Effect.map(statement.raw, (header) => ({ rows: [header] }))
        )
      ).then((res) => {
        if (res._tag === "Failure") {
          throw res.failure.cause;
        }
        return res.success;
      });
    }
    let effect: Effect.Effect<any, SqlError> =
      method === "all" || method === "values" || method === "get"
        ? statement.values
        : statement.withoutTransform;
    if (method === "get") {
      effect = Effect.map(effect, (rows) => rows[0] ?? undefined);
    }
    return runPromise(
      Effect.result(
        Effect.map(effect, (rows) => {
          return { rows };
        })
      )
    ).then((res) => {
      if (res._tag === "Failure") {
        throw res.failure.cause;
      }
      return res.success;
    });
  };
});
