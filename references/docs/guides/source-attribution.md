# 来源归属
## 目标
大脑中的每一个事实都可以追溯到它的来源——谁说的、在什么背景下以及何时说的。
## 用户得到什么
如果没有这个：六个月后，有人读了大脑页面，就不知道“Pedro 共同创立了 Brex”是来自 Pedro 本人、LinkedIn 上的刮擦还是幻觉。这样：每项主张都是可审计的，冲突都会浮出水面，大脑是法庭可接受的现实记录。
＃＃ 执行
```
on brain_write(page, fact):
    # EVERY fact gets a citation -- compiled truth AND timeline
    citation = format_citation(source)
    #   format: [Source: {who}, {channel/context}, {date} {time} {tz}]

    # Category-specific formats:
    if source.type == "direct":
        # [Source: User, direct message, 2026-04-07 12:33 PM PT]
    elif source.type == "meeting":
        # [Source: Meeting notes "Team Sync" #12345, 2026-04-03 12:11 PM PT]
    elif source.type == "api_enrichment":
        # [Source: Crustdata LinkedIn enrichment, 2026-04-07 12:35 PM PT]
    elif source.type == "social_media":
        # MUST include full URL -- not just @handle
        # [Source: X/@pedroh96 tweet, product launch, 2026-04-07](https://x.com/pedroh96/status/...)
    elif source.type == "email":
        # [Source: email from Sarah Chen re Q2 board deck, 2026-04-05 2:30 PM PT]
    elif source.type == "workspace":
        # [Source: Slack #engineering, Keith re deploy schedule, 2026-04-06 11:45 AM PT]
    elif source.type == "web":
        # [Source: Happenstance research, 2026-04-07 12:35 PM PT]
    elif source.type == "published":
        # [Source: [Wall Street Journal, 2026-04-05](https://wsj.com/...)]
    elif source.type == "funding":
        # [Source: Captain API funding data, 2026-04-07 2:00 PM PT]

    # Attach citation inline with the fact
    gbrain put <slug> --content "...fact [Source: ...]..."

    # When sources conflict, note BOTH -- never silently pick one
    if conflicts_exist(fact, existing_page):
        append_to_compiled_truth(
            "Conflict: Source A says X, Source B says Y. "
            "[Source: A] [Source: B]"
        )

# Source hierarchy for conflict resolution (highest authority first):
SOURCE_PRIORITY = [
    "User direct statements",      # 1 -- always wins
    "Primary sources",             # 2 -- meetings, emails, direct conversations
    "Enrichment APIs",             # 3 -- Crustdata, Happenstance, Captain
    "Web search results",          # 4
    "Social media posts",          # 5
]
```

## 棘手的地方
1. **编译的真相不能免于引用。** 综合部分中的“Pedro 共同创立了 Brex”需要“[来源：...]”，就像时间线条目一样。大多数代理人都会跳过栏上方的引文。
2. **推文 URL 是强制性的。** 没有 URL 的“[来源：X/@handle tweet，主题，日期]”是一个损坏的引用。当 URL 被省略时，数百个大脑页面最终会出现无法访问的推文引用。始终：“[来源：X/@handle 推文、主题、日期](https://x.com/handle/status/ID)”。
3. **“用户说的”是不够的。** 地点、内容、时间。 “[来源：用户，私信，太平洋时间 2026 年 4 月 7 日下午 12:33]”——不仅仅是“[来源：用户]”。
4. **不要默默地解决冲突。** 当用户说一件事而 API 说另一件事时，请注意两种引用的编译事实中的矛盾。让读者决定吧。
5. **时间线条目也需要来源。** 时间线的每个附加内容都带有出处。没有来源的时间线条目是一个孤立的事实。
## 如何验证
1. 使用“gbrain get <slug>”打开任何大脑页面。阅读栏上方编译的真相部分。每个事实主张都应该有一个内嵌的“[来源：...]”引用。
2. 搜索推文参考：`gbrain 搜索“X/@”`。每个结果都应该有一个完整的 URL，而不仅仅是一个 @handle。
3. 查找包含多个来源数据的页面（例如，通过 API + 在会议中提及的人丰富数据）。确认两个来源均被独立引用。
4. 检查 3 个随机页面上的时间线条目。每个条目都应该有一个带有日期和上下文的来源引用。
5. 查找用户所表述的内容与 API 结果相矛盾的页面。确认矛盾被注意到，而不是默默解决。
---
*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*