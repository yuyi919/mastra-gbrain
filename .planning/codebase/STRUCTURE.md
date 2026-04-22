# GBrain 目录结构与模块说明 (Directory Structure & Modules)

GBrain 代码库是一个基于 TypeScript 和 Node.js/Bun 的全栈本地优先 (local-first) 代理项目。它围绕着个人知识管理的存储、搜索和 AI 代理进行构建。

## 1. 目录概览

```text
/workspace/src/
├── agent/       # 核心 AI 代理定义
├── chunkers/    # 文本分块算法
├── ingest/      # 数据摄入工作流
├── libs/        # 外部库的集成、修复或适配
├── scripts/     # 项目维护、导入、诊断和执行脚本
├── search/      # 搜索算法 (Hybrid, RRF)
├── store/       # 数据库模型、ORM 操作、依赖注入和底层存储
├── tools/       # Mastra 工具定义 (提供给 Agent 的 API)
├── workflow/    # 其他工作流定义
├── index.ts     # 项目的主入口文件
├── markdown.ts  # Markdown 解析器与序列化器
├── segmenter.ts # 分词工具 (支持 FTS 的中文/多语言分词)
├── slug.ts      # 路径和标题的 URL Slug 生成工具
└── types.ts     # 全局类型定义
```

## 2. 关键模块与职责

### 2.1 Agent (`src/agent/`)
- **`index.ts`**：定义了 `GBrain Agent`，通过 `@mastra/core/agent` 初始化。向系统注入了指令 (Instructions) 和所有可用的工具 (Tools)。该模块是 LLM 与本地知识库交互的大脑和中枢。

### 2.2 Store (`src/store/`)
- 职责：数据持久化、检索与依赖注入层。
- **`schema.ts`**：Drizzle ORM 的表结构定义 (SQLite)，包含了 `pages`、`content_chunks`、`links`、`timeline_entries`、`tags`、`chunks_fts` 等。
- **`interface.ts`**：定义了核心抽象接口，如 `StoreProvider` (存储提供者)、`EmbeddingProvider` (向量提供者)。
- **`libsql.ts`**：`StoreProvider` 的主要实现，基于 Bun SQLite 和 Drizzle ORM，封装了页面管理、图谱链接、混合检索等核心业务逻辑。
- **`SqlBuilder.ts`**：底层 SQL 语句的构造器，利用 Drizzle 编写复杂的关联查询和 FTS 语句。
- **`index.ts`**：利用 `effect` 库提供依赖注入容器，用于初始化 `BrainStore` 和默认的 `LlamaEmbeddingProvider`。

### 2.3 Search (`src/search/`)
- 职责：复杂检索算法。
- **`hybrid.ts`**：实现了 `hybridSearch` 函数，调用存储层的向量和 FTS 查询，并使用 RRF 算法融合和去重 (deduplication)。
- **`rrf.ts`**：Reciprocal Rank Fusion (倒数排序融合) 算法的实现。
- **`llama-reranker.ts`**：可能用于重排序 (Reranking) 搜索结果的集成。

### 2.4 Tools (`src/tools/`)
- 职责：为 Agent 提供原子化的 MCP 工具。每个文件导出了创建特定工具的工厂函数。
- **`page.ts`**：页面读写、标签管理和元数据获取工具。
- **`search.ts`**：调用 Hybrid Search 的检索工具。
- **`ingest.ts` & `import.ts`**：调用摄入工作流的工具，支持单文件或批量导入。
- **`links.ts`**：页面关系图谱 (Graph) 的链接管理工具。
- **`timeline.ts`**：时间线事件查询工具。
- **`config.ts`**：系统全局配置管理。
- **`raw.ts`**：原始外部数据抓取与存储工具。

### 2.5 Ingest (`src/ingest/`)
- 职责：文档摄入的管道 (Pipeline)。
- **`workflow.ts`**：基于 `@mastra/core/workflows` 构建的 `gbrain-ingest` 工作流。包含解析 (Parse)、分块 (Chunk)、向量化 (Embed) 和持久化 (Persist) 四个阶段。

### 2.6 Chunkers & Markdown (`src/chunkers/` & `src/markdown.ts`)
- 职责：文本处理。
- **`markdown.ts`**：使用 `gray-matter` 解析 Markdown 文件，提取 Frontmatter、`compiled_truth` (编译后的事实/正文) 和 `timeline` (时间线事件)。支持从文件路径推断页面类型 (Type) 和标题。
- **`chunkers/recursive.ts`**：实现了按段落、换行符和句子边界递归拆分长文本的算法，以适应 Embedding 模型的上下文窗口。

### 2.7 Scripts (`src/scripts/`)
- 职责：项目实用工具和维护。
- **`backlinks.ts`**：批量分析和更新双向链接的脚本。
- **`doctor.ts`**：健康检查工具，用于诊断数据库完整性、孤儿节点和死链。
- **`embed.ts`**：离线批量生成或修复向量的脚本。

## 3. 项目配置文件

- **`package.json`**：项目依赖，使用 `bun` 运行和测试，依赖 `@mastra/core`、`drizzle-orm`、`node-llama-cpp` 等。
- **`drizzle.config.ts`**：Drizzle 数据库迁移和 Schema 生成配置。
- **`tsconfig.json` & `tsup.config.ts`**：TypeScript 编译和打包配置。
- **`biome.json`**：代码格式化和 Lint 配置工具。
