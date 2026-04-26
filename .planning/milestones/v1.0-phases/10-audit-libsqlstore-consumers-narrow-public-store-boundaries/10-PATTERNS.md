# Phase 10: audit-libsqlstore-consumers-narrow-public-store-boundaries - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 41 likely new/modified files
**Analogs found:** 40 / 41

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/ingest/workflow.ts` | workflow/service contract | batch, transform, request-response | `src/search/hybrid.ts` | partial, same narrow-wrapper goal |
| `src/workflow/index.ts` | provider integration | request-response | `src/store/index.ts` | role-match |
| `src/search/hybrid.ts` | service facade wrapper | request-response, transform | existing file | exact |
| `src/tools/contracts.ts` or local tool interfaces | utility/contracts | request-response | `src/store/interface.ts` | role-match |
| `src/tools/ingest.ts` | tool | request-response, batch | `src/tools/page.ts` | role-match |
| `src/tools/search.ts` | tool | request-response | `src/search/hybrid.ts` | exact behavior analog |
| `src/tools/page.ts` | tool | CRUD, request-response | existing file | exact |
| `src/tools/links.ts` | tool | CRUD, request-response | existing file | exact |
| `src/tools/timeline.ts` | tool | request-response | existing file | exact |
| `src/tools/config.ts` | tool | CRUD, request-response | existing file | exact |
| `src/tools/raw.ts` | tool | CRUD, request-response | existing file | exact |
| `src/tools/list.ts` | tool | request-response | existing file | exact |
| `src/tools/import.ts` | tool | batch, file-I/O bridge | `src/tools/ingest.ts` | role-match |
| `src/agent/index.ts` | provider/aggregator | request-response | existing file | exact |
| `src/scripts/doctor.ts` | script utility | request-response, batch | existing file | exact |
| `src/scripts/embed.ts` | script utility | batch, vector maintenance | existing file | exact |
| `src/scripts/import.ts` | script utility | batch, file-I/O | existing file | exact |
| `src/store/brainstore/content/chunks/interface.ts` | branch interface | CRUD, vector-adjacent | `src/store/brainstore/content/pages/interface.ts` | exact role-match |
| `src/store/brainstore/content/chunks/factory.ts` | branch factory | CRUD, vector-adjacent | existing file + `retrieval/search/factory.ts` | exact |
| `src/store/brainstore/retrieval/embedding/interface.ts` | branch interface | vector lookup/write | existing file | exact |
| `src/store/brainstore/retrieval/embedding/factory.ts` | branch factory | vector lookup/write | existing file | exact |
| `src/store/brainstore/ops/vector/interface.ts` | internal provider interface | vector operations | `src/store/brainstore/ops/internal/interface.ts` | role-match |
| `src/store/brainstore/ops/vector/factory.ts` | internal provider factory | vector operations | `src/store/brainstore/ops/lifecycle/factory.ts` | role-match |
| `src/store/brainstore/ops/vector/index.ts` | barrel | export wiring | `src/store/brainstore/ext/index.ts` | exact role-match |
| `src/store/brainstore/ops/internal/interface.ts` | branch interface | unsafe DB, vector boundary | existing file | exact |
| `src/store/brainstore/ops/internal/factory.ts` | branch factory | unsafe DB, vector boundary | existing file | exact |
| `src/store/brainstore/tree/interface.ts` | branch tree interface | composition | existing file | exact |
| `src/store/brainstore/tree/factory.ts` | branch tree factory | composition | existing file | exact |
| `src/store/BrainStore.ts` | root Context/facade types | composition, compatibility | existing file | exact |
| `src/store/libsql-store.ts` | layer assembly | composition, request-response bridge | existing file | exact |
| `src/store/libsql.ts` | public Promise facade | request-response, CRUD, vector | existing file | exact |
| `src/store/index.ts` | provider factory | provider/layer composition | existing file | exact |
| `test/ingest/workflow.test.ts` | unit test | request-response, batch | existing file + `test/search/hybrid.test.ts` | exact target |
| `test/search/hybrid.test.ts` | unit test | request-response | existing file | exact |
| `test/ext.test.ts` | mixed facade/helper test | CRUD, vector | `test/libsql.test.ts` + `test/store/brainstore-layers.test.ts` | role-match |
| `test/libsql.test.ts` | public facade test | CRUD, vector, request-response | existing file | exact |
| `test/tools.test.ts` | integration test | tool request-response | existing file | exact |
| `test/integration.test.ts` | integration test | batch + tools | existing file | exact |
| `test/store_extensions.test.ts` | public facade test | CRUD/extensions | existing file | exact |
| `test/scripts/doctor.test.ts` | script integration test | request-response | existing file | exact |
| `test/scripts/embed.test.ts` | script integration test | batch, vector maintenance | existing file | exact |

## Pattern Assignments

### `src/ingest/workflow.ts` (workflow/service contract, batch + transform)

**Analog:** `src/search/hybrid.ts`

**Direct Effect-first plus Promise compatibility pattern** (lines 37-45, 167-181):
```typescript
export function hybridSearchEffect(
  query: string,
  opts: HybridSearchOpts = {},
  queryVector?: number[]
): Eff.Effect<SearchResult[], StoreError, BrainStoreSearch> {
  return Eff.gen(function* () {
    const engine = yield* BrainStoreSearch;
```

```typescript
export async function hybridSearch(
  backend: StoreProvider,
  query: string,
  opts: HybridSearchOpts,
  queryVector?: number[]
): Promise<SearchResult[]> {
  // Primary path: real stores provide a BrainStore runtime.
  if (backend.brainStore?.runPromise) {
    return backend.brainStore.runPromise(
      hybridSearchEffect(query, opts, queryVector)
    );
  }
```

**Current workflow surface to migrate** (from `src/ingest/workflow.ts`, lines 17-24):
```typescript
export interface IngestionOptions {
  store: StoreProvider;
  embedder: EmbeddingProvider;
  maxBytes?: number;
}

export function createIngestionWorkflow(deps: IngestionOptions) {
  const { store, embedder, maxBytes = 5000000 } = deps;
```

**Methods actually required by the workflow** (from `src/ingest/workflow.ts`, lines 219-281):
```typescript
const write = async (tx: StoreProvider) => {
  if (inputData.existing_hash) await tx.createVersion(slug);
  await tx.putPage(slug, {
    type: parsed.type,
    title: parsed.title,
    frontmatter: parsed.frontmatter || {},
    compiled_truth: parsed.compiled_truth,
    timeline: parsed.timeline,
    content_hash,
  });
  const existingTags = await tx.getTags(slug);
  await tx.upsertChunks(slug, chunks);
  await tx.addTimelineEntriesBatch(entries);
};

if (deps.store.transaction) {
  await deps.store.transaction(write);
} else {
  await write(deps.store);
}
```

**Copy target:** keep the already-created `IngestionWorkflowStore` only as compatibility glue for public `{ store, embedder }` callers. New internal workflow paths should acquire Effect services from `brainStore.runPromise(...)` or a provided `ManagedRuntime` and execute against `ContentPages`, `ContentChunks`, `GraphTimeline`, and related branch contracts directly.

---

### `src/tools/*.ts`, `src/tools/contracts.ts`, `src/agent/index.ts` (tools and aggregate provider)

**Analog:** `src/tools/page.ts`

**Tool factory imports and dependency injection** (lines 1-5):
```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { StoreProvider } from "../store/interface.js";

export function createPageTools(store: StoreProvider) {
```

**Tool execution pattern** (lines 13-27):
```typescript
execute: async (inputData) => {
  const page = await store.getPage(inputData.slug);
  if (!page) {
    return { error: "Page not found" };
  }
  return {
    slug: page.slug,
    type: page.type,
    title: page.title,
    tags: await store.getTags(inputData.slug),
    frontmatter: page.frontmatter,
    compiled_truth: page.compiled_truth,
    updated_at: page.updated_at,
  };
},
```

**Error-return pattern for tool/script bridge** (from `src/tools/import.ts`, lines 21-38):
```typescript
execute: async (inputData) => {
  try {
    const summary = await bulkImport(
      inputData.directoryPath,
      store,
      embedder
    );
    return { success: true, summary };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unknown error occurred during bulk import",
    };
  }
},
```

**Aggregate wiring pattern** (from `src/agent/index.ts`, lines 13-27 and 49-67):
```typescript
export function createGBrainAgent(
  store: StoreProvider,
  embedder: EmbeddingProvider
) {
  const { pageInfoTool, readPageTool, deletePageTool, addTagTool, removeTagTool } =
    createPageTools(store);
  const { linksTool, addLinkTool, removeLinkTool } = createLinksTools(store);
```

```typescript
tools: {
  searchTool: createSearchTool(store, embedder),
  ingestTool: createIngestTool(store, embedder),
  bulkImportTool: createBulkImportTool(store, embedder),
  listPagesTool: createListPagesTool(store),
  timelineTool: createTimelineTool(store),
}
```

**Copy target:** keep public tool factories structurally compatible with `LibSQLStore`, but make shared implementation helpers Effect-first where practical. Internal tool/search behavior should call branch services through the store runtime instead of creating more Promise-shaped capability interfaces. Do not make tools depend on raw SQL/vector internals.

---

### `src/scripts/doctor.ts`, `src/scripts/embed.ts`, `src/scripts/import.ts` (script utilities)

**Analog:** existing script DI/default factory pattern.

**Optional injected store with default factory and owned disposal** (from `src/scripts/doctor.ts`, lines 10-23 and 117-123):
```typescript
export async function runDoctor(
  storeInstance?: StoreProvider,
  isJson = false
): Promise<boolean> {
  const store = storeInstance ?? createDefaultStore();
  const checks: Check[] = [];

  try {
    await store.init();
    const report = await store.getHealthReport();
```

```typescript
} finally {
  try {
    if (!storeInstance) {
      await store.dispose();
    }
  } catch (e) {}
}
```

**Batch vector maintenance method subset** (from `src/scripts/embed.ts`, lines 15-25 and 57-70):
```typescript
export async function embedStale(
  batchSize: number = 20,
  storeInstance?: StoreProvider
): Promise<number> {
  const store = storeInstance ?? createDefaultStore();
  await store.init();
  const staleChunks = await store.getStaleChunks();
```

```typescript
await store.upsertVectors(records);
const chunkIds = batch.map((c) => c.id);
await store.markChunksEmbedded(chunkIds);
```

**Bulk import workflow dependency shape** (from `src/scripts/import.ts`, lines 65-70 and 112-115):
```typescript
export async function bulkImport(
  baseDir: string,
  storeInstance?: StoreProvider,
  embedderInstance?: EmbeddingProvider,
  options: { workerCount?: number; fresh?: boolean } = {}
)
```

```typescript
const workflow = createIngestionWorkflow({
  store: activeStore,
  embedder: activeEmbedder,
});
```

**Copy target:** keep script CLI/default factory fallback and disposal ownership, but move reusable script internals toward Effect branch services or provider services. Narrow Promise script contracts are acceptable only for exported CLI/helper compatibility and must delegate to the Effect path.

---

### `src/store/brainstore/content/chunks/interface.ts` (branch interface)

**Analog:** `src/store/brainstore/content/pages/interface.ts`

**Context.Service contract pattern** (lines 15-33):
```typescript
export interface ContentPagesService {
  getPage(slug: string): EngineEffect<Page | null>;
  listPages(filters?: PageFilters): EngineEffect<Page[]>;
  createVersion(slug: string): EngineEffect<PutReturning<PageVersion>>;
  putPage(slug: string, page: PageInput): EngineEffect<PutReturning<Page>>;
}

export class ContentPages extends Context.Service<
  ContentPages,
  ContentPagesService
>()("@yui-agent/brain-mastra/BrainStoreTree/content/pages") {}
```

**Current chunk contract to extend with branch-owned lookup** (from `src/store/brainstore/content/chunks/interface.ts`, lines 8-19):
```typescript
// Vector lookup/write ownership moves to retrieval.embedding; this branch
// stays focused on chunk and FTS-facing responsibilities.
export interface ContentChunksService {
  upsertChunks(slug: string, chunks: ChunkInput[]): EngineEffect<void>;
  deleteChunks(slug: string): EngineEffect<void>;
  getChunks(slug: string): EngineEffect<Chunk[]>;
}

export class ContentChunks extends Context.Service<
  ContentChunks,
  ContentChunksService
>()("@yui-agent/brain-mastra/BrainStoreTree/content/chunks") {}
```

**Copy target:** add `getChunksWithEmbeddings(slug)` here if Phase 10 moves ownership. Keep the service contract in this branch interface, not in `BrainStore.ts`.

---

### `src/store/brainstore/content/chunks/factory.ts` (branch factory)

**Analog:** existing `ContentChunks` factory.

**Port/dependency pattern** (lines 11-26):
```typescript
export interface ContentChunksEmbeddingPort {
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[],
    opts?: { deleteSlug?: string }
  ): Eff.Effect<void, StoreError>;
  deleteVectorsBySlug(slug: string): Eff.Effect<void, StoreError>;
}

export interface ContentChunksDependencies {
  mappers: SqlBuilder;
  embeddings?: ContentChunksEmbeddingPort;
}
```

**Core CRUD + vector-port use** (lines 83-102):
```typescript
const vectorData = chunks
  .filter((chunk) => chunk.embedding)
  .map((chunk) => ({
    id: `${slug}::${chunk.chunk_index}`,
    vector: Array.from(chunk.embedding!),
    metadata: { page_id: pageId, slug, title: pageTitle, type: pageType },
  }));

if (embeddings && vectorData.length > 0) {
  yield* embeddings.upsertVectors(vectorData, { deleteSlug: slug });
}
```

**Layer overload pattern** (lines 148-185):
```typescript
export const makeLayer = (
  service:
    | ContentChunksService
    | ContentChunksDependencies
    | ContentChunksLayerOptions = {}
) => {
  if (isService(service)) {
    return Layer.succeed(ContentChunks, service);
  }
  if (isDependencies(service)) {
    return Layer.succeed(ContentChunks, makeContentChunks(service));
  }
  return Layer.effect(
    ContentChunks,
    Eff.gen(function* () {
      const mappers = yield* Mappers;
      const embedding = yield* RetrievalEmbedding;
      return makeContentChunks({ mappers, embeddings });
    })
  );
};
```

**Copy target:** any new chunk/vector helper should use typed ports and `makeLayer(service | deps | options)` instead of passing raw `LibSQLVector` broadly.

---

### `src/store/brainstore/retrieval/embedding/*` and `src/store/brainstore/ops/vector/*` (vector provider/service)

**Analog:** `src/store/brainstore/retrieval/embedding/interface.ts`, `factory.ts`, and `src/store/brainstore/ops/lifecycle/factory.ts`.

**Current retrieval embedding service** (from `interface.ts`, lines 13-39):
```typescript
export interface RetrievalEmbeddingLookup {
  getEmbeddingsByChunkIds(
    ids: number[]
  ): EngineEffect<Map<number, Float32Array>>;
}

export interface RetrievalEmbeddingService extends RetrievalEmbeddingLookup {
  searchVector(embedding: number[], opts?: SearchOpts & { slug?: string }): EngineEffect<SearchResult[]>;
  getStaleChunks(): EngineEffect<StaleChunk[]>;
  upsertVectors(vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]): EngineEffect<void>;
  markChunksEmbedded(chunkIds: number[]): EngineEffect<void>;
}
```

**Raw vector access to encapsulate** (from `factory.ts`, lines 57-65 and 144-156):
```typescript
return yield* Eff.from(
  () =>
    deps.vectorStore?.query({
      indexName: deps.indexName,
      queryVector: Array.from(queryVector),
      topK: limit * 2,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    }) ?? []
);
```

```typescript
if (!deps.vectorStore || vectors.length === 0) return;
yield* Eff.promise(() =>
  deps.vectorStore!.upsert({
    indexName: deps.indexName,
    vectors: vectors.map((vector) => vector.vector),
    ids: vectors.map((vector) => vector.id),
    metadata: vectors.map((vector) => vector.metadata),
  })
);
```

**Provider layer shape to copy** (from `src/store/brainstore/ops/lifecycle/factory.ts`, lines 69-95):
```typescript
export const makeLayer = (
  service:
    | OpsLifecycleService
    | OpsLifecycleDependencies
    | OpsLifecycleLayerOptions
) => {
  if (isService(service)) {
    return Layer.succeed(OpsLifecycle, service);
  }
  if (isDependencies(service)) {
    return Layer.succeed(OpsLifecycle, makeOpsLifecycle(service));
  }
  return Layer.effect(
    OpsLifecycle,
    Eff.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const initialized = yield* Eff.Ref.make(false);
      return makeOpsLifecycle({ sql, initialized, initSql: service.initSql });
    })
  );
};
```

**Copy target:** introduce a typed vector provider only if needed by the plan. It should expose named methods such as `query`, `upsert`, `deleteBySlug`, `createIndex`, and `dispose`, then inject that provider into retrieval/chunks/lifecycle. Avoid keeping `vectorStore?: LibSQLVector` on branch dependency surfaces.

---

### `src/store/brainstore/retrieval/search/*` and `src/search/hybrid.ts` (narrow branch search)

**Analog:** `src/store/brainstore/retrieval/search/factory.ts`

**Dependency composition pattern** (lines 14-21):
```typescript
export type RetrievalSearchMappers = Pick<SqlBuilder, "searchKeyword">;

export interface RetrievalSearchDependencies {
  mappers: RetrievalSearchMappers;
  backlinks: Pick<RetrievalSearchService, "getBacklinkCounts">;
  embeddings: Pick<RetrievalSearchService, "getEmbeddingsByChunkIds">;
  vectorSearch: Pick<RetrievalSearchService, "searchVector">;
}
```

**Delegating service methods** (lines 27-56):
```typescript
return {
  searchKeyword: Eff.fn("retrieval.search.searchKeyword")(function* (query, opts) {
    const segmentedQuery = extractWordsForSearch(query);
    const rows = yield* deps.mappers.searchKeyword(segmentedQuery, opts);
    return rows.map((row) => ({ ...row, score }));
  }, catchStoreError),
  searchVector: Eff.fn("retrieval.search.searchVector")(function* (embedding, opts) {
    return yield* deps.vectorSearch.searchVector(embedding, opts);
  }, catchStoreError),
  getEmbeddingsByChunkIds: Eff.fn("retrieval.search.getEmbeddingsByChunkIds")(
    function* (ids) {
      return yield* deps.embeddings.getEmbeddingsByChunkIds(ids);
    },
    catchStoreError
  ),
};
```

**Layer assembly from exact services** (lines 68-82):
```typescript
return Layer.effect(
  RetrievalSearch,
  Eff.gen(function* () {
    const mappers = yield* Mappers;
    const backlinks = yield* GraphBacklinkCountsService;
    const embeddings = yield* RetrievalEmbeddingLookupService;
    const vectorSearch = yield* RetrievalEmbedding;
    return makeRetrievalSearch({ mappers, backlinks, embeddings, vectorSearch });
  })
);
```

**Copy target:** use `Pick<>` dependency contracts for branch composition. For Promise fallback tests in `hybrid.ts`, prefer runtime-backed Effect execution; if a Promise fallback remains for legacy mocks, name it as compatibility glue and keep it out of the internal implementation model.

---

### `src/store/brainstore/tree/*`, `src/store/BrainStore.ts`, `src/store/libsql-store.ts` (root composition and compat)

**Analog:** existing tree and assembly.

**Tree service shape** (from `tree/interface.ts`, lines 11-33):
```typescript
export interface BrainStoreTreeService {
  content: {
    pages: ContentPagesService;
    chunks: ContentChunksService;
  };
  retrieval: {
    search: RetrievalSearchService;
    embedding: RetrievalEmbeddingService;
  };
  ops: {
    lifecycle: OpsLifecycleService;
    internal: OpsInternalService;
  };
}

export class BrainStoreTree extends Context.Service<
  BrainStoreTree,
  BrainStoreTreeService
>()("@yui-agent/brain-mastra/BrainStoreTree") {}
```

**Composed layer pattern** (from `tree/factory.ts`, lines 22-44):
```typescript
export const makeComposedLayer = Layer.effect(
  BrainStoreTree,
  Eff.gen(function* () {
    return makeBrainStoreTree({
      content: { pages: yield* ContentPages, chunks: yield* ContentChunks },
      retrieval: {
        search: yield* RetrievalSearch,
        embedding: yield* RetrievalEmbedding,
      },
      ops: { lifecycle: yield* OpsLifecycle, internal: yield* OpsInternal },
    });
  })
);
```

**Root compat boundary** (from `src/store/BrainStore.ts`, lines 53-62 and 100-145):
```typescript
export interface IngestionStore
  extends ContentPagesService,
    ContentChunksService,
    RetrievalEmbeddingLookup {
  getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>;
}

export class BrainStore extends Context.Service<
  BrainStore,
  BrainStore.Service
>()("@yui-agent/brain-mastra/BrainStore") {}
```

```typescript
export declare namespace BrainStore {
  export type Ingestion = IngestionStore;
  export type Embedding = RetrievalEmbeddingService;
  export type Options = {
    vectorUrl?: string;
    authToken?: string;
    dimension?: number;
    vectorStore?: LibSQLVector;
  };
}
```

**Assembly boundary** (from `src/store/libsql-store.ts`, lines 124-221):
```typescript
export function makeLayer(options: { url: string } & BrainStore.Options) {
  const SqlLive = SqliteClient.layer({ filename });
  const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
  const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);

  const EmbeddingLayer = makeRetrievalEmbeddingLayer({
    vectorStore,
    indexName,
  }).pipe(Layer.provide(DatabaseLive));

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

  return Layer.mergeAll(DatabaseLive, BranchLayers, TreeLayer, ExtLayer, BrainStoreLayer, CompatLayer);
}
```

**Copy target:** keep `libsql-store.ts` as wiring only. Move behavior into branch/provider factories, then project through `BrainStore`/`BrainStoreCompat` without reimplementing feature logic in assembly.

---

### `src/store/libsql.ts`, `src/store/index.ts` (public facade and provider default)

**Analog:** existing facade/provider.

**Lazy runtime and vector facade compatibility** (from `src/store/libsql.ts`, lines 66-99):
```typescript
get brainStore(): ManagedRuntime.ManagedRuntime<BrainStoreRuntime, never> {
  if (!this._brainStore) {
    if (this.options.vectorStore) {
      this.vectorStore = this.options.vectorStore;
    } else {
      this.vectorStore = new LibSQLVector({
        id: "gbrain",
        url: this.vectorUrl,
        authToken: this.authToken,
      });
    }

    const layer = makeLibSQLStoreLayer({
      url: this.url,
      vectorUrl: this.vectorUrl,
      authToken: this.authToken,
      dimension: this.dimension,
      vectorStore: this.vectorStore,
    });
    this._brainStore = ManagedRuntime.make(layer);
  }
  return this._brainStore!;
}
```

**Promise facade wrappers over compat service** (from `src/store/libsql.ts`, lines 120-141 and 419-420):
```typescript
async runFlatten<A, E = never, E2 = never, R extends BrainStoreRuntime = never>(
  fn: (store: BrainStoreCompatService) => Effect.Effect<Effect.Effect<A, E2, R>, E, BrainStoreCompat>
): Promise<A> {
  return this.brainStore.runPromise(
    BrainStoreCompat.use((store) => fn(store).pipe(Effect.flatten))
  );
}

async run<A, E = never>(
  fn: (store: BrainStoreCompatService) => Effect.Effect<A, E, BrainStoreCompat>
): Promise<A> {
  return this.brainStore.runPromise(BrainStoreCompat.use(fn));
}

async getChunksWithEmbeddings(slug: string): Promise<Chunk[]> {
  return this.run((store) => store.getChunksWithEmbeddings(slug));
}
```

**Provider default pattern** (from `src/store/index.ts`, lines 11-18 and 82-105):
```typescript
export function createDefaultStore(
  options: LibSQLStoreOptions = { url: "file::memory:" }
) {
  return new LibSQLStore({
    ...options,
    url: options.url || "file::memory:",
    dimension: options.dimension || 768,
  });
}
```

```typescript
export class BrainStoreProvider extends Context.Service<BrainStoreProvider>()(
  "@yui-agent/brain-mastra/BrainStoreProvider",
  { make }
) {
  static liveWith: (store: StoreProvider) => Layer.Layer<BrainStoreProvider, never, EmbeddingModel.EmbeddingModel> =
    (store) => Layer.unwrap(/* ... */);

  static Default = flow(make, Layer.effect(BrainStoreProvider));
}
```

**Copy target:** preserve public `new LibSQLStore`, `createDefaultStore`, `BrainStoreProvider.Default`, and facade methods. Do not widen `StoreProvider` for internal vector or branch needs.

---

### Tests: public facade lane vs narrow branch/provider lane

**Public facade analog:** `test/libsql.test.ts`

**Facade setup and cleanup** (lines 1-17):
```typescript
import { afterAll, beforeAll, expect, test } from "bun:test";
import { LibSQLStore } from "../src/store/libsql.js";

let store: LibSQLStore;

beforeAll(async () => {
  store = new LibSQLStore({
    url: "file:./tmp/libsql.test.db",
    dimension: 1536,
  });
  await store.init();
});

afterAll(async () => {
  await store.cleanDBFile();
});
```

**Keep multilingual/vector facade behavior here** (lines 157-235):
```typescript
test("LibSQLStore upsert and delete chunks", async () => {
  const chunks: ChunkInput[] = [
    { chunk_text: "Hello world", embedding: new Float32Array(1536).fill(0.1) },
    { chunk_text: "这是一个中文测试", embedding: new Float32Array(1536).fill(0.2) },
    { chunk_text: "これは日本語のテストです。", embedding: new Float32Array(1536).fill(0.3) },
  ];
  await store.upsertChunks("chunk-slug", chunks);
  const chineseResults = await store.searchKeyword("中文", { limit: 10 });
  const vectorResults = await store.searchVector(new Array(1536).fill(0.1), {
    slug: "chunk-slug",
  });
});
```

**Narrow branch injection analog:** `test/store/brainstore-layers.test.ts` (lines 7-32):
```typescript
test("supports branch-only injection with Layer.succeed", async () => {
  const search = makeRetrievalSearch({
    mappers: { searchKeyword: () => ({ asEffect: () => Effect.succeed([]) }) as any },
    backlinks: { getBacklinkCounts: () => Effect.succeed(new Map()) },
    embeddings: { getEmbeddingsByChunkIds: () => Effect.succeed(new Map()) },
    vectorSearch: { searchVector: () => Effect.succeed([] as any) },
  });
  const runtime = ManagedRuntime.make(
    Layer.succeed(BrainStoreSearch, BrainStoreSearch.of(search as any))
  );
  const resolved = await runtime.runPromise(BrainStoreSearch.asEffect());
  expect(resolved).toHaveProperty("searchKeyword");
});
```

**Workflow mock target to narrow** (from `test/ingest/workflow.test.ts`, lines 10-31):
```typescript
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
      return track(prop);
    },
  });
  return store;
}
```

**Anti-pattern to retire from helper tests** (from `test/ext.test.ts`, lines 153-190 and 462-495):
```typescript
const originalQuery = store.vectorStore.query.bind(store.vectorStore);
store.vectorStore.query = async () => [
  { id: "page-a::0", score: 0.9, metadata: { slug: "page-a", chunk_index: 0 } },
];
try {
  const results = await store.searchVector(new Array(1536).fill(0.5));
} finally {
  store.vectorStore.query = originalQuery;
}
```

```typescript
const originalUpsert = store.vectorStore.upsert.bind(store.vectorStore);
store.vectorStore.upsert = async (payload: any) => {
  calls.push({ ids: payload.ids, vectors: payload.vectors, metadata: payload.metadata });
  return undefined as never;
};
```

**Copy target:** keep `test/libsql.test.ts`, `test/integration.test.ts`, and facade extension tests as public compatibility evidence. Convert workflow/search/vector helper tests to precise narrow interfaces or `Layer.succeed` branch/provider injection. Avoid proving new boundaries with `as unknown as StoreProvider` or direct `store.vectorStore` mutation.

## Shared Patterns

### Effect v4 Service and Layer Rules

**Source:** `docs/effect/effect-v4-agent-skill.md`, lines 16-22; repo branch files above.

Apply to all store branch/provider code:
```typescript
export class ContentChunks extends Context.Service<
  ContentChunks,
  ContentChunksService
