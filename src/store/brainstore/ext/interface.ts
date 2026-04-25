import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  DatabaseHealth,
  FileRecord,
  IngestLogEntry,
  IngestLogInput,
  McpRequestLog,
  RawData,
  StaleChunk,
  VectorMetadata,
} from "../../../types.js";
import type { StoreError } from "../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface ExtService {
  putRawData(slug: string, source: string, data: unknown): EngineEffect<void>;
  getRawData(slug: string, source?: string): EngineEffect<RawData[]>;
  upsertFile(
    file: Omit<FileRecord, "id" | "page_id" | "created_at">
  ): EngineEffect<void>;
  getFile(storagePath: string): EngineEffect<FileRecord | null>;
  getConfig(key: string): EngineEffect<string | null>;
  setConfig(key: string, value: string): EngineEffect<void>;
  logIngest(log: IngestLogInput): EngineEffect<void>;
  verifyAccessToken(tokenHash: string): EngineEffect<AccessToken | null>;
  logMcpRequest(
    log: Omit<McpRequestLog, "id" | "created_at">
  ): EngineEffect<void>;
  getHealthReport(): EngineEffect<DatabaseHealth>;
  getStats(): EngineEffect<BrainStats>;
  getHealth(): EngineEffect<BrainHealth>;
  getStaleChunks(): EngineEffect<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): EngineEffect<void>;
  markChunksEmbedded(chunkIds: number[]): EngineEffect<void>;
  getIngestLog(opts?: { limit?: number }): EngineEffect<IngestLogEntry[]>;
}

export class BrainStoreExt extends Context.Service<BrainStoreExt, ExtService>()(
  "@yui-agent/brain-mastra/BrainStore/Ext"
) {}
