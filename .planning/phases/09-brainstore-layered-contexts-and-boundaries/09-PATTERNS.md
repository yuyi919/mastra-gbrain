# Phase 09: brainstore-layered-contexts-and-boundaries - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 19 areas/files
**Analogs found:** 17 / 19

## File Classification

| New/Modified File or Area | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/store/BrainStore.ts` | provider | request-response | `src/store/BrainStore.ts` | exact |
| `src/store/brainstore/content/pages/*` | service | CRUD | `src/store/page.ts`, `src/store/libsql-store.ts` | role-match |
| `src/store/brainstore/content/chunks/*` | service | CRUD | `src/store/libsql-store.ts` | exact |
| `src/store/brainstore/graph/links/*` | service | CRUD | `src/store/libsql-store.ts` | exact |
| `src/store/brainstore/graph/timeline/*` | service | CRUD | `src/store/libsql-store.ts` | exact |
| `src/store/brainstore/retrieval/search/*` | service | request-response | `src/store/libsql-store.ts`, `src/search/hybrid.ts` | exact |
| `src/store/brainstore/retrieval/embedding/*` | service | CRUD | `src/store/libsql-store.ts` | exact |
| `src/store/brainstore/ops/lifecycle/*` | service | request-response | `src/store/libsql-store.ts` | exact |
| `src/store/brainstore/ops/internal/*` | service | request-response | `src/store/Mappers.ts`, `src/libs/effect-drizzle/sqlite.ts` | exact |
| `src/store/brainstore/tree/*` | provider | request-response | `src/store/libsql-store.ts`, `src/store/index.ts` | partial |
| `src/store/brainstore/compat/*` | provider | request-response | `src/store/libsql.ts`, `src/store/libsql-store.ts` | exact |
| `src/store/libsql-store.ts` | provider | request-response | `src/store/libsql-store.ts` | exact |
| `src/store/libsql.ts` | service | request-response | `src/store/libsql.ts` | exact |
| `src/store/index.ts` | provider | request-response | `src/store/index.ts` | exact |
| `src/store/interface.ts` | model | request-response | `src/store/interface.ts` | exact |
| `src/search/hybrid.ts` | service | request-response | `src/search/hybrid.ts` | exact |
| `src/workflow/index.ts` | provider | request-response | `src/workflow/index.ts` | exact |
| `test/store/brainstore-tree.test.ts` | test | request-response | `test/search/hybrid.test.ts`, `test/libsql.test.ts` | partial |
| `test/store/brainstore-layers.test.ts` | test | request-response | `test/search/hybrid.test.ts`, `test/ingest/workflow.test.ts` | partial |

## Pattern Assignments

### `src/store/BrainStore.ts` and all `*/interface.ts` branch contracts

**Analog:** `src/store/BrainStore.ts`

**Contract-first imports and Effect tags** (`src/store/BrainStore.ts:1-6`, `214-252`):
```ts
import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { Schema } from "effect";
import type { SchemaError } from "effect/Schema";
import type { SqlError } from "effect/unstable/sql";

export class BrainStoreIngestion extends Context.Service<
  BrainStoreIngestion,
  IngestionStore
>()("@yui-agent/brain-mastra/BrainStore/Ingestion") {}

export class BrainStoreSearch extends Context.Service<
  BrainStoreSearch,
  SearchStore
>()("@yui-agent/brain-mastra/BrainStore/Search") {}

export class BrainStore extends Context.Service<
  BrainStore,
  BrainStore.Service
>()("@yui-agent/brain-mastra/BrainStore") {}
```

**Tree contract pattern** (`src/store/BrainStore.ts:193-211`):
```ts
export interface BrainStoreFeatureTree {
  ingestion: IngestionStore;
  links: LinkService;
  search: SearchStore;
  timeline: TimelineService;
  ext: ExtService;
  lifecycle: BrainStoreLifecycle;
  unsafe: UnsafeDBService;
}