>()("@yui-agent/brain-mastra/BrainStoreTree/content/chunks") {}
```

Use `Layer.succeed` for already-built services, `Layer.effect` for services that resolve dependencies, and `yield* SomeService`/`SomeService.asEffect()` for service access. Do not introduce `Context.Tag`, `Effect.Tag`, `Effect.Service`, `Effect.catchAll`, or branch factory `as unknown` / `as any` type escapes.

### Error Handling

**Source:** `src/store/brainstore/content/chunks/factory.ts`, lines 31-39 and 42-103.

Apply to branch factories:
```typescript
const catchStoreError = StoreError.catch;
const deleteChunksByPageId = Eff.fn("content.chunks.deleteChunksByPageId")(
  function* (pageId: number) {
    yield* mappers.deleteFtsByPageId(pageId);
    yield* mappers.deleteContentChunksByPageId(pageId);
  },
  catchStoreError
);
```

### Interface Location

**Source:** `AGENTS.md` and `src/store/BrainStore.ts`, lines 53-62.

Feature branch contracts live under `src/store/brainstore/**/interface.ts`. `BrainStore.ts` may combine aliases or transitional compatibility projections, but should not duplicate branch contracts.

### Public Compatibility

**Source:** `src/store/libsql.ts`, lines 51-99 and `test/libsql.test.ts`, lines 1-17.

Keep `LibSQLStore` as the Promise facade and public construction seam. Internal narrowing is a typing/dependency cleanup, not facade removal.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/store/brainstore/ops/vector/*` | internal provider | vector operations | No exact typed vector provider exists yet. Use role-match patterns from `ops/internal`, `ops/lifecycle`, and `retrieval/embedding`; keep it internal and Layer-provided. |

## Metadata

**Analog search scope:** `src/store/brainstore/**`, `src/store/{BrainStore,interface,index,libsql,libsql-store}.ts`, `src/ingest/**`, `src/search/**`, `src/tools/**`, `src/scripts/**`, `test/**`
**Files scanned:** 70+ TypeScript files by `rg`/targeted reads
**Pattern extraction date:** 2026-04-26
**Skills applied:** `effect-v4` local skill and repository AGENTS/CLAUDE constraints
