# GBrain Maintenance Tools Spec

## Why
目前 `mastra-gbrain` 已经实现了核心的向量化摄入和查询工具（暴露给了大模型使用）。然而，在真实的个人知识库运维场景中，我们需要定期执行一些底层维护任务，以保持知识图谱的连通性和数据的完整性。原始的 `gbrain` 仓库提供了 `check-backlinks`（修复反向链接断层）、`doctor`（数据库与环境健康诊断）以及处理过期向量（`stale`）的能力。为了全面对齐并在健壮性上超越原版，我们需要将这些维护工具以现代化、可扩展（如使用 AST `remark` 替代简单正则）的方式在当前项目中重新实现，并确保其翻译文档和流程规范可以作为常态化任务沉淀。

## What Changes
- **文档迁移与本地化**：拉取原版 `gbrain` 的 `TODOS.md` 以及整个 `docs` 目录（包含 `recipes`、`designs` 等）到本地 `references` 目录，并将其所有内容翻译为中文。同时更新 `CLAUDE.md` 记录这一规范化定期任务。
- **重写 `check-backlinks`**：在 `src/scripts/backlinks.ts` 中实现。**BREAKING**: 弃用原版粗糙的正则匹配，引入 `remark` 体系（AST解析）来精准扫描 Markdown 文件中的 `[Text](link)` 和 `[[WikiLink]]`。此脚本支持扫描 (`check`) 并在目标文件的 `Timeline` 中自动插入（修复 `fix`）缺失的反向链接记录。
- **重写 `doctor`**：在 `src/scripts/doctor.ts` 中实现。对当前使用的 LibSQL/SQLite 数据库进行健康检查，包括：表结构完整性校验、连接测试、以及向量化覆盖率（无向量块比例）扫描。
- **重写 `stale` (增量向量化)**：在 `src/scripts/embed.ts` 中实现。提供 `--stale` 标志，通过查询数据库中尚未拥有向量或内容哈希已变更的文本块，批量并发调用 `embedBatch` 生成并更新向量。
- **对齐 `searchKeyword`**：在 `src/store/libsql.ts` 中升级全文检索逻辑。增加对 `type`, `exclude_slugs`, `detail: 'low'` 的过滤支持；实现**可控制的单页面最佳文本块去重**（Best Chunk per Page），并添加查询安全限制（如最大 Limit 和超时保护）。
- **Provider 抽象与依赖注入重构**：**BREAKING**: 移除代码库中（如 Tools、Workflow、Agent 中）直接导入具体 `store` 实例的硬编码做法。抽象出 `StoreProvider` 和 `EmbeddingProvider` 接口，并引入工厂函数模式。默认使用基于内存 (`file::memory:`) 的 `LibSQLStore` 和 Dummy (Mock) Embedding 作为默认实现，支持在启动时通过依赖注入替换。

## Impact
- Affected specs: 无
- Affected code:
  - `CLAUDE.md` (updated)
  - `references/TODOS.md` (translated)
  - `references/docs/*` (translated)
  - `src/scripts/backlinks.ts` (new)
  - `src/scripts/doctor.ts` (new)
  - `src/scripts/embed.ts` (new)
  - `package.json` (add `remark` dependencies)

## ADDED Requirements
### Requirement: AST-based Backlink Checker
The system SHALL provide a script to parse markdown links via AST and verify bidirectional references.

#### Scenario: Success case
- **WHEN** user runs `bun run src/scripts/backlinks.ts check ./docs`
- **THEN** it outputs a list of missing backlinks without modifying files.

### Requirement: Database Doctor
The system SHALL verify the integrity of the SQLite database and FTS/Vector extensions.

#### Scenario: Success case
- **WHEN** user runs `bun run src/scripts/doctor.ts`
- **THEN** it reports the status of tables, FTS indexes, and the percentage of chunks successfully embedded.

### Requirement: Search Result Deduplication
The system SHALL support an option (`dedupe`) in `searchKeyword` to return only the best-scoring chunk per page.

### Requirement: Dependency Injection via Providers
The system SHALL NOT rely on global static instances for the database or embedding models. It MUST use factory functions (`createTools`, `createWorkflow`, `createAgent`) that accept `StoreProvider` and `EmbeddingProvider` implementations.