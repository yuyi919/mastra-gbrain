---
phase: 2
phase_name: "替换核心运行时 (Replace Runtime)"
project: "GBrain: Effect 重构里程碑 (Effect Refactoring Milestone)"
generated: "2026-04-23T22:59:14.5346831+08:00"
counts:
  decisions: 4
  lessons: 3
  patterns: 3
  surprises: 1
missing_artifacts:
  - "VERIFICATION.md"
  - "UAT.md"
---

# Phase 2 Learnings: 替换核心运行时 (Replace Runtime)

## Decisions

### 采用渐进式替换并保持公开接口不变
决定以“Wave 逐步替换”的方式引入 Effect 运行时，并通过 `Effect.runPromise` 桥接，保持 `GBrainStore` 接口签名不变。

**Rationale:** 在大规模底层重构中，把外部 API 稳定性和内部实现替换解耦，降低一次性迁移风险。
**Source:** `PLAN.md`

---

### 统一事务边界到 Effect 事务模型
决定禁止在 `LibSQLStore` 显式使用 `BEGIN TRANSACTION` 或事务状态变量，统一改为 `sql.withTransaction` 包裹事务。

**Rationale:** 由 Effect 事务模型统一管理原子性和错误传播，减少手动状态管理的缺陷面。
**Source:** `PLAN.md`

---

### 对复杂写入链路使用事务封装
决定对 `putPage + createVersion` 联动写入以及 `upsertChunks` 这类“先删后插 + 索引更新 + 向量同步”流程进行事务封装。

**Rationale:** 确保页面版本、FTS 索引与向量索引在失败时不会出现部分成功导致的不一致。
**Source:** `PLAN.md`

---

### 将混合检索迁移为并发 Effect 执行
决定将 `searchKeyword` / `searchVector` 调度迁移到 Effect 引擎，并由 `hybridSearchEffect` 支持并发搜索。

**Rationale:** 在重构后保持检索行为等价的同时，提升搜索调度的一致性与并发执行能力。
**Source:** `SUMMARY.md`

---

## Lessons

### 渐进式替换可以在不中断功能的情况下完成运行时迁移
在 5 个 Wave 的连续替换后，核心功能仍通过了现有测试。

**Context:** `bun test` 单元与集成测试在阶段末全部绿灯，验证了重构与原行为等价。
**Source:** `SUMMARY.md`

---

### 测试节奏需要绑定任务与波次，而不是只在最后回归
每个任务提交后跑定向测试、每个 Wave 后跑全量测试的节奏在本阶段有效控制了回归风险。

**Context:** 验证策略将 `bun test -t "<keyword>"` 和 `bun test` 作为固定采样点，所有任务状态均为 green。
**Source:** `02-VALIDATION.md`

---

### embedding 超时可能来自算力瓶颈而非数据层回归
大文本导入时的 `node-llama-cpp` 本地 CPU 推理性能会引发超时风险。

**Context:** 该问题在总结中被归类为外部计算瓶颈，而不是本阶段 Effect 重构导致的数据层问题。
**Source:** `SUMMARY.md`

---

## Patterns

### Wave 化分域迁移
按 Tags、Pages、Links、Chunks、Hybrid Search 分域推进迁移，而非一次性改写全部存储逻辑。

**When to use:** 适用于核心基础设施重构，且存在持续可运行的测试护栏时。
**Source:** `PLAN.md`

---

### 接口稳定 + 内核替换的桥接模式
通过 `runPromise` 桥接旧调用面，内部逐步替换为 Effect Service 与 Layer。

**When to use:** 适用于需要向后兼容 SDK/Tool API，同时重构底层执行模型的场景。
**Source:** `PLAN.md`

---

### “定向验证 + 全量回归”双层验证模式
每个任务使用关键字定向测试，每个 Wave 及阶段末执行全量测试。

**When to use:** 适用于跨模块迁移，既要快速反馈又要持续监控系统级回归。
**Source:** `02-VALIDATION.md`

---

## Surprises

### 数据层重构通过后，瓶颈反而集中在本地模型推理
阶段内核心数据路径已验证等价正确，但导入流程仍可能因为本地 embedding 推理慢而超时。

**Impact:** 后续阶段需要把“算力与模型执行策略”独立为性能治理议题，不能只关注数据库重构本身。
**Source:** `SUMMARY.md`
