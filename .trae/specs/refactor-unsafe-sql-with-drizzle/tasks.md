# Tasks
- [x] Task 1: 盘点 UnsafeSql 可迁移点并确定保留清单
  - [x] SubTask 1.1: 列出 `UnsafeSql` 所有方法的调用方与用途（stats/health/report/vector/graph/fts）
  - [x] SubTask 1.2: 标注“可 Drizzle 化”（计数/exists/简单 join）与“应保留 Unsafe”（vector_store/递归 CTE/FTS integrity）边界

- [x] Task 2: 扩展 SqlBuilder 承载统计与健康检查查询构建
  - [x] SubTask 2.1: 新增 BrainStats 所需计数与 pages_by_type 聚合的 builder
  - [x] SubTask 2.2: 新增 BrainHealth 所需计数（stale/orphan/deadLinks/entity 覆盖率等）的 builder
  - [x] SubTask 2.3: 新增 getHealthReport 表行数统计 builder（固定表集合强类型化）
  - [x] SubTask 2.4: 复用已有 `countContentChunks(embedded?)`，不引入重复实现

- [x] Task 3: 重构 libsql.ts 统计/健康相关方法改走 Drizzle
  - [x] SubTask 3.1: `getStats()` / `getHealth()` 改为调用 `this.mappers` 执行并映射返回
  - [x] SubTask 3.2: `getHealthReport()` 改为使用 Drizzle 计数填充 tableDetails 与 vectorCoverage，移除调试输出
  - [x] SubTask 3.3: `UnsafeSql` 仅保留必要方法，并同步更新其调用点（vector_store/graph/fts）

- [x] Task 4: 测试与回归验证
  - [x] SubTask 4.1: 更新/新增测试覆盖 `getStats()` / `getHealth()`（必要时增加 `getHealthReport()` 的关键断言）
  - [x] SubTask 4.2: 运行 `bun test`，确保无回归

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
