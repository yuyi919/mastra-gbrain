# `LibSQLStore` 到 `BrainStore.Service` 方法映射分析

本文档分析了位于 `/workspace/src/store/libsql.ts` 中的 `LibSQLStore` 实现（基于 `Promise`）和位于 `/workspace/src/store/libsql-store.ts` 中的 `BrainStore.Service` 接口实现（基于 `Effect`）之间的映射关系及其封装状态。

## 概述

`LibSQLStore` 是一个传统的面向对象的类，直接使用 `Promise` 和底层的 Drizzle ORM 以及 SQLite API 来进行操作。
`BrainStore.Service` 是其在函数式架构下的等价替代，利用 `@tslibs/effect/effect-next` 库对操作进行了 Effect 封装，将其返回类型统一为 `EngineEffect<T>`（即 `Effect<T, StoreError>`）。通过 `Eff.fn("methodName")(function*() { ... }, catchStoreError)` 这样的语法包装，所有的异常都会被映射到统一的 `StoreError` 类型，以提供更强的错误处理和组合能力。

以下是各个领域的方法签名映射和封装详情：

## 1. 生命周期 (Lifecycle)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `init(): Promise<void>` | `init(): EngineEffect<void>` | 通过 `Eff.fn("init")` 和 `catchStoreError` 封装 |
| `dispose(): Promise<void>` | `dispose(): EngineEffect<void>` | 封装为了 Effect，但内部未显式释放资源（由 Layer 管理） |
| `cleanVector(): Promise<void>` | **无对应方法** | 仅内部存在 |
| `dropDBFile(): Promise<void>` | **无对应方法** | 仅内部存在 |
| `cleanDBFile(drop?: boolean): Promise<void>` | **无对应方法** | 仅内部存在 |

## 2. 核心内容与页面摄取 (Ingestion)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `getPage(slug: string): Promise<Page \| null>` | `getPage(slug: string): EngineEffect<Page \| null>` | `Eff.fn("getPage")`，对结果应用 `Page.decode` |
| `listPages(filters?: PageFilters): Promise<Page[]>` | `listPages(filters?: PageFilters): EngineEffect<Page[]>` | `Eff.fn("listPages")` |
| `resolveSlugs(partial: string): Promise<string[]>` | `resolveSlugs(partial: string): EngineEffect<string[]>` | `Eff.fn("resolveSlugs")` |
| `getTags(slug: string): Promise<string[]>` | `getTags(slug: string): EngineEffect<string[]>` | `Eff.fn("getTags")` |
| `createVersion(slug: string): Promise<PageVersion>` | `createVersion(slug: string): EngineEffect<PutReturning<PageVersion>>` | `Eff.fn("createVersion")` |
| `getVersions(slug: string): Promise<PageVersion[]>` | `getVersions(slug: string): EngineEffect<PageVersion[]>` | `Eff.fn("getVersions")` |
| `revertToVersion(slug: string, versionId: number): Promise<void>` | `revertToVersion(slug: string, versionId: number): EngineEffect<void>` | `Eff.fn("revertToVersion")` |
| `putPage(slug: string, page: PageInput): Promise<Page>` | `putPage(slug: string, page: PageInput): EngineEffect<PutReturning<Page>>` | `Eff.fn("putPage")` |
| `updateSlug(oldSlug: string, newSlug: string): Promise<void>` | `updateSlug(oldSlug: string, newSlug: string): EngineEffect<void>` | `Eff.fn("updateSlug")` |
| `deletePage(slug: string): Promise<void>` | `deletePage(slug: string): EngineEffect<void>` | `Eff.fn("deletePage")`，内部利用 `Eff.all` 并发删除 |
| `addTag(slug: string, tag: string): Promise<void>` | `addTag(slug: string, tag: string): EngineEffect<void>` | `Eff.fn("addTag")` |
| `removeTag(slug: string, tag: string): Promise<void>` | `removeTag(slug: string, tag: string): EngineEffect<void>` | `Eff.fn("removeTag")` |

## 3. 块与嵌入向量 (Chunks & Embeddings)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>` | `upsertChunks(slug: string, chunks: ChunkInput[]): EngineEffect<void>` | `Eff.fn("upsertChunks")` |
| `deleteChunks(slug: string): Promise<void>` | `deleteChunks(slug: string): EngineEffect<void>` | `Eff.fn("deleteChunks")`，内部使用 `Eff.withConcurrency(2)` |
| `getChunks(slug: string): Promise<Chunk[]>` | `getChunks(slug: string): EngineEffect<Chunk[]>` | `Eff.fn("getChunks")` |
| `getChunksWithEmbeddings(slug: string): Promise<Chunk[]>` | `getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>` | `Eff.fn("getChunksWithEmbeddings")` |
| `getEmbeddingsByChunkIds(ids: number[]): Promise<Map<number, Float32Array>>` | `getEmbeddingsByChunkIds(ids: number[]): EngineEffect<Map<number, Float32Array>>` | `Eff.fn("getEmbeddingsByChunkIds")` |
| `upsertVectors(vectors: { ... }[]): Promise<void>` | `upsertVectors(vectors: { ... }[]): EngineEffect<void>` | `Eff.fn("upsertVectors")` (位于 ExtService 分类中) |

## 4. 链接与图操作 (Links & Graph)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `addLink(fromSlug: string, toSlug: string, linkType?: string, context?: string): Promise<void>` | `addLink(fromSlug: string, toSlug: string, linkType?: string, context?: string): EngineEffect<void>` | `Eff.fn("addLink")` |
| `removeLink(fromSlug: string, toSlug: string): Promise<void>` | `removeLink(fromSlug: string, toSlug: string): EngineEffect<void>` | `Eff.fn("removeLink")` |
| `getLinks(slug: string): Promise<Link[]>` | `getLinks(slug: string): EngineEffect<Link[]>` | `Eff.fn("getLinks")` |
| `getBacklinks(slug: string): Promise<Link[]>` | `getBacklinks(slug: string): EngineEffect<Link[]>` | `Eff.fn("getBacklinks")` |
| `getOutgoingLinks(slug: string): Promise<Link[]>` | **无对应暴露方法** | 在 `BrainStore.Service` 中仅内联实现在 `getLinks` 中 |
| `rewriteLinks(oldSlug: string, newSlug: string): Promise<void>` | `rewriteLinks(oldSlug: string, newSlug: string): EngineEffect<void>` | `Eff.fn("rewriteLinks")` |
| `traverseGraph(slug: string, depth?: number): Promise<GraphNode[]>` | `traverseGraph(slug: string, depth?: number): EngineEffect<GraphNode[]>` | `Eff.fn("traverseGraph")` |

*(注：`BrainStore.Service` 的 `LinkService` 接口中还定义了 `addLinksBatch`、`traversePaths` 和 `getBacklinkCounts` 等可选方法，但在 SQLite 的具体实现中通常提供了默认空实现或未实现)*

## 5. 时间线 (Timeline)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `addTimelineEntry(slug: string, entry: TimelineInput, opts?: { skipExistenceCheck?: boolean }): Promise<void>` | `addTimelineEntry(slug: string, entry: TimelineInput, opts?: { skipExistenceCheck?: boolean }): EngineEffect<void>` | `Eff.fn("addTimelineEntry")` |
| `addTimelineEntriesBatch(entries: TimelineBatchInput[]): Promise<number>` | `addTimelineEntriesBatch(entries: TimelineBatchInput[]): EngineEffect<number>` | `Eff.fn("addTimelineEntriesBatch")` |
| `getTimeline(slug: string, opts?: TimelineOpts): Promise<TimelineEntry[]>` | `getTimeline(slug: string, opts?: TimelineOpts): EngineEffect<TimelineEntry[]>` | `Eff.fn("getTimeline")` |

