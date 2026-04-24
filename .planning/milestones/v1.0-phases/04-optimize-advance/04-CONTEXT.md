# Phase 04: optimize-advance - Context

**Gathered:** 2026-04-24 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段聚焦两个交付物：
1. 对 Effect 重构后的存储/检索路径做可复现的性能分析与低风险优化；
2. 产出下一步 Agent 层与 Search 层 Effect 改造路线文档。

不在本阶段内新增用户可见功能，也不做大规模架构迁移。
</domain>

<decisions>
## Implementation Decisions

### 性能验证方法
- **D-01:** 以现有测试与脚本为基线做性能对比，优先使用 `bun test`、现有 health/stats 能力和关键路径调用耗时记录，而不是引入新的重型 benchmark 框架。
- **D-02:** 只评估与本里程碑直接相关的热点：`upsertChunks`、`searchKeyword/searchVector + hybrid fusion`、事务边界相关路径。

### 优化策略边界
- **D-03:** 只做“低风险、可验证”的微优化（循环/批处理、冗余查询减少、并发参数调优），不做破坏接口或跨模块的大改。
- **D-04:** 对每个优化项必须给出“变更前后行为等价”的验证证据（测试通过、结果一致、无类型回退）。

### 下一步 Effect 改造路线
- **D-05:** 下一阶段路线图按“Agent 层、Search 层、Workflow/Tools 层”拆分，明确依赖关系、风险和建议执行顺序。
- **D-06:** 路线图必须引用当前代码中的可复用模式（Layer 组合、Effect.fn、事务封装）和当前限制（跨连接事务、向量查询边界）。

### the agent's Discretion
性能采样的具体命令组织、报告排版方式、路线图粒度（phase 级还是 wave 级）由 the agent 自主选择，只要满足可验证和可执行。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `src/store/libsql-store.ts`
- `src/store/libsql.ts`
- `src/search/hybrid.ts`
- `src/store/interface.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/libsql-store.ts` 已包含 Effect 化后的核心存储实现与事务封装，可直接作为优化主战场。
- `src/search/hybrid.ts` 已具备混合检索融合、去重、backlink boost 和重排流程，适合做调度和小幅性能调优。
- `src/store/libsql.ts` 作为对外适配层，适合做桥接开销与调用路径简化。

### Established Patterns
- 使用 `Eff.fn` 包装用例，统一 `StoreError.catch`。
- 事务通过 `sql.withTransaction` 管理，避免手工事务状态。
- 多处已采用 `Eff.all` / `Eff.forEach` 并发执行，具备可调优空间。

### Integration Points
- 性能分析输出会影响后续 `plan-phase` 的任务拆分与验证策略。
- 路线图文档将直接作为下一里程碑（Agent/Search Effect 改造）的输入。
</code_context>

<specifics>
## Specific Ideas

- 优先验证 `upsertChunks` 中逐条 upsert 和 FTS 重建成本。
- 检查 `hybridSearchEffect` 的查询批次与 fallback 路径是否存在可消减开销。
- 路线图需明确“可并行执行”与“必须串行执行”的改造块。
</specifics>

<deferred>
## Deferred Ideas

- 引入独立基准测试框架（如 benchmark harness）暂缓到后续性能专项阶段。
- 将全链路 tracing/metrics 平台化（OpenTelemetry 等）暂不纳入本阶段。
</deferred>
