import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Metric, ScopedCache } from "@tslibs/effect";
import {
  Effect,
  Exit,
  flow,
  Layer,
  Logger,
  Pool,
  Scope,
} from "@tslibs/effect/effect-next";
import { FsUtilsLive } from "@tslibs/effect/FsUtils";
import { Persistence } from "effect/unstable/persistence";
import {
  getLlama,
  type LlamaEmbeddingContext,
  LlamaLogLevel,
  type LlamaOptions,
} from "node-llama-cpp";
import type { EmbeddingProvider } from "./interface.js";

type Embedding = number[];
type LlamaEffector = {
  getEmbeddingContext: (modelPath: string) => Promise<LlamaEmbeddingContext>;
  destory: () => Promise<void>;
  embedQuery: (text: string) => Promise<Embedding>;
  embedBatch: (texts: string[]) => Promise<Embedding[]>;
};
const init = (
  options: LlamaEmbeddingProviderOptions & { llama?: LlamaOptions }
) =>
  Effect.gen(function* () {
    const globalScope = yield* Scope.make("sequential");
    const GetLlama = Effect.tryPromise(() => getLlama(options.llama));
    const counter = Metric.gauge("llama_embedding_context_count");
    const cached = yield* ScopedCache.make({
      lookup: (modelPath: string) => {
        return Effect.acquireRelease(
          Pool.makeWithTTL({
            acquire: GetLlama.pipe(
              Effect.tap(Effect.log("llama")),
              Effect.flatMap((llama) =>
                Effect.tryPromise(() => llama.loadModel({ modelPath }))
              ),
              Effect.tap(Effect.log("llama loadModel")),
              Effect.flatMap((model) =>
                Effect.tryPromise(() =>
                  model.createEmbeddingContext({ batchSize: 20 })
                )
              ),
              Effect.tapErrorCause(Effect.logFatal),
              Effect.tap(Effect.log("connected", { modelPath }))
            ),
            min: 0,
            max: 1,
            timeToLive: "10 seconds",
          }).pipe(Effect.tap(Metric.modify(counter, 1))),
          (_) =>
            Effect.log("disconnected").pipe(
              Effect.tap(Metric.modify(counter, -1))
            )
        );
      },
      capacity: 30,
      timeToLive: "30 second",
      requireServicesAt: "lookup",
    }).pipe(Effect.provideScope(globalScope));
    const handle = yield* Effect.runtime();
    const LocalPersistence = yield* Persistence.layerSql.pipe(
      Layer.provideMerge(
        SqliteClient.layer({
          create: true,
          filename: "./tmp/cache/vector.db",
        })
      ),
      Layer.build,
      Effect.provideScope(globalScope)
    );
    const loadContext = (modelPath: string) =>
      ScopedCache.get(cached, modelPath).pipe(Effect.flatMap(Pool.get));
    const batchSize = 20;
    const embedBatch = Effect.fn(
      Effect.persistedBatch(
        (input: string[]) => {
          return Effect.gen(function* () {
            return yield* Effect.forEach(
              input,
              (text) =>
                Effect.sync(() => detectLang(text, options)).pipe(
                  Effect.bindTo("lang"),
                  Effect.bind("ctx", (_) =>
                    loadContext(getModelPath(_.lang, options))
                  ),
                  Effect.tap(({ ctx }) => {
                    const model = ctx.model;
                    return Effect.logDebug(
                      "detokenize",
                      text + " -> " + model.detokenize(model.tokenize(text))
                    );
                  }),
                  Effect.flatMap(({ ctx }) =>
                    Effect.tryPromise(() => ctx.getEmbeddingFor(text))
                  ),
                  Effect.scoped,
                  Effect.tap(({ vector }) =>
                    Effect.logDebug("getEmbeddingFor", text, vector)
                  ),
                  Effect.map(({ vector }) => vector as Embedding)
                ),
              { concurrency: batchSize }
            ).pipe(
              Effect.zipLeft(
                Effect.log(
                  "getEmbeddingFor: ",
                  ...input.map(
                    (text) => text.slice(0, 20) + (text.length > 20 ? ".." : "")
                  )
                ),
                { concurrent: true }
              )
            );
          });
        },
        {
          // memCached: true,
          storeId: "llama_embedding_context",
          timeToLive: (text, exit) => (Exit.isFailure(exit) ? 0 : Infinity),
        }
      )
    );
    return {
      getEmbeddingContext: flow(loadContext, Effect.scoped, (_) =>
        Effect.runPromiseWith(handle)(_)
      ),
      embedBatch: flow(
        Effect.forEach(
          (text: string) => {
            options.onModelUsed?.(detectLang(text, options), text);
            return embedBatch(text);
          },
          { concurrency: batchSize }
        ),
        Effect.provide(LocalPersistence),
        Effect.scoped,
        Effect.runPromiseWith(handle)
      ),
      embedQuery: flow(
        (text) => {
          options.onModelUsed?.(detectLang(text, options), text);
          return embedBatch(text);
        },
        Effect.provide(LocalPersistence),
        Effect.scoped,
        Effect.runPromiseWith(handle)
      ),
      destory: () =>
        Effect.runPromiseWith(handle)(
          Scope.close(globalScope, Exit.succeed(undefined))
        ),
    } satisfies LlamaEffector;
  }).pipe(
    Effect.provide(
      Logger.pretty.pipe(
        // Layer.provideMerge(KeyValueStore.layerFileSystem("./tmp/_a")),
        Layer.provideMerge(FsUtilsLive)
      )
    ),
    (a) => Effect.runPromise(a)
  );

