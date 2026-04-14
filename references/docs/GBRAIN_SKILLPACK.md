<!-- 技能包版本：0.7.0 -->
<!-- 来源：https://raw.githubusercontent.com/garrytan/gbrain/master/docs/GBRAIN_SKILLPACK.md -->
# GBrain 技能包：AI 代理的参考架构

这是一个参考架构，说明生产级 AI 代理如何使用 gbrain 作为其知识支柱。基于 14,700 多个大脑文件、40 多项技能和 20 多个连续运行的 cron 任务的实际部署模式。

**memex 愿景已实现。** 范内瓦·布什 (Vannevar Bush) 设想了一种设备，个人可以在其中存储所有的书籍、记录和通信，该设备是机械化的，因此可以极其快速和灵活地查阅。GBrain 就是那个设备，只不过是 memex 自己构建的。代理检测实体、丰富页面、创建交叉引用，并自动维护编译后的事实。

下面的每个部分都是一个独立的指南。点击查看完整内容。

---

## 核心模式
基础的读写循环和数据模型。

| 指南 | 涵盖内容 |
|--------|----------------|
| [大脑-代理循环 (Brain-Agent Loop)](guides/brain-agent-loop.md) | 让大脑随着时间的推移不断复合的读写循环 |
| [实体检测 (Entity Detection)](guides/entity-detection.md) | 在每条消息上运行。捕捉原创想法 + 实体提及 |
| [原创文件夹 (Originals Folder)](guides/originals-folder.md) | 捕捉你的想法，而不仅仅是你发现的内容 |
| [大脑优先查找 (Brain-First Lookup)](guides/brain-first-lookup.md) | 在调用任何外部 API 之前，先检查大脑 |
| [编译真相 + 时间线 (Compiled Truth + Timeline)](guides/compiled-truth.md) | 横线之上：当前的综合内容。横线之下：仅追加的证据 |
| [来源归属 (Source Attribution)](guides/source-attribution.md) | 每一个事实都需要引用。格式和层级结构 |

## 数据流水线
获取数据并保持更新。

| 指南 | 涵盖内容 |
|--------|----------------|
| [丰富流水线 (Enrichment Pipeline)](guides/enrichment-pipeline.md) | 7 步协议、层级系统（按重要性分为 1/2/3 层） |
| [会议摄取 (Meeting Ingestion)](guides/meeting-ingestion.md) | 始终提取完整的文字记录，传播到所有实体页面 |
| [内容和媒体摄取 (Content & Media Ingestion)](guides/content-media.md) | YouTube、社交媒体书签、PDF/文档 |
| [尽职调查摄取 (Diligence Ingestion)](guides/diligence-ingestion.md) | 数据室材料：商业计划书、财务模型、股权结构表 |
| [确定性收集器 (Deterministic Collectors)](guides/deterministic-collectors.md) | 代码用于数据，LLM 用于判断。收集器模式 |
| [想法捕捉与原创 (Idea Capture & Originals)](guides/idea-capture.md) | 深度测试、原创性分布、深度交叉链接 |
| [获取数据 (Getting Data In)](integrations/README.md) | 集成诀窍：语音、电子邮件、X (Twitter)、日历 |

## 运营
运行生产级大脑。

| 指南 | 涵盖内容 |
|--------|----------------|
| [参考 Cron 计划 (Reference Cron Schedule)](guides/cron-schedule.md) | 20 多个重复性任务、安静时间、做梦周期 |
| [安静时间与时区 (Quiet Hours & Timezones)](guides/quiet-hours.md) | 在睡眠期间保留通知，时区感知的投递 |
| [虚拟助理模式 (Executive Assistant Pattern)](guides/executive-assistant.md) | 电子邮件分流、会议准备、日程安排提示 |
| [操作纪律 (Operational Disciplines)](guides/operational-disciplines.md) | 信号检测、大脑优先、写入后同步、心跳、做梦周期 |
| [技能开发周期 (Skill Development Cycle)](guides/skill-development.md) | 5 步循环：构思、原型、评估、编纂、cron 化 |

## 架构
如何构建你的系统。

