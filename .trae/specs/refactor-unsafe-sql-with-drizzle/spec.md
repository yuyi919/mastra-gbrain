# UnsafeSql Drizzle 化 Spec

## Why
`src/store/UnsafeSql.ts` 目前承载了多处可以通过 Drizzle ORM 安全表达的统计/健康检查查询，导致“Unsafe”边界被放大，并遗留了字符串拼接表名等可避免风险点。

## What Changes
- 将 `UnsafeSql` 中可用 Drizzle 表达的读取型查询迁移到 `SqlBuilder`（或新增 builder），并由 `LibSQLStore` 执行
- 移除/替换 `getHealthReport()` 中对 `UnsafeSql.getTableRowCount()` 的依赖，改为对已知表的强类型计数
- 统一向量覆盖率统计口径：使用 Drizzle 的计数结果填充 `vectorCoverage`，不再额外走原生 SQL
- 收敛 `UnsafeSql` 职责，仅保留确实需要原生 SQLite 能力或暂未纳入 Drizzle schema 的操作（例如：`vector_store`、递归图遍历、FTS integrity-check）
- 保持 `BrainStats` / `BrainHealth` / `DatabaseHealth` 的返回结构与现有测试断言一致

## Impact
- Affected specs: StoreProvider 健康检查与统计能力、safe/unsafe 边界清晰度
- Affected code:
  - `src/store/UnsafeSql.ts`
  - `src/store/SqlBuilder.ts`
  - `src/store/libsql.ts`
  - 相关测试（例如 `test/ext.test.ts`，必要时新增/扩展健康检查测试）

## ADDED Requirements
### Requirement: UnsafeSql 最小化
系统 SHALL 将可由 Drizzle ORM 表达的只读统计/健康检查查询迁移出 `UnsafeSql`，使 `UnsafeSql` 仅保留必要的原生能力访问点。

#### Scenario: Stats/Health 走 Drizzle
- **WHEN** 调用 `LibSQLStore.getStats()` / `LibSQLStore.getHealth()`
- **THEN** 不再依赖 `UnsafeSql.getStats()` / `UnsafeSql.getHealth()` 的原生 SQL 拼接实现

### Requirement: 健康检查计数强类型化
系统 SHALL 在 `getHealthReport()` 的表行数统计中避免字符串拼接表名查询，并改为对固定表集合的强类型计数。

#### Scenario: Table row counts
- **WHEN** `getHealthReport()` 遍历已知表集合（pages/content_chunks/links/timeline_entries/tags/chunks_fts）
- **THEN** 每张表行数通过 Drizzle 计数获得，且不出现 `FROM ${table}` 形式的动态 SQL

### Requirement: 向量覆盖率口径一致
系统 SHALL 使用同一套 Drizzle 计数结果产出 `vectorCoverage.total` 与 `vectorCoverage.embedded`。

#### Scenario: Vector coverage
- **WHEN** `getHealthReport()` 产出 `vectorCoverage`
- **THEN** 结果与 `content_chunks` 的 `embedded_at IS NOT NULL` 统计一致，且不依赖原生 SQL 的重复实现

## MODIFIED Requirements
### Requirement: SqlBuilder 职责扩展（统计/健康）
`SqlBuilder` SHALL 提供 `BrainStats`/`BrainHealth`/健康报告所需的计数与聚合查询构建，保持同步构建风格并由 `LibSQLStore` 负责执行与结果映射。

## REMOVED Requirements
### Requirement: UnsafeSql.getTableRowCount 动态表名查询
**Reason**: 动态拼接表名属于可避免的不安全模式，且当前使用场景表集合是固定的。  
**Migration**: 在 `SqlBuilder` 中为固定表集合提供计数 builder，并由 `LibSQLStore.getHealthReport()` 调用。
