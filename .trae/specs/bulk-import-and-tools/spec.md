# Bulk Import and Extended Tools Spec

## Why
当前系统已经具备了极速运行环境、多语言分块和搜索、底层完整的 `GBrainStore` 接口以及最基础的摄入（Ingest）和搜索（Search）工具。然而，我们在将整个本地知识库（大量 Markdown 文件）迁入系统时缺乏批量导入的能力，且 `GBrainStore` 中的许多高级特性（如链接、时间线、配置等）仍未暴露为大模型可调用的 Tool。为了提供与真实使用场景高度一致的验证环境，我们需要提供一个好用的批量导入脚本、更多的大模型工具，并提供高度仿真的本地文档库用于端到端测试。

## What Changes
- **批量导入脚本**: 在 `src/scripts/import.ts` 中实现批量从本地目录递归读取 Markdown 并摄入到数据库的功能。
- **扩展 Tools**: 为 `GBrainStore` 中暴露的所有公开方法创建对应的 Mastra Tools，例如：
  - `pageInfoTool`: 获取页面的基础信息、标签等。
  - `linksTool`: 增删查页面的双向链接。
  - `timelineTool`: 获取页面的时间线条目。
  - `configTool`: 读写配置。
- **仿真测试文档库**: 在 `test/fixtures/docs` 目录下建立包含真实结构（含有 Frontmatter、Timeline、中英文混合、相互引用）的 Markdown 文档。
- **端到端集成测试**: 编写集成测试，调用批量导入脚本导入仿真文档库，然后利用新封装的各种 Tools 验证在真实数据量下的可用性和正确性。

## Impact
- Affected specs: 无
- Affected code:
  - `src/scripts/import.ts` (new)
  - `src/tools/*.ts` (extended)
  - `src/index.ts` (register new tools)
  - `test/fixtures/docs/` (new)
  - `test/integration.test.ts` (new)

## ADDED Requirements
### Requirement: Bulk Import
The system SHALL provide a script capable of reading a directory recursively and ingesting all valid `.md` files into the store.

#### Scenario: Success case
- **WHEN** user runs `bun run src/scripts/import.ts ./test/fixtures/docs`
- **THEN** all markdown files in the directory are processed, chunked, and upserted into the SQLite database.

### Requirement: Extended Store Tools
The system SHALL expose `GBrainStore` capabilities as Mastra Tools so the agent can autonomously query tags, backlinks, timeline entries, and configuration.