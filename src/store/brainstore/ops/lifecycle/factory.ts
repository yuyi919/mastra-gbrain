import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { OpsLifecycle, type OpsLifecycleService } from "./interface.js";

export interface OpsLifecycleDependencies {
  sql: {
    withTransaction<A, E = never, R = never>(
      effect: Eff.Effect<A, E, R>
    ): Eff.Effect<A, E, R>;
    unsafe(sqlText: string): { raw: Eff.Effect<unknown> };
  };
  initSql: string;
  initialized: Eff.Ref.Ref<boolean>;
  createIndex?: () => Promise<void> | void;
  disposeVector?: () => Promise<void> | void;
}

export const makeOpsLifecycle = (
  deps: OpsLifecycleDependencies
): OpsLifecycleService =>
  ({
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
    }, Eff.unsafeCoerce) as OpsLifecycleService["init"],
    dispose: Eff.fn("ops.lifecycle.dispose")(function* () {
      yield* Eff.from(() => deps.disposeVector?.());
    }, Eff.tapDefect(Eff.logError)) as OpsLifecycleService["dispose"],
    transaction: ((effect) =>
      deps.sql
        .withTransaction(effect)
        .pipe(Eff.unsafeCoerce)) as OpsLifecycleService["transaction"],
  }) as OpsLifecycleService;

export const makeLayer = (
  service: OpsLifecycleService | OpsLifecycleDependencies
) =>
  Layer.succeed(
    OpsLifecycle,
    "initialized" in service ? makeOpsLifecycle(service) : service
  );
