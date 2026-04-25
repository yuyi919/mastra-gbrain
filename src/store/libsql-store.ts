import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type { BrainStoreRuntime } from "./BrainStore.js";
import {
  BrainStore,
  BrainStoreExt,
  BrainStoreIngestion,
  BrainStoreLifecycleService,
  BrainStoreLinks,
  BrainStoreSearch,
  BrainStoreTimeline,
  BrainStoreUnsafeDB,
} from "./BrainStore.js";
import { StoreError } from "./BrainStoreError.js";
import { makeLayer as makeContentChunksLayer } from "./brainstore/content/chunks/factory.js";
import { makeLayer as makeContentPagesLayer } from "./brainstore/content/pages/factory.js";
import { makeLayer as makeExtLayer } from "./brainstore/ext/index.js";
import { makeLayer as makeGraphLinksLayer } from "./brainstore/graph/links/factory.js";
import { makeLayer as makeGraphTimelineLayer } from "./brainstore/graph/timeline/factory.js";
import { makeLayer as makeOpsInternalLayer } from "./brainstore/ops/internal/index.js";
import { makeLayer as makeOpsLifecycleLayer } from "./brainstore/ops/lifecycle/index.js";
import { makeLayer as makeRetrievalEmbeddingLayer } from "./brainstore/retrieval/embedding/factory.js";
import { makeLayer as makeRetrievalSearchLayer } from "./brainstore/retrieval/search/factory.js";
import {
  BrainStoreTree,
  type BrainStoreTreeService,
  makeComposedLayer,
} from "./brainstore/tree/index.js";
import {
  BrainStoreCompat,
  makeCompatBrainStore,
} from "./brainstore/compat/index.js";
import init from "./init.sql" with { type: "text" };
import { Mappers } from "./Mappers.js";

const catchStoreError = StoreError.catch;
const DEFAULT_INDEX_NAME = "gbrain_chunks";

/**
 * 获取可安全关闭的 Turso 客户端。
 */
function getClosableTursoClient(
  value: BrainStore.Options["vectorStore"]
): { close: () => Promise<void> | void } | undefined {
  if (!value || typeof value !== "object" || !("turso" in value)) {
    return undefined;
  }

  // @ts-expect-error 未公开
  const turso = value.turso;
  if (
    turso &&
    typeof turso === "object" &&
    "close" in turso &&
    typeof turso.close === "function"
  ) {
    return turso;
  }

  return undefined;
}

function makeDeleteVectorsBySlug(
  vectorStore: BrainStore.Options["vectorStore"],
  indexName: string
) {
  return Eff.fn("brainstore.vectors.deleteBySlug")(function* (slug: string) {
    yield* Eff.from(() =>
      vectorStore?.deleteVectors({
        indexName,
        filter: { slug: { $eq: slug } },
      })
    );
  }, catchStoreError);
}

function makeLegacyIngestion(
  tree: BrainStoreTreeService
): BrainStore.Ingestion {
  return {
    getPage: tree.content.pages.getPage,
    listPages: tree.content.pages.listPages,
    resolveSlugs: tree.content.pages.resolveSlugs,
    getTags: tree.content.pages.getTags,
    createVersion: tree.content.pages.createVersion,
    getVersions: tree.content.pages.getVersions,
    revertToVersion: tree.content.pages.revertToVersion,
    putPage: tree.content.pages.putPage,
    updateSlug: tree.content.pages.updateSlug,
    deletePage: tree.content.pages.deletePage,
    addTag: tree.content.pages.addTag,
    removeTag: tree.content.pages.removeTag,
    upsertChunks: tree.content.chunks.upsertChunks,
    deleteChunks: tree.content.chunks.deleteChunks,
    getChunks: tree.content.chunks.getChunks,
    getChunksWithEmbeddings: Eff.fn(
      "brainstore.compat.getChunksWithEmbeddings"
    )(function* (slug: string) {
      return yield* tree.content.chunks.getChunks(slug);
    }, catchStoreError),
    getEmbeddingsByChunkIds: tree.retrieval.embedding.getEmbeddingsByChunkIds,
  };
}

function makeBrainStoreService(
  tree: BrainStoreTreeService,
  ext: BrainStore.Ext
): BrainStore.Service {
  const ingestion = makeLegacyIngestion(tree);
  const features: BrainStore.Features = {
    ingestion,
    links: tree.graph.links,
    search: tree.retrieval.search,
    timeline: tree.graph.timeline,
    ext,
    lifecycle: tree.ops.lifecycle,
    unsafe: tree.ops.internal,
  };

  return {
    ...tree.retrieval.search,
    ...tree.graph.links,
    ...ingestion,
    ...tree.graph.timeline,
    ...ext,
    ...tree.ops.lifecycle,
    ...tree.ops.internal,
    tree,
    features,
  };
}

export function makeLayer(options: { url: string } & BrainStore.Options) {
  const filename = options.url.replace(/^file:/, "");
  const indexName = DEFAULT_INDEX_NAME;
  const dimension = options.dimension ?? 1536;
  const vectorStore = options.vectorStore;
  const deleteVectorsBySlug = makeDeleteVectorsBySlug(vectorStore, indexName);

  const SqlLive = SqliteClient.layer({ filename });
  const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
  const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);

  const EmbeddingLayer = makeRetrievalEmbeddingLayer({
    vectorStore,
    indexName,
  }).pipe(Layer.provide(DatabaseLive));

  const ContentPagesLayer = makeContentPagesLayer({
    vectors: { deleteVectorsBySlug },
  }).pipe(Layer.provide(DatabaseLive));

  const ContentChunksLayer = makeContentChunksLayer({
    embeddings: {
      deleteVectorsBySlug,
    },
  }).pipe(Layer.provide(Layer.mergeAll(DatabaseLive, EmbeddingLayer)));

  const GraphLinksLayer = makeGraphLinksLayer().pipe(
    Layer.provide(DatabaseLive)
  );

  const GraphTimelineLayer = makeGraphTimelineLayer().pipe(
    Layer.provide(DatabaseLive)
  );

  const SearchLayer = makeRetrievalSearchLayer().pipe(
    Layer.provide(Layer.mergeAll(DatabaseLive, GraphLinksLayer, EmbeddingLayer))
  );

  const LifecycleLayer = makeOpsLifecycleLayer({
    initSql: init,
    createIndex: () =>
      vectorStore?.createIndex({
        indexName,
        dimension,
        metric: "cosine",
      }),
    disposeVector: () => getClosableTursoClient(vectorStore)?.close(),
  }).pipe(Layer.provide(SqlLive));

  const InternalLayer = makeOpsInternalLayer({ vectorStore }).pipe(
    Layer.provide(DatabaseLive)
  );

  const BranchLayers = Layer.mergeAll(
    ContentPagesLayer,
    ContentChunksLayer,
    GraphLinksLayer,
    GraphTimelineLayer,
    EmbeddingLayer,
    SearchLayer,
    LifecycleLayer,
    InternalLayer
  );

  const TreeLayer = makeComposedLayer.pipe(Layer.provide(BranchLayers));

  const ExtLayer = makeExtLayer().pipe(
    Layer.provide(Layer.mergeAll(DatabaseLive, EmbeddingLayer))
  );

  const BrainStoreLayer = Layer.effect(
    BrainStore,
    Eff.gen(function* () {
      const tree = yield* BrainStoreTree;
      const ext = yield* BrainStoreExt;
      return makeBrainStoreService(tree, ext);
    })
  ).pipe(Layer.provide(Layer.mergeAll(TreeLayer, ExtLayer)));

  const CompatLayer = Layer.effect(
    BrainStoreCompat,
    Eff.gen(function* () {
      const tree = yield* BrainStoreTree;
      const store = yield* BrainStore;
      return makeCompatBrainStore(tree, store);
    })
  ).pipe(Layer.provide(Layer.mergeAll(TreeLayer, BrainStoreLayer)));

  const FeatureLayers = Layer.mergeAll(
    Layer.effect(
      BrainStoreIngestion,
      BrainStoreCompat.use((store) => Eff.succeed(store.features.ingestion))
    ),
    Layer.effect(
      BrainStoreLinks,
      BrainStoreTree.use((tree) => Eff.succeed(tree.graph.links))
    ),
    Layer.effect(
      BrainStoreSearch,
      BrainStoreTree.use((tree) => Eff.succeed(tree.retrieval.search))
    ),
    Layer.effect(
      BrainStoreTimeline,
      BrainStoreTree.use((tree) => Eff.succeed(tree.graph.timeline))
    ),
    Layer.effect(
      BrainStoreLifecycleService,
      BrainStoreTree.use((tree) => Eff.succeed(tree.ops.lifecycle))
    ),
    Layer.effect(
      BrainStoreUnsafeDB,
      BrainStoreTree.use((tree) => Eff.succeed(tree.ops.internal))
    )
  ).pipe(Layer.provide(Layer.mergeAll(TreeLayer, CompatLayer, ExtLayer)));

  return Layer.mergeAll(
    DatabaseLive,
    BranchLayers,
    TreeLayer,
    ExtLayer,
    BrainStoreLayer,
    CompatLayer,
    FeatureLayers
  ).pipe(
    Layer.provideMerge([Eff.Logger.minimumLogLevel("Debug"), Eff.Logger.pretty])
  );
}

export function make(options: { url: string } & BrainStore.Options) {
  return BrainStore.use((store) => Eff.succeed(store)).pipe(
    Eff.provide(makeLayer(options))
  );
}
