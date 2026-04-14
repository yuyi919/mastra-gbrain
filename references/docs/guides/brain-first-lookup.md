# 大脑优先查找协议
＃＃ 目标
在调用任何外部 API 之前先检查一下大脑。大脑几乎总是有
某事。外部 API 填补了空白，它们并不是从头开始。
## 用户得到什么
如果没有这个：代理会呼叫 Brave Search 寻找与您进行过 12 次会面的人。
您会得到 LinkedIn 摘要，而不是您的关系历史记录。
这样：代理会提取您编译的真相、最近的时间线条目，以及
在做其他事情之前共享上下文。外部 API 只能填补空白。
＃＃ 执行
```
lookup(name_or_topic):
  // STEP 1: Keyword search (fast, works day one, no embeddings needed)
  results = gbrain search "{name_or_topic}"
  if results.length > 0:
    page = gbrain get {results[0].slug}
    return page  // done, brain had it

  // STEP 2: Hybrid search (needs embeddings, finds semantic matches)
  results = gbrain query "what do we know about {name_or_topic}"
  if results.length > 0:
    page = gbrain get {results[0].slug}
    return page

  // STEP 3: Direct slug (if you know or can guess the slug)
  page = gbrain get "people/{slugify(name_or_topic)}"
  if page: return page

  // STEP 4: External API (FALLBACK ONLY)
  // Only reach here if brain has nothing
  return external_search(name_or_topic)
```

**这是强制性的。** 在检查大脑之前调用 Brave Search 的代理
浪费金钱并给出更糟糕的答案。
## 为什么大脑优先
大脑具有外部 API 无法提供的上下文：
- 关系历史（你如何认识他们，你们讨论过什么）
- 您自己的评估（您对他们的看法，而不是他们的 LinkedIn 简介）
- 会议记录（说什么，决定什么）
- 交叉引用（他们认识谁，他们与哪些公司有联系）
- 时间线（最近发生了什么变化，趋势是什么）
LinkedIn 上的信息可以告诉你他们的职位。大脑给你：“共同创立
Brex，你和他喝了3次咖啡，最后一次讨论了支付基础设施
论文，他对你对人工智能代理的看法感兴趣。”
## 棘手的地方
1. **首先尝试关键字，然后混合。** 关键字搜索无需嵌入即可工作
   （第一天）。混合搜索需要嵌入，但可以找到语义匹配。尝试一下
   两者按顺序。
2. **模糊slug匹配。** `gbrain get`支持模糊匹配。如果准确的话
   slug 不存在，它建议替代方案。使用此名称变体
   （“佩德罗”→“佩德罗-弗朗西斯奇”）。
3. **不要跳过“简单”问题。** 即使是“Acme Corp 的地址是什么？”
   应该先检查大脑。大脑可能有它，并且查找添加了
   无延迟（关键字搜索 < 100 毫秒）。
4. **加载编译的真相 + 最近的时间线。** 编译的真相为您提供
   30秒内的比赛状态。时间线显示了最近发生的变化。
   两者加在一起=完整的上下文。
## 如何验证
1.询问大脑中的某个人。验证代理首先搜索了大脑
   （检查响应中的工具调用顺序）。
2.询问不在大脑中的人。验证特工搜索了大脑，
   什么也没找到，然后又回到外部搜索。
3.同一问题问两次。第二次应该是即时的（大脑有它）。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[Brain-Agent Loop](brain-agent-loop.md)、[搜索模式](search-modes.md)*