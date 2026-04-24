# Next Effect Refactor Roadmap (Post Phase 04)

## Goal

将当前已完成的 Store 层 Effect 化经验，扩展到 Search / Agent / Workflow 层，形成可分阶段推进且可验证的下一里程碑路线。

## Inputs

- `04-PERF-REPORT.md`（热点与优化优先级）
- `.planning/REQUIREMENTS.md`（需求 4：推进下一步 Effect 重构）
- 现有实现模式：
  - `src/store/libsql-store.ts`
  - `src/store/libsql.ts`
  - `src/search/hybrid.ts`

## Phase Breakdown

### R1: Search Layer Consolidation

**Scope**
- 统一 `hybridSearchEffect` 周边策略（query expansion, candidate budget, scoring pipeline）的 Effect 化配置与可观测性。
- 把搜索后处理（rrf/dedup/boost）的调度边界标准化，避免隐式行为漂移。

**Deliverables**
- Search 层设计说明 + 策略配置点（detail, expansion, limit budget）
- 关键路径验证脚本与回归测试补强

**Success Signal**
- search 行为可预测、配置可控，且在基准采样下无明显退化。

### R2: Agent & Tools Effect Boundary

**Scope**
- 将 `src/tools/*` 与 Agent 调用边界中的 Promise 包装进一步收敛到 Effect 服务接口。
- 明确 Tool 层错误模型映射（StoreError -> user-facing failure contract）。

**Deliverables**
- Tool 层 Effect service adapter 规范
- 错误与超时策略统一文档（包含 fallback）

**Success Signal**
- Agent/Tools 链路中异常路径可追踪、可分类，且不引入行为回归。

### R3: Workflow Orchestration Hardening

**Scope**
- 将 ingest / script / workflow 内高频异步流程统一为可组合 Effect 管线。
- 固化“任务级验证 + 阶段级验证”模式（延续 Phase 2/3 经验）。

**Deliverables**
- Workflow 层的 Effect orchestration 基线模板
- 验证契约文档（自动化 checks + human-needed gate）

**Success Signal**
- 关键 workflow 可在同一语义模型下执行、验证和排障。

## Dependency Order

1. **R1 -> R2 -> R3**（建议顺序）
2. 原因：
- R1 先稳定 Search 行为和成本模型，给 Agent 调用层提供稳定目标；
- R2 再收敛 Agent/Tools 边界，避免接口反复变动；
- R3 最后治理编排层，复用前两步的稳定 contract。

## Risks & Mitigations

### Risk 1: Search behavior drift after optimization
- Mitigation:
  - 保留 detail/expansion 的回归测试矩阵；
  - 对 ranking 变化做阈值化验收而非“完全相同”误判。

### Risk 2: Error model divergence across tools
- Mitigation:
  - 先定义统一错误分类，再逐工具迁移；
  - 迁移期间增加适配层，不一次性替换全部工具。

### Risk 3: Over-coupling workflow refactor with feature delivery
- Mitigation:
  - 编排层重构按“模板 + 新增流程先落地”推进，旧流程渐进迁移；
  - 每阶段保持可回滚点。

## Execution Heuristics

- 优先低风险、高收益、可量化的改动；
- 每个阶段结束必须产出 summary + verification；
- 禁止跨层同时大改（保持单层聚焦、跨层联调）。

## Exit Criteria

1. Search/Agent/Workflow 三层均形成 Effect 化推进计划与验收标准；
2. 每层至少有一条可执行计划可直接进入 `plan-phase`；
3. 路线图与 `04-PERF-REPORT.md` 的优先级一致，无冲突项。
