# Phase 2: 替换核心运行时 (Replace Runtime)

## 目标 (Objective)
在 `LibSQLStore` 中引入 `BrainStore` 的 Effect 运行时。遵循渐进式替换的原则，通过 `Effect.runPromise` 桥接，在保持 `GBrainStore` 接口签名不变的前提下完成底层的运行时切换，并通过所有现存测试。

## 准备与约束 (Prerequisites & Constraints)
- **测试保护**：每个 Wave 执行完毕后，必须运行指定的 `bun test -t "<keyword>"` 以确保 0 回归错误。
- **事务处理**：严禁在 `LibSQLStore` 层面显式使用 `BEGIN TRANSACTION` 或状态变量。所有事务由 Effect 的 `sql.withTransaction` 包裹。
- **禁止 any**：所有的类型转换必须借助 Effect Schema 确保安全，消除 `ts-expect-error`。

## Wave 1: 基础设施搭建与 Tags 模块重构
**描述**: 搭建 Effect Layer 环境并适配基础且相互独立的 Tags 方法。
- [ ] 1. **初始化 Layer 注入**: 修改 `src/store/libsql.ts` 构造函数，初始化 `SqliteClient.layer` 和 `Mappers.makeLayer`，并合成 `DatabaseLive`。
- [ ] 2. **初始化 BrainStore 服务**: 在 `LibSQLStore` 类内部添加一个私有属性 `brainStore`，保存通过 `Effect.runSync(Effect.provide(BrainStore, DatabaseLive))` 构建出的服务实例。
- [ ] 3. **重构 Tags 操作**: 
  - 修改 `addTag(slug, tag)`：调用 `this.brainStore.addTag` 并 `runPromise`。
  - 修改 `removeTag(slug, tag)`：调用 `this.brainStore.removeTag` 并 `runPromise`。
  - 修改 `getTags(slug)`：调用 `this.brainStore.getTags` 并 `runPromise`。
- **验证**: 运行 `bun test test/libsql.test.ts -t "tag"` 确保绿灯。

## Wave 2: 页面生命周期与版本控制 (Pages & Versions)
**描述**: 重构页面的增删改查及快照生成机制。由于 `putPage` 涉及 `createVersion` 的联动，这部分需开启事务包裹。
- [ ] 1. **重构基础读取**: 
  - `getPage(slug)` -> `runPromise(this.brainStore.getPage)`
  - `listPages(filters)` -> `runPromise(this.brainStore.listPages)`
- [ ] 2. **重构复杂写入与事务**:
  - `putPage(slug, page)`: 修改为使用 `this.brainStore.transaction(tx => tx.putPage(slug, page))` 并执行。
  - `deletePage(slug)`: 修改为 `runPromise(this.brainStore.deletePage)`。
- [ ] 3. **重构版本控制**:
  - `createVersion(slug)` -> `runPromise`
  - `getVersions(slug)` -> `runPromise`
  - `revertToVersion(slug, versionId)` -> `runPromise`
- **验证**: 运行 `bun test test/libsql.test.ts -t "page"` 以及 `bun test test/integration.test.ts`。

## Wave 3: 链接管理与图谱 (Links & Graph)
**描述**: 替换双向链接的维护及图谱遍历方法。
- [ ] 1. **重构基础 Links**:
  - `addLink(from, to, type, ctx)` -> `runPromise`
  - `removeLink(from, to)` -> `runPromise`
  - `getLinks(slug)` / `getBacklinks(slug)` -> `runPromise`
- [ ] 2. **图谱与路径**:
  - `traverseGraph(slug, depth)` -> `runPromise`
- **验证**: 运行 `bun test test/integration.test.ts`，重点检查 backlinks 生成和遍历测试。

## Wave 4: 文本块切片与向量数据 (Chunks & Vectors)
**描述**: 处理最复杂的数据结构，包括大批量的 Chunk 插入（N+1 优化）及第三方向量库的同步。
- [ ] 1. **重构读取**:
  - `getChunks(slug)` -> `runPromise`
  - `getChunksWithEmbeddings(slug)` -> `runPromise`
- [ ] 2. **重构 `upsertChunks`**:
  - 由于涉及先删后插、FTS 更新和外部的 `LibSQLVector.upsert`，此方法需使用 `this.brainStore.transaction(tx => tx.upsertChunks(...))` 以确保 FTS 索引与数据库实体强一致性。
  - 确认 `BrainStore` 内的实现是否并发安全，特别是基于 `Eff.all` 循环处理 chunk。
- [ ] 3. **重构 `deleteChunks`**: -> `runPromise`
- **验证**: 运行 `bun test test/libsql.test.ts -t "chunk"` 以及 `bun test test/integration.test.ts` 中的向量查询相关测试。

## Wave 5: 混合搜索重构与最终聚合 (Hybrid Search & Maintenance)
**描述**: 重构搜索调度以及健康度检查相关的离散方法。
- [ ] 1. **混合搜索重构**:
  - `searchKeyword(query, opts)` -> `runPromise`
  - `searchVector(embedding, opts)` -> `runPromise`
  - 将 `src/search/hybrid.ts` 内部修改为接收 Effect Context，通过 `Eff.all({ concurrency: "unbounded" })` 并发执行关键词和向量搜索，然后同步计算 RRF 融合。
- [ ] 2. **运维工具与健康度**:
  - `getHealthReport()`, `getStats()`, `getStaleChunks()`, `markChunksEmbedded()` 等均桥接至 `runPromise`。
- **验证**: 运行全量 `bun test`。确保无任何回归问题。
