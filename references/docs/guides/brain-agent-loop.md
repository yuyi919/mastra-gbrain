# 大脑代理循环
＃＃ 目标
每一次谈话都会让大脑变得更聪明。每次大脑查找都会做出反应
更好。循环每天都会复合。
## 用户得到什么
如果没有这个：代理会从陈旧的上下文中回答。你们周一讨论一笔交易，
到了周五，代理人已经忘记了。每一次对话都是从零开始。
有了这个：六个月后，代理对你的世界的了解超出了你的承受能力
在工作记忆中。它永远不会忘记。它永远不会停止索引。
## 循环
```
Signal arrives (message, meeting, email, tweet, link)
  │
  ▼
DETECT entities (people, companies, concepts, original thinking)
  │  → spawn sub-agent (see entity-detection.md)
  │
  ▼
READ: check brain FIRST (before responding)
  │  → gbrain search "{entity name}"
  │  → gbrain get {slug} (if you know it)
  │  → gbrain query "what do we know about {topic}"
  │
  ▼
RESPOND with brain context (every answer is better with context)
  │
  ▼
WRITE: update brain pages (new info → compiled truth + timeline)
  │  → gbrain put {slug} (update page)
  │  → add_timeline_entry (append to timeline)
  │  → add_link (cross-reference to other entities)
  │
  ▼
SYNC: gbrain indexes changes
  │  → gbrain sync --no-pull --no-embed
  │
  ▼
(next signal arrives — agent is now smarter)
```

＃＃ 执行
### 每条入站消息
```
on_message(text):
  // 1. DETECT (async, don't block)
  spawn_entity_detector(text)

  // 2. READ (before composing response)
  entities = extract_entity_names(text)  // quick regex/NER
  context = []
  for name in entities:
    results = gbrain_search(name)
    if results:
      page = gbrain_get(results[0].slug)
      context.append(page.compiled_truth)

  // 3. RESPOND (with brain context injected)
  response = compose_response(text, context)

  // 4. WRITE (after responding, if new info emerged)
  if response_contains_new_info(response):
    for entity in mentioned_entities:
      gbrain_add_timeline_entry(entity.slug, {
        date: today,
        summary: "Discussed {topic}",
        source: "[Source: User, conversation, {date}]"
      })

  // 5. SYNC
  gbrain_sync()
```

### 两个不变量
1. **每次阅读都会提高响应能力。** 如果您回答了有关某个问题的问题
   没有先检查他们的大脑页面的人，你给出了一个更糟糕的答案
   比你能拥有的。大脑几乎总是有东西。外部API
   填补空白，他们不是从头开始。
2. **每次写入都会改善未来的阅读。** 如果提到会议记录
   有关公司的新信息，但您没有更新公司页面，
   你创造了一个缺口，这个缺口稍后会咬住你。
## 棘手的地方
1. **在回复之前阅读，而不是之后阅读。** 诱惑是先回复
   稍后更新大脑。但大脑环境使反应更好。
   首先阅读。
2. **不要跳过写入步骤。** “我稍后会更新大脑”意味着从不。
   谈话结束后，趁上下文新鲜的时候立即写下来。
3. **每次写入批次后同步。** 不同步时，大脑搜索索引为
   陈旧的。下一个查询将找不到您刚刚编写的内容。
4. **外部 API 是后备 API，而不是主要 API。** 之前的 `gbrain search`
   勇敢的搜索。 Crustdata 之前的“gbrain get”。大脑有关系
   历史记录、您自己的评估、会议记录、交叉引用。
   没有外部 API 可以提供这一点。
## 如何验证它是否有效
1. **提及大脑认识的一个人。** 问“我们对{name}了解什么？”
   代理应该搜索大脑并返回编译后的真相，而不是产生幻觉
   或者进行网络搜索。
2. **讨论有关已知实体的新内容。** 说“我听说 Acme Corp
   刚刚筹集了 B 轮资金。”对话结束后，检查：Acme Corp 是否
   大脑页面有新的时间线条目吗？
3. **一天后询问同一个人。** 代理人应立即
   无需您询问即可提取大脑上下文。如果它不涉及大脑
   页，循环未运行。
4. **检查同步。** 对话后，运行 `gbrain search "{topic}"`
   来自 CLI。新信息应该是可搜索的。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[实体检测](entity-detection.md)、[大脑优先查找](brain-first-lookup.md)*