# Tasks
- [x] Task 1: 盘点 `libsql.ts` 中剩余的 Drizzle 构建点并定义迁移清单
  - [x] SubTask 1.1: 列出所有仍在 `libsql.ts` 内联构建的查询（按模块分组）
  - [x] SubTask 1.2: 为每个构建点定义对应的 `SqlBuilder` 函数签名与返回类型

- [x] Task 2: 扩展 `SqlBuilder.ts` 承载全部查询构建职责
  - [x] SubTask 2.1: 新增缺失的 builder 函数并复用已有条件拼装逻辑
  - [x] SubTask 2.2: 保证 `SqlBuilder.ts` 无 `async/await`，仅构建 query
  - [x] SubTask 2.3: 统一函数注释与命名风格，避免语义重复

- [x] Task 3: 重构 `libsql.ts` 为执行层
  - [x] SubTask 3.1: 将 `libsql.ts` 的内联构建替换为 `SqlBuilder` 调用
  - [x] SubTask 3.2: 移除 `libsql.ts` 对 `"drizzle-orm"` 的直接 import
  - [x] SubTask 3.3: 保持现有行为与返回结构不变（包括 stale、分页、过滤等）

- [x] Task 4: 回归验证与质量门禁
  - [x] SubTask 4.1: 运行 TypeScript 诊断，确认无新增类型错误
  - [x] SubTask 4.2: 运行与 store 相关测试（至少 `test/libsql.test.ts`）
  - [x] SubTask 4.3: 自检 `libsql.ts` 不再包含 `"drizzle-orm"` import

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
