import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { StoreError } from "../../../BrainStoreError.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import type { VectorProviderService } from "../vector/index.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface UnsafeDBService {
  query<T>(text: string, params?: ReadonlyArray<unknown>): EngineEffect<T[]>;
  get<T>(text: string, params?: ReadonlyArray<unknown>): EngineEffect<T>;
  run(text: string, params?: ReadonlyArray<unknown>): EngineEffect<void>;
}

export interface OpsInternalService extends UnsafeDBService {
  readonly sql: SqlClient;
  readonly mappers: SqlBuilder;
  readonly vectors: VectorProviderService;
}

export class OpsInternal extends Context.Service<
  OpsInternal,
  OpsInternalService
>()("@yui-agent/brain-mastra/BrainStoreTree/ops/internal/UnsafeDB") {}
