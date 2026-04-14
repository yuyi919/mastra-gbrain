# Align GBrain Full Tools Spec

## Why
在对最新的 GBrain 原版仓库进行深度对比分析后发现，虽然我们在底层架构（GBrainStore、Drizzle Schema）上已经完美还原了所有数据结构，并且实现了 `search`, `ingest`, `pageInfo`, `links`, `timeline`, `config` 等基础工具。但作为供大模型（LLM）使用的完整个人知识库助手，我们仍缺少部分核心的增删改查交互工具。例如，LLM 目前无法阅读某个页面的完整正文，无法列出或过滤全局页面，也无法删除废弃页面。这限制了 Agent 的自治能力。

## What Changes
- [x] 在 `src/store/interface.ts` 中补齐底层确实的 Store 方法（如 `deletePage`, `listPages`, `getPageContent`）。
- [x] 在 `src/store/libsql.ts` 中实现上述底层方法。
- [x] 扩展 `src/tools/page.ts`，增加 `readPageTool` 用于读取页面完整内容和 Frontmatter，增加 `deletePageTool` 用于删除页面。
- [x] 新增 `src/tools/list.ts`，封装 `listPagesTool` 允许大模型按类型或标签列出和筛选知识库中的页面。
- [x] 新增 `src/tools/raw.ts`，封装 `getRawDataTool` 和 `putRawDataTool` 用于管理原始数据。
- [x] 将 `src/scripts/import.ts` 封装为 `bulkImportTool`，允许大模型在获得用户授权后直接通过目录路径批量导入本地知识库。
- [x] 将所有新工具注册到 `src/index.ts` 和 `src/agent/index.ts` 的 Mastra 实例中。

## Impact
- Affected specs: 无
- Affected code:
  - `src/store/interface.ts`
  - `src/store/libsql.ts`
  - `src/tools/page.ts`
  - `src/tools/list.ts` (new)
  - `src/tools/raw.ts` (new)
  - `src/index.ts`
  - `src/agent/index.ts`

## ADDED Requirements
### Requirement: Read Full Page Content
The system SHALL provide a tool for the agent to read the full `compiled_truth` and `frontmatter` of any ingested page by its slug.

#### Scenario: Success case
- **WHEN** the agent calls `readPageTool` with a specific slug.
- **THEN** it receives the full text and JSON frontmatter of that page.

### Requirement: List and Filter Pages
The system SHALL provide a tool to list available pages, optionally filtered by `type` or `tag`.

#### Scenario: Success case
- **WHEN** the agent calls `listPagesTool` with `tag: "ai"`.
- **THEN** it receives a list of slugs and titles for all pages containing that tag.

### Requirement: Bulk Import
The system SHALL provide a tool `bulkImportTool` allowing the LLM to trigger a recursive ingestion of a local directory, leveraging the existing script logic.