type Lang = "en" | "zh";

export interface LlamaEmbeddingProviderOptions {
  modelPathEn?: string;
  modelPathZh?: string;
  defaultLang?: Lang;
  onModelUsed?: (lang: Lang, text: string) => void;
  dimension?: number;
  gpu?: LlamaOptions["gpu"];
}

export class LlamaEmbeddingProvider implements EmbeddingProvider {
  public readonly dimension: number;

  private llamaPromise!: Promise<LlamaEffector>;

  constructor(options: LlamaEmbeddingProviderOptions) {
    this.dimension = options.dimension ?? 768;
    this.llamaPromise = init({
      ...options,
      llama: {
        // logger: console.warn,
        logLevel: LlamaLogLevel.error,
        // 测试中禁用GPU
        gpu:
          options.gpu === "auto" || !options.gpu
            ? process.env.NODE_ENV === "test"
              ? false
              : "auto"
            : options.gpu,
      },
    });
  }

  async embedQuery(text: string): Promise<Embedding> {
    return this.llamaPromise.then((effector) => effector.embedQuery(text));
  }

  async embedBatch(texts: string[]): Promise<Embedding[]> {
    if (texts.length === 0) return [];
    return this.llamaPromise.then((effector) => effector.embedBatch(texts));
  }
}

function detectLang(
  text: string,
  options: LlamaEmbeddingProviderOptions
): Lang {
  if (options.modelPathEn && !options.modelPathZh) return "en";
  if (options.modelPathZh && !options.modelPathEn) return "zh";
  if (/[\p{Script=Han}]/u.test(text)) return "zh";
  return options.defaultLang ?? "en";
}

function getModelPath(
  lang: Lang,
  options: LlamaEmbeddingProviderOptions
): string {
  if (lang === "zh") {
    if (!options.modelPathZh) {
      if (options.modelPathEn) return options.modelPathEn;
      throw new Error("Missing modelPathZh");
    }
    return options.modelPathZh;
  }

  if (!options.modelPathEn) {
    if (options.modelPathZh) return options.modelPathZh;
    throw new Error("Missing modelPathEn");
  }
  return options.modelPathEn;
}
