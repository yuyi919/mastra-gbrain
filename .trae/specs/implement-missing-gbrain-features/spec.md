# Implement Missing GBrain Features Spec

## Why
目前项目已经完成了核心的页面（Pages）、块（Chunks）、标签（Tags）的存储以及多语言搜索，并且使用了 Drizzle ORM 一比一还原了原始 GBrain 的数据库 Schema。然而，现有的 `LibSQLStore` 实现中，仍有部分原始 GBrain 核心特性没有对外暴露相应的增删改查（CRUD）接口。为了完全对齐 GBrain 的业务能力并为上层的应用（如 MCP Server、关联图谱等）提供支撑，我们需要补齐这些缺失的功能。

## What Changes
- 实现 **Links（双向链接）** 功能：允许建立页面与页面之间的连接，并支持查询反向链接（Backlinks）与正向链接。
- 实现 **Timeline Entries（时间线条目）** 功能：支持将页面的 `timeline` 结构化存入独立的条目表中，并提供查询能力。
- 实现 **Raw Data（原始数据）** 功能：支持存储和读取抓取（Fetch）的原始上下文数据。
- 实现 **Files（文件附件）** 功能：支持存储和读取关联的文件及元数据。
- 实现 **Config（配置项）** 功能：提供对全局键值的读取和更新。
- 实现 **Ingest Log（摄入日志）** 功能：在摄入工作流中记录历史信息。
- 实现 **MCP & Auth（MCP鉴权与日志）** 功能：为未来提供远程 MCP 服务增加鉴权与请求日志能力。

## Impact
- Affected specs: 无
- Affected code: 
  - `src/store/libsql.ts`
  - `src/types.ts`
  - 测试用例

## ADDED Requirements
### Requirement: Links Management
系统 SHALL 支持页面之间的双向链接，能添加链接、移除链接，并获取指定页面的所有出链（outgoing links）和入链（backlinks）。

### Requirement: Timeline Entries Management
系统 SHALL 能够存储结构化的时间线条目，能将 Markdown 中解析出的时间线或独立的时间线事件入库，并能按时间线维度检索页面。

### Requirement: Config & Logs
系统 SHALL 支持基础的键值对全局配置管理，以及工作流执行和接口调用的日志记录。