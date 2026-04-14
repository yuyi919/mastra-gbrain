# 想法捕捉：原创、深度和分发 (Idea Capture: Originals, Depth, and Distribution)
## 目标
以确切的措辞、深度的上下文和交叉链接捕捉用户的原创想法，从而使“原创 (originals)”文件夹成为大脑中最有价值的内容。
## 用户得到什么
如果没有这个：在对话中说出的绝妙想法消失了。代理听到了“野心与寿命的比例从未如此失衡”却又忘记了。
有了这个：每一个原创观察都会被逐字捕捉，并交叉链接到塑造它的那些人和想法上，然后评估其发布潜力。你的知识档案随着每一次对话而增长。
## 实现
```
capture_idea(message_text, source_context):

  // 1. 作者测试 —— 这个想法属于哪里？
  if user_generated_the_idea(message_text):
    destination = "brain/originals/{slug}.md"
  elif user_synthesis_of_others(message_text):
    destination = "brain/originals/{slug}.md"  // 综合就是原创
  elif world_concept(message_text):
    destination = "brain/concepts/{slug}.md"
  elif product_or_business_idea(message_text):
    destination = "brain/ideas/{slug}.md"
  elif ghostwritten_by_user(message_text):
    destination = "brain/originals/{slug}.md"  // 在元数据中注明代笔者
  elif article_about_user(message_text):
    destination = "brain/media/writings/{slug}.md"

  // 2. 以确切的措辞捕捉 —— 永远不要转述
  page = create_or_update(destination, {
    content: message_text,          // 逐字记录，不总结
    source: source_context,         // 对话、会议、时刻
    reasoning_path: influences,     // 是什么导致了这个洞见
    depth_context: emotional_nuance // “什么”背后的“为什么”
  })

  // 3. 原创性评分（针对显著的想法）
  if is_notable(message_text):
    rate_originality(page, populations=[
      "general_population", "tech_industry",
      "intellectual_media", "political_establishment"
    ])

  // 4. 交叉链接（强制 —— 没有链接的原创是死的）
  link_to_people(page, mentioned_people)
  link_to_companies(page, mentioned_companies)
  link_to_meetings(page, source_meeting)
  link_to_media(page, influences)
  link_to_other_originals(page, related_ideas)
  link_to_concepts(page, referenced_concepts)

  // 5. 同步
  gbrain sync --no-pull --no-embed
```

### 作者测试
| 信号 | 目的地 |
|--------|-------------|
| 用户产生了想法 | `brain/originals/{slug}.md` |
| 用户对他人想法的独特综合 | `brain/originals/`（综合是原创的） |
| 其他人创造的世界概念 | `brain/concepts/{slug}.md` |
| 产品或商业想法 | `brain/ideas/{slug}.md` |
| 用户代笔的书籍/文章 | `brain/originals/`（在元数据中注明代笔） |
| 关于用户的文章 | `brain/media/writings/` |
### 捕捉标准
**使用用户的确切措辞。 ** 语言即是洞见。
“野心与寿命的比例从未如此失衡”捕捉到了一些“野心与必死性之间的紧张关系”所没有的东西。不要美化它。不要转述。生动的版本才是真实的版本。
**什么算作值得捕捉：**
- 关于世界如何运作的原创观察
- 截然不同的事物之间的新颖联系
- 框架和心智模型
- 模式识别时刻（“我总是在每个 Y 中看到 X”）
- 背后有推理的犀利观点
- 揭示新视角的隐喻
- 关于自己或他人的情感/心理洞察
**什么不（NOT）算作：**
- 日常操作消息（“好的”、“做吧”）
- 没有嵌入观察的纯问题
- 重复代理说过的话
- 确认和反应
### 深度测试
**一个不熟悉用户的人能够阅读这个页面并理解他们不仅仅是“想了什么”，还有“为什么”和“怎么”得出这个结论的吗？ **
如果答案是否定的，它需要更多的深度。包括：
- 推理路径（是什么导致了这个洞见）
- 影响因素（他们在读/看/经历什么）
- 上下文（对话、会议、时刻）
- 情感或心理的细微差别
### 原创性分布评分
对于显着的想法，在不同人群中进行 0-100 的原创性评分：
```markdown
## 原创性分布

- **普通大众:** 72/100 — 大多数人没有遇到过这个框架
- **科技行业:** 45/100 — 在初创圈子里很常见，但对大多数人来说很新颖
- **知识分子/媒体阶层:** 68/100 — 会产生共鸣，但尚未被清晰表达
- **政治建制派:** 82/100 — 对政策思维来说完全陌生

**发布信号:** 强有力的文章候选者。最佳受众：创始人、建设者。
```

这告诉用户哪些想法值得变成文章、演讲或视频，以及哪些受众会觉得它们最新颖。
### 深度交叉链接指令
**没有交叉链接的原创就是死的原创。 ** 这些联系本身就是智能。
每一个原创必须（MUST）链接到：
- 塑造该想法的**人物**
- 想法得以发挥作用的**公司**
- 讨论它的**会议**
- 影响它的**书籍和媒体**
- 与之相连的**其他原创**（想法形成集群）
- 它建立在其之上或挑战它的**概念**
### 显着性过滤
在创建任何实体页面之前，检查显着性：
**为以下情况创建页面：**
- 你认识或具体讨论的人
- 你正在评估、合作或投资的公司
- 你带有个人反应提及的媒体
- 你明确接触过的任何人
**不要为以下情况创建页面：**
- 一般性引用或顺便提及的例子
- 仅提及过你一次的低互动账号
- 纯粹的隐喻（“就像罗马帝国...”）
- 没有后续跟进的一次性遭遇
**决策:** 如果显着且没有页面存在，创建一个完整的带有网络搜索丰富的页面。没有存根。如果你创建一个页面，请把它做好。
## 棘手的地方
1. **综合即原创。 ** 当用户以一种新的方式连接两个现有的想法时，这种综合属于 `brain/originals/`，而不是 `brain/concepts/`。新颖的组合就是洞见，即使组成想法本身并不新颖。
2. **确切的措辞是不可妥协的。 ** 永远不要转述、总结或“清理”用户的语言。 “野心与寿命的比例从未如此失衡”是洞见。 “野心与必死性之间的紧张关系”是一具尸体。捕捉第一个版本。
3. **交叉链接是强制性的，而不是可选的。 ** 一个原创如果不链接到塑造它的人物、公司、会议和概念，那就是一个死的原创。联系就是智能。在认为捕捉完成之前，检查每个原创是否有至少 2 个交叉链接。
## 如何验证
1. **产生一个想法并检查页面。 ** 在对话中说一些原创的话（例如，“如果 markdown 文件实际上是分布式软件会怎样？”）。验证 `brain/originals/{slug}.md` 是用你的确切措辞而不是转述创建的。
2. **检查交叉链接是否存在。 ** 打开新创建的原创页面。它应该至少链接到提到的人物或概念。打开那些链接的页面，并验证它们反向链接到原创页面。
3. **验证深度测试通过。 ** 像陌生人一样阅读捕获的页面。你不仅能理解用户想了什么，还能理解为什么吗？如果缺少推理路径和上下文，则捕获是不完整的。
---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *