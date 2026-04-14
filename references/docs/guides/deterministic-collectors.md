# 确定性收集器：代码用于数据，法学硕士用于判断
＃＃ 目标
将机械工作（100% 可靠的代码）与分析工作（LLM 判断）分开，以便确定性任务永远不会失败。
## 用户得到什么
如果没有这个：LLM 会生成 Gmail 链接、格式化表格并跟踪状态。
它遵循前 10 个项目的规则，然后在第 11 个项目上放置一个链接。
在提示中写下“无例外”。它仍然失败。 90% 可靠性超过 20
项目意味着每天两次明显的故障。信任被破坏了。
这样：代码可以处理 URL、格式和状态（100% 可靠）。法学硕士
读取预先格式化的数据并添加判断、分类和丰富。
链接永远不会错，因为法学硕士从不生成链接。
＃＃ 执行
```
// The pattern: code collects, LLM analyzes

// STEP 1: Deterministic collector (script, no LLM calls)
collector_run():
  messages = gmail_api.fetch_unread()
  for msg in messages:
    structured = {
      id: msg.id,
      from: msg.sender,
      subject: msg.subject,
      snippet: msg.snippet,
      gmail_link: f"https://mail.google.com/mail/u/?authuser={account}#inbox/{msg.id}",
      gmail_markdown: f"[Open in Gmail]({gmail_link})",
      is_signature: regex_match(msg, DOCUSIGN_PATTERNS),
      is_noise: regex_match(msg, NOISE_PATTERNS),
      is_new: msg.id not in state.seen_ids
    }
    store(structured)
    state.seen_ids.add(msg.id)
  generate_markdown_digest(structured_messages)

// STEP 2: LLM reads the pre-formatted digest
llm_analyze():
  digest = read("data/digests/today.md")  // links already baked in
  classify_urgency(digest)                 // judgment call
  add_commentary(digest)                   // contextual analysis
  run_brain_enrichment(notable_entities)   // gbrain search + update
  draft_replies(urgent_items)              // creative work
  surface_to_user(final_output)            // delivery

// STEP 3: Wire into cron
cron_job():
  collector_run()     // fast, cheap, deterministic
  llm_analyze()       // slower, expensive, creative
```

### 架构
```
+-----------------------------+     +------------------------------+
|  Deterministic Collector    |---->|       LLM Agent              |
|  (Node.js / Python script)  |     |                              |
|                             |     |  - Read the pre-formatted    |
|  - Pull data from API       |     |    digest                    |
|  - Store structured JSON    |     |  - Classify items            |
|  - Generate links/URLs      |     |  - Add commentary            |
|  - Detect patterns (regex)  |     |  - Run brain enrichment      |
|  - Track state (seen/new)   |     |  - Draft replies             |
|  - Output markdown digest   |     |  - Surface to user           |
|                             |     |                              |
|  CODE — deterministic,      |     |  AI — judgment, context,     |
|  never forgets              |     |  creativity                  |
+-----------------------------+     +------------------------------+
```

### 文件结构
```
scripts/email-collector/
├── email-collector.mjs     # No LLM calls, no external deps
├── data/
│   ├── state.json          # Last pull timestamp, known IDs, pending signatures
│   ├── messages/           # Structured JSON per day
│   │   └── 2026-04-09.json
│   └── digests/            # Pre-formatted markdown
│       └── 2026-04-09.md
```

### 模式适用的地方
|信号源|收藏家生成|法学硕士添加 |
|--------------|--------------------|----------|
| **电子邮件** | Gmail 链接、发件人元数据、签名检测 |紧急分类、充实、回复草稿|
| **X/推特** |推文链接、参与度指标、删除检测 |情感分析、叙事检测、内容创意 |
| **日历** |活动链接、与会者列表、冲突检测 |准备简报、来自大脑的会议背景 |
| **松弛** |频道链接、话题链接、提及检测 |优先级分类、行动项提取|
| **GitHub** | PR/问题链接、差异统计、CI 状态 |代码审查背景、优先级评估 |
### 原则
如果一段输出必须存在并且必须正确格式化
时间，用代码生成它。如果一段输出需要判断、上下文，
或创造力，通过法学硕士产生它。不要要求法学硕士同时做这两件事
相同的通行证。
## 棘手的地方
1. **法学硕士忘记了链接——将它们写入代码中。**法学硕士将遵循
   前 10 项的“包含 Gmail 链接”规则，然后默默删除
   就第 11 项而言。再多的即时工程也无法解决概率问题
   对长输出进行格式化。修复：生成中的每个链接
   收集器脚本。 LLM 读取预格式化的 Markdown，其中链接为
   已经嵌入了。它不能忘记它没有生成的东西。
2. **噪声过滤必须是确定性的。** 基于正则表达式的噪声检测
   （时事通讯、自动收据、营销）属于收集器，
   不是法学硕士。法学硕士可能会将时事通讯归类为“可能重要”
   一次运行时，下一次运行时会出现“噪音”。代码对相同的输入进行分类
   每次都以同样的方式。
3. **原子写入可防止损坏。** 收集器写入状态
   文件（`state.json`）跟踪已看到的消息。如果
   脚本在写入过程中崩溃，状态文件可能已损坏。写信给一个
   首先临时文件，然后自动重命名。这也阻碍了LLM
   如果 cron 在收集运行期间触发，则不会读取部分摘要。
## 如何验证
1. **运行收集器并检查每个链接。** 执行收集器脚本
   手动。打开生成的摘要。单击每个“[在 Gmail 中打开]”链接
   （或同等内容）。每个链接都必须解析为正确的项目。如果
   任何链接损坏或丢失，收集器都有错误。
2. **验证噪声过滤是否一致。** 在
   相同的输入数据。噪声分类（is_noise 字段）必须是
   两次都相同。如果它发生变化，概率元素就会泄漏到
   确定性层。
3. **验证LLM读取结构化输出。**运行完整的管道
   （收藏家，然后是法学硕士）。检查 LLM 的分析引用数据
   来自结构化摘要，而不是来自自己的一代。中的链接
   最终输出应与摘要文件中的链接相同。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*