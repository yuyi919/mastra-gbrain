import { DummyEmbeddingProvider } from "./dummy-embedder.js";
import type { EmbeddingProvider } from "./interface.js";
import { LibSQLStore } from "./libsql.js";
import { LlamaEmbeddingProvider } from "./llama-embedder.js";

export type DefaultEmbedderKind = "dummy" | "llama";

export interface DefaultEmbedderOptions {
  kind?: DefaultEmbedderKind;
  dummy?: {
    dimension?: number;
  };
  llama?: {
    modelPathEn?: string;
    modelPathZh?: string;
    defaultLang?: "en" | "zh";
  };
}

// Default global factory functions
export function createDefaultStore() {
  return new LibSQLStore({ url: "file::memory:", dimension: 1536 });
}

function readEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

function readEmbedderKindFromEnv(): DefaultEmbedderKind | undefined {
  const raw = readEnv("GBRAIN_EMBEDDER")?.toLowerCase();
  if (raw === "dummy") return "dummy";
  if (raw === "llama") return "llama";
  if (raw === "node-llama-cpp") return "llama";
  if (raw === "local") return "llama";
  return undefined;
}

function readDummyDimensionFromEnv(): number | undefined {
  const raw = readEnv("GBRAIN_DUMMY_EMBEDDING_DIMENSION");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return undefined;
}

export function createDefaultEmbedder(
  options: DefaultEmbedderOptions = {}
): EmbeddingProvider {
  const envKind = readEmbedderKindFromEnv();
  const envModelPathEn = readEnv("GBRAIN_LLAMA_EMBED_MODEL_EN");
  const envModelPathZh = readEnv("GBRAIN_LLAMA_EMBED_MODEL_ZH");

  const kind: DefaultEmbedderKind =
    options.kind ??
    envKind ??
    (options.llama?.modelPathEn ||
    options.llama?.modelPathZh ||
    envModelPathEn ||
    envModelPathZh
      ? "llama"
      : "dummy");

  if (kind === "llama") {
    return new LlamaEmbeddingProvider({
      modelPathEn: options.llama?.modelPathEn ?? envModelPathEn,
      modelPathZh: options.llama?.modelPathZh ?? envModelPathZh,
      defaultLang: options.llama?.defaultLang,
    });
  }

  const dimension =
    options.dummy?.dimension ?? readDummyDimensionFromEnv() ?? 1536;
  return new DummyEmbeddingProvider(dimension);
}
