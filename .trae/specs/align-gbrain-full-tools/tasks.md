# Tasks

- [x] Task 1: 在 `GBrainStore` 接口中定义新增方法
  - [x] SubTask 1.1: 定义 `getPageContent(slug: string): Promise<PageRecord | null>`
  - [x] SubTask 1.2: 定义 `listPages(options?: { type?: string, tag?: string }): Promise<{ slug: string, title: string, type: string }[]>`
  - [x] SubTask 1.3: 定义 `deletePage(slug: string): Promise<boolean>`

- [x] Task 2: 在 `LibSQLStore` 中实现新增方法
  - [x] SubTask 2.1: 实现 `getPageContent`
  - [x] SubTask 2.2: 实现 `listPages`
  - [x] SubTask 2.3: 实现 `deletePage` (确保 SQLite 外键级联生效，或者手动清理矢量库和相关表)

- [x] Task 3: 创建并封装新的 Mastra Tools
  - [x] SubTask 3.1: 在 `src/tools/page.ts` 中新增 `readPageTool` (读取完整内容与 Frontmatter)
  - [x] SubTask 3.2: 在 `src/tools/page.ts` 中新增 `deletePageTool` (删除页面)
  - [x] SubTask 3.3: 创建 `src/tools/list.ts` 并实现 `listPagesTool` (支持按类型/标签过滤页面)
  - [x] SubTask 3.4: 创建 `src/tools/raw.ts` 并实现 `getRawDataTool` 与 `putRawDataTool`
  - [x] SubTask 3.5: 创建 `src/tools/import.ts` 封装 `bulkImportTool`，允许模型通过传入目录路径触发 `src/scripts/import.ts` 的 `bulkImport` 逻辑。

- [x] Task 4: 更新系统注册与 Agent
  - [x] SubTask 4.1: 在 `src/index.ts` 导出并注册这些新 Tools。
  - [x] SubTask 4.2: 在 `src/agent/index.ts` 中将这些新 Tools 绑定到 `gbrainAgent`，并更新其系统提示词以指导它如何使用 `readPageTool` 和 `listPagesTool`。

- [x] Task 5: 编写测试用例验证新增功能
  - [x] SubTask 5.1: 编写单元测试验证 `LibSQLStore` 新方法的正确性。
  - [x] SubTask 5.2: 编写测试验证大模型 Tools 的执行结果。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4