# 待办事项 (TODOS)

## 第一季度 (Q1)

### 跨文件批处理嵌入队列
**内容:** 一个共享的嵌入队列，收集来自所有并行导入工作线程 (workers) 的块 (chunks)，并以 100 个为一批刷新到 OpenAI，而不是每个工作线程独立进行批处理。
**原因:** 当 4 个工作线程正在导入文件（平均每个文件 5 个块）时，你会得到 4 个小批量（5-10 个块）的并发 OpenAI API 调用。共享队列可以将跨工作线程的 100 个块批处理到单个 API 调用中，从而将嵌入成本和延迟减半。
**优点:** 更少的 API 调用（500 个块 = 5 次调用，而不是约 100 次），更低的成本，更快的嵌入速度。
**缺点:** 增加了协调的复杂性：队列满时的背压 (backpressure)、错误归因回源文件、工作线程暂停。中等实施工作量。
**上下文:** 在工程审查期间被推迟，因为每个工作线程的嵌入更简单，并且并行工作线程本身具有更大的速度优势（网络往返）。在分析了实际的导入工作负载后重新考虑，以确认嵌入实际上是瓶颈。如果大多数导入使用 `--no-embed`，那么这就没那么重要了。
**实现草案:** `src/core/embedding-queue.ts` 带有基于 Promise 的信号量 (semaphore)。工作线程 `await queue.submit(chunks)`，当队列有空间时解析。队列以 100 个为一批刷新到 OpenAI，最多 2-3 个并发 API 调用。跟踪每个块的源文件以进行错误传播。
**依赖:** 第 5 部分（带每个工作线程引擎的并行导入）——已发布。

## P0

### 修复 PGLite 的 `bun build --compile` WASM 嵌入
**内容:** 向 oven-sh/bun 提交 PR，修复 `bun build --compile` 中嵌入 WASM 文件的问题 (issue oven-sh/bun#15032)。
**原因:** PGLite 的 WASM 文件（约 3MB）无法嵌入到编译后的二进制文件中。通过 `bun install -g gbrain` 安装的用户没有问题（WASM 从 node_modules 解析），但编译后的二进制文件在使用 PGLite 时会崩溃。Jarred Sumner（Bun 创始人，YC W22）可能会乐意合并。
**优点:** 单一二进制分发包含 PGLite。不需要辅助文件。
**缺点:** 需要了解 Bun 的打包器内部机制。可能是一个大型 PR。
**上下文:** 该问题自 2024 年 11 月起存在。根本原因是 `bun build --compile` 生成了 PGLite 无法解析的虚拟文件系统路径 (`/$bunfs/root/...`)。多名用户报告了此问题。修复此问题将使任何依赖 WASM 的包受益，而不仅仅是 PGLite。
**依赖:** PGLite 引擎发布（为 PR 提供实际用例）。

### ChatGPT MCP 支持 (OAuth 2.1)
**内容:** 将带有动态客户端注册的 OAuth 2.1 添加到自托管 MCP 服务器，以便 ChatGPT 可以连接。
**原因:** ChatGPT 要求 MCP 连接器使用 OAuth 2.1。不支持 Bearer 令牌认证。这是唯一一个不能远程使用 GBrain 的主流 AI 客户端。
**优点:** 兑现了“每个 AI 客户端”的承诺。ChatGPT 拥有最大的用户群。
**缺点:** OAuth 2.1 是一项重要的实现：授权端点、令牌端点、PKCE 流程、动态客户端注册。预计耗时：约 3-4 小时。
**上下文:** 在 DX 审查期间发现 (2026-04-10)。所有其他客户端（Claude Desktop/Code/Cowork、Perplexity）都使用 Bearer 令牌。边缘函数部署在 v0.8.0 中被移除。需要将 OAuth 添加到自托管 HTTP MCP 服务器（或实施时的 `gbrain serve --http`）。
**依赖:** `gbrain serve --http`（尚未实现）。

## P1 (v0.7.0 新增)

### ~~第三方诀窍的受限 health_check DSL~~
**已完成:** v0.9.3 (2026-04-12)。具有 4 种检查类型（`http`、`env_exists`、`command`、`any_of`）的类型化 DSL。所有 7 个第一方诀窍已迁移。接受字符串形式的健康检查并附带弃用警告 + 针对非内置诀窍的元字符验证。

## P2

### 社区诀窍提交 (`gbrain integrations submit`)
**内容:** 将用户的自定义集成诀窍打包为 GBrain 仓库的 PR。验证前言 (frontmatter)，检查受限 DSL `health_checks`，使用模板创建 PR。
**原因:** 将 GBrain 从“Garry 的集成”转变为社区生态系统。诀窍格式就是贡献格式。
**优点:** 社区驱动的集成库。用户可以构建 slack-to-brain、rss-to-brain、discord-to-brain。
**缺点:** 支持负担。在接受第三方诀窍之前需要受限 DSL (P1)。需要对诀窍质量进行审查。
**上下文:** 来自 CEO 审查 (2026-04-11)。由于带宽限制，用户明确推迟。目标为 v0.9.0。
**依赖:** 受限 `health_check` DSL (P1) — **已在 v0.9.3 中发布。**

### 永远在线的部署诀窍 (Fly.io, Railway)
**内容:** 用于 voice-to-brain 及未来集成的替代部署诀窍，运行在云服务器而不是 local+ngrok 上。
**原因:** ngrok 免费 URL 是短暂的（重启时会改变）。永远在线的部署消除了看门狗的复杂性并提供稳定的 webhook URL。
**优点:** 稳定的 URL，无 ngrok 依赖，生产级正常运行时间。
**缺点:** 每次集成每月花费 $5-10。需要云帐户。
**上下文:** 来自 DX 审查 (2026-04-11)。v0.7.0 发布了 local+ngrok 作为 v1 部署路径。
**依赖:** v0.7.0 诀窍格式（已发布）。

### `gbrain serve --http` + Fly.io/Railway 部署
**内容:** 添加 `gbrain serve --http` 作为 stdio MCP 服务器周围的瘦 HTTP 包装器。包含用于云部署的 Dockerfile/fly.toml。
**原因:** 边缘函数部署在 v0.8.0 中被移除。远程 MCP 现在需要围绕 `gbrain serve` 构建自定义 HTTP 包装器。内置的 `--http` 标志将使此过程毫不费力。Bun 原生运行，无打包缝隙，无 60 秒超时，无冷启动。
**优点:** 更简单的远程 MCP 设置。用户在 ngrok 后面运行 `gbrain serve --http`，而不是构建自定义服务器。支持所有 30 个远程操作（包括 `sync_brain` 和 `file_upload`）。
**缺点:** 用户需要 ngrok（$8/月）或云主机（Fly.io $5/月，Railway $5/月）。并非零基础设施。
**上下文:** Wintermute 的生产部署使用自定义 Hono 服务器包装 `gbrain serve`。此 TODO 将该模式形式化到 CLI 中。ChatGPT OAuth 2.1 支持依赖于此。
**依赖:** v0.8.0（已发布，移除了边缘函数）。

## 已完成

### 为 S3 存储后端实现 AWS Signature V4
**已完成:** v0.6.0 (2026-04-10) — 替换为 `@aws-sdk/client-s3` 以进行正确的 SigV4 签名。