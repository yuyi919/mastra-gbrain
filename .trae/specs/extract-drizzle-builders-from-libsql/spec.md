# LibSQL SQL 构建解耦 Spec

## Why
`libsql.ts` 仍残留大量 Drizzle 查询构建语句，导致存储执行层与 SQL 构建层耦合。需要将构建逻辑统一收敛到 `SqlBuilder.ts`，并确保 `libsql.ts` 不再直接依赖 `drizzle-orm`。

## What Changes
- 将 `libsql.ts` 中剩余的 Drizzle 查询构建逻辑继续迁移到 `SqlBuilder.ts`
- `libsql.ts` 仅保留业务流程编排、查询执行与结果映射
- 移除 `libsql.ts` 对 `"drizzle-orm"` 的直接导入
- 为新增 Builder 提供清晰命名与职责边界（按领域拆分：page/tag/chunk/link/timeline/raw-data/config/log 等）
- 保持 `SqlBuilder.ts` 为同步构建模块，不引入任何异步语法

## Impact
- Affected specs: StoreProvider 存储实现边界、查询构建职责边界、检索与写入一致性
- Affected code: `src/store/libsql.ts`、`src/store/SqlBuilder.ts`、相关测试文件（如 `test/libsql.test.ts`）

## ADDED Requirements
### Requirement: LibSQL 查询构建分层
系统 SHALL 将 Drizzle 查询构建职责集中在 `SqlBuilder.ts`，`libsql.ts` 不直接出现 Drizzle 构建表达式。

#### Scenario: 读写页面与检索
- **WHEN** `LibSQLStore` 执行页面读写、关键词检索、向量回表、标签/链接/时间线/原始数据相关方法
- **THEN** 查询对象由 `SqlBuilder` 提供，`libsql.ts` 只调用 Builder 并执行

### Requirement: 依赖边界约束
系统 SHALL 禁止 `src/store/libsql.ts` 直接导入 `"drizzle-orm"`。

#### Scenario: 编译期静态检查
- **WHEN** 代码完成迁移
- **THEN** `libsql.ts` 的 import 列表不包含 `"drizzle-orm"`，并且类型检查通过

## MODIFIED Requirements
### Requirement: SqlBuilder 模块职责
`SqlBuilder.ts` 从“部分查询构建”升级为“统一查询构建入口”，覆盖 `libsql.ts` 需要的 Drizzle 构建逻辑，且保持纯同步（无 `async/await`）。

## REMOVED Requirements
### Requirement: 在 libsql.ts 内联构建 Drizzle 查询
**Reason**: 该模式破坏层次边界，增加维护复杂度与重复实现风险。  
**Migration**: 将内联构建代码迁移为 `SqlBuilder` 导出的 builder 函数，`libsql.ts` 改为调用并执行。
