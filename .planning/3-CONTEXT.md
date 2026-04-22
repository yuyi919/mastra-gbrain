# Phase 3: 测试验证与功能修复 (Test & Fix) - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

确保在 Phase 2 完成运行时替换后，整个测试集（单元测试和集成测试）能够稳定通过，修复任何因底层异步控制流变更而产生的时序问题或数据库锁问题。同时确保所有运维脚本 (`doctor.ts`, `backlinks.ts`, `embed.ts`) 在新的 Store 实现上稳定运行。

</domain>

<decisions>
## Implementation Decisions

### 1. 数据库锁与连接池 (Database Locks & Connection)
- **D-01:** 由于 Effect 驱动可能会引入不同的并发模式，若出现 `SQLITE_BUSY` 错误，首先应排查是否存在交叉开启的事务，并通过调整 Effect SQL 并发级别或增加重试机制解决，而不是简单地降低测试并发度。

### 2. 运维脚本兼容性 (Scripts Compatibility)
- **D-02:** 所有运维脚本保持现有接口调用不变（即调用 `GBrainStore` 接口）。若有报错，通过在 `LibSQLStore` 中修补 `Effect.runPromise` 桥接，不修改脚本业务逻辑本身。

### Claude's Discretion
- 如果存在导致 `node-llama-cpp` 超时的集成测试问题，可以选择暂时使用 Dummy Embedder 作为 CI/集成环境的降级方案，或者提高 Timeout 设置。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 核心约束
- `AGENTS.md` — 包含如何执行测试与环境初始化规则
- `docs/effect/v4-systematic-guide.md` — 确保修复代码仍遵循 Effect v4 规范
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/integration.test.ts` — 核心的集成测试流，包含文档导入、Chunking、和混合检索
- `src/scripts/*.ts` — 需要验证的运维脚本
</code_context>

<specifics>
## Specific Ideas
- 关注并发测试情况下的临时数据库清理 (`tmp/` 目录)。
</specifics>

<deferred>
## Deferred Ideas
None
</deferred>
