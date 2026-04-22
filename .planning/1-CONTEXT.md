# 阶段 1：分析与准备工作 (Phase 1 Context)

## 核心决策 (Core Decisions)

在进入实质性开发之前，我们已经对第一阶段以及整个重构过程确立了以下核心架构与实施决策：

1. **适配器策略 (Adapter Strategy)**:
   - **决定**：采用 `LibSQLStore` 内部适配模式（Adapter within LibSQLStore）。
   - **说明**：不对上层的 Agent 和 Tools 产生破坏性修改。现有的 `LibSQLStore` 实例将保留并充当一个外观（Facade）。它的每个实现方法内部将通过 `Effect.runPromise` 去执行底层经过 `effect` 重构的逻辑。这样可以在保持 `GBrainStore` 接口签名完全不变的前提下完成内核替换。

2. **发布与替换路径 (Rollout Approach)**:
   - **决定**：渐进式替换（Incremental Replacement）。
   - **说明**：我们将逐个模块（例如：先重构标签 Tag 相关方法，再处理内容 Chunk，最后处理搜索 Search）进行替换，确保在每一个小步骤完成后，`bun test` 的相关测试用例都能 100% 绿灯通过，避免陷入“大爆炸”式的重构黑洞中。

3. **事务上下文管理 (Transaction Context)**:
   - **决定**：在 Effect 层面合并并利用 `withTransaction` 管理事务。
   - **说明**：对于跨越多张表或多个业务逻辑的复杂事务，我们将避免在 `LibSQLStore` 外层通过多个独立的 `runPromise` 拼凑。相反，在底层我们会将这些操作在 Effect 的管道中通过 `yield*` 或 `Effect.all/flatMap` 等机制合并为一个组合的 Effect。最后统一由 `yield* SqlClient.SqlClient` 提取出客户端实例，并利用其自带的 `withTransaction` 包裹执行整个 Effect，从而从根本上保证数据库事务的 ACID 特性。

## 下一步研究焦点 (Next Research Focus)
根据上述决策，Phase 1 的后续研究与分析将集中于：
- 梳理 `/workspace/src/store/libsql.ts` 中现有的 Promise 方法，按复杂度和依赖关系排序，为 Phase 2 的“渐进式替换”制定优先级列表。
- 深入阅读现有的 `BrainStore` 运行时文件，理解其如何通过 `@effect/sql-drizzle` 或 `@effect/sql-sqlite-bun` 暴露 API，以及目前尚未覆盖的方法。
- 检查现有的测试用例覆盖范围，确认在替换过程中，哪些测试可以提供最直接的防退化保护（如 `libsql.test.ts` 和 `integration.test.ts`）。
