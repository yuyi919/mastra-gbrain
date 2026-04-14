# 可插拔引擎架构
## 这个想法
每个 GBrain 操作都会经过“BrainEngine”。引擎是“大脑可以做什么”和“大脑如何存储”之间的契约。换发动机，其他都保留。
v0 发布了由 Supabase 支持的“PostgresEngine”。 v0.7 添加了“PGLiteEngine”——通过 WASM (@electric-sql/pglite) 嵌入 Postgres 17.5，默认为零配置。该界面的设计使得“DuckDBEngine”、“TursoEngine”或任何自定义后端都可以插入，而无需接触 CLI、MCP 服务器、技能或任何消费者代码。
## 为什么这很重要
不同的用户有不同的限制：
|用户 |需求|最佳发动机|
|------|--------|-------------|
|开始使用 |零配置、无账户、无服务器 | PGLiteEngine（自 v0.7 起默认）|
|高级用户（您）|世界一流的搜索、7K+ 页面、零操作 | Postgres引擎+Supabase |
|开源黑客|单文件、无服务器、git 友好 | PGLite引擎 |
|团队/企业 |多用户、RLS、审计跟踪 | PostgresEngine + 自托管 |
|研究员|分析、批量导出、嵌入 | DuckDBEngine（有一天）|
|边缘/移动 |先离线，后同步 | PGLiteEngine + 同步（有一天）|
引擎接口意味着我们不必选择。 PGLite 是零摩擦默认设置。 Supabase是生产规模化路径。 `gbrain migrate --to supabase/pglite` 在它们之间移动。
## 接口
```typescript
// src/core/engine.ts

export interface BrainEngine {
  // Lifecycle
  connect(config: EngineConfig): Promise<void>;
  disconnect(): Promise<void>;
  initSchema(): Promise<void>;
  transaction<T>(fn: (engine: BrainEngine) => Promise<T>): Promise<T>;

  // Pages CRUD
  getPage(slug: string): Promise<Page | null>;
  putPage(slug: string, page: PageInput): Promise<Page>;
  deletePage(slug: string): Promise<void>;
  listPages(filters: PageFilters): Promise<Page[]>;

  // Search
  searchKeyword(query: string, opts?: SearchOpts): Promise<SearchResult[]>;
  searchVector(embedding: Float32Array, opts?: SearchOpts): Promise<SearchResult[]>;

  // Chunks
  upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>;
  getChunks(slug: string): Promise<Chunk[]>;

  // Links
  addLink(from: string, to: string, context?: string, linkType?: string): Promise<void>;
  removeLink(from: string, to: string): Promise<void>;
  getLinks(slug: string): Promise<Link[]>;
  getBacklinks(slug: string): Promise<Link[]>;
  traverseGraph(slug: string, depth?: number): Promise<GraphNode[]>;

  // Tags
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;
  getTags(slug: string): Promise<string[]>;

  // Timeline
  addTimelineEntry(slug: string, entry: TimelineInput): Promise<void>;
  getTimeline(slug: string, opts?: TimelineOpts): Promise<TimelineEntry[]>;

  // Raw data
  putRawData(slug: string, source: string, data: object): Promise<void>;
  getRawData(slug: string, source?: string): Promise<RawData[]>;

  // Versions
  createVersion(slug: string): Promise<PageVersion>;
  getVersions(slug: string): Promise<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): Promise<void>;

  // Stats + health
  getStats(): Promise<BrainStats>;
  getHealth(): Promise<BrainHealth>;

  // Ingest log
  logIngest(entry: IngestLogInput): Promise<void>;
  getIngestLog(opts?: IngestLogOpts): Promise<IngestLogEntry[]>;

  // Config
  getConfig(key: string): Promise<string | null>;
  setConfig(key: string, value: string): Promise<void>;

  // Migration + advanced (added v0.7)
  runMigration(sql: string): Promise<void>;
  getChunksWithEmbeddings(slug: string): Promise<ChunkWithEmbedding[]>;
}
```

