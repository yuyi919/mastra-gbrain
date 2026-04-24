---
phase: 04-optimize-advance
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/04-optimize-advance/04-PERF-REPORT.md
  - .planning/phases/04-optimize-advance/04-REFACTOR-ROADMAP.md
  - .planning/phases/04-optimize-advance/04-01-SUMMARY.md
autonomous: true
requirements:
  - PH4-R1-performance-analysis
  - PH4-R2-next-effect-roadmap
must_haves:
  truths:
    - "Performance bottlenecks and optimization opportunities are documented with concrete evidence from current code paths."
    - "A next-step Effect refactor roadmap for Agent/Search layers is produced with ordering, dependencies, and risks."
  artifacts:
    - ".planning/phases/04-optimize-advance/04-PERF-REPORT.md exists and contains measured findings + actionable improvements."
    - ".planning/phases/04-optimize-advance/04-REFACTOR-ROADMAP.md exists and contains phased roadmap with dependency graph."
  key_links:
    - "PERF-REPORT findings are referenced by REFACTOR-ROADMAP priorities."
    - "Roadmap decisions align with ROADMAP.md Phase 4 objective and REQUIREMENTS.md item 4."
---

<objective>
完成 Phase 4 的收尾交付：输出性能分析报告与下一步 Effect 改造路线图。

Purpose: 将“重构已完成”转化为“可持续推进”的工程资产，避免经验丢失。
Output: `04-PERF-REPORT.md` + `04-REFACTOR-ROADMAP.md` + plan summary。
</objective>

<execution_context>
@D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/.codex/get-shit-done/workflows/execute-plan.md
@D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/04-optimize-advance/04-CONTEXT.md
@src/store/libsql-store.ts
@src/store/libsql.ts
@src/search/hybrid.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Produce performance analysis report</name>
  <files>.planning/phases/04-optimize-advance/04-PERF-REPORT.md</files>
  <read_first>src/store/libsql-store.ts, src/store/libsql.ts, src/search/hybrid.ts, .planning/ROADMAP.md</read_first>
  <action>审查 Phase 2/3 后的核心热点路径（upsertChunks、hybridSearch、事务边界），整理当前性能行为、潜在瓶颈、低风险优化建议和验证方法，写入 04-PERF-REPORT.md。</action>
  <verify>rg -n "## Hot Paths|## Bottlenecks|## Low-risk Optimizations|## Validation Plan" .planning/phases/04-optimize-advance/04-PERF-REPORT.md</verify>
  <acceptance_criteria>
    - 04-PERF-REPORT.md 包含热点路径、瓶颈证据、优化建议和验证计划四个完整章节
    - 每条建议都注明风险级别与验证方式
  </acceptance_criteria>
  <done>性能报告结构完整且可执行</done>
</task>

<task type="auto">
  <name>Task 2: Produce next Effect refactor roadmap</name>
  <files>.planning/phases/04-optimize-advance/04-REFACTOR-ROADMAP.md</files>
  <read_first>.planning/phases/04-optimize-advance/04-PERF-REPORT.md, .planning/REQUIREMENTS.md</read_first>
  <action>基于性能报告和需求文档输出下一步改造路线图，覆盖 Agent/Search/Workflow 三层，明确阶段顺序、依赖关系、风险与验收信号，写入 04-REFACTOR-ROADMAP.md。</action>
  <verify>rg -n "## Phase Breakdown|## Dependency Order|## Risks & Mitigations|## Exit Criteria" .planning/phases/04-optimize-advance/04-REFACTOR-ROADMAP.md</verify>
  <acceptance_criteria>
    - 路线图包含阶段拆分、依赖顺序、风险与退出标准
    - 明确关联 REQUIREMENTS.md 中“推进下一步 effect 重构”要求
  </acceptance_criteria>
  <done>路线图可直接作为下一里程碑输入</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `bun test` passes (allow existing skipped tests, no new failures)
- [ ] 文档产物存在且章节齐全
- [ ] 路线图与性能报告互相引用并与 Phase 4 目标对齐
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- Phase 4 outputs are concrete and reusable for next milestone planning
</success_criteria>

<output>
After completion, create `.planning/phases/04-optimize-advance/04-01-SUMMARY.md`
</output>
