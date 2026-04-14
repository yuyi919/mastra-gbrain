---
type: essay
title: "Homebrew for Personal AI"
subtitle: "Why Markdown is Code and Your Agent is a Package Manager"
author: Garry Tan
created: 2026-04-11
updated: 2026-04-11
tags: [ai, gbrain, gstack, markdown-is-code, open-source, software-distribution, agents, openclaw]
status: draft-v2
prior: "Thin Harness, Fat Skills"
---

# 个人人工智能自制软件
`brew install` 给你别人的二进制文件。 `npm install` 为您提供其他人的源代码。两者都要求您了解该工具、配置它、集成它、维护它。
如果软件分发的工作方式不同怎么办？如果您可以用简单的英语描述一项功能，将该描述交给人工智能代理，然后代理构建适合您的设置的本机实现，会怎么样？
当 Markdown 是代码时就会发生这种情况。
## Markdown 是代码
这是一个真正的技能文件。这是教人工智能代理筛选电话：
```markdown
# Voice Agent — Your Phone Number

Caller → Twilio → <Stream> WebSocket → Voice Server (port 8765)
                                            ↕ audio
                                      OpenAI Realtime API
                                            ↓ tool calls
                                      Brain / Calendar / Telegram

## Call Routing

Every inbound call routes based on caller phone number + brain lookup:

### Owner → Authenticated Mode
- Send crypto-random 6-digit code to secure channel
- Caller reads it back
- Match → full assistant mode (brain, calendar, scheduling)
- No match → treated as unknown caller

### Known Person, Inner Circle (brain score ≥ 4) → Forward
- Greet by name with brain context
- Transfer to cell
- If no answer (30s timeout), take message
- Text Telegram with who called and context

### Unknown Caller → Screen
- Get their name, look them up in brain
- If inner circle → offer to transfer
- Otherwise → take message
- Create brain entry with phone number (marked UNVERIFIED)
```

那不是伪代码。那不是文档。这是一个工作规范，像 Claude Opus 4.6 这样具有百万个令牌上下文窗口的模型可以读取和实现。架构图告诉它组件。路由表告诉它逻辑。安全模型告诉它限制。代理读取该文件，理解它，并构建 Twilio 集成、WebSocket 服务器、Telegram 机器人挂钩、大脑查找等所有内容，以适应用户已有的任何基础设施。
技能文件是一个方法调用。它需要参数（你的电话号码、你的大脑、你喜欢的消息应用程序）。同样的技巧，不同的论点，不同的实现。程序就是包。该模型是运行时。
## 分配机制
传统的包管理器分发工件：编译的二进制文件、源 tarball、容器映像。消费者运行别人的代码。
GBrain 分发配方：降价文件，以足够的特异性描述功能，以便人工智能代理可以从头开始实现它们。消费者获得本机实现。没有依赖地狱。没有版本冲突。没有可传递的漏洞链。因为没有上游代码。其中描述了要构建什么以及为什么构建。
它的工作原理如下：
1. **构建一个功能。** 实施语音代理、会议摄取管道、电子邮件分类系统、投资尽职调查工作流程等。
2. **GBrain 捕获配方。** 不仅仅是代码。架构、集成点、故障模式、判断调用。编码完整功能的 Markdown 文件。
3. **推送到存储库。** 开源。任何人都可以阅读。
4. **其他人的代理拉取菜谱。** 读取降价。说：“新配方可用：具有来电筛选功能的人工智能语音代理。想要它吗？”用户说是的。代理读取规范并构建它。
无需安装。没有配置向导。没有自述文件。特工阅读了一份文件并弄清楚了。
## 为什么现在有效
这在两年前是行不通的。有两件事发生了变化。
**上下文窗口达到一百万个令牌。** 用于会议摄取的真正技能文件有 200 多行。所谓的丰富技能引用了大脑模式、解析器、引用标准、五个外部 API 和一个交叉链接协议。实现此配方的代理需要同时将所有这些内容保存在工作内存中，同时还要了解用户的现有设置。对于 8K 代币来说，这是不可能的。 128K 时，处于边缘状态。 1M，舒服。
**模型跨越了判断阈值。** 以下是真实丰富配方的片段：
```markdown
## Philosophy

A brain page should read like an intelligence dossier crossed
with a therapist's notes, not a LinkedIn scrape. We want:

- What they believe — ideology, worldview, first principles
- What they're building — current projects, what's next
- What motivates them — ambition drivers, career arc
- What makes them emotional — angry, excited, defensive, proud
- Their trajectory — ascending, plateauing, pivoting, declining?
- Hard facts — role, company, funding, location, contact info

Facts are table stakes. Texture is the value.
```