### 关键设计选择
**基于 Slug 的 API，而不是基于 ID。** 每个方法都采用 slug，而不是数字 ID。引擎在内部将 slugs 解析为 ID。这使界面保持可移植性...slugs 是字符串，ID 是特定于数据库的。
**嵌入不在引擎中。** 引擎存储嵌入并按矢量搜索，但它不生成嵌入。 `src/core/embedding.ts` 处理这个问题。这是有意为之的：嵌入是外部 API 调用 (OpenAI)，而不是存储问题。所有引擎共享相同的嵌入服务。
**分块不在引擎中。**相同的逻辑。 `src/core/chunkers/` 处理分块。引擎存储和检索块。所有引擎共享相同的分块器。
**搜索返回“SearchResult[]”，而不是原始行。**引擎负责其自己的搜索实现（tsvector 与 FTS5、pgvector 与 sqlite-vss），但必须返回统一的结果类型。 RRF 融合和重复数据删除发生在引擎上方的“src/core/search/hybrid.ts”中。
**`traverseGraph` 存在，但特定于引擎。** Postgres 使用递归 CTE。 SQLite 将使用带有深度跟踪的循环。界面是相同的：给我一个 slug 和最大深度，返回图表。
## 搜索如何跨引擎工作
```
                        +-------------------+
                        |  hybrid.ts        |
                        |  (RRF fusion +    |
                        |   dedup, shared)  |
                        +--------+----------+
                                 |
                    +------------+------------+
                    |                         |
           +--------v--------+       +--------v--------+
           | engine.search   |       | engine.search   |
           |   Keyword()     |       |   Vector()      |
           +-----------------+       +-----------------+
                    |                         |
        +-----------+-----------+   +---------+---------+
        |                       |   |                   |
+-------v-------+  +-------v---+   +-------v---+  +----v--------+
| Postgres:     |  | PGLite:   |   | Postgres: |  | PGLite:     |
| tsvector +    |  | tsvector +|   | pgvector  |  | pgvector    |
| ts_rank +     |  | ts_rank   |   | HNSW      |  | HNSW        |
| websearch_to_ |  | (same SQL)|   | cosine    |  | cosine      |
| tsquery       |  |           |   |           |  | (same SQL)  |
+---------------+  +-----------+   +-----------+  +-------------+
```

RRF 融合、多查询扩展和 4 层重复数据删除与引擎无关。它们对“SearchResult[]”数组进行操作。只有原始关键字和矢量搜索是特定于引擎的。
## PostgresEngine（v0，发布）
**依赖项：** `postgres` (porsager/postgres)、`pgvector`
**使用的 Postgres 特定功能：**
- `tsvector` + `GIN` 索引，用于带有 `ts_rank` 权重的全文搜索
- 用于余弦相似度向量搜索的 `pgvector` HNSW 索引
- `pg_trgm` + `GIN` 用于模糊 slug 分辨率
- 用于图遍历的递归 CTE
- 基于触发器的搜索向量（跨页面+时间线条目）
- 用于带有 GIN 索引的 frontmatter 的 JSONB
- 通过 Supabase Supavisor 进行连接池（端口 6543）
**托管：** Supabase Pro（25 美元/月）。零操作。使用内置的 pgvector 管理 Postgres。
**为什么 v0 不自托管：** 大脑应该是基础设施代理使用的，而不是您维护的东西。使用 Docker 的自托管 Postgres 是一个受欢迎的社区 PR，但 v0 针对零操作进行了优化。
## PGLiteEngine（v0.7，发布）
**依赖项：** `@electric-sql/pglite` (v0.4.4+)
**它是什么：** 通过 ElectricSQL 的 PGLite 编译为 WASM 的嵌入式 Postgres 17.5。在进程内运行，没有服务器，没有 Docker，没有帐户。与 PostgresEngine 相同的 SQL ——不是单独的方言。已实现全部 37 个 BrainEngine 方法。
**PGLite 特定详细信息：**
- 使用 `pglite-schema.ts` 进行 DDL（pgvector 扩展、pg_trgm、触发器、索引）
- 全程参数化查询（`src/core/utils.ts` 中的共享实用程序）
- 未设置“OPENAI_API_KEY”时仅使用“hybridSearch”关键字回退
- 数据存储在`~/.gbrain/brain.db`（可配置）
- 用于余弦相似度向量搜索的 pgvector HNSW 索引（与 Postgres 相同）
- tsvector + ts_rank 用于全文搜索（与 Postgres 相同）
- pg_trgm 用于模糊 slug 分辨率（与 Postgres 相同）
**何时使用 PGLite 与 Postgres：**
|因素 | PGLite | Postgres引擎+Supabase |
|--------|--------|--------------------------|
|设置 | `gbrain init`（零配置）|帐户 + 连接字符串 |
|规模|适合 < 1,000 个文件 |经过 10K+ 生产验证 |
|多设备|仅单机|通过远程 MCP 的任何设备 |
|成本|免费| Supabase Pro（25 美元/月）|
|并发 |单进程|连接池 |
|备份 |手册（文件副本）|由 Supabase 管理 |
**迁移：** `gbrain migrate --to supabase` 导出所有内容（页面、块、嵌入、链接、标签、时间线）并导入到 Supabase。 `gbrain migrate --to pglite` 则相反。双向、无损。
## 添加新引擎
1. 创建实现 `BrainEngine` 的 `src/core/<name>-engine.ts`
2. 在 `src/core/engine-factory.ts` 中添加引擎工厂：   ```typescript
   export function createEngine(type: string): BrainEngine {
     switch (type) {
       case 'pglite': return new PGLiteEngine();
       case 'postgres': return new PostgresEngine();
       case 'myengine': return new MyEngine();
       default: throw new Error(`Unknown engine: ${type}`);
     }
   }
   ```
