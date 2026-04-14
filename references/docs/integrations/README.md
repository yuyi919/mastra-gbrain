# 获取数据：集成

你的大脑只有在有数据流入时才有用。这些“诀窍 (recipes)”教你的 AI 代理如何将外部系统连接到 GBrain，以便知识能够自动复合。

## 核心集成

这些是连接你的主要数据源的基础级集成：

- [凭证网关 (Credential Gateway)](credential-gateway.md) — 如何安全地授权 Gmail、Google 日历和联系人以供你的代理访问。
- [会议和通话 Webhooks (Meeting & Call Webhooks)](meeting-webhooks.md) — 自动将来自 Circleback 和 Quo (OpenPhone) 的文字记录摄取到大脑页面中。

## 数据摄取诀窍

诀窍是胖 markdown 文件（“技能”），它们向你的代理描述端到端的工作流。你的代理读取该文件，配置外部服务，并开始摄取数据。

### 活跃的诀窍

- **[语音到大脑 (Voice-to-Brain)](../recipes/twilio-voice-brain.md)** — 通过 Twilio 和 OpenAI 实时 API 路由电话。在与你通话之前搜索大脑，筛选未知呼叫者，并将对话记录为大脑页面。
- **[电子邮件到大脑 (Email-to-Brain)](../recipes/email-to-brain.md)** — 连接到 Gmail，分流收件箱，并在每封电子邮件包含新信息时提取发件人/公司以丰富大脑。
- **[X 到大脑 (X-to-Brain)](../recipes/x-to-brain.md)** — 监控 Twitter/X 上的提及、参与度和你的发帖历史。捕获已删除的推文并更新媒体大脑页面。
- **[日历到大脑 (Calendar-to-Brain)](../recipes/calendar-to-brain.md)** — 将日历事件转化为每天的每日大脑页面，并在会议前触发准备简报。
- **[会议同步 (Meeting Sync)](../recipes/meeting-sync.md)** — 使用 Circleback webhooks 创建会议页面，并将见解传播给讨论过的每个与会者和公司。

### 基础设施诀窍

- **[Ngrok 隧道 (Ngrok Tunnel)](../recipes/ngrok-tunnel.md)** — 通过安全的公共隧道将你的本地 GBrain MCP 服务器暴露给外部服务（如 Twilio、webhooks 和 Claude Cowork）。

---

*关于为什么我们使用 markdown 文件而不是插件来分发集成的理念，请阅读 [Markdown 技能即诀窍 (Markdown Skills as Recipes)](../ethos/MARKDOWN_SKILLS_AS_RECIPES.md)。*