实现此秘诀的模型必须了解 LinkedIn 抓取和情报档案之间的区别。这是关于哪些信息值得捕获以及如何对其进行加权的判断。 GPT-3 无法做到这一点。 GPT-4 可以做到这一点。 Opus 4.6 做得很好。支持技术是足够智能的模型，可以解释意图，而不仅仅是遵循指令。
## 食谱实际上包含什么
一个好的食谱有五个部分：
**架构。**组件图。什么与什么对话，通过什么协议，通过什么数据流。这是代理首先构建的骨架。
**路由逻辑。**决策树。当 X 发生时，执行 Y。当 Z 失败时，回退到 W。这就是领域知识所在。语音代理配方对呼叫路由进行编码。勤奋秘诀编码了如何处理融资演讲稿、财务模型和股权结构表。会议摄取配方编码了如何将原始记录转化为可操作的情报。
**集成点。** 这会触及哪些外部系统？ Twilio、Telegram、Gmail、Circleback、Slack、GitHub、Supabase 等等。该配方命名了集成；代理根据用户已配置的内容确定如何连接它们。
**需要做出判断。**困难的部分。不是“发送电子邮件”，而是“根据发件人的重要性、时间敏感性以及是否需要做出决定来决定这封电子邮件是否值得向用户展示。”跳过判断调用的方法会产生浅层实现。判断调用是实际值。
**故障模式。**出了什么问题以及如何处理。 “如果 Circleback 令牌过期，请向用户发送消息并要求他们重新连接。不要默默地跳过。” “如果来电显示被欺骗，切勿信任它进行身份验证。通过单独的通道使用质询响应代码。”没有失效模式的配方会产生脆弱的系统。
这是一个真实的例子。这是勤勉配方的检测逻辑：
```markdown
## Detection

Recognize data room materials by:
- PDF filenames: "Data Deck", "Intro Deck", "Cap Table",
  "Financial Model", "Pitch Deck", "Series [A-D]"
- Spreadsheets with tabs: Revenue, Retention, Cohorts,
  CAC, Gross Margin, Unit Economics, ARR
- User saying: "data room", "diligence", "deck", "pitch"
- Context: shared in the Diligence topic
```

这是一个用英语表达的模式匹配器。代理阅读此内容并知道如何对传入文档进行分类。没有正则表达式。没有文件类型配置。只是模式的描述以及模型对给定文档是否匹配的判断。
## 挑选
GBrain 并不是单一的。食谱是独立的。拿走你想要的：
- **语音代理** — 电话筛选、来电显示、大脑查找、消息路由
- **会议摄取** — 记录处理、实体提取、操作项捕获、时间线更新
- **电子邮件分类** — 收件箱清理、优先级分类、草稿回复、安排提取
- **丰富管道** - 来自多个数据源的人员和公司研究，分类为大脑页面
- **尽职处理** — 数据室摄取、PDF 提取、财务模型分析
- **社交监控** — X/Twitter 时间线分析、提及跟踪、叙述检测
- **内容管道** — 想法捕获、链接摄取、文章摘要
每个食谱都是独立的。你的代理人知道你已经拥有什么。 GBrain 每天都会发出 ping 消息：“自上次同步以来三个新食谱。想要吗？”你选。它建立了。
而且因为源代码是英文的，所以分叉是微不足道的。不喜欢语音代理处理未知呼叫者的方式？编辑降价。将“留言”改为“先问三个筛选问题”。行为发生变化是因为规范发生了变化。
## 瘦吊带、胖技能连接
本文为续篇。前传是《薄的束缚，肥的技能》，其中认为 100 倍人工智能生产力的秘密不是更好的模型，而是更好的上下文管理。保持线束细（运行模型的程序）。使技巧发胖（markdown程序编码判断及流程）。
“Markdown 就是代码”是发行版的推论。如果技能是厚重的 Markdown 文件，并且模型足够智能，可以通过 Markdown 实现，那么技能就是可分发的软件。技能文件同时为：
- **文档**供人们阅读
- **执行代理的规范**
- **软件包**用于分发系统
- 最终功能的**源代码**
四件神器合二为一。这就是为什么它与以前的包管理器不同。 `brew install` 将公式与二进制文件与源文档分开。 GBrain 使它们崩溃。降价是全部四个。
## 底层架构
三层，同讲：
**胖技能**在上面。 Markdown 配方编码判断、过程、故障模式和领域知识。这是 90% 的价值所在。这就是分发的内容。
**中间有细线束**。运行模型的程序。文件操作、工具调度、上下文管理、安全执行。大约200行。 OpenClaw 或任何同等产品。线束限制越少，配方可以表达的内容就越多。
**确定性基础**位于底部。数据库、API、CLI。每次都是相同的输入，相同的输出。 SQL 查询、HTTP 调用、文件读取。这些技能描述了何时调用它们；线束执行它们。
将智力提升为技能。将执行向下推入确定性工具。分配技能。这就是整个系统。
## 这意味着什么
当实施成本接近零时，瓶颈就会发生变化。它不再是“我们能建造这个吗？”这是“我们应该建造这个吗？”以及“它到底应该做什么？”
品味、视野和领域知识成为稀缺资源。深入了解呼叫筛选并编写精确配方的人比能够从头开始实施 Twilio 集成的人创造更多价值。秘诀就是实施。
这也意味着最好的人工智能代理设置将默认开源。封闭的、专有的代理配置正在与一个世界竞争，在这个世界中，有人发布一个配方，然后一千个代理在一夜之间实施它。配方以 git 推送的速度传播。护城河是品味，而不是代码。
重新构想的软件分发：包是一个 markdown 文件，运行时是一个足够智能的模型，包管理器是你的 AI 代理，应用程序商店是一个 git 存储库。
`gbrain 安装语音代理`
就是这样。