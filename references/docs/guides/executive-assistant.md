# 虚拟助理模式 (Executive Assistant Pattern)

## 目标
由大脑上下文提供支持的电子邮件分流、会议准备和日程安排 —— 确保每次互动都建立在你们关系的完整历史基础之上。

## 用户得到什么
如果没有这个：代理只是机械地对电子邮件进行分类（“你有 12 封未读”），使用通用的 LinkedIn 简介为你准备会议，并在没有关系背景的情况下安排日程。有了这个：代理在阅读每封电子邮件之前就知道发件人是谁，在每次会议前提供你们的共同历史，并根据关系的温度和未决问题来提示日程安排。

## 实现

```
# 工作流 1：电子邮件分流
on email_batch(emails):
    for email in emails:
        # 第 1 步：在阅读电子邮件正文之前搜索发件人
        #   大脑上下文使分流效果提高 10 倍
        sender_page = gbrain search "{email.sender_name}"
        if sender_page:
            context = gbrain get <sender_slug>
            #   现在你知道了：他们是谁，关系历史，
            #   他们关心什么，未决问题

        # 第 2 步：带着加载的大脑上下文阅读电子邮件
        #   现在的分类是知情的，而不是机械的

        # 第 3 步：带上下文进行分类
        if context.relationship == "inner_circle" or context.has_open_threads:
            priority = "urgent"
        elif context.is_known_entity:
            priority = "normal"
        else:
            priority = "noise"  # 未知发件人，没有大脑页面

        # 第 4 步：带关系上下文起草回复
        if needs_reply(email):
            draft = compose_reply(
                email,
                context=context,           # 他们的大脑页面
                open_threads=context.open_threads,  # 你们正在合作的事情
                relationship=context.relationship   # 语气校准
            )

# 工作流 2：会议准备
on upcoming_meeting(meeting):
    briefing = {}
    for attendee in meeting.attendees:
        # 在大脑中搜索每个与会者
        results = gbrain search "{attendee.name}"
        if results:
            page = gbrain get <attendee_slug>
            briefing[attendee] = {
                "compiled_truth": page.compiled_truth,
                "last_interaction": page.timeline[0],     # 最近一次
                "open_threads": page.open_threads,
                "relationship_temperature": page.relationship,
                "relevant_deals": gbrain get_links <attendee_slug>,
            }
        else:
            briefing[attendee] = "No brain page -- consider enriching"

    # 呈现：共同历史、需要跟进的事项、需要注意的事项
    # "上次你们讨论了 B 轮融资的时间表。Pedro 对
    #  烧钱率感到担忧。这是他公司页面的最新情况。"

# 工作流 3：收件箱处理后的大脑更新
on inbox_cleared():
    for email in processed_emails:
        if email.contained_new_information:
            # 用新信号更新发件人的大脑页面
            gbrain add_timeline_entry <sender_slug> \
                --entry "电子邮件关于：{subject}。关键信息：{extracted_signal}" \
                --source "来自 {sender} 关于 {subject} 的电子邮件，{date}"

            # 同时也更新任何被提及实体的大脑页面
            for entity in email.mentioned_entities:
                gbrain add_timeline_entry <entity_slug> \
                    --entry "{what_was_said_about_them}" \
                    --source "来自 {sender} 的电子邮件，{date}"

# 工作流 4：日程安排提示
on schedule_request(meeting):
    for attendee in meeting.attendees:
        page = gbrain get <attendee_slug>
        if page.last_interaction > 6_weeks_ago:
            nudge("你已经有 {weeks} 周没有和 {attendee} 见面了")
        if page.has_open_threads:
            nudge("{attendee} 有一个关于 {topic} 的未决问题")
        if page.relationship_temperature == "cooling":
            nudge("与 {attendee} 的关系可能需要关注")
```

## 棘手的地方

1. **在阅读电子邮件之前搜索发件人。** 这违反直觉，但至关重要。首先加载大脑上下文意味着你在看到主题行之前就知道他们是谁、你们在一起做什么以及他们关心什么。这种分流是知情的，而不是机械的。
2. **没有大脑页面的未知发件人几乎总是噪音。** 如果 `gbrain search` 对某个发件人没有返回任何内容，他们可能并不重要。除非电子邮件内容发出其他信号，否则归类为低优先级。
3. **会议准备是影响力最大的 EA 工作流。** 用户走进每次会议时都已经了解了每个与会者的情况：最后一次互动、未决问题、关系历史。这就是“你 3 点有个会议”和“你 3 点和 Pedro 有个会议——上次你们讨论了 B 轮融资，他担心烧钱率”之间的区别。
4. **收件箱处理后的大脑更新是大脑复合的地方。** 每封电子邮件都是信号。如果你清空收件箱而不更新大脑页面，信息就丢失了。这是大多数代理跳过的步骤。
5. **日程安排提示需要时间线数据。** “你已经 6 周没有见 Diana 了”只有在通过适当的实体传播（请参阅 meeting-ingestion 指南）摄取了会议页面的情况下才有效。

## 如何验证

1. 为明天的日历运行会议准备。对于每个与会者，确认代理在生成简报之前运行了 `gbrain search` 并加载了他们的大脑页面。
2. 分流 5 封电子邮件。确认代理在分类电子邮件之前在大脑中搜索了每个发件人。
3. 清空收件箱后，使用 `gbrain get <slug>` 检查 2 个发件人的大脑页面。确认添加了包含电子邮件信息的新时间线条目。
4. 检查日程安排建议。确认代理在提示中引用了与会者的大脑页面（最后一次互动日期、未决问题）。
5. 从有大脑页面的人那里发送一封测试电子邮件。确认分流响应引用了他们的关系上下文，而不仅仅是电子邮件内容。

---
*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*