export interface BrainStoreService
  extends LinkService,
    IngestionStore,
    SearchStore,
    TimelineService,
    ExtService,
    BrainStoreLifecycle,
    UnsafeDBService {
  readonly features: BrainStoreFeatureTree;
}
```

**Apply to Phase 09:** new branch `interface.ts` files should preserve the current small-interface style, but move from flat names like `ingestion/search/ext` to domain branches like `content.pages`, `graph.links`, `retrieval.search`, `ops.internal`. Keep `Context.Service` tags small and specific; do not let sibling branches depend on the flat root tag.

---

### `src/store/brainstore/content/pages/*`

**Analog:** `src/store/page.ts` for service constructor shape, `src/store/libsql-store.ts` for current page/version logic

**Service + `make` pattern** (`src/store/page.ts:15-23`, `31-39`, `73-80`):
```ts
export class PageService extends Context.Service<PageService>()("PageService", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const resolver = yield* SqlModel.makeResolvers(Page, {
      tableName: "pages",
      spanPrefix: "Pages",
      idColumn: "id",
    });
    const repository = yield* SqlModel.makeRepository(Page, {
      tableName: "pages",
      spanPrefix: "Pages",
      idColumn: "id",
    });
    return {
      getById: SqlResolver.request(resolver.findById),
      update: flow(Page.update.makeEffect, Effect.flatMap(repository.update)),
    };
  }),
}) {}
```

**Current pages/version behavior to preserve** (`src/store/libsql-store.ts:135-219`):
```ts
const ingestion: BrainStore.Ingestion = {
  listPages: Eff.fn("listPages")(function* (filters = {}) {
    return yield* pipe(
      mappers.listPages(filters).asEffect(),
      Eff.flatMap((rows) => Eff.all(rows.map(Page.decode)))
    );
  }, catchStoreError),
  getPage: Eff.fn("getPage")(function* (slug: string) {
    const result = yield* mappers.getPageBySlug(slug);
    if (!result) return null;
    return yield* Page.decode(result);
  }, catchStoreError),
  createVersion: Eff.fn("createVersion")(function* (slug: string) {
    const pageResult = yield* mappers.getPageForVersionBySlug(slug);
    if (!pageResult) {
      throw new Error(`Page ${slug} not found`);
    }
    const res = yield* mappers.insertPageVersion({
      page_id: pageResult.id,
      compiled_truth: pageResult.compiled_truth || "",
      frontmatter: pageResult.frontmatter || "{}",
    });
    return PageVersion.decode(res[0]);
  }, catchStoreError),
  putPage: Eff.fn("putPage")(function* (slug: string, page: PageInput) {
    return yield* sql.withTransaction(
      Eff.gen(function* () {
        const record = yield* mappers.upsertPage(slug, page);
        yield* ingestion.createVersion(slug).pipe(Eff.asVoid);
        return Page.decode(record[0]);
      })
    );
  }, catchStoreError),
}
```

**Apply to Phase 09:** `content/pages/factory.ts` should own page CRUD and version lifecycle only. If chunks or links need page lookup, expose a narrow contract such as `PageLookup` or `PageIdResolver`; do not hand them the whole pages branch.

---

### `src/store/brainstore/content/chunks/*`

**Analog:** `src/store/libsql-store.ts`

**Chunk write pattern** (`src/store/libsql-store.ts:232-297`):
```ts
upsertChunks: Eff.fn("upsertChunks")(function* (
  slug: string,
  chunks: ChunkInput[]
) {
  const pageResult = yield* mappers.getPageBasicBySlug(slug);
  if (pageResult.length === 0) return;
  const page_id = pageResult[0].id;
  const page_title = pageResult[0].title;
  const page_type = pageResult[0].type;
  const newIndices = chunks.map((c) => c.chunk_index);

  if (newIndices.length > 0) {
    yield* mappers.deleteContentChunksNotIn(page_id, newIndices);
    yield* mappers.deleteFtsChunksNotIn(page_id, newIndices);
  } else {
    yield* ingestion.deleteChunks(slug);
    return;
  }

  for (const chunk of chunks) {
    yield* mappers.upsertContentChunk(page_id, chunk);
  }
  yield* mappers.deleteFtsByPageId(page_id);
  yield* mappers.insertFtsChunks(
    chunks.map((chunk) => ({
      page_id,
      page_title,
      page_slug: slug,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_source: chunk.chunk_source,
      token_count: chunk.token_count ?? 0,
      chunk_text_segmented: extractWordsForSearch(chunk.chunk_text),
    }))
  );
}, catchStoreError)
```

**Deletion and embedding lookup seam** (`src/store/libsql-store.ts:298-334`):
```ts
deleteChunks: Eff.fn("deleteChunks")(
  function* (slug: string) {
    const result = yield* mappers.getPageIdBySlug(slug);
    const pageResult = Array.isArray(result) ? result[0] : result;
    if (!pageResult) return;
    const page_id = pageResult.id;
    yield* Eff.all([
      deleteChunksByPageId(page_id).asEffect(),
      deleteVectorsBySlug(slug).asEffect(),
    ]);
  },
  catchStoreError,
  Eff.withConcurrency(2)
),
getEmbeddingsByChunkIds: Eff.fn("getEmbeddingsByChunkIds")(function* (_ids) {
  return new Map<number, Float32Array>();
}, catchStoreError),
```

**Apply to Phase 09:** `content/chunks` is the right place for chunk CRUD and FTS maintenance. Do not bury vector-write side effects here unless they are behind an explicit `retrieval.embedding` contract.

---

### `src/store/brainstore/graph/links/*`

**Analog:** `src/store/libsql-store.ts`

**Core link CRUD and graph traversal** (`src/store/libsql-store.ts:336-424`):
```ts
const link: BrainStore.Link = {
  addLink: Eff.fn("addLink")(function* (
    fromSlug: string,
    toSlug: string,
    linkType = "references",
    context = ""
  ) {
    const fromResult = yield* mappers.getPageIdBySlug(fromSlug);
    const toResult = yield* mappers.getPageIdBySlug(toSlug);
    const fromPage = Array.isArray(fromResult) ? fromResult[0] : fromResult;
    const toPage = Array.isArray(toResult) ? toResult[0] : toResult;
    if (!fromPage || !toPage) return;
    yield* mappers.insertLink({
      from_page_id: fromPage.id,
      to_page_id: toPage.id,
      link_type: linkType,
      context,
    });
  }, catchStoreError),
  getBacklinks: Eff.fn("getBacklinks")(function* (slug: string) {
    const rows = yield* mappers.getBacklinksBySlug(slug);
    return rows.map((r) => ({
      from_slug: r.from_slug,
      to_slug: r.to_slug,
      link_type: r.link_type || "",
      context: r.context || "",
    }) satisfies Link);
  }, catchStoreError),
  traverseGraph: Eff.fn("traverseGraph")(function* (slug, depth = 5) {
    const rows = yield* mappers.unsafe.traverseGraph(slug, depth).asEffect();
    return yield* Eff.all(rows.map(GraphNode.decode));
  }, catchStoreError),
  getBacklinkCounts: Eff.fn("getBacklinkCounts")(function* (slugs) {
    const result = new Map<string, number>();
    for (const s of slugs) result.set(s, 0);
    const rows = yield* mappers.getBacklinkCounts(slugs);
    for (const r of rows) {
      result.set(r.slug, r.cnt);
    }
    return result;
  }, catchStoreError),
}
```

**Apply to Phase 09:** `graph/links/factory.ts` is a strong exact analog. `retrieval.search` should consume only `getBacklinkCounts` through a tiny contract, not the whole links branch.

---

### `src/store/brainstore/graph/timeline/*`

**Analog:** `src/store/libsql-store.ts`

**Timeline batch and query pattern** (`src/store/libsql-store.ts:500-543`):
```ts
const timeline: BrainStore.Timeline = {
  addTimelineEntry: Eff.fn("addTimelineEntry")(function* (
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ) {
    const result = yield* mappers.getPageIdBySlug(slug);
    const pageResult = Array.isArray(result) ? result[0] : result;
    if (!pageResult) {
      if (opts?.skipExistenceCheck) return;
      throw new Error(`addTimelineEntry failed: page "${slug}" not found`);
    }
    yield* mappers.insertTimelineEntry(pageResult.id, entry);
  }, catchStoreError),
  addTimelineEntriesBatch: Eff.fn("addTimelineEntriesBatch")(function* (
    entries: TimelineBatchInput[]
  ) {
    if (entries.length === 0) return 0;
    let count = 0;
    for (const entry of entries) {
      const result = yield* mappers.getPageIdBySlug(entry.slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) continue;
      const res = yield* mappers.insertTimelineEntryReturningId(pageResult.id, entry);
      if (res.length > 0) count++;
    }
    return count;
  }, catchStoreError),
  getTimeline: Eff.fn("getTimeline")(function* (slug: string, opts?: TimelineOpts) {
    const result = yield* mappers.getTimeline(slug, opts);
    return result.map((r) => ({
      ...r,
      created_at: new Date(r.created_at),
    }) satisfies TimelineEntry);
  }, catchStoreError),
}
```

**Apply to Phase 09:** this branch is mostly self-contained CRUD. Keep slug-to-page-id resolution narrow; do not make timeline depend on a broad content root.

---

### `src/store/brainstore/retrieval/search/*`

**Analog:** `src/store/libsql-store.ts` for implementation, `src/search/hybrid.ts` for consumer seam

**Search backend shape** (`src/store/libsql-store.ts:427-470`):
```ts
const hybridSearch: BrainStore.HybridSearch = {
  searchKeyword: Eff.fn("searchKeyword")(function* (
    query: string,
    opts?: SearchOpts
  ) {
    const segmentedQuery = extractWordsForSearch(query);
    const rows = yield* mappers.searchKeyword(segmentedQuery, opts);
    return rows.map((row) => {
      const score = Math.abs(row.score) / (1 + Math.abs(row.score));
      return { ...row, score };
    });
  }, catchStoreError),
  searchVector: Eff.fn("searchVector")(function* (
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ) {
    const vectorResults = yield* queryVectors(queryVector, opts);
    const hits = vectorResults
      .map((match: any) => ({
        score: match.score as number,
        slug: (match.metadata?.slug ?? ...) as string | undefined,
        chunk_index: (match.metadata?.chunk_index ?? ...) as number | undefined,
      }))
      .filter((h): h is { score: number; slug: string; chunk_index: number } =>
        !!h.slug && Number.isFinite(h.chunk_index)
      );
    if (hits.length === 0) return [];
    const rows = yield* mappers.searchVectorRows(slugs, chunkIndexes, opts);
    ...
  }, catchStoreError),
}
```

**Narrow consumer seam** (`src/search/hybrid.ts:37-43`, `58-60`, `289-305`):
```ts
export function hybridSearchEffect(
  query: string,
  opts: HybridSearchOpts = {},
  queryVector?: number[]
): Eff.Effect<SearchResult[], StoreError, BrainStoreSearch> {
  return Eff.gen(function* () {
    const engine = yield* BrainStoreSearch;
    const keywordResults = yield* engine.searchKeyword(query, searchOpts);
    ...
const cosineReScore = Eff.fn("cosineReScore")(function* (
  results: SearchResult[],
  queryEmbedding: ArrayLike<number>,
  DEBUG: boolean
) {
  const engine = yield* BrainStoreSearch;
  ...
  embeddingMap = yield* engine.getEmbeddingsByChunkIds(chunkIds);
```

**Apply to Phase 09:** `retrieval/search/interface.ts` should be just enough for `hybridSearchEffect`. Keep `searchKeyword`, `searchVector`, `getBacklinkCounts`, and `getEmbeddingsByChunkIds` as explicit contracts or imported narrow tags.

---

### `src/store/brainstore/retrieval/embedding/*`

**Analog:** `src/store/libsql-store.ts`

**Embedding maintenance pattern** (`src/store/libsql-store.ts:821-843`):
```ts
getStaleChunks: Eff.fn("getStaleChunks")(function* () {
  const rows = yield* mappers.getStaleChunks();
  return rows as StaleChunk[];
}, catchStoreError),
upsertVectors: Eff.fn("upsertVectors")(function* (
  vectors: { id: string; vector: number[]; metadata: any }[]
) {
  if (!vectorStore || vectors.length === 0) return;
  yield* Eff.promise(() =>
    vectorStore.upsert({
      indexName,
      vectors: vectors.map((v) => v.vector),
      ids: vectors.map((v) => v.id),
      metadata: vectors.map((v) => v.metadata),
    })
  );
}, catchStoreError),
markChunksEmbedded: Eff.fn("markChunksEmbedded")(function* (chunkIds: number[]) {
  if (chunkIds.length === 0) return;
  yield* mappers.markChunksEmbeddedByIds(chunkIds);
}, catchStoreError),
```

**Apply to Phase 09:** this is the best exact analog for `retrieval/embedding/factory.ts`. Keep vector store interaction and stale-mark coupling together. Do not spread these methods back into `StoreProvider`.

---

### `src/store/brainstore/ops/internal/*`

**Analog:** `src/store/Mappers.ts`, `src/libs/effect-drizzle/sqlite.ts`, `src/store/libsql-store.ts`

**Internal DB service pattern** (`src/store/Mappers.ts:9-26`):
```ts
export class Mappers extends Context.Service<Mappers, SqlBuilder>()(
  "@yui-agent/brain-mastra/BrainStore/Mappers",
  {
    make: Eff.gen(function* () {
      const db = yield* SqliteDrizzle.DB;
      return new SqlBuilder(db as any);
    }),
  }
) {
  static makeLayer(): Eff.Layer<Mappers, never, SqlClient> {
    return Layer.effect(Mappers, Mappers.make).pipe(
      Layer.provide(
        SqliteDrizzle.makeLayer({
          schema: Schemas,
        })
      )
    );
  }
}
```

**Low-level DB layer pattern** (`src/libs/effect-drizzle/sqlite.ts:46-59`):
```ts
export class DB extends Context.Service<DB, SqliteRemoteDatabase<any>>()(
  "@effect/sql-drizzle/Sqlite"
) {}

export const makeLayer = <TSchema extends Record<string, unknown> = Record<string, never>>(
  config?: Omit<DrizzleConfig<TSchema>, "logger">
): Layer.Layer<DB, never, Client.SqlClient> =>
  Layer.effect(DB, make(config));
```

**Unsafe fence pattern** (`src/store/libsql-store.ts:890-914`):
```ts
const unsafe: BrainStore.UnsafeDB = {
  query: (text, params) =>
    sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      catchStoreError
    ),
  get: (text, params) =>
    sql.unsafe(text, params).unprepared.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      catchStoreError,
      Eff.map((_) => _[0])
    ),
  run: (text, params) =>
    sql.unsafe(text, params).raw.pipe(
      Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
      catchStoreError
    ),
}
```

**Apply to Phase 09:** `ops/internal` should own `SqlClient`, `Mappers`, unsafe SQL, and vector resource access. Public branch `index.ts` files should not re-export this branch except where explicitly intended for internal assembly.

---

### `src/store/brainstore/ops/lifecycle/*`

**Analog:** `src/store/libsql-store.ts`

**Lifecycle + transaction + idempotent init** (`src/store/libsql-store.ts:857-889`):
```ts
const inited = yield* Eff.Ref.make(false);
const lifecycle: BrainStore.Lifecycle = {
  init: Eff.fn("init")(
    function* () {
      if (yield* Eff.Ref.get(inited)) return;
      yield* Eff.log("Initializing database...");
      yield* Eff.forEach(init.split(";\n").filter(Boolean), (rawSQL) =>
        sql.unsafe(rawSQL).raw.pipe(Eff.tapError(Eff.logError))
      ).pipe(
        Eff.zipRight(
          Eff.from(() =>
            vectorStore?.createIndex({
              indexName,
              dimension,
              metric: "cosine",
            })
          ),
          { concurrent: true }
        )
      );
      yield* Eff.Ref.set(inited, true);
    },
    catchStoreError,
    Eff.withLogElapsed("Initialized database")
  ),
  dispose: Eff.fn("dispose")(function* () {
    yield* Eff.logDebug("dispose");
    yield* Eff.from(() => getClosableTursoClient(vectorStore)?.close());
  }, Eff.tapDefect(Eff.logError)),
  transaction: (operators) => {
    return sql.withTransaction(operators).pipe(catchStoreError);
  },
};
```

**Resource-scoped store assembly** (`src/store/libsql-store.ts:935-937`):
```ts
return yield* Eff.acquireRelease(Eff.succeed(store), (store) =>
  store.dispose()
);
```

**Apply to Phase 09:** `ops/lifecycle/factory.ts` should stay the sole owner of init/dispose/transaction. Keep `acquireRelease` at the assembled-store boundary.

---

### `src/store/brainstore/tree/*`

**Closest analog:** `src/store/libsql-store.ts` is only a partial match

**Useful assembly idiom** (`src/store/libsql-store.ts:940-980`):
```ts
const SqlLive = SqliteClient.layer({ filename });
const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);
...
return Layer.mergeAll(BrainStoreLayer, FeatureLayers, DatabaseLive).pipe(
  Layer.provideMerge([Eff.Logger.minimumLogLevel("Debug"), Eff.Logger.pretty])
);
```

**Current anti-pattern to replace** (`src/store/libsql-store.ts:948-977`):
```ts
const FeatureLayers = Layer.mergeAll(
  Layer.effect(
    BrainStoreIngestion,
    BrainStore.use((store) => Eff.succeed(store.features.ingestion))
  ),
  Layer.effect(
    BrainStoreSearch,
    BrainStore.use((store) => Eff.succeed(store.features.search))
  ),
  ...
).pipe(Layer.provide(BrainStoreLayer));
```

**Apply to Phase 09:** `tree/factory.ts` should reuse `Layer.mergeAll` and provider wiring, but invert the order: build branch layers first, then assemble `BrainStoreTree`, and only then derive compat if needed. Do not recreate this root-first projection pattern.

---

### `src/store/brainstore/compat/*` and `src/store/libsql.ts`

**Analog:** `src/store/libsql.ts`

**ManagedRuntime bridge** (`src/store/libsql.ts:81-89`, `112-125`):
```ts
const layer = makeLibSQLStoreLayer({
  url: this.url,
  vectorUrl: this.vectorUrl,
  authToken: this.authToken,
  dimension: this.dimension,
  vectorStore: this.vectorStore,
});
this._brainStore = ManagedRuntime.make(layer);

async runFlatten<A, E = never, E2 = never, R extends BrainStoreRuntime = never>(
  fn: (store: BrainStore.Service) => Effect.Effect<Effect.Effect<A, E2, R>, E, BrainStore>
): Promise<A> {
  return this.brainStore.runPromise(
    BrainStore.use((store) => fn(store).pipe(Effect.flatten))
  );
}

async run<A, E = never>(
  fn: (store: BrainStore.Service) => Effect.Effect<A, E, BrainStore>
): Promise<A> {
  return this.brainStore.runPromise(BrainStore.use(fn));
}
```

**Promise adapter forwarding pattern** (`src/store/libsql.ts:160-175`, `367-375`):
```ts
async putPage(slug: string, page: PageInput): Promise<Page> {
  return this.runFlatten((store) => store.putPage(slug, page));
}

async upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void> {
  return this.run((store) =>
    store.transaction(store.upsertChunks(slug, chunks))
  );
}

async transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T> {
  return fn(this);
}
```

**Apply to Phase 09:** `compat/factory.ts` should flatten `BrainStoreTree` into the current `BrainStore.Service` shape, and `libsql.ts` should keep forwarding Promise methods to that compat surface without widening `StoreProvider`.

---

### `src/store/index.ts` and `src/workflow/index.ts`

**Analog:** `src/store/index.ts`, `src/workflow/index.ts`

**Provider service with effectful make** (`src/store/index.ts:71-105`):
```ts
const make = Effect.fnUntraced(function* (
  path: `file:${string}`,
  vectorUrl: string = path
) {
  const embedder = yield* Embdder;
  const store = new LibSQLStore({ url: path, vectorUrl, dimension: embedder.dimension });
  yield* Effect.promise(() => store.init());
  return { store: store as StoreProvider, embedder };
});

export class BrainStoreProvider extends Context.Service<BrainStoreProvider>()(
  "@yui-agent/brain-mastra/BrainStoreProvider",
  { make }
) {
  static Default = flow(make, Layer.effect(BrainStoreProvider));
}
```

**Workflow should stay on stable Promise boundary** (`src/workflow/index.ts:1-7`):
```ts
export const Ingest = BrainStoreProvider.use(({ store, embedder }) => {
  return Effect.gen(function* () {
    return createIngestionWorkflow({
      store,
      embedder,
    });
  });
});
```

**Apply to Phase 09:** keep `src/store/index.ts` thin and stable. Do not export new internal tree branches from this provider module unless they are explicitly part of public DI surface.

---

### Narrow seam tests: `test/store/brainstore-tree.test.ts`, `test/store/brainstore-layers.test.ts`, and modified regressions

**Analog 1: branch-only injection** (`test/search/hybrid.test.ts:59-86`):
```ts
const runtime = ManagedRuntime.make(
  Layer.succeed(
    BrainStoreSearch,
    BrainStoreSearch.of({
      searchKeyword: () => Effect.succeed([r("a", "alpha", 1)] as any),
      searchVector: () => Effect.succeed([] as any),
      getBacklinkCounts: () => Effect.succeed(new Map([["a", 0]]) as any),
      getEmbeddingsByChunkIds: () => Effect.succeed(new Map() as any),
    } as any)
  )
);

const results = await runtime.runPromise(hybridSearchEffect("q", { limit: 10 }));
```

**Analog 2: Promise-boundary mock seam** (`test/ingest/workflow.test.ts:10-31`, `43-73`):
```ts
function mockStore(
  overrides: Partial<Record<string, any>> = {}
): StoreProvider & { _calls: any[] } {
  const calls: { method: string; args: any[] }[] = [];
  const store = new Proxy({} as any, {
    get(_, prop: string) {
      if (prop === "_calls") return calls;
      if (prop === "transaction") {
        return overrides.transaction || (async (fn: any) => fn(store));
      }
      return async (...args: any[]) => {
        calls.push({ method: prop, args });
        if (overrides[prop]) return overrides[prop](...args);
        if (prop === "getPage") return null;
        if (prop === "getTags") return [];
      };
    },
  });
  return store;
}
```

**Analog 3: real compat regression** (`test/libsql.test.ts:115-134`, `157-234`):
```ts
await store.transaction(async (tx) => {
  await tx.putPage("tx-slug", { ... });
  await tx.addTag("tx-slug", "tx-tag");
});
...
await store.upsertChunks("chunk-slug", chunks);
const keywordResults = await store.searchKeyword("Hello", { limit: 10 });
const vectorResults = await store.searchVector(new Array(1536).fill(0.1), {
  slug: "chunk-slug",
});
```

**Apply to Phase 09:** add one test that assembles only the new branch layers into `BrainStoreTree`, and one test that proves a single branch can be provided without the compat root. Keep existing `hybrid`, `workflow`, and `libsql` regressions as boundary guards.

## Shared Patterns

### 1. `Context.Service` + effectful constructor + explicit layer
**Source:** `src/store/Mappers.ts:9-26`, `src/store/page.ts:15-23`, `82-99`

Use this for every new `factory.ts`:
```ts
export class SomeBranch extends Context.Service<SomeBranch, SomeContract>()(
  "@yui-agent/brain-mastra/SomeBranch",
  { make: Eff.gen(function* () { ... }) }
) {}

export const SomeBranchLive = Layer.effect(SomeBranch, SomeBranch.make).pipe(
  Layer.provide(...)
);
```

### 2. Keep low-level SQL fenced inside internal layers
**Source:** `src/store/libsql-store.ts:890-914`, `src/store/interface.ts:86-154`

Unsafe SQL may exist, but it belongs in `ops.internal` and behind explicit warnings. Do not widen `StoreProvider` with more runtime internals.

### 3. Compose resources with `acquireRelease`
**Source:** `src/store/libsql-store.ts:857-889`, `935-937`

Branch resources can be ordinary layers, but the assembled store object should be lifecycle-bound with `Eff.acquireRelease(..., store.dispose())`.

### 4. Promise compatibility is an adapter, not architecture center
**Source:** `src/store/libsql.ts:112-125`, `160-175`, `367-375`

Keep `LibSQLStore` as a forwarder over the compat root. New Effect code should target tree branches or narrow contracts directly.

### 5. Tests should prove narrow seams before full integration
**Source:** `test/search/hybrid.test.ts:59-86`, `test/ingest/workflow.test.ts:10-31`

Prefer:
- branch-only `Layer.succeed(Tag, Tag.of(...))`
- Promise-layer Proxy mocks for workflow/tool callers
- one real `LibSQLStore` regression for end-to-end boundary safety

## No Exact Analog Found

| File or Area | Role | Data Flow | Reason |
|---|---|---|---|
| `src/store/brainstore/*/index.ts` | provider | request-response | Repo has top-level `index.ts` files, but no existing branch-local `interface + factory + index` trio. Keep these files minimal: re-export only, no new business logic. |
| `src/store/brainstore/tree/interface.ts` | provider | request-response | Closest current concept is `BrainStoreFeatureTree` in `src/store/BrainStore.ts`, but no existing domain-grouped `BrainStoreTree` exact analog exists yet. |

## Metadata

**Analog search scope:** `src/store`, `src/search`, `src/workflow`, `src/libs/effect-drizzle`, `test`, phase docs, todo docs
**Files scanned:** 24
**Pattern extraction date:** 2026-04-25

## PATTERN MAPPING COMPLETE
