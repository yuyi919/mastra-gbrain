# Phase 2 Context: 替换核心运行时 (Replace Runtime)

## 1. 架构与依赖注入策略 (Architecture & DI Strategy)
- **底层驱动**：使用 `@effect/sql-sqlite-bun` 替代直接的 `Database` 实例化，利用 `SqliteClient.layer` 提供数据库连接层。
- **Mappers 桥接**：将基于 Drizzle 的 `SqlBuilder` 重构为 `Mappers` 服务，通过 `Layer.provide(SqlLive)` 将 SQL 驱动注入到 Mappers 中。
- **外观模式 (Facade)**：现存的 `LibSQLStore` 构造函数中将初始化上述 Effect Layers，并通过 `Effect.runPromise` 作为外部暴露的执行边界。`BrainStore.ts` 和 `libsql-store.ts` 中定义的纯 Effect 接口 (`EngineEffect`) 将作为内核。

## 2. 事务管理方案 (Transaction Management)
- **彻底移除手动状态**：禁止在代码中手动调用 `BEGIN TRANSACTION` 或使用 `this._inTransaction` 状态位。
- **基于 Fiber 的事务**：利用 Effect `SqlClient` 提供的 `sql.withTransaction(fn)`。在组合后的 Effect 闭包内，所有衍生出的数据库查询都会自动挂载到同一个连接和事务上下文中，从而保证 ACID。
- **接口扩展**：在 `BrainStore` 的接口中提供 `transaction` 方法，利用 `yield* SqlClient.SqlClient` 提取客户端并包裹闭包。

## 3. 核心方法的 Effect 化路径 (Core Methods Refactoring)
- **生成器函数 (Generators)**：所有数据库操作方法必须使用 `Eff.fn("methodName")(function* (...) { ... }, catchStoreError)` 进行封装，确保完整的错误追踪和类型推导。
- **页面生命周期 (`putPage` / `upsertPages`)**：将原先的链式 Promise 拆解为 `yield* mappers.upsertPage` 和 `yield* ingestion.createVersion` 等顺序步骤。如果任意一步失败，整个事务将自动回滚。
- **数据分块与向量 (`upsertContentChunks`)**：
  - 清理旧数据和 FTS 索引使用顺序的 `yield* mappers.delete...`。
  - 新数据的批量插入使用 `for...of` 配合 `yield* mappers.upsertContentChunk`，以避免 N+1 瓶颈，并由外层统一开启事务。
  - 对于第三方 `@mastra/libsql` 向量库调用，使用 `yield* Eff.promise(() => vectorStore.upsert(...))` 进行桥接。
- **混合检索 (`hybridSearch`)**：
  - 将 `Promise<SearchResult[]>` 改造为 `EngineEffect<SearchResult[]>`。
  - 关键字检索和向量检索之间没有依赖关系，**必须**使用 `Eff.all([keyword, vector], { concurrency: "unbounded" })` 并发执行以提升检索性能。
  - RRF 融合打分和结果去重作为纯同步步骤，在并发检索完成后通过 `yield*` 获取结果后直接进行。

## 4. 类型安全约束 (Type Safety Constraints)
- **禁止 `any`**：严格禁止在新的 Effect 管道中引入隐式的 `any` 或使用 `@ts-expect-error` 绕过类型检查。
- **统一错误类型**：所有 Drizzle 或 SQLite 层面抛出的异常，必须通过 `catchStoreError` 统一映射并向上层抛出 `StoreError` 类型，确保外部可以通过 `Effect.catchTag` 捕获。
