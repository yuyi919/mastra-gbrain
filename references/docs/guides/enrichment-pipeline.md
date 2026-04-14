# 丰富流水线 (Enrichment Pipeline)
## 目标
利用分层支出的外部 API 来丰富大脑页面 —— 对关键人物进行全流水线处理，对顺便提及的人进行轻度处理，保留原始数据以供审计。
## 用户得到什么
如果没有这个：大脑页面只是薄薄的外壳，只有用户手动输入的内容，API 调用浪费在无名小卒身上，丰富的数据在代理会话结束后就消失了。有了这个：关键人物拥有丰富的、多来源的画像；支出按重要性扩展；原始 API 响应被保留以供重新处理；交叉引用连接整个图谱。
## 实现
```
on enrich(entity, trigger):
    # 触发器：会议提及、电子邮件主题、社交互动、用户请求

    # 第 1 步：从输入信号中提取实体
    entities = extract_entities(signal)
    #   人名、公司名、关联

    # 第 2 步：检查大脑状态 —— 是 UPDATE（更新）还是 CREATE（创建）路径？
    for entity in entities:
        existing = gbrain search "{entity.name}"
        if existing:
            page = gbrain get <entity_slug>
            path = "UPDATE"
        else:
            path = "CREATE"

    # 第 3 步：确定层级 —— 按重要性扩展支出
    tier = classify_tier(entity):
        # Tier 1（10-15 次 API 调用）：关键人物、核心圈子、业务合作伙伴、
        #         投资组合公司。全流水线，所有数据源。
        # Tier 2（3-5 次 API 调用）：知名人士、偶尔的互动。
        #         网络搜索 + 社交媒体 + 大脑交叉引用。
        # Tier 3（1-2 次 API 调用）：次要提及，其他值得追踪的人。
        #         大脑交叉引用 + 如果知道句柄则进行社交媒体查找。

    # 第 4 步：运行外部查找（优先级顺序，信号足够时停止）
    data = {}
    data["brain"] = gbrain search "{entity.name}"          # 始终第一（免费）
    if tier <= 2:
        data["web"] = brave_search("{entity.name}")        # 背景、新闻、演讲
    if tier <= 2:
        data["twitter"] = twitter_lookup(entity.handle)    # 信仰、正在构建的内容、网络
    if tier == 1:
        data["linkedin"] = crustdata_enrich(entity.name)   # 职业生涯、联系
        data["research"] = happenstance_research(entity)   # 职业轨迹、网络存在
        data["funding"] = captain_api(entity.company)      # 资金、估值、团队
        data["meetings"] = circleback_search(entity.name)  # 成绩单搜索
        data["contacts"] = google_contacts(entity.email)   # 联系人数据

    # 第 5 步：存储原始数据（可审计、可重新处理）
    gbrain put_raw_data <entity_slug> \
        --data '{"sources": {"crustdata": {"fetched_at": "...", "data": {...}}, ...}}'
    # 在重新丰富时覆盖，不要追加

    # 第 6 步：写入大脑页面
    if path == "CREATE":
        gbrain put <entity_slug> --content "<compiled_truth_from_all_sources>"
        gbrain add_timeline_entry <entity_slug> --entry "Page created via enrichment"
    elif path == "UPDATE":
        # 追加时间线，仅当有实质性新内容时更新编译的真相
        gbrain add_timeline_entry <entity_slug> --entry "Enriched: {new_signal}"
        # 标记矛盾之处 —— 不要默默解决它们

    # 第 7 步：交叉引用图谱
    gbrain add_link <person_slug> <company_slug>       # 人物 -> 公司
    gbrain add_link <company_slug> <person_slug>       # 公司 -> 人物
    gbrain add_link <person_slug> <deal_slug>          # 人物 -> 交易
    # 每个实体页面都链接到引用它的每个其他实体页面

# 人物页面部分（不是 LinkedIn 个人资料 —— 而是一幅鲜活的画像）：
#   执行摘要 (Executive Summary)、状态 (State)、他们相信什么 (What They Believe)、他们正在构建什么 (What They're Building)、
#   什么激励着他们 (What Motivates Them)、评估 (Assessment)、轨迹 (Trajectory)、关系 (Relationship)、联系方式 (Contact)、时间线 (Timeline)
# 事实是基本要求。质感（TEXTURE）才是价值。

# 提取质感，而不仅仅是事实：
#   表达了观点？        -> 他们相信什么
#   正在构建或发布？     -> 他们正在构建什么
#   表达了情感？        -> 是什么让他们运转
#   他们与谁互动？ -> 网络 / 关系
#   反复出现的主题？          -> 嗜好/常谈话题
#   致力于某事？   -> 未决问题
#   能量水平？             -> 轨迹
```

## 棘手的地方
1. **不要覆盖人类编写的评估。 ** 如果用户用他们自己对某人的解读编写了“评估 (Assessment)”部分，API 丰富过程绝不能覆盖它。 API 数据进入状态、联系方式、时间线。用户的评估是神圣不可侵犯的。
2. **每周不要对同一个页面重新丰富超过一次。 ** 在再次运行流水线之前，请检查 `put_raw_data` 的时间戳。丰富过程很昂贵，而且数据变化没那么快。
3. **LinkedIn 连接数 < 20 意味着找错人了。 ** Crustdata 有时会返回同名的不同人。如果 LinkedIn 个人资料的连接数少于 20，这几乎可以肯定是一个错误匹配。丢弃它。
4. **X/Twitter 是被低估最多的数据源。 ** 当你有了某人的句柄时，他们的推文揭示了信仰、他们正在构建的东西、常谈话题、网络（回复模式）和轨迹（发帖频率、语气转变）。对于“他们相信什么”和“是什么让他们运转”来说，​​这比 LinkedIn 更丰富。
5. **交叉引用不是可选的。 ** 丰富一个人后，更新他们的公司页面。丰富一家公司后，更新创始人页面。没有交叉链接的被丰富页面是图谱中的死胡同。
## 如何验证
1. 丰富一个 Tier 1 的人物。运行 `gbrain get <slug>` 并确认该页面具有执行摘要、状态、他们相信什么、联系方式和时间线部分，这些部分来自多个来源的数据。
2. 运行 `gbrain get_raw_data <slug>`。确认存储了带有 `sources.{provider}.fetched_at` 时间戳的原始 API 响应。
3. 运行 `gbrain get_links <slug>`。确认存在指向该人物的公司页面、交易页面和相关实体的交叉引用链接。
4. 检查一个被丰富过且有用户编写的“评估”的页面。确认“评估”部分被保留，没有被 API 数据覆盖。
5. 尝试重新丰富同一个人。确认系统检查了 `fetched_at` 时间戳，如果不到一周则跳过。
---
*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *