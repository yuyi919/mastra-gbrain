# GBrain 系统架构 (System Architecture)

GBrain 是一个基于本地优先 (local-first) 的个人知识管理系统，构建在 [Mastra](https://mastra.ai/) 代理框架之上。它利用 SQLite 提供结构化数据、全文检索 (FTS) 和向量搜索 (Vector Search) 能力，旨在为 AI 助手提供一个可持久化、可查询的“大脑”。

## 1. 核心架构层级

系统整体可以划分为以下几个核心层级：

- **Agent 层 (代理层)**：基于 `@mastra/core` 的 `Agent`，名为 "GBrain Agent"。它封装了一系列工具 (Tools)，使 LLM 能够与知识库进行交互（搜索、摄入、读取、管理链接和时间线等）。
- **Workflow 层 (工作流层)**：定义了文档摄入 (Ingestion) 等复杂多步流程，确保数据处理的可靠性和一致性。
- **Tool 层 (工具层)**：为 Agent 提供的原子化操作集合，包括页面管理、图谱链接管理、时间线查询、混合搜索等。
- **Search 层 (搜索层)**：实现复杂的混合搜索逻辑 (Hybrid Search)，结合了向量相似度检索和 FTS 关键字检索，并使用 RRF (Reciprocal Rank Fusion) 算法进行结果融合与去重。
- **Store 层 (存储层)**：数据持久化抽象，定义了 `StoreProvider` 和 `EmbeddingProvider`。底层基于 `Bun SQLite`、`Drizzle ORM` 和 `@mastra/libsql` (用于向量存储)。

## 2. 关键设计模式与组件

### 2.1 混合搜索模式 (Hybrid Search & RRF)
搜索模块 (`src/search/hybrid.ts`) 实现了高精度的知识检索：
- **双路召回**：同时执行 FTS 关键字检索和向量搜索。
- **RRF 融合**：使用 Reciprocal Rank Fusion (`src/search/rrf.ts`) 将两路结果合并排序。
- **智能去重 (Deduplication)**：
  - 限制单个页面返回的 Chunk 数量 (默认最多 3 个)。
  - 使用 Jaccard 相似度去除内容高度重合的 Chunk (阈值 0.85)。
  - 保证结果的页面类型多样性 (Type Diversity)。
  - 确保尽可能包含页面的 `compiled_truth` (核心正文) Chunk。

### 2.2 工作流驱动的摄入管道 (Ingestion Workflow)
文档摄入 (`src/ingest/workflow.ts`) 基于 Mastra 的 `createWorkflow`，被拆分为多个解耦的步骤 (Steps)：
1. **Parse (解析)**：解析 Markdown 文件，分离 Frontmatter、`compiled_truth` (正文) 和 `timeline` (时间线)，并计算内容哈希 (`content_hash`) 以避免重复摄入。
2. **Chunk (分块)**：使用递归分块算法 (`src/chunkers/recursive.ts`) 将长文本拆分为适合 Embedding 的片段。
3. **Embed (向量化)**：批量调用 `EmbeddingProvider` 生成文本向量。
4. **Persist (持久化)**：在一个数据库事务中，原子性地写入页面元数据、标签、分块内容、FTS 数据、时间线条目和向量数据。

### 2.3 函数式与副作用管理 (Effect TS)
在存储层初始化和依赖注入中，系统使用了 `effect` (Effect TS) 库来处理上下文、副作用和配置 (如 `src/store/index.ts` 中的 `BrainStoreProvider`)。这种模式提升了复杂依赖初始化的安全性和可测试性。

## 3. 数据流 (Data Flow)

### 3.1 摄入数据流 (Write Path)
1. **输入**：用户提供 Markdown 文本或目录路径。
2. **解析**：`src/markdown.ts` 提取元数据、正文和时间线。
3. **分块与向量化**：长文本被切分为 Chunks，送入本地或远程的 Embedding 模型 (如 `node-llama-cpp` 或 OpenAI) 获取向量。
4. **存储**：
   - 结构化数据 (如 tags, links, timeline) 和原始 Chunk 文本存入 SQLite 关系表。
   - 分词后的 Chunk 存入 SQLite FTS5 虚拟表。
   - 向量存入 LibSQLVector 存储。

### 3.2 检索数据流 (Read Path)
1. **输入**：Agent 或用户发起自然语言查询。
2. **向量化查询**：将查询文本转化为向量。
3. **双路并发查询**：
   - 向量查询 -> LibSQLVector -> 返回 Top-K 结果。
   - 关键字查询 -> FTS5 -> 返回 Top-K 结果。
4. **融合与重排**：通过 RRF 合并两路结果，应用去重逻辑。
5. **输出**：返回最高质量的知识片段给 Agent 作为上下文。

## 4. 数据库 Schema 设计
核心数据实体围绕 "Page (页面)" 展开 (`src/store/schema.ts`)：
- **`pages`**：核心文档表。
- **`content_chunks`**：文档的片段，用于细粒度检索。
- **`chunks_fts`**：FTS5 虚拟表，用于全文搜索。
- **`links`**：记录页面之间的双向图谱关系。
- **`tags`**：页面的分类标签。
- **`timeline_entries`**：从页面中提取的时间线事件，支持按时间序列查询。
- **`page_versions`**：页面历史版本，用于防丢失和回滚。
