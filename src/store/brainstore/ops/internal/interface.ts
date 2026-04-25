import type { LibSQLVector } from "@mastra/libsql";
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { UnsafeDBService } from "../../../BrainStore.js";
import type { StoreError } from "../../../BrainStoreError.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface OpsInternalService extends UnsafeDBService {
  readonly sql: SqlClient;
  readonly mappers: SqlBuilder;
  readonly vectorStore?: LibSQLVector;
}

export class OpsInternal extends Context.Service<
  OpsInternal,
  OpsInternalService
>()("@yui-agent/brain-mastra/BrainStoreTree/ops/internal/UnsafeDB") {}
