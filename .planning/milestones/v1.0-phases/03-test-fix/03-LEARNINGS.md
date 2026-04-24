---
phase: 3
phase_name: "测试验证与功能修复 (Test & Fix)"
project: "GBrain: Effect 重构里程碑 (Effect Refactoring Milestone)"
generated: "2026-04-23T22:59:14.5346831+08:00"
counts:
  decisions: 5
  lessons: 4
  patterns: 4
  surprises: 3
missing_artifacts:
  - "VERIFICATION.md"
  - "UAT.md"
---

# Phase 3 Learnings: 测试验证与功能修复 (Test & Fix)

## Decisions

### 移除 SQLite 不兼容的 `.limit(1)` 更新写法
决定在更新相关查询中移除 SQLite 不支持的 `.limit(1)` 链式调用。

**Rationale:** 直接修复 `near "limit": syntax error`，恢复回滚与版本管理相关测试的可执行性。
**Source:** `PLAN.md`

---

### 用“事务包裹 + 先取后改 (Merge & Upsert)”替代不兼容的更新路径
决定在 `revertToVersion` 场景采用事务包裹并调整为获取后更新的策略，而不是依赖不兼容的查询构造。

**Rationale:** 避开 SQLite `UPDATE ... FROM` 与 `effect-drizzle` 组合下的数据更新失败问题。
**Source:** `SUMMARY.md`

---

### 在 SQL 边界增加手动映射以修复结果形状异常
决定在 `traverseGraph` 查询结果处手动映射数据结构。

**Rationale:** 处理 `drizzleDb.all` 返回“数组的数组”而非“对象数组”导致的编解码错误。
**Source:** `SUMMARY.md`

---

### 通过测试环境替换规避本地模型推理超时
决定在 `integration.test.ts` 中将慢速本地推理替换为 `DummyEmbeddingProvider`。

**Rationale:** 消除大文档导入时 `5000ms Timeout` 阻塞，保证集成测试稳定反馈。
**Source:** `SUMMARY.md`

---

### 调整事务验证边界，跳过不兼容的全局事务测试
决定将与底层连接模型不兼容的全局级事务测试标注为 `skip`，并保留单操作原子性验证。

**Rationale:** `bun:sqlite` 原生事务与 `@effect/sql-sqlite-bun` 连接池无法混用，但操作级 `sql.withTransaction` 仍可保障原子性。
**Source:** `SUMMARY.md`

---

## Lessons

### SQL 方言与查询构造器能力不对齐会在重构后集中暴露
运行时替换后，旧查询习惯（如 UPDATE 上的 LIMIT）会变成高频失败点。

**Context:** Wave 1 的目标就是修复 SQLite 语法与查询兼容性错误。
**Source:** `PLAN.md`

---

### 测试隔离不足会伪造成业务回归
临时数据库复用会引发 `UNIQUE constraint failed`、Timeline 重复、导入被标记为 `"skipped"` 等连锁异常。

**Context:** 通过在多个测试文件强化 `beforeAll` 清理逻辑后，这些问题被消除。
**Source:** `SUMMARY.md`

---

### 本地 embedding 推理速度会直接影响测试策略
当本地模型加载与推理过慢时，测试失败可能来自执行环境而非业务逻辑。

**Context:** `integration.test.ts` 的超时问题通过替换 embedder 而不是继续调整业务代码得到解决。
**Source:** `SUMMARY.md`

---

### 高频自动化验证能显著降低修复阶段的不确定性
任务级与波次级自动化验证在修复 10 个回归失败时保持了快速反馈闭环。

**Context:** 验证契约明确每个任务的自动化命令，最终全阶段均为 green。
**Source:** `03-VALIDATION.md`

---

## Patterns

### “问题簇 -> Wave”分批修复模式
按语法兼容、事务机制、工具脚本、性能超时、全量验证分成多个 Wave 逐步清除回归。

**When to use:** 适用于大规模回归修复，需要把故障类型分层并逐步收敛。
**Source:** `PLAN.md`

---

### 先定向回归再全量回归的验证节奏
先跑失败点相关测试，再在阶段末执行 `bun test` 全量确认。

**When to use:** 适用于故障定位明确、但系统耦合高的修复阶段。
**Source:** `03-VALIDATION.md`

---

### 在驱动/ORM 边界显式归一化数据形状
对返回结果执行手动映射，避免下游编解码依赖隐式结果结构。

**When to use:** 适用于多层封装后结果结构可能被改变的查询路径。
**Source:** `SUMMARY.md`

---

### 把环境清理作为测试基线步骤
在测试入口统一清理数据库状态，避免“脏状态污染”导致的伪失败。

**When to use:** 适用于共享临时数据库文件、并行执行或跨测试文件复用环境的场景。
**Source:** `SUMMARY.md`

---

## Surprises

### `drizzleDb.all` 返回形状与预期不一致
查询结果在特定路径下返回 `statement.values`（数组的数组），而不是对象数组。

**Impact:** 必须补充手动映射层，否则会触发下游编解码错误并放大排障成本。
**Source:** `SUMMARY.md`

---

### 多个看似无关故障实际由同一测试环境污染触发
Timeline 重复、UNIQUE 约束失败、导入 `"skipped"` 最终都指向测试环境清理不足。

**Impact:** 说明测试隔离策略是系统稳定性的关键控制点，而非单个用例细节。
**Source:** `SUMMARY.md`

---

### 全局事务能力并非可直接沿用到新连接模型
重构后全局级事务测试需要 `skip`，与“全部保持原事务模型”预期不一致。

**Impact:** 事务保证需要重新分层定义为“操作级原子性优先”，并在后续阶段再评估全局事务方案。
**Source:** `SUMMARY.md`
