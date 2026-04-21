import { Schema } from "@tslibs/effect";
import { Effect } from "effect";
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
  constructor(reason: StoreErrorReason) {
    super({ reason });
  }

  get message(): string {
    return this.reason.message;
  }

  static from(reason: StoreErrorReason) {
    return new StoreError(reason);
  }
  static failed(reason: StoreErrorReason) {
    return Effect.fail(StoreError.from(reason));
  }
  static catch<T, E extends StoreErrorReason>(effect: Effect.Effect<T, E>) {
    return Effect.catch(effect, StoreError.failed);
  }
}