| 指南 | 涵盖内容 |
|--------|----------------|
| [双仓库架构 (Dual-Repo Architecture)](guides/repo-architecture.md) | 代理仓库 vs 大脑仓库、边界规则、决策树 |
| [子代理模型路由 (Sub-Agent Model Routing)](guides/sub-agent-routing.md) | 哪种模型用于哪种任务、信号检测器模式、成本优化 |
| [三种搜索模式 (Three Search Modes)](guides/search-modes.md) | 关键字、混合、直接。何时使用每种模式 |
| [大脑 vs 代理记忆 (Brain vs. Agent Memory)](guides/brain-vs-memory.md) | 3 个层级：GBrain（世界知识）、代理记忆、会话 |

## 集成
连接你的生活。

| 指南 | 涵盖内容 |
|--------|----------------|
| [凭证网关 (Credential Gateway)](integrations/credential-gateway.md) | 用于 Gmail、日历、联系人的 ClawVisor / Hermes |
| [会议与通话 Webhook (Meeting & Call Webhooks)](integrations/meeting-webhooks.md) | Circleback 文字记录 + Quo/OpenPhone 短信/通话 |
| [语音到大脑 (Voice-to-Brain)](../recipes/twilio-voice-brain.md) | 电话 + WebRTC 浏览器通话创建大脑页面。25 种生产模式：身份分离、出价系统、对话计时、主动顾问、提示词压缩、呼叫者路由、动态 VAD、实时文字记录、通话后线束 |
| [电子邮件到大脑 (Email-to-Brain)](../recipes/email-to-brain.md) | Gmail 消息通过确定性收集器流入实体页面 |
| [X-to-Brain](../recipes/x-to-brain.md) | 通过删除检测 + 参与度速率进行 Twitter 监控 |
| [日历到大脑 (Calendar-to-Brain)](../recipes/calendar-to-brain.md) | Google 日历事件变成可搜索的每日大脑页面 |
| [会议同步 (Meeting Sync)](../recipes/meeting-sync.md) | 通过与会者传播自动导入 Circleback 文字记录 |

## 管理
保持系统运行并保持最新。

| 指南 | 涵盖内容 |
|--------|----------------|
| [升级与自动更新 (Upgrades & Auto-Update)](guides/upgrades-auto-update.md) | 检查更新、代理通知、迁移文件 |
| [实时同步 (Live Sync)](guides/live-sync.md) | 保持索引最新：cron、--watch、webhook 方法 |

---

## 附录：GBrain CLI 快速参考

| 命令 | 目的 |
|---------|---------|
| `gbrain search "term"` | 跨所有大脑页面进行关键字搜索 |
| `gbrain query "question"` | 混合搜索（向量 + 关键字 + RRF） |
| `gbrain get <slug>` | 阅读某个 slug 的特定大脑页面 |
| `gbrain sync` | 将本地 markdown 仓库同步到 gbrain 索引 |
| `gbrain import <path>` | 将文件导入大脑 |
| `gbrain embed --stale` | 重新嵌入过时的或缺少嵌入的页面 |
| `gbrain integrations` | 管理集成诀窍（感知 + 反应） |
| `gbrain stats` | 显示大脑统计信息（页面数、上次同步时间等） |
| `gbrain doctor` | 诊断大脑健康问题 |
| `gbrain check-update` | 检查新版本和集成诀窍 |

运行 `gbrain --help` 获取完整的命令参考。

---

## 架构与理念
- [基础设施层 (Infrastructure Layer)](architecture/infra-layer.md) — 导入流水线、分块、嵌入、搜索
- [瘦线束，胖技能 (Thin Harness, Fat Skills)](ethos/THIN_HARNESS_FAT_SKILLS.md) — 架构理念
- [Markdown 技能即诀窍 (Markdown Skills as Recipes)](ethos/MARKDOWN_SKILLS_AS_RECIPES.md) — 为什么 markdown 是代码，而你的代理是包管理器
- [个人 AI 的自制程序 (Homebrew for Personal AI)](designs/HOMEBREW_FOR_PERSONAL_AI.md) — 10 星级愿景
- [推荐架构 (Recommended Architecture)](GBRAIN_RECOMMENDED_SCHEMA.md) — 大脑仓库的目录结构
- [验证运行手册 (Verification Runbook)](GBRAIN_VERIFY.md) — 端到端安装验证