## 6. 混合检索 (Hybrid Search)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `searchKeyword(query: string, opts?: SearchOpts): Promise<SearchResult[]>` | `searchKeyword(query: string, opts?: SearchOpts): EngineEffect<SearchResult[]>` | `Eff.fn("searchKeyword")` |
| `searchVector(queryVector: number[], opts?: SearchOpts & { slug?: string }): Promise<SearchResult[]>` | `searchVector(queryVector: number[], opts?: SearchOpts & { slug?: string }): EngineEffect<SearchResult[]>` | `Eff.fn("searchVector")` |

## 7. 原始数据与文件 (Raw Data & Files)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `putRawData(slug: string, source: string, data: any): Promise<void>` | `putRawData(slug: string, source: string, data: any): EngineEffect<void>` | `Eff.fn("putRawData")` |
| `getRawData(slug: string, source?: string): Promise<RawData[]>` | `getRawData(slug: string, source?: string): EngineEffect<RawData[]>` | `Eff.fn("getRawData")` |
| `upsertFile(file: Omit<FileRecord, "id" \| "page_id" \| "created_at">): Promise<void>` | `upsertFile(file: Omit<FileRecord, "id" \| "page_id" \| "created_at">): EngineEffect<void>` | `Eff.fn("upsertFile")` |
| `getFile(storagePath: string): Promise<FileRecord \| null>` | `getFile(storagePath: string): EngineEffect<FileRecord \| null>` | `Eff.fn("getFile")` |

## 8. 配置、日志与监控 (Config, Logs & Maintenance)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `getConfig(key: string): Promise<string \| null>` | `getConfig(key: string): EngineEffect<string \| null>` | `Eff.fn("getConfig")` |
| `setConfig(key: string, value: string): Promise<void>` | `setConfig(key: string, value: string): EngineEffect<void>` | `Eff.fn("setConfig")` |
| `logIngest(log: IngestLogInput): Promise<void>` | `logIngest(log: IngestLogInput): EngineEffect<void>` | `Eff.fn("logIngest")` |
| `getIngestLog(opts?: { limit?: number }): Promise<IngestLogEntry[]>` | `getIngestLog(opts?: { limit?: number }): EngineEffect<IngestLogEntry[]>` | `Eff.fn("getIngestLog")` |
| `verifyAccessToken(tokenHash: string): Promise<AccessToken \| null>` | `verifyAccessToken(tokenHash: string): EngineEffect<AccessToken \| null>` | `Eff.fn("verifyAccessToken")` |
| `logMcpRequest(log: Omit<McpRequestLog, "id" \| "created_at">): Promise<void>` | `logMcpRequest(log: Omit<McpRequestLog, "id" \| "created_at">): EngineEffect<void>` | `Eff.fn("logMcpRequest")` |
| `getHealthReport(): Promise<DatabaseHealth>` | `getHealthReport(): EngineEffect<DatabaseHealth>` | `Eff.fn("getHealthReport")`，内部使用了 `Eff.all` 以无限制并发(`unbounded`)检查各个数据表状态 |
| `getStats(): Promise<BrainStats>` | `getStats(): EngineEffect<BrainStats>` | `Eff.fn("getStats")` |
| `getHealth(): Promise<BrainHealth>` | `getHealth(): EngineEffect<BrainHealth>` | `Eff.fn("getHealth")` |
| `getStaleChunks(): Promise<StaleChunk[]>` | `getStaleChunks(): EngineEffect<StaleChunk[]>` | `Eff.fn("getStaleChunks")` |
| `markChunksEmbedded(chunkIds: number[]): Promise<void>` | `markChunksEmbedded(chunkIds: number[]): EngineEffect<void>` | `Eff.fn("markChunksEmbedded")` |

## 9. 事务 (Transaction)

| `LibSQLStore` 方法签名 (基于 Promise) | `BrainStore.Service` 方法签名 (基于 Effect) | Effect 封装状态 |
| :--- | :--- | :--- |
| `transaction<T>(fn: (tx: StoreProvider) => Promise<T>): Promise<T>` | 未直接提供实现 | 在 `BrainStore.Service` 层，通常使用 `Eff.transaction` 或底层 SqlClient 的原生 Effect 支持来处理事务。当前的 SQLite 模块实现中并没有显式在导出的 service 对象中提供 `transaction`。 |
