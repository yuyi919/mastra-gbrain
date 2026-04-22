# 外部集成 (Integrations)

GBrain (`mastra-gbrain`) 是一个知识获取和复合的自动化系统。系统利用多种外部服务将数据流引入本地大脑，并通过 MCP (Model Context Protocol) 暴露给外部 AI 助手进行查询。本列表重点分析了支持与集成的 3rd-party APIs、外部服务和数据库。

## 核心数据源与网关 (Data Sources & Gateways)

GBrain 通过 "诀窍 (Recipes)" 技能包描述并对接外部服务，将新数据提取为本地的知识节点（Markdown 页面和 Chunk）：

- **Google Workspace** (通过 Credential Gateway):
  - **Gmail API**: 分流收件箱邮件，提取发件人、公司及邮件上下文信息并同步到本地（Email-to-Brain）。
  - **Google Calendar API**: 摄取日历事件转化为每日事件节点，并在会议前自动触发准备简报（Calendar-to-Brain）。
  - **Google Contacts**: 连接人际关系图谱。

- **Twitter / X API**:
  - 用于监控账户的提及 (Mentions)、用户参与度 (Engagement) 和发帖历史（X-to-Brain），并捕获推文与媒体素材同步到本地知识库。

## 通讯与会议分析 (Communication & Meeting Analysis)

- **Twilio API**:
  - 提供电话线路接入。通过路由电话（Voice-to-Brain），系统在接听前在本地知识库搜索，识别陌生来电者并将对话内容保存为大脑节点。

- **会议录音与转录服务 Webhooks**:
  - **Circleback**: 通过 Webhooks 摄取会议转录文本，自动生成会议页面（Meeting Sync），并将会议见解链接到参与的联系人和公司页面。
  - **Quo (OpenPhone)**: 摄取通话转录，将文字记录作为上下文节点加入大脑。

## 外部大模型与 AI 接口 (External LLMs & AI APIs)

虽然系统本地依赖 `node-llama-cpp` 进行文本嵌入（Embedding）与搜索重排，但也需要与外部的高级模型交互，以提供复杂的代理和实时交互能力。

- **OpenAI API** (如 GPT-4o-mini 和 Realtime API):
  - **Agent 决策核心**: Mastra Agent 使用其进行多步骤推理与意图理解。
  - **实时语音 API**: 配合 Twilio 提供低延迟的 Voice-to-Brain 语音交互体验。

- **Claude Desktop / Claude Cowork**:
  - 核心集成目标之一。通过 MCP 协议，将本地知识库的搜索、管理功能暴露给 Claude 等兼容的桌面客户端，提供上下文感知的知识对话。

## 基础设施与隧道 (Infrastructure & Tunnels)

- **Ngrok**:
  - 为本地运行的 GBrain 服务器提供安全的公共隧道，将其暴露给外部的 Webhooks 服务（例如 Circleback, Quo, Twilio），从而实现实时数据的被动摄取和外部服务的反向调用。

## 数据库与持久化 (Databases)

GBrain 遵循"本地优先"（Local-first）原则，但可以支持跨设备的底层存储系统同步。

- **Turso / libSQL**:
  - 高性能的 SQLite 分支（原生支持向量数据扩展）。项目通过 `@mastra/libsql` 模块直接在本地提供离线的全文搜索和向量搜索，并在必要时连接云端的 Turso 数据库以实现多设备同步。