工厂使用动态导入，因此仅在选择时才加载引擎。
3. 将引擎类型存储在`~/.gbrain/config.json`中：`{ "engine": "myengine", ... }`
4.添加测试。测试套件应该尽可能与引擎无关......相同的测试用例，不同的引擎构造函数。
5.在此文件中记录+在`docs/`中添加设计文档
### 你不需要碰什么
-`src/cli.ts`（发送到引擎，不知道是哪一个）
-`src/mcp/server.ts`（相同）
-`src/core/chunkers/*`（跨引擎共享）
- `src/core/embedding.ts`（跨引擎共享）
- `src/core/search/hybrid.ts`、`expansion.ts`、`dedup.ts` （共享，对 SearchResult[] 进行操作）
- `skills/*`（大量降价，与引擎无关）
### 您需要实施什么
`BrainEngine` 中的每个方法。完整的界面。没有可选方法，没有功能标志。如果您的引擎无法进行矢量搜索（例如纯文本引擎），请实现“searchVector”以返回“[]”并记录限制。
## 能力矩阵
|能力| Postgres引擎| PGLite引擎 |笔记|
|----------|--------------|----------|------|
|增删改查 |完整|完整|相同的 SQL |
|关键词搜索 | ts向量 + ts_rank | ts向量 + ts_rank |相同（真正的 Postgres）|
|矢量搜索| pgvector HNSW | PGVector pgvector HNSW | PGVector相同（真正的 Postgres）|
|模糊蛞蝓| pg_trgm | pg_trgm |相同（真正的 Postgres）|
|图遍历|递归 CTE |递归 CTE |相同的 SQL |
|交易 |全酸|全酸 |双方都支持这一点 |
| JSONB 查询 |杜松子酒索引 |杜松子酒索引 |相同|
|并发访问 |连接池 |单进程| PGLite 限制 |
|托管| Supabase、自托管、Docker |本地文件 | |
|迁移方法 |运行迁移，getChunksWithEmbeddings |相同 |添加了 v0.7 |
## 未来引擎的想法
**TursoEngine.** libSQL（SQLite 分支），具有嵌入式副本和 HTTP 边缘访问。通过云同步赋予 SQLite 简单性。对于移动/边缘用例很有趣。
**DuckDBEngine。** 分析工作负载。批量导出、嵌入分析、全脑统计。不适用于 OLTP。可以作为与 Postgres 一起用于运营的辅助分析引擎。
**自定义/远程。** 界面足够干净，以至于有人可以构建由任何存储支持的引擎：Firestore、DynamoDB、REST API，甚至平面文件系统。该接口不采用 SQL。
注意：原始 SQLite 引擎计划 (`docs/SQLITE_ENGINE.md`) 已被 PGLite 取代。 PGLite 使用与 Postgres 相同的 SQL，无需使用带有 FTS5/sqlite-vss 转换的单独 SQLite 方言。