---
phase: 3
phase_name: "测试验证与功能修复 (Test & Fix)"
project: "mastra-gbrain"
generated: "2026-04-23"
counts:
  decisions: 1
  lessons: 2
  patterns: 1
  surprises: 1
missing_artifacts:
  - "3-UAT.md"
---

# Phase 3 Learnings: 测试验证与功能修复 (Test & Fix)

## Decisions

### 移除原生 SQLite limit 的误用
在 `SqlBuilder` 回滚方法中，去除了含有 `LIMIT` 子句的原生 `update`，改用符合 Drizzle 兼容且安全的子查询逻辑。

**Rationale:** Bun 的 SQLite 不支持 `UPDATE ... LIMIT` 语法扩展，导致编译抛出原生引擎异常。
**Source:** `3/PLAN.md`

---

## Lessons

### `test` 环境清理的幽灵锁定
集成测试或并行的单测执行如果没有严格关闭连接池，会导致文件锁定和环境残留，引发虚假的 “SQLite busy” 或 “Locked” 测试错误。

**Context:** 在 `bun test` 全量覆盖时。
**Source:** `3/SUMMARY.md`

### 慎用 `--hard` 重置策略
在修复与推代码流程（`gsd-ship`）中，尝试清理缓存文件而使用的 `git reset --hard` 操作是灾难性的，因为它会无条件丢弃本地的有用工作。

**Context:** 代码在修复后由于错误的 Git 清理指令而被擦除，引发了法证恢复流程。
**Source:** `.planning/forensics/report-20260422182359.md`

---

## Patterns

### 基于 `git reflog` 的工作流恢复 (Forensics)
在发生意外回滚（如错误地执行了 `git reset --hard`）时，借助 `reflog` 和 `ls-tree` 将原本的修订树状态精准找回。

**When to use:** 在错误推送、意外重置或者发生不可逆灾难破坏时挽救代码。
**Source:** `.planning/forensics/report-20260422182359.md`

---

## Surprises

### `.pnpm-store` 被意外提交
巨大的包管理缓存目录被无意间记录到版本控制历史中，不仅拖慢了分析流程，还触发了错误的清理脚本。

**Impact:** 造成了版本库历史污染，且后续处理失当直接导致了本次阶段代码丢失。
**Source:** `.planning/forensics/report-20260422182359.md`
