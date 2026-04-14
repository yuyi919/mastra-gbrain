# 原件文件夹
## 目标
通过准确的措辞、深入的交叉链接和完整的出处来捕捉用户的原始想法——这样智力资本就会复合而不是蒸发。
## 用户得到什么
如果没有这个：用户会在对话中生成一个出色的框架，并在会话结束时消失。六个月后，他们依稀记得这个想法，但找不到它，记不起确切的措辞，也无法追踪是什么影响了它。这样：每一个原创观察、论文、框架和热点都被逐字记录在“大脑/原创/”中，与塑造它的人、公司和媒体交叉链接，并且可以永远搜索。
＃＃ 执行
```
on user_message(message):
    # Detect original thinking in every message
    if contains_original_thinking(message):
        # The authorship test:
        #   User generated the idea?                   -> originals/{slug}.md
        #   User's unique synthesis of someone else's?  -> originals/ (synthesis IS original)
        #   World concept someone else coined?          -> concepts/{slug}.md
        #   Product or business idea?                   -> ideas/{slug}.md

        # Step 1: Use the user's EXACT phrasing for the slug
        #   "meatsuit-maintenance-tax"
        #   NOT "biological-needs-maintenance-overhead"
        #   The vividness IS the concept.
        slug = slugify(user_exact_phrase)

        # Step 2: Create the originals page
        gbrain put originals/{slug} --content """
            # {User's Exact Phrase}

            ## The Idea
            {User's original thinking, captured in their own words.
             Do NOT paraphrase. Do NOT clean up the language.
             The raw phrasing is the intellectual artifact.}

            ## Context
            {What triggered this thinking. Meeting? Article? Conversation?
             Include the source that sparked it.}
            [Source: User, {context}, {date} {time} {tz}]

            ## Connections
            - Related to: [[{person_slug}]] -- {how they connect}
            - Emerged from: [[{meeting_slug}]] -- {what was discussed}
            - Influenced by: [[{book_or_media_slug}]] -- {what resonated}
            - Builds on: [[{other_original_slug}]] -- {how ideas cluster}
        """

        # Step 3: Cross-link to everything that shaped the thinking
        for entity in idea.influences:
            gbrain add_link originals/{slug} <entity_slug>
            gbrain add_link <entity_slug> originals/{slug}

        # Step 4: Sync
        gbrain sync

# What counts as original thinking:
#   - Novel frameworks ("the meatsuit maintenance tax")
#   - Hot takes on someone else's work (synthesis IS original)
#   - Pattern recognition across multiple entities
#   - Predictions or bets about the future
#   - Contrarian positions with reasoning

# What does NOT go in originals/:
#   - Facts about the world (-> entity pages)
#   - Concepts someone else coined (-> concepts/)
#   - Product ideas (-> ideas/)
#   - Preferences (-> agent memory)
```

## 棘手的地方
1. **命名：生动性就是概念。** “肉服维护税”不是“生物需求维护开销”。 “野心债务”而不是“递延职业风险积累”。用户丰富多彩的措辞是智力成果。切勿将其净化为公司用语。
2. **综合是原创的。** 用户对 Peter Thiel 的零到一框架的看法属于“原创/”，而不是“概念/”。原始部分是用户的综合、解释或分歧——即使潜在的想法来自其他人。
3. **没有交叉链接的原创是死原创。** 连接就是智慧。一个关于“野心债务”的想法，如果与体现它的人、讨论它的会议以及影响它的书无关，就只是墓地里的一张纸条。积极交叉链接。
4. **原创形成集群。** 随着时间的推移，用户的想法会相互联系。 “肉服维护税”与“野心债务”相关，与“创始人能源预算”相关。将原件链接到其他原件。集群是用户的世界观。
5. **捕获触发上下文。** 哪些对话、会议、文章或时刻激发了这个想法？对于未来的检索来说，上下文通常与想法本身一样重要。将其包含在页面中。
## 如何验证
1. 在谈话中提出一个原创的想法（例如，“我称之为‘野心债务’问题——你每年推迟做大事，复利就会对你不利”）。使用“gbrain get Originals/ambition-debt”确认新页面出现在“brain/originals/ambition-debt”处。
2. 检查页面的标题和slug 是否使用了用户的准确措辞——而不是经过净化的版本。
3. 运行“gbrain get_links Originals/ambition-debt”。确认相关人员、会议或其他原件存在交叉链接。
4. 表达对其他人想法的看法（例如，“我认为泰尔的逆向问题是错误的，因为……”）。确认它转到“originals/”（合成是原始的），而不是“concepts/”。
5.运行`gbrain搜索“野心债务”`。确认原始页面出现在搜索结果中并且可以被发现。
---
*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*