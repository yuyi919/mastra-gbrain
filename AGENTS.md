# AGENTS（交接上下文）

本文档用于在切换到新的 Agent 环境时，快速提供本仓库的必要上下文、当前状态与关键约束。

## 项目是什么
- 本仓库是 `mastra-gbrain`：使用 Bun + TypeScript + Mastra 实现的本地优先知识库（对齐上游 `garrytan/gbrain`），底层存储为 SQLite/LibSQL（FTS5 + 向量检索）。
- 主要能力：导入 Markdown → 分块 → 生成 embedding → 写入 SQLite + 向量索引 → 混合检索（关键词 + 向量）→ 工具化给 Agent 使用。

## 关键目录
- `src/store/`：存储实现与接口抽象（核心是 [libsql.ts](./src/store/libsql.ts) 与 [interface.ts](./src/store/interface.ts)）。
- `src/ingest/`：导入工作流（[workflow.ts](./src/ingest/workflow.ts)）。
- `src/search/`：混合检索与排序（[hybrid.ts](./src/search/hybrid.ts)、[rrf.ts](./src/search/rrf.ts)）。
- `src/tools/`：Mastra tools（search/ingest/page/links/timeline/import 等），Agent 通过 tools 访问能力。
- `src/scripts/`：运维脚本（doctor/embed/backlinks/import）。
- `test/`：单元/集成测试与 fixtures（数据库路径统一在 `./tmp/`）。
- `.trae/specs/`：Spec 驱动开发产生的规范、任务与检查表（历史决策依据）。
- `references/`：从上游仓库同步并翻译的文档（说明见 [references/AGENTS.md](./references/AGENTS.md)）。

## 重要架构约束（必须遵守）
- 禁止 SQL/ORM 内核泄露到 store 之外：外部脚本/工具只通过 `StoreProvider` 方法访问数据库能力（[interface.ts](./src/store/interface.ts)）。
- 默认使用工厂函数与依赖注入（DI），禁止静态单例硬绑定：默认工厂见 [store/index.ts](./src/store/index.ts)。
- 测试隔离：测试数据库必须落在 `./tmp/`，并通过 `dispose()` 释放资源（[libsql.ts](./src/store/libsql.ts)）。
- 多语言：分词与检索依赖 `Intl.Segmenter`（[segmenter.ts](./src/segmenter.ts)），避免只按空格处理。

## 搜索相关现状（近期关键改动）
- `searchKeyword` 只负责从 FTS5 获取候选并做过滤/limit，不再做复杂去重；SQL 已改为 drizzle-orm QueryBuilder 方式构建（[libsql.ts](./src/store/libsql.ts)）。
- 去重与结果规整统一在混合检索层进行：`dedupResults` 已融合至 [hybrid.ts](./src/search/hybrid.ts)，用于对关键词结果与 RRF 融合后的结果做全局去重与质量控制。
- `SearchResult` 类型为严格结构（字段必填）：`page_id/title/type/chunk_index/token_count/chunk_source/stale` 均必须存在（[types.ts](./src/types.ts)）。
- 向量检索字段一致性：`searchVector` 会对向量命中的 `(slug, chunk_index)` 做 DB 回表（`content_chunks` + `pages`），补齐 `title/type/page_id/token_count/stale` 等字段，避免仅依赖向量库 metadata 导致结构不一致（[libsql.ts](./src/store/libsql.ts)）。

## node-llama-cpp（仅 Embedding + 可选 reranker）
- 已集成本地 embedding provider： [llama-embedder.ts](./src/store/llama-embedder.ts)
  - 目标：在测试/评估场景按输入语言选择 EN/ZH embedding 模型（bge-base-en-v1.5 / bge-base-zh-v1.5，GGUF）。
  - 模型下载不在代码里 fetch，统一使用 CLI：`bunx -y node-llama-cpp pull --dir ./tmp/models <model-url>`（见 [llama_embedder.test.ts](./test/llama_embedder.test.ts)）。
- 默认 embedder 工厂支持通过环境变量切换（Dummy / Llama）：[store/index.ts](./src/store/index.ts)
  - `GBRAIN_EMBEDDER=dummy|llama|node-llama-cpp|local`
  - `GBRAIN_LLAMA_EMBED_MODEL_EN=/abs/path/to/en.gguf`
  - `GBRAIN_LLAMA_EMBED_MODEL_ZH=/abs/path/to/zh.gguf`
- 可选 reranker 探索： [llama-reranker.ts](./src/search/llama-reranker.ts)
  - 可选测试默认 skip，仅在提供 `GBRAIN_LLAMA_RERANK_MODEL_PATH` 时运行：[llama-reranker.optional.test.ts](./test/search/llama-reranker.optional.test.ts)
- 评估过程与注意事项记录在： [execution-record.md](./.trae/specs/evaluate-node-llama-cpp/execution-record.md)

## 如何验证（本仓库默认）
- 安装依赖：`bun install`
- 运行全部测试：`bun test`

## 近期工作流纪律
- 每次 spec/任务落地后：更新文档（如 CLAUDE.md/Spec checklist）+ 运行测试 + 语义化 git commit（不提交任何 secret）。

# Agent Guidelines & Skill Index

Welcome, AI Agent! When you are working on this repository, you must first read and follow the instructions in this index document. This repository uses specific skills and constraints that you must apply to ensure code quality and consistency.

## 📌 Effect v4 (Beta) Constraint & Systematic Skill

This project uses **Effect v4 (Beta)**. It is STRICTLY FORBIDDEN to use Effect v3 syntax. Furthermore, you must systematically adopt the Effect v4 architectural paradigms (such as Context.Service, Layer composition, and Scope management) rather than merely replacing syntax.

### 📚 Knowledge Base (Must Read)
Before writing or modifying any Effect code, please ensure you have read and understood:
- **[Systematic Guide](docs/effect/v4-systematic-guide.md)**: NEW! The core guide on how to architect and write Effect v4 code correctly. Includes best practices on using `Effect.fn`, handling errors with `Schema.TaggedErrorClass`, and Vitest guidelines.
- **[v4 Playbook](docs/effect/v4-playbook.md)**: Contains the core paradigms (Services, Yieldable, Runtime, Error Handling, Forking) and the official migration guide.
- **[Banned Patterns](docs/effect/v4-banned-patterns.md)**: A strict checklist of APIs that are no longer allowed (e.g., `Effect.Tag`, `Effect.catchAll`, native `async/await`).

### 🛠️ Agent Skill Prompt (Must Apply)
When executing tasks related to Effect, you MUST apply the rules and prompt templates defined in:
- **[Agent Skill Rules](docs/effect/effect-v4-agent-skill.md)**

### ✅ Self-Check
After generating your code, ensure it passes the local check script.
You can run the script locally to verify your output:
```bash
./scripts/check-effect-v4.sh
```
If the script fails, you MUST correct your code before submitting.

---

> **Note to Claude Code / Codex:** By reading this file, you acknowledge that you are constrained by the Effect v4 beta rules and its systematic design patterns. Do not rely on your general pre-training knowledge for Effect, as it is highly likely to contain outdated v3 patterns or non-idiomatic imperative code. Always defer to the local `docs/effect/v4-systematic-guide.md`.
