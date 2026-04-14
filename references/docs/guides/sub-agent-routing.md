# 子代理模型路由
＃＃ 目标
将子代理路由到能够完成这项工作的最便宜的模型，在不牺牲质量的情况下节省 10-40 倍的成本。
## 用户得到什么
如果没有这个：每个子代理都在 Opus 上运行（15 美元/MTok）。实体检测开启
每条消息的费用为 3-5 美元/天。每个研究任务花费 10 美元以上。
这样：实体检测在 Sonnet 上运行（3 美元/MTok，便宜 5 倍）。研究
在 DeepSeek 上运行（0.50 美元/MTok，便宜 30 倍）。主要会议在 Opus 上停留时间为
质量。总成本下降 70-80%。
＃＃ 执行
### 路由表
|任务类型 |推荐型号 |为什么 |
|------------|------------------|-----|
|主会议/复杂说明 | Opus 级（默认）|最佳推理和说明如下 |
|研究/合成/分析| DeepSeek V3 或同等产品 |便宜 25-40 倍，探索性工作强劲 |
|结构化输出/长上下文 |大上下文模型（Qwen、Gemini）| 200K+ 上下文，可靠的 JSON 输出 |
|快速轻量级分代理|快速推理模型（Groq）| 500 tok/s，便宜，适合快速任务 |
|深度推理（谨慎使用）|推理模型（DeepSeek-R1、o3）|最适合解决难题，但价格昂贵 |
|实体检测（信号检测器）|十四行诗级|检测速度快、价格便宜、质量足够 |
### 信号检测器模式
在每条入站消息上生成一个轻量级子代理。这是强制性的。
```
on_every_message(text):
  // Spawn async — don't block the response
  spawn_subagent({
    task: `SIGNAL DETECTION — scan this message:
    "${text}"

    1. IDEAS FIRST: Is the user expressing an original thought?
       If yes -> create/update brain/originals/ with EXACT phrasing
    2. ENTITIES: Extract person names, company names, media titles
       For each -> check brain, create/enrich if notable
    3. FACTS: New info about existing entities -> update timeline
    4. CITATIONS: Every fact needs [Source: ...] attribution
    5. Sync changes to brain repo`,
    model: "sonnet-class",  // fast + cheap
    timeout: 120s
  })
```

**为什么使用 Sonnet-class 进行检测：** 实体检测是模式匹配，而不是
深刻的推理。 Sonnet 比 Opus 便宜 5-10 倍，并且速度足够快，适合异步
检测。主会话在 Opus 上继续，同时检测并行运行。
### 研究管道模式
对于研究繁重的任务，请使用多模型管道：
```
1. PLANNING (Opus):     Write research brief, identify what to look for
2. EXECUTION (DeepSeek): Sub-agent does the actual research (web, APIs, docs)
3. SYNTHESIS (Opus):     Read research output, add strategic analysis
```

**为什么这样做：** 规划和综合步骤需要品味和判断
（作品）。执行步骤是机械数据收集（DeepSeek at 25-40x
成本更低）。您可以以 DeepSeek 级别的成本获得 Opus 质量的输出，成本只需 80%
工作。
### 何时产生子代理
|情况|产卵？ |型号|
|------------|--------|--------|
|每条入站消息 |是（强制）|十四行诗|
|研究请求|是 | DeepSeek 执行 |
|快速查找/事实核查 |是 |快速模型（Groq）|
|复杂分析|否——主会话中的句柄|作品|
|写作/编辑|否——主会话中的句柄|作品|
### 成本优化
主会话在您的最佳模型上运行。其他一切都运行在
可以完成这项工作的最便宜的型号。实践中，60-70%的分代理
工作是实体检测（Sonnet）和研究执行（DeepSeek），
比主会话模型便宜 10-40 倍。
## 棘手的地方
1. **用于检测的 Sonnet，而不是 Opus。** 最常见的错误是运行
   Opus 上的实体检测。检测是模式匹配，而不是深度推理。
   Sonnet 便宜 5-10 倍，而且速度足够快。为主要会议保留 Opus
   推理质量很重要。
2. **不要阻塞主线程。** 子代理必须异步运行。如果
   信号检测器同步运行，用户每次等待30-120秒
   实体检测完成时的消息。产生并忘记。用户看到
   立即回复。
3. **成本优化是乘数的。** 实体检测在每个
   单个消息。如果您以 15 美元/MTok 的价格使用 Opus 进行 50 个以上的检测
   消息/天，每天检测费用为 3-5 美元。 Sonnet 以 $3/MTok 的价格带来
   每天 0.60-1.00 美元。一个多月以来，选错型号花费了 100 多美元
   超过必要的。
## 如何验证
1. **生成信号检测器并检查型号。** 发送消息并验证
   子代理是在 Sonnet 级上生成的，而不是在 Opus 上生成的。检查模型字段
   在子代理配置或日志中。
2. **检查每天的成本。** 使用子代理路由运行一天后，
   将 API 总成本与前一天（不使用路由）进行比较。你
   总成本应该会降低 50-80%。
3. **验证异步执行。** 发送消息并测量响应时间。的
   响应应在 5 秒内到达。如果需要 30 秒以上，
   信号检测器同步运行并阻塞主线程。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*