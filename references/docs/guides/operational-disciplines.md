# 操作纪律
## 目标
将生产大脑与演示区分开来的五个不可协商的规则——信号检测、大脑优先查找、每次写入后同步、每日心跳和每晚做梦周期。
## 用户得到什么
如果没有这个：代理会错过对话中的信号，当大脑已经有了答案时，会在外部 API 上浪费金钱，在写入后使搜索结果变得陈旧，并让大脑静静地腐烂。这样：每条消息都会被扫描以查找实体，总是首先咨询大脑，搜索始终是最新的，每天监控健康状况，并且大脑会在夜间进行复合。
＃＃ 执行
```
# DISCIPLINE 1: Signal Detection on Every Message (MANDATORY)
on every_inbound_message(message):
    # No exceptions. If the user thinks out loud and the brain doesn't
    # capture it, the system is broken. This is the #1 discipline.

    entities = detect_entities(message)
    #   people, companies, deals, original ideas

    for entity in entities:
        existing = gbrain search "{entity.name}"
        if existing:
            gbrain add_timeline_entry <entity_slug> \
                --entry "{what_was_said}" \
                --source "User, direct message, {timestamp}"
        # else: flag for enrichment if important enough

    originals = detect_original_thinking(message)
    for idea in originals:
        gbrain put originals/{slug} --content "{user's exact phrasing}"

# DISCIPLINE 2: Brain-First Lookup Before External APIs (MANDATORY)
on information_needed(topic):
    # ALWAYS check the brain before reaching for the web
    brain_result = gbrain search "{topic}"
    if brain_result:
        page = gbrain get <slug>
        # Use brain data first. External APIs FILL GAPS, not replace.
    else:
        # Brain has nothing -- now use external APIs
        external_result = brave_search("{topic}")

    # An agent that reaches for the web before checking its own brain
    # is wasting money and giving worse answers.

# DISCIPLINE 3: Sync After Every Write (MANDATORY)
on brain_write_complete():
    gbrain sync
    # Without this, search results are stale.
    # The page you just wrote won't appear in gbrain search or gbrain query
    # until sync runs. Skipping this means the next lookup misses the
    # most recent data.

# DISCIPLINE 4: Daily Heartbeat Check
on daily_schedule("09:00"):
    gbrain doctor
    # Checks: database connectivity, embedding health, sync status,
    # page count, stale pages, broken links
    # If doctor reports issues, fix them before doing anything else.

# DISCIPLINE 5: Nightly Dream Cycle
on nightly_schedule("02:00"):
    # The dream cycle is the most important discipline.
    # The brain COMPOUNDS overnight.

    # 5a: Entity sweep -- find unlinked mentions
    pages = gbrain list_pages
    for page in pages:
        mentions = extract_entity_mentions(page.content)
        existing_links = gbrain get_links <page.slug>
        for mention in mentions:
            if mention not in existing_links:
                gbrain add_link <page.slug> <mention_slug>  # fix broken graph

    # 5b: Citation audit -- find facts without sources
    for page in pages:
        facts_without_sources = audit_citations(page.content)
        if facts_without_sources:
            flag_for_remediation(page, facts_without_sources)

    # 5c: Memory consolidation -- update compiled truth from timeline
    for page in stale_pages(older_than="7d"):
        timeline = gbrain get_timeline <page.slug>
        if timeline.has_new_entries_since_last_consolidation:
            # Re-synthesize compiled truth from accumulated timeline
            updated_truth = consolidate(page.compiled_truth, timeline.new_entries)
            gbrain put <page.slug> --content updated_truth

    # 5d: Sync everything
    gbrain sync

# BONUS: Durable Skills Over One-Off Work
# If you do something twice, make it a skill + cron.
#   1. Concept the process
#   2. Run it manually for 3-10 items
#   3. Revise -- iterate on quality
#   4. Codify into a skill
#   5. Add to cron -- automate it
# Each entity type and signal source has exactly one owner skill.
# Two skills creating the same page = coverage violation.
```

## 棘手的地方
1. **梦想周期是最重要的纪律。** 大脑在一夜之间复合。实体扫描修复损坏的图表，引文审计捕获无来源的事实，内存整合使编译后的事实保持最新。跳过做梦周期，大脑就会慢慢腐烂。
2. **跳过规则 3（写入后同步）意味着过时的搜索结果。** 您编写一个页面，然后立即搜索它 - 但什么也得不到。该页面存在但未编入索引。写入后始终同步。
3. **信号检测必须针对每条消息触发。**不仅仅是看起来重要的消息。用户顺便说“我昨天与佩德罗谈论了董事会席位”——这是佩德罗页面上的时间线条目，是对他的州部分的潜在更新，也是有关董事会的信号。如果代理没有捕捉到它，系统就会崩溃。
4. **大脑优先可以节省资金并提供更好的答案。** 大脑拥有外部 API 所没有的上下文：关系历史记录、会议记录、用户自己的评估。对“Pedro Franceschi”的 API 查找会返回 LinkedIn 个人资料。大脑返回包括私人背景在内的完整图片。
5. **`gbrain doctor` 捕获静默故障。** 嵌入管道可能会停止，同步可能会静默失败，数据库连接可能会断开。每日心跳会在这些问题复合导致数据丢失之前捕获它们。
## 如何验证
1. 发送一条消息，提及一个有脑子的人页面。确认代理检测到实体并将时间线条目添加到其页面（`gbrain get_timeline <slug>`）。
2. 向特工询问大脑中某个人的情况。在访问外部 API 之前，请确认它运行“gbrain search”或“gbrain get”（检查工具调用顺序）。
3. 使用“gbrain put”编写一个新页面，然后立即对其运行“gbrain search”。确认它出现在结果中（验证同步运行）。
4.运行“gbrain doctor”。确认它返回包含数据库状态、页数和任何标记问题的运行状况报告。
5. 梦想循环运行后，检查具有未链接实体提及的页面。确认添加了新链接（`gbrain get_links <slug>`）。
---
*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*