# 技术栈 (Tech Stack)

该项目（GBrain / `mastra-gbrain`）是一个基于本地优先的个人 AI 知识管理系统（"第二大脑"）。项目结合了现代前端工具链、函数式编程、以及支持大语言模型交互的 Agentic 框架。

## 核心语言与运行时 (Core Languages & Runtimes)

- **TypeScript** (v5.6+): 作为主要的开发语言，通过强类型保障系统稳定性。
- **Bun**: 用作构建工具、测试运行器（`bun test`）以及基础运行时。项目中利用了 Bun 原生的 SQLite 支持（通过 `@effect/sql-sqlite-bun`）。
- **Node.js API**: 作为底层依赖基础。

## 框架与系统架构 (Frameworks & Architecture)

- **Mastra Framework** (`@mastra/core`): 用于构建 AI Agent 和工作流（Workflow）的核心框架。项目通过 Mastra 提供的能力整合了数据层和搜索功能，创建出可交互的 AI Agent（例如 `GBrain Agent`）。
- **MCP (Model Context Protocol)**: 提供本地工具供 Claude 桌面端、Claude Cowork 等外部 AI 连接与交互的标准协议。

## 数据存储与 ORM (Database & ORM)

- **libSQL (Turso)**: 高性能的 SQLite 分支，支持向量运算等扩展功能。通过 `@mastra/libsql` 模块深度集成。
- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`): 提供类型安全的数据库 Schema 定义、查询构建以及数据迁移，将关系型数据与向量搜索逻辑结合在一起。

## AI 模型与搜索算法 (AI & Search)

- **node-llama-cpp**: 提供与本地 Llama C++ 引擎的绑定，使系统能够在本地计算向量嵌入（Embeddings）并利用本地大模型进行搜索结果的重排（Re-ranking）。
- **Hybrid Search（混合搜索）**: 结合了基于向量相似度语义搜索与传统的关键字全文检索（FTS）。
- **RRF (Reciprocal Rank Fusion)**: 倒数排名融合算法，对来自不同搜索策略的结果进行智能合并与打分排序。

## 函数式编程与控制流 (Functional Programming)

- **Effect** (`effect`, `@tslibs/effect`): 使用 Effect 生态重构异步控制流、依赖注入及错误处理。专门对 Drizzle 和 SQLite 的调用进行了 Effect 化封装，以提高核心存储层的健壮性。

## 数据验证与文本处理 (Validation & Parsing)

- **数据验证**: 
  - **Zod** 和 **Typia**: 提供高性能的运行时类型断言和输入校验。
  - **Standard Schema Spec**: 规范化验证器接口的实现。
- **Markdown 与文本解析**: 
  - **remark / remark-parse**: 解析 Markdown 并构建抽象语法树 (AST)。
  - **gray-matter**: 提取 Markdown 文件的 Front-matter 元数据。
  - **unist-util-visit**: 遍历 Markdown AST，为长文本的语义化分块（Chunking）提供支持。

## 工具链与构建 (Toolchain)

- **Biome**: 极速的 Rust 编写的 Lint 与代码格式化工具，替代了传统的 ESLint + Prettier。
- **Tsup**: 基于 esbuild 的轻量级打包器，负责将 TypeScript 编译打包。
- **pnpm**: 使用 pnpm workspace 管理依赖和本地包结构。
