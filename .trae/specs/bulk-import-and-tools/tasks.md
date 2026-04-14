# Tasks

- [x] Task 1: 创建本地仿真测试文档库
  - [x] SubTask 1.1: 在 `test/fixtures/docs` 目录下创建多篇包含中文、英文、带 Frontmatter 和 Timeline 分隔的 `.md` 页面文件，确保相互之间存在概念上的引用关联。

- [x] Task 2: 编写批量导入脚本 (`src/scripts/import.ts`)
  - [x] SubTask 2.1: 实现目录递归读取所有的 `.md` 文件功能。
  - [x] SubTask 2.2: 使用现有的 `createIngestionWorkflow` 读取并导入所有扫描到的文件内容到 `GBrainStore` 中，处理结果日志的打印。

- [x] Task 3: 提取并封装更多的 `GBrainStore` API 为 Mastra Tools
  - [x] SubTask 3.1: 创建 `src/tools/page.ts` 封装 `getPage`, `getTags`, `addTag`, `removeTag` 等操作。
  - [x] SubTask 3.2: 创建 `src/tools/links.ts` 封装 `addLink`, `removeLink`, `getOutgoingLinks`, `getBacklinks` 操作。
  - [x] SubTask 3.3: 创建 `src/tools/timeline.ts` 封装 `getTimelineEntries` 操作。
  - [x] SubTask 3.4: 创建 `src/tools/config.ts` 封装 `getConfig`, `setConfig` 操作。
  - [x] SubTask 3.5: 将新提取的 Tools 注册到 `src/index.ts` 中的 Mastra 实例里。

- [x] Task 4: 编写真实场景的集成测试 (`test/integration.test.ts`)
  - [x] SubTask 4.1: 在测试中执行批量导入 `test/fixtures/docs` 到内存/测试数据库。
  - [x] SubTask 4.2: 调用新封装的 Tools 验证文档库内容的搜索、时间线获取、反向链接提取功能，证明真实场景下的高可用性。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2 and Task 3