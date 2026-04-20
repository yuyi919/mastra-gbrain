import { Context, Effect, flow, Layer, Option, pipe } from "effect";
import { EmbeddingModel } from "effect/unstable/ai";
import { resolveModelFile } from "node-llama-cpp";
import type { EmbeddingProvider, StoreProvider } from "./interface.js";
import { LibSQLStore, type LibSQLStoreOptions } from "./libsql.js";
import {
  LlamaEmbeddingProvider,
  type LlamaEmbeddingProviderOptions,
} from "./llama-embedder.js";

export function createDefaultStore(
  options: LibSQLStoreOptions = { url: "file::memory:" }
) {
  return new LibSQLStore({
    ...options,
    url: options.url || "file::memory:",
    dimension: options.dimension || 768,
  });
}

export async function createDefaultEmbedder(
  options: LlamaEmbeddingProviderOptions = {}
) {
  const modelsDir = "./tmp/models";
  const enModelUrl = "hf:CompendiumLabs/bge-base-en-v1.5-gguf:Q4_K_M"; // "hf:nomic-ai/nomic-embed-text-v1.5-GGUF:Q8_0";
  const zhModelUrl = "hf:CompendiumLabs/bge-base-zh-v1.5-gguf:Q4_K_M";
  const enModelPath =
    options.modelPathEn ?? (await resolveModelFile(enModelUrl, modelsDir));
  const zhModelPath =
    options.modelPathZh ?? (await resolveModelFile(zhModelUrl, modelsDir));
  return new LlamaEmbeddingProvider({
    ...options,
    modelPathEn: enModelPath,
    modelPathZh: zhModelPath,
    dimension: options.dimension ?? 768,
  });
}

const Dimension = pipe(
  Effect.serviceOption(EmbeddingModel.Dimensions),
  Effect.map(
    Option.getOrElse(
      () =>
        1536 /** for (openai) text-embedding-3-small, 1024 for voyage, etc. */
    )
  )
);

const Embdder = Effect.gen(function* () {
  const dimension = yield* Dimension;
  const embddingService = yield* EmbeddingModel.EmbeddingModel;
  const context = yield* Effect.context();
  const embedder: EmbeddingProvider = {
    async embedBatch(texts) {
      const r = await embddingService
        .embedMany(texts)
        .pipe(Effect.runPromiseWith(context));
      return r.embeddings.map((e) => e.vector as number[]);
    },
    embedQuery: async (text: string): Promise<number[]> => {
      const r = await embddingService
        .embedMany([text])
        .pipe(Effect.runPromiseWith(context));
      return r.embeddings[0].vector as number[];
    },
    dimension,
  };
  return embedder;
});

const make = Effect.fnUntraced(function* (
  path: `file:${string}`,
  vectorUrl: string = path
) {
  const embedder = yield* Embdder;
  const dimension = embedder.dimension;
  const store = new LibSQLStore({ url: path, vectorUrl, dimension });
  yield* Effect.promise(() => store.init());
  return { store: store as StoreProvider, embedder };
});

export class BrainStoreProvider extends Context.Service<BrainStoreProvider>()(
  "@yui-agent/brain-mastra/BrainStoreProvider",
  {
    make,
  }
) {
  static Dimension: Effect.Effect<number> = Dimension;
  static liveWith: (
    store: StoreProvider
  ) => Layer.Layer<BrainStoreProvider, never, EmbeddingModel.EmbeddingModel> = (
    store
  ) =>
    Layer.unwrap(
      Effect.gen(function* () {
        return Layer.succeed(
          BrainStoreProvider,
          BrainStoreProvider.of({ store, embedder: yield* Embdder })
        );
      })
    );

  static Default: (
    path: `file:${string}`,
    vectorUrl?: string | undefined
  ) => Layer.Layer<BrainStoreProvider, never, EmbeddingModel.EmbeddingModel> =
    flow(make, Layer.effect(BrainStoreProvider));
}
