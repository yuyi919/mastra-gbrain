# 大脑 vs 记忆 vs 会话
## 目标
明确什么内容进入 GBrain，什么内容进入代理记忆，什么内容留在会话上下文中——确保每条信息都能落入正确的层级。
## 用户得到什么
如果没有这个：人员档案会被存储在代理记忆中（在代理重置时丢失），用户偏好会被存储在 GBrain 中（使知识页面变得杂乱），并且代理会重复询问它已经知道答案的问题。有了这个：世界知识持久保存在大脑中，操作状态持久保存在代理记忆中，代理永远不会将信息放入错误的层级。
## 实现
```
on new_information(info):
    # 三个层级，三个目的 —— 路由到正确的层级

    if info.is_about_the_world:
        # GBRAIN：人物、公司、交易、会议、概念、想法
        # 这是世界知识 —— 关于代理外部实体的事实
        gbrain put <slug> --content "..."
        # 示例：
        #   "Pedro 是 Brex 的 CEO"           -> gbrain (人物页面)
        #   "Brex 以 120 亿美元的估值筹集了 D 轮融资"   -> gbrain (公司页面)
        #   "周二的会议讨论了第二季度"   -> gbrain (会议页面)
        #   "肉体维护税"   -> gbrain (原创想法页面)

    elif info.is_about_operations:
        # 代理记忆（AGENT MEMORY）：偏好、决策、工具配置、会话连续性
        # 这是代理的操作方式 —— 不是关于世界的事实
        memory_write(info)
        # 示例：
        #   "用户偏好简洁的格式"      -> 代理记忆
        #   "在生产环境之前部署到预发布环境"        -> 代理记忆
        #   "在代码块中使用深色模式"         -> 代理记忆
        #   "Crustdata 的 API 密钥放在 .env 中"   -> 代理记忆

    elif info.is_current_conversation:
        # 会话上下文（SESSION CONTEXT）：刚刚说过的话、当前任务、即时状态
        # 这是自动的 —— 已经在对话窗口中了
        # 不需要存储操作
        # 示例：
        #   "我们刚才在讨论董事会演示文稿"  -> 会话
        #   "你让我审查这个 PR"          -> 会话
        #   "我刚刚分享的文件"                  -> 会话

# 查找路由：
on user_asks(question):
    if question.about_person or question.about_company or question.about_meeting:
        gbrain search "{entity}"    # -> 世界知识
        gbrain get <slug>

    elif question.about_preference or question.about_how_to_operate:
        memory_search("{topic}")    # -> 操作状态

    elif question.about_current_context:
        # 已经在会话中 —— 直接引用对话历史即可
        pass
```

## 棘手的地方
1. **不要将人物存储在代理记忆中。 ** "Pedro 偏好电子邮件而不是 Slack" 感觉像是一个偏好，但它是关于 Pedro 的一个事实 —— 它应该放在 GBrain 中 Pedro 的页面上。代理记忆是用于代理自身的操作状态的，而不是用于世界上的人物事实的。
2. **不要将用户偏好存储在 GBrain 中。 ** "用户喜欢要点而不是段落" 是关于代理应该如何表现的，而不是关于世界的。它应该进入代理记忆。 GBrain 页面是为实体准备的，而不是为代理配置准备的。
3. **外部想法的综合应该放在 GBrain 中。 ** "用户对 Peter Thiel 从零到一框架的看法" 是用户的原创想法 —— 它应该放在 GBrain 的 originals/ 目录下，而不是代理记忆中。
4. **在某些平台上，代理记忆无法在代理重置后幸存。 ** 关键的世界知识必须在 GBrain 中，因为它是持久的。如果代理失去了记忆，大脑仍然拥有一切。
5. **当有疑问时，请问：这是关于世界的，还是关于如何操作的？ ** 世界 -> GBrain。操作 -> 代理记忆。当前对话 -> 会话。
## 如何验证
1. 问代理 "谁是 Pedro？" —— 确认它运行了 `gbrain search` 或 `gbrain get`，而不是 `memory_search`。人物查找应该命中 GBrain。
2. 问代理 "我应该如何格式化回复？" —— 确认它检查了代理记忆，而不是 GBrain。偏好是操作状态。
3. 检查代理记忆存储中是否存在人物或公司页面。运行 `memory_search "person"` —— 它应该返回偏好，而不是档案。
4. 检查 GBrain 中是否包含有关代理行为的页面。运行 `gbrain search "user prefers"` —— 它应该什么都不返回（偏好属于代理记忆）。
5. 在代理重置后，确认 GBrain 知识仍然可访问。运行 `gbrain get <any_slug>` —— 世界知识应该能在重置后幸存。
---
*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *