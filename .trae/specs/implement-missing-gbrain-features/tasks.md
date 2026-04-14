# Tasks

- [x] Task 1: 扩展 `src/types.ts` 中的类型定义
  - [x] SubTask 1.1: 增加 `LinkRecord`, `TimelineEntry`, `RawData`, `FileRecord`, `ConfigRecord` 等接口定义。

- [x] Task 2: 在 `LibSQLStore` 中实现 Links (双向链接) 相关方法
  - [x] SubTask 2.1: 实现 `addLink(fromSlug, toSlug, linkType, context)`
  - [x] SubTask 2.2: 实现 `removeLink(fromSlug, toSlug)`
  - [x] SubTask 2.3: 实现 `getOutgoingLinks(slug)` 和 `getBacklinks(slug)`

- [x] Task 3: 在 `LibSQLStore` 中实现 Timeline Entries (时间线条目) 相关方法
  - [x] SubTask 3.1: 实现 `upsertTimelineEntries(slug, entries)` 
  - [x] SubTask 3.2: 实现 `getTimelineEntries(slug)`

- [x] Task 4: 在 `LibSQLStore` 中实现 Raw Data & Files (原始数据与文件) 相关方法
  - [x] SubTask 4.1: 实现 `putRawData(slug, source, data)` 和 `getRawData(slug, source)`
  - [x] SubTask 4.2: 实现 `upsertFile(fileRecord)` 和 `getFile(storagePath)`

- [x] Task 5: 在 `LibSQLStore` 中实现 Config & Logs (配置与日志) 相关方法
  - [x] SubTask 5.1: 实现 `getConfig(key)` 和 `setConfig(key, value)`
  - [x] SubTask 5.2: 实现 `addIngestLog(log)`
  - [x] SubTask 5.3: 实现 `verifyAccessToken(tokenHash)` 和 `logMcpRequest(log)`

- [x] Task 6: 编写缺失功能的单元测试
  - [x] SubTask 6.1: 编写 Links 的测试用例
  - [x] SubTask 6.2: 编写 Timeline Entries, Raw Data, Files, Config, Logs 的测试用例

# Task Dependencies
- Task 2-5 depends on Task 1
- Task 6 depends on Task 2-5