# 会议摄取 (Meeting Ingestion)
## 目标
将会议记录（transcripts）转化为大脑页面，该页面会更新每个被提及的实体 —— 与会者、公司、交易和待办事项都在一次传递中传播。
## 用户得到什么
如果没有这个：会议会消失在记忆中，待办事项被遗忘，而且代理完全不知道你上次见到某人时讨论了什么。有了这个：每次会议都是永久记录，丰富了它所接触到的每个人和公司页面，并且用户在每次后续会议前都已经了解了情况。
## 实现
```
on new_meeting_transcript(meeting):
    # 第 1 步：提取完整的文字记录 —— 而不是 AI 摘要
    #   AI 摘要会产生幻觉框架（"双方同意..."）
    #   文字记录才是基本事实
    transcript = fetch_full_transcript(meeting.id)  # 例如，Circleback API
    # 必须有说话者日志化：谁（WHO）说了什么（WHAT）

    # 第 2 步：创建会议页面
    slug = f"meetings/{meeting.date}-{short_description}"
    compiled_truth = agent_analysis(transcript):
        # 门槛之上：代理自己的分析，而不是通用的回顾
        #   - 通过用户的优先事项重新构建
        #   - 标记意外、矛盾、暗示
        #   - 命名真正的决策（而不是表演性的决策）
        #   - 指出未说明或未解决的问题
    timeline = format_diarized_transcript(transcript)
        # 门槛之下：完整的文字记录，仅追加
        #   格式：**说话者** (HH:MM:SS): 话语。

    gbrain put <slug> --content "<compiled_truth>\n---\n<timeline>"

    # 第 3 步：传播到所有实体页面（强制 —— 大多数代理跳过此步）
    for person in meeting.attendees + meeting.mentioned_people:
        gbrain add_timeline_entry <person_slug> \
            --entry "在 '{meeting.title}' 会议上会面，日期 {date}。要点：..." \
            --source "会议笔记 '{meeting.title}', {date}"
        # 如果有新信息出现，更新他们的状态部分
        # 如果相关，为每个人的公司更新公司页面

    for company in meeting.mentioned_companies:
        gbrain add_timeline_entry <company_slug> \
            --entry "在 '{meeting.title}' 中讨论：{what_was_said}" \
            --source "会议笔记 '{meeting.title}', {date}"

    # 第 4 步：提取待办事项
    action_items = extract_action_items(transcript)
    # 添加到任务列表，并注明负责人

    # 第 5 步：反向链接所有内容（双向图）
    for entity in all_entities_mentioned:
        gbrain add_link <slug> <entity_slug>   # 会议 -> 实体
        gbrain add_link <entity_slug> <slug>    # 实体 -> 会议

    # 第 6 步：同步，以便新页面立即可被搜索
    gbrain sync

# 时间表：每天执行 3 次 cron（上午 10 点、下午 4 点、晚上 9 点）以捕捉新会议
# 来源：Circleback (https://circleback.ai) 或任何带有说话者日志化 + API/webhook 访问权限的服务
```

## 棘手的地方
1. **始终提取完整的文字记录，而不是 AI 摘要。 ** AI 摘要会产生框架幻觉 —— 它们会主观编辑什么被“同意”或“决定”，而实际上并没有达成这样的协议。记录说话者的文字记录才是基本事实。
2. **实体传播是大多数代理跳过的步骤。 ** 除非每个与会者的页面、每个被提及的人物的页面以及每个公司的页面都有一个新的时间线条目，否则会议并未被完全摄取。如果没有传播，仅仅一个会议页面是无用的。
3. **被提及的人物不仅仅是与会者。 ** 如果会议讨论了“Brex 的 Sarah 团队”，那么 Sarah 的页面和 Brex 的页面都需要更新 —— 即使 Sarah 不在场。
4. **代理的分析才是价值所在，而不是摘要。 ** “他们讨论了 Q2 目标” 是没有价值的。 “Pedro 拒绝了烧钱率，Diana 没有对时间表做出承诺，而且没有人解决定价差距问题” 才是有效的。
5. **反向链接必须是双向的。 ** 会议页面链接到与会者页面，同时与会者页面链接回会议页面。图谱是双向的。始终如此。
## 如何验证
1. 摄取会议后，运行 `gbrain get meetings/{date}-{slug}`。确认页面在横线之上包含代理的分析，在横线之下包含完整的带说话者标识的文字记录。
2. 对于每个与会者，运行 `gbrain get <attendee_slug>`。检查他们的时间线中是否有引用该会议的新条目，其中包含具体见解（而不仅仅是“参加了会议”）。
3. 挑选一个在会议中提到的公司。运行 `gbrain get <company_slug>`。确认存在引用关于该公司的讨论内容的时间线条目。
4. 运行 `gbrain get_links meetings/{date}-{slug}`。验证所有与会者和实体页面都有反向链接。
5. 运行 `gbrain search "{meeting_topic}"`。确认会议页面出现在搜索结果中（验证同步已运行）。
---
*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *