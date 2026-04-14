---
title: GBrain Architecture
type: concept
tags: [architecture, storage]
---

GBrain 是一个先进的个人知识库系统。它通过对 Markdown 文件的深度解析，提取 Frontmatter、正文（Compiled Truth）以及历史事件时间线（Timeline），将非结构化文本转化为结构化数据。

GBrain 底层依赖 `drizzle-orm` 与 `bun:sqlite` 来管理复杂的关联数据（如页面链接 Links、时间线条目 Timeline Entries 等）。
它还集成了强大的混合搜索（Hybrid Search），通过合并向量检索和 SQLite 的 FTS5 虚拟表关键词匹配，提供精准的查询结果。

系统支持将知识直接暴露给 Mastra Agent。

---
- 2023-11-20: Garry 构思并开源了最初版本的 GBrain，使用 Postgres。
- 2025-02-10: 系统经历重构，全面引入 Bun 和 SQLite 作为底层基础设施。