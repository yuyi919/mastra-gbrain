# Phase 1: 分析与准备工作 (Analysis & Preparation)

## 目标 (Objective)
通过深入梳理现有 `LibSQLStore` 实现和 `BrainStore` 运行时，生成完整的接口映射与重构替换计划。分析测试覆盖率以确保 Phase 2 的“渐进式替换”安全可靠。

## 计划步骤 (Plan Steps)

### 1. 梳理 LibSQLStore 与 BrainStore 方法映射 (Method Mapping)
- 提取 `/workspace/src/store/libsql.ts` 中的所有业务方法（如 `getPage`, `addTag`, `upsertChunks` 等）。
- 对照 `/workspace/src/store/libsql-store.ts` (`makeStore` 提供的 `BrainStore.Ingestion`, `BrainStore.Link` 等模块)。
- 生成一份完整的映射关系文档，记录每个方法的签名、底层调用的 `drizzle` 方法以及它对应的 `Effect` 封装。
- 重点标识复杂逻辑（如 `upsertChunks` 中的 N+1 插入、`searchKeyword` 等）和可能缺失的方法。
- **输出**: `.planning/1/METHOD_MAPPING.md`

### 2. 测试覆盖率分析 (Test Coverage Analysis)
- 分析 `/workspace/test/libsql.test.ts` 和 `/workspace/test/integration.test.ts`，梳理哪些 `LibSQLStore` 方法已有充分的测试覆盖。
- 确认目前的测试用例如何处理事务、测试隔离（如 `:memory:`）以及资源清理（`dispose`）。
- 识别潜在的测试盲区，记录在案，以备在重构时进行补充测试或警惕风险。
- **输出**: `.planning/1/TEST_COVERAGE.md`

### 3. 制定重构发布路线与优先级 (Refactoring Priority)
- 根据模块依赖关系和业务复杂度，将 `libsql.ts` 的方法划分为若干个“重构批次（Batches）”。
- 规划顺序原则：先独立模块（如 Tags, Config），再基础实体（Pages, Versions, Files），然后复杂关联与操作（Chunks, Timeline, Links），最后高层聚合（Search, Transactions）。
- 明确指出如何在每一个批次替换完成后，通过运行 `bun test` 进行验证（即如何应用“内部适配器”策略并在 `libsql.ts` 中调用 `Effect.runPromise`）。
- **输出**: `.planning/1/REFACTORING_PRIORITY.md`

## 验证标准 (Verification Criteria)
- [ ] 成功生成 `METHOD_MAPPING.md`，列出了 `libsql.ts` 中的 100% 暴露方法。
- [ ] 成功生成 `TEST_COVERAGE.md`，覆盖了关键业务场景。
- [ ] 成功生成 `REFACTORING_PRIORITY.md`，划分了合理的增量重构批次。
- [ ] 这三个文档内容互为补充，为 Phase 2 的代码修改提供精准的蓝图，不再有未知架构盲区。
