---
phase: 2
phase_name: "替换核心运行时 (Replace Runtime)"
project: "mastra-gbrain"
generated: "2026-04-23"
counts:
  decisions: 1
  lessons: 2
  patterns: 1
  surprises: 1
missing_artifacts:
  - "2-UAT.md"
---

# Phase 2 Learnings: 替换核心运行时 (Replace Runtime)

## Decisions

### 移除硬编码 SQL 并引入 Effect 驱动的 ORM
决定完全放弃在底层混用原生的 `db.all` 语句（对于 FTS 查询），而尽可能统一为 Effect/Drizzle 风格。

**Rationale:** 这统一了错误处理（`StoreError`）并保证了类型的完备。
**Source:** `2/PLAN.md`

---

## Lessons

### 数据库事务的回滚盲区
在使用 `@effect/sql-drizzle` 包裹 Drizzle 事务时，由于 Effect 的隔离和 Bun 的同步/异步事务边界处理存在断层，测试套件暴露了事务回滚行为可能不可靠的潜在问题。

**Context:** 在替换 `LibSQLStore transaction` 方法和 `bun test` 的初步验证期间。
**Source:** `2/SUMMARY.md`

### 复杂的联合类型校验问题
Effect 中多个环境（如 `SqlClient`, `BrainStoreService`）的组合，在 TypeScript 中容易因为漏传环境或者签名不一致而爆发庞大的类型错误链。

**Context:** 重写上层查询适配器（如 `listPages`，`hybridSearch`）时。
**Source:** `2/02-01-tags-PLAN.md`

---

## Patterns

### 增量迁移 (Wave-based Refactoring)
按领域模块（Tags、Pages、Links、Chunks）划分的渐进式重构。

**When to use:** 重写大而复杂的单体类时，避免因为修改一处导致所有测试同时爆炸。
**Source:** `2/PLAN.md`

---

## Surprises

### 错误类型推断爆炸
简单的 Effect 参数返回类型不一致，导致 TypeScript 报出几百行的 `never` / `StoreError` 的冗长错误栈，严重影响了排错体验。

**Impact:** 增加了代码联调的时间，且需要通过引入更明确的 Type Alias（如 `EngineEffect<T>`）来简化排查。
**Source:** `2/SUMMARY.md`
