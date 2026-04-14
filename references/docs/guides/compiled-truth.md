# 编译真相+时间线模式
＃＃ 目标
每个大脑页面都有两个区域：编译真理（当前综合，重写为
证据更改）和时间线（仅附加证据跟踪，从未编辑）。
## 用户得到什么
如果没有这个：大脑页面只是附加日志。要了解一个人，就读
200 个时间线条目。答案隐藏在条目 #147 中。
有了这个：汇总的真相可以让您在 30 秒内了解游戏状态。的
时间线就是证据。六个月的条目压缩成一个段落
评估始终是最新的。
＃＃ 执行
### 页面结构
```markdown
---
type: person
title: Sarah Chen
tags: [engineering, acme-corp]
---

## Executive Summary
One paragraph. How you know them, why they matter.

## State
VP Engineering at Acme Corp. Managing 45-person team. Reports to CEO.

## What They Believe
Strong opinions on test coverage. "Ship it when the tests pass, not before."

## What They're Building
Leading the API migration from REST to GraphQL. Target: Q3 completion.

## Assessment
Sharp technical leader. Under-appreciated internally. Watch for signs of burnout.

## Trajectory
Ascending. Likely CTO track if the migration succeeds.

## Relationship
Met through Pedro. Had coffee 3x. Last: discussed API architecture thesis.

## Contact
sarah@acmecorp.com | @sarahchen | linkedin.com/in/sarahchen

---

## Timeline

- **2026-04-07** | Met at team sync. Discussed API migration timeline.
  Seemed energized about GraphQL pivot.
  [Source: Meeting notes, 2026-04-07 2:00 PM PT]
- **2026-04-03** | Mentioned in email re Q2 planning. Taking lead on ops.
  [Source: Gmail, sarah@acmecorp.com, 2026-04-03 10:30 AM PT]
- **2026-03-15** | First meeting. Intro from Pedro. Strong technical background.
  [Source: User, direct conversation, 2026-03-15 3:00 PM PT]
```

### 更新页面
```
update_brain_page(slug, new_info, source):
  page = gbrain get {slug}

  // TIMELINE: always APPEND (never edit existing entries)
  gbrain add_timeline_entry {slug} {
    date: today,
    summary: new_info.summary,
    detail: new_info.detail,
    source: format_source(source)  // [Source: who, channel, date time tz]
  }

  // COMPILED TRUTH: REWRITE (not append)
  // Read the existing compiled truth
  // Integrate new information
  // Write the updated synthesis
  updated_truth = rewrite_compiled_truth(page.compiled_truth, new_info)
  gbrain put {slug} {
    compiled_truth: updated_truth,
    // timeline is NOT passed — it's managed by add_timeline_entry
  }
```

### 规则
|专区 |行动|说明|
|------|--------|-------------|
|真相编译| **重写** |目前综合。当证据改变时改变。 |
|时间轴 | **附加** |证据线索。从未编辑过，仅添加到。 |
**每一个已编译的真相声明都必须追溯到时间线条目。**如果评估
说“内部未得到充分重视”，应该有时间表条目
支持这一主张。
## 棘手的地方
1. **REWRITE 的意思是重写，而不是追加。** 不要在编译时添加新的段落
   真相。使用集成的新信息重写整个部分。老
   不再准确的评估应该更新，而不是保留在一起
   矛盾的新事物。
2. **时间线条目是不可变的。** 切勿编辑时间线条目。如果信息
   结果是错误的，添加一个新条目来纠正它：
   `- 2026-04-10 |更正：Sarah 是工程副总裁，而不是首席技术官。之前的条目是错误的。`
3. **GBrain 搜索权重编译后的真实值更高。** `gbrain query` 返回编译后的结果
   真相块比时间线块具有更高的相关性。这意味着最新鲜的
   合成首先出现在搜索结果中。
4. ** --- 分隔符很重要。** GBrain 在之后使用第一个独立的 `---`
   frontmatter 从时间线中分割COMPILED_TRUTH。以上所有内容均已编译
   事实上，下面的一切都是时间线。
5. **不要跳过评估部分。** 评估就是价值。 “强
   技术领先”是任何 API 都无法提供的。这是您阅读的内容
   人。这就是 Brain Page 比 LinkedIn 更好的原因。
## 如何验证
1. **更新人员页面。** 添加新的会议信息。检查：编译的真相是
   重写（未附加），时间线在顶部有新条目。
2. **搜索此人。** `gbrain 查询“Sarah Chen”`。整理出来的真相
   （当前合成）应该首先出现，而不是随机时间线条目。
3. **检查可追溯性。** 编译事实中的每项主张都应该有一个
   相应的时间线条目。阅读这两部分并验证。
4. **检查不变性。** 更新后，旧的时间线条目应保持不变。
   日期、来源和内容应与原文完全一致。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[来源归因](source-attribution.md)、[实体检测](entity-detection.md)*