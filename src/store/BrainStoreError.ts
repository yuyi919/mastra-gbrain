import { Schema } from "@tslibs/effect";
import { Effect } from "effect";
import { or } from "effect/Predicate";
import { isSchemaError } from "effect/Schema";
import { SqlError } from "effect/unstable/sql";

export type StoreErrorReason = SqlError.SqlError | Schema.SchemaError;

export const StoreErrorReason = Schema.Union([
  SqlError.SqlError,
  Schema.instanceOf(Schema.SchemaError),
]);

export class StoreError extends Schema.TaggedClass<StoreError>()(
  "WorkerError",
  {
    reason: StoreErrorReason,
  }
) {
  get message(): string {
    return this.reason.message;
  }

  static from(reason: StoreErrorReason) {
    return new StoreError({ reason });
  }
  static failed(reason: StoreErrorReason) {
    return Effect.fail(StoreError.from(reason));
  }
  static catch<T, E = never>(
    effect: Effect.Effect<T, E>
  ): Effect.Effect<
    T,
    Exclude<E, Schema.SchemaError | SqlError.SqlError> | StoreError,
    never
  > {
    return Effect.catchIf(effect, or(SqlError.isSqlError, isSchemaError), (e) =>
      StoreError.failed(e)
    );
  }
}
