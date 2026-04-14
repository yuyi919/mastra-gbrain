# 实体检测：在每条消息上运行它
＃＃ 目标
每条入站消息都会被扫描以获取原始思维和实体提及，因此大脑会在每次对话中自动成长。
## 用户得到什么
如果没有这个：代理会回答问题但会忘记一切。你提到
佩德罗在开会，下周经纪人就不知道佩德罗是谁了。
这样：谈话中提到的每个人、公司和想法都会得到一个
大脑页面。下次佩德罗出现时，特工已经有了背景信息。的
脑化合物。
＃＃ 执行
在每条入站消息上生成一个轻量级子代理。不要等待
在回复之前完成。它并行运行。
```
on_every_message(message_text, source_context):

  // 1. SPAWN ASYNC — don't block the response
  spawn_subagent({
    model: "sonnet-class",     // cheap + fast, not opus
    timeout: 120,              // seconds
    task: build_detection_prompt(message_text, source_context)
  })

  // 2. RESPOND TO USER NORMALLY
  // The sub-agent runs in the background
```

### 检测提示
```
build_detection_prompt(text, source):
  return `
SIGNAL DETECTION — scan this message for ideas AND entities:

Message: "${text}"
Source: [Source: User, ${source.topic}, ${source.platform}, ${source.timestamp}]

STEP 1 — IDEAS FIRST (highest priority):
Is the user expressing an original thought, observation, thesis, or framework?

If yes:
  - Create or update brain/originals/{slug}.md
  - Use the user's EXACT phrasing (the language IS the insight)
  - "The ambition-to-lifespan ratio has never been more broken" is better
    than "tension between ambition and mortality"
  - Include [Source: ...] citation with full context

If the idea references a world concept: brain/concepts/{slug}.md
If it's a product/business idea: brain/ideas/{slug}.md

STEP 2 — ENTITIES:
Extract all person names, company names, media titles.

For each entity:
  a. Run: gbrain search "{name}"
  b. If page exists AND new info: append timeline entry
     Format: - YYYY-MM-DD | {what happened} [Source: {who}, {context}, {date}]
  c. If no page AND entity is notable: create page with web enrichment
  d. If page is thin (< 5 lines compiled truth): spawn background enrichment

STEP 3 — BACK-LINKING (mandatory):
For every entity mentioned, add a back-link FROM their page TO this source.
An unlinked mention is a broken brain.
Format: - **YYYY-MM-DD** | Referenced in [{page title}]({path}) — {context}

STEP 4 — SYNC:
Run: gbrain sync --no-pull --no-embed

If nothing to capture, reply "No signals detected" and exit.
`
```

### 知名度过滤
在创建新的实体页面之前，请检查知名度：
```
is_notable(entity):
  // CREATE a page for:
  - People the user knows or discusses with specificity
  - Companies the user is evaluating, working with, or investing in
  - Media the user mentions with personal reaction
  - Anyone the user has explicitly engaged with

  // DON'T create a page for:
  - Generic references or passing examples
  - Low-engagement accounts who mentioned the user once
  - Pure metaphors ("like the Roman Empire...")
  - One-off encounters with no follow-up

  // If notable AND no page: create FULL page (not a stub)
  // If not notable: skip silently
```

### 什么才算是原创思维
|捕捉|不要捕捉 |
|--------|----------------|
|关于世界如何运作的原创观察| “好的”、“做吧”、“当然” |
|不同事物之间的新颖联系|没有观察的纯粹问题|
|框架和心智模型|回应经纪人的话|
|模式识别（“我总是在每个 Y 中看到 X”）|致谢和反应|
|热门观点与推理 |日常操作消息|
|揭示新角度的隐喻 |没有嵌入洞察力的请求 |
### 备案规则
|信号|目的地 |
|--------|-------------|
|用户提出这个想法 | `brain/originals/{slug}.md` |
|用户对他人想法的综合| `brain/originals/`（合成为原创）|
|别人创造的世界概念| `brain/concepts/{slug}.md` |
|产品或经营理念| `brain/ideas/{slug}.md` |
|提到的人 | `brain/people/{slug}.md` |
|提到的公司 | `brain/companies/{slug}.md` |
|媒体引用| `brain/media/{type}/{slug}.md` |
### 反向链接铁律
每个实体提及必须创建一个从实体页面到
来源。这不是可选的。
```
// When message mentions "Pedro" and creates a meeting page:

// 1. Update the meeting page (normal)
brain/meetings/2026-04-10-board-sync.md:
  - Pedro presented Q1 numbers

// 2. ALSO update Pedro's page (back-link)
brain/people/pedro-franceschi.md:
  ## Timeline
  - **2026-04-10** | Presented Q1 numbers at board sync
    [Source: User, board meeting, 2026-04-10]
```

如果没有反向链接，您就无法遍历该图。 “向我展示所有相关内容
to Pedro”仅当 Pedro 的页面链接回每个提及的内容时才有效。
## 棘手的地方
1. **不要阻止对话。** 实体检测异步运行。用户
   应该立即看到响应，而不是等待 2 分钟而子代理
   丰富了5个实体页面。
2. **Sonnet，不是Opus。** 实体检测是模式匹配，而不是深度
   推理。 Sonnet 便宜 5-10 倍，而且速度足够快。使用 Opus 进行
   主要对话。
3. **准确的措辞很重要。** “Markdown 实际上是代码”是一种见解。
   “Markdown 可以当代码使用”是一个总结。捕获第一个版本。
4. **不要创建存根。** 如果您创建了一个页面，请确保它良好。运行一个网络
   搜索，构建编译的事实，添加上下文。一个存根页面只有
   有名字比没有页面更糟糕（它会带来虚假的信心）。
5. **创建前进行去重。** 在创建页面之前始终进行“gbrain search”。
   不同的拼写、昵称和公司缩写会导致重复。
   “Pedro Franceschi”和“Pedro”可能是同一个人。
## 如何验证
1. **发送一条消息提及某人。** 说“我和 Sarah Chen 喝咖啡
   今天来自 Acme Corp。”验证：brain/people/sarah-chen.md 已创建或
   已更新，brain/companies/acme-corp.md 已创建或更新，两者都有
   带有今天日期的时间线条目。
2. **发送一条带有原创想法的消息。** 说“如果我们可以分发
   软件作为代理执行的降价文件？”验证：
   Brain/originals/{slug}.md 是根据您的确切措辞创建的。
3. **检查反向链接。** 打开 Sarah Chen 的页面。应该有一个时间表
   条目链接回今天的对话。打开 Acme Corp 的页面。相同的。
4. **发送一条无聊的消息。** 说“好吧，听起来不错。”验证：什么都没有
   创建的。检测器应报告“未检测到信号”。
5. **检查重复项。** 提及“Pedro”，然后提及“Pedro Franceschi”。
   验证：一页，而不是两页。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*