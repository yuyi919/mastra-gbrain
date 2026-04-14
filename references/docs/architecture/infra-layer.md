# GBrain 基础设施层

所有技能、诀窍和集成都建立在这个共享的基础上。

## 数据流水线

```
INPUT (markdown 文件, git 仓库)
  ↓
FILE RESOLUTION (本地 → .redirect → .supabase → error)
  ↓
MARKDOWN PARSER (gray-matter 前言 + 正文)
  → 编译的真相 (compiled_truth) + 时间线 (timeline) 分离
  ↓
CONTENT HASH (SHA-256 幂等性检查 — 如果未更改则跳过)
  ↓
CHUNKING (3 种策略, 可配置)
  ├── 递归 (Recursive): 300 词块, 50 词重叠, 5 级分隔符层次结构
  ├── 语义 (Semantic): 嵌入句子, 余弦相似度, Savitzky-Golay 平滑
  └── LLM 引导 (LLM-guided): Claude Haiku 在 128 词候选块中识别主题转换
  ↓
EMBEDDING (OpenAI text-embedding-3-large, 1536 维度)
  → 批处理 100, 指数退避, 如果失败则非致命
  ↓
DATABASE TRANSACTION (原子操作: 页面 + 块 + 标签 + 版本)
  ↓
SEARCH (混合搜索, 立即生效)
```

## 搜索架构

GBrain 使用倒数排名融合 (RRF) 来合并向量搜索和关键字搜索：

```
User Query (用户查询)
  ↓
EXPANSION (可选: Claude Haiku 生成 2 种替代措辞)
  ↓
  ├── VECTOR SEARCH (向量搜索) (pgvector HNSW, 余弦距离)
  │     → 每个查询变体 2 倍限制结果
  │
  └── KEYWORD SEARCH (关键字搜索) (PostgreSQL tsvector, ts_rank)
        → 2 倍限制结果
  ↓
RRF MERGE (融合) (得分 = Σ(1/(60 + 排名)), 公平平衡两者)
  ↓
4-LAYER DEDUP (4 层去重)
  ├── 每页最佳的 3 个块 (来源去重)
  ├── Jaccard 相似度 > 0.85 (文本去重)
  ├── 没有哪种类型超过 60% (多样性)
  └── 每页最多 2 个块 (页面上限)
  ↓
TOP N RESULTS (前 N 个结果) (默认 20)
```

## 关键组件

| 文件 | 目的 |
|------|---------|
| `src/core/engine.ts` | 可插拔引擎接口 (BrainEngine) |
| `src/core/postgres-engine.ts` | Postgres + pgvector 实现 |
| `src/core/import-file.ts` | importFromFile + importFromContent 流水线 |
| `src/core/sync.ts` | 基于 Git 的增量变更检测 |
| `src/core/markdown.ts` | YAML 前言 + compiled_truth / timeline 解析 |
| `src/core/embedding.ts` | OpenAI 嵌入批处理、重试、退避 |
| `src/core/chunkers/recursive.ts` | 基础分块器 (300 词, 5 级分隔符) |
| `src/core/chunkers/semantic.ts` | 基于嵌入的主题边界检测 |
| `src/core/chunkers/llm.ts` | Claude Haiku 引导的分块 |
| `src/core/search/hybrid.ts` | 向量 + 关键字的 RRF 合并 |
| `src/core/search/dedup.ts` | 4 层结果去重 |
| `src/core/search/expansion.ts` | 通过 Claude Haiku 进行多查询扩展 |
| `src/core/storage.ts` | 可插拔存储 (S3, Supabase, 本地) |
| `src/core/operations.ts` | 契约优先的操作定义 (31 个操作) |
| `src/schema.sql` | 完整的 DDL (10 个表, RLS, tsvector, HNSW) |

## 架构概述

Postgres 中的 10 个表：
- **pages** — slug (UNIQUE), type, title, compiled_truth, timeline, frontmatter (JSONB)
- **content_chunks** — pgvector 1536 维嵌入, chunk_source (compiled_truth|timeline)
- **links** — 类型化边 (knows, works_at, invested_in, founded 等)
- **tags** — 多对多页面标签
- **timeline_entries** — 结构化事件 (date, source, summary, detail)
- **page_versions** — 用于差异/恢复的快照历史
- **raw_data** — 来自外部 API 的辅助 JSON (保留出处)
- **files** — 存储后端的二进制附件
- **ingest_log** — 导入操作的审计追踪
- **config** — 大脑级设置 (version, embedding model, chunk strategies)

全文搜索使用加权 tsvector：标题 (A)、compiled_truth (B)、timeline (C)。
向量搜索在 `content_chunks.embedding` 上使用带有余弦距离的 HNSW 索引。

## 瘦线束原则

GBrain 是确定性层。技能和诀窍是潜在空间层。
完整的架构理念请参见 [瘦线束，胖技能](../ethos/THIN_HARNESS_FAT_SKILLS.md)。

- **GBrain CLI** = 瘦线束 (相同输入 → 相同输出)
- **技能** (ingest, query, maintain, enrich, briefing, migrate, setup) = 胖技能
- **诀窍** (voice-to-brain, email-to-brain) = 供胖技能设置基础设施的清单

代理读取技能/诀窍并使用 GBrain 的确定性工具来完成工作。