# 升级和自动更新通知
＃＃ 目标
用户会通过对话方式收到 GBrain 新功能的通知，代理会引导他们完成升级，并进行升级后迁移，使新版本真正发挥作用。
## 用户得到什么
如果没有这个：GBrain 会发布更新，但没人知道。用户仍使用旧版本
技能陈旧且功能缺失的版本。或者更糟糕的是，有人跑了
`gbrain Upgrade` 但跳过升级后步骤，将新代码保留在旧代码中
代理行为。
这样：代理每天检查更新，并以有力的方式出售升级
以利益为中心的项目符号，等待明确的许可，然后运行完整的
升级流程，包括重新阅读技能、运行迁移和同步
架构。用户自动获得新功能。
＃＃ 执行
### 检查（cron 启动）
```
check_for_update():
  result = run("gbrain check-update --json")

  if not result.update_available:
    exit_silently()  // do NOT message the user

  // Sell the upgrade — lead with what they can DO, not what changed
  message = compose_upgrade_message(
    current: result.current_version,
    latest: result.latest_version,
    changelog: result.changelog
  )
  send_to_user(message, respect_quiet_hours=true)
```

### 升级消息
出售升级版。用户应该感到“天哪，我想要那个”。领导与
他们现在可以做什么以前不能做的事情，而不是哪些文件发生了变化。
```
> **GBrain v0.5.0 is available** (you're on v0.4.0)
>
> What's new:
> - Your brain never falls behind. Live sync keeps the vector DB current
>   automatically, so edits show up in search within minutes
> - New verification runbook catches silent failures before they bite you
> - New installs set up live sync automatically. No more manual setup step
>
> Want me to upgrade? I'll update everything and refresh my playbook.
>
> (Reply **yes** to upgrade, **not now** to skip, **weekly** to check
> less often, or **stop** to turn off update checks)
```

### 处理响应
|用户说 |行动|
|------------|--------|
|是/是/当然/好的/执行/升级|运行完整的升级流程（如下）|
|不是现在/稍后/跳过/打盹|确认，下一个周期再次检查|
|每周|存储首选项，将 cron 切换为每周 |
|每日 |存储首选项，将 cron 切换回每日 |
|停止/取消订阅/不再|禁用 cron。告诉用户如何恢复 |
**从不自动升级。**始终等待明确的确认。
### 完整升级流程（在用户同意后）
```
full_upgrade():
  // Step 1: Update the binary/package
  run("gbrain upgrade")

  // Step 2: Re-read all updated skills
  for skill in find("skills/*/SKILL.md"):
    read_and_internalize(skill)  // updated skills = better agent behavior

  // Step 3: Re-read production reference docs
  read("docs/GBRAIN_SKILLPACK.md")
  read("docs/GBRAIN_RECOMMENDED_SCHEMA.md")

  // Step 4: Check for version-specific migration directives
  for version in range(old_version, new_version):
    migration = find(f"skills/migrations/v{version}.md")
    if migration exists:
      read_and_execute(migration)  // in order, don't skip

  // Step 5: Schema sync — suggest new, respect declined
  state = read("~/.gbrain/update-state.json")
  for recommendation in new_schema_recommendations:
    if recommendation not in state.declined:
      suggest_to_user(recommendation)
  update(state, new_choices)

  // Step 6: Report what changed
  summarize_to_user(actions_taken)
```

### 迁移文件
迁移文件位于“skills/migrations/vX.Y.Z.md”。它们含有代理
生成新版本的升级后操作的说明（非脚本）
为现有用户工作。示例：v0.5.0 迁移设置实时同步并
运行验证运行手册。
Agent按照版本顺序读取迁移文件并逐步执行
步骤。如果没有迁移，代理将拥有新的代码，但用户的环境
没有改变。
### Cron 注册
```
Name: gbrain-update-check
Default schedule: 0 9 * * * (daily 9 AM)
Weekly schedule: 0 9 * * 1 (Monday 9 AM)
Prompt: "Run gbrain check-update --json. If update_available is true,
  summarize the changelog and message me asking if I'd like to upgrade.
  If false, stay silent."
```

### 频率偏好
默认值：每天。在代理内存中存储为“gbrain_update_Frequency: daily|weekly|off”。
还保留在“~/.gbrain/update-state.json”中，以便它在代理上下文重置后仍然存在。
### 独立技能包用户
如果您直接加载此 SKILLPACK（从 GitHub 复制或读取）而无需
安装 gbrain，您仍然可以保持最新状态。 GBRAIN_SKILLPACK.md 和
GBRAIN_RECOMMENDED_SCHEMA.md 有版本标记：
```bash
curl -s https://raw.githubusercontent.com/garrytan/gbrain/master/docs/GBRAIN_SKILLPACK.md | head -1
# Returns: <!-- skillpack-version: X.Y.Z -->
```

如果远程版本较新，请获取完整文件并替换本地版本
复制。设置每周 cron 来自动检查。
## 棘手的地方
1. **绝不自动安装。** 升级必须始终等待用户的明确指示
   “是的。”即使 cron 在上午 9 点检测到更新并且更改日志看起来
   太好了，代理向用户发送消息并等待。自动安装可能会中断
   工作流程、引入重大变更或中断正在进行的工作。
2. **迁移文件是代理指令，而不是脚本。**它们告诉代理
   用通俗易懂的语言一步步做什么。它们不是 bash 脚本
   盲目执行。代理阅读它们，理解上下文并进行调整
   到用户的特定环境（例如，如果用户已经
   已配置实时同步）。
3. **check-update 应按每日 cron 运行。** 不要依赖用户
   记得检查更新。 cron 运行 `gbrain check-update --json`
   每天上午 9 点（遵守安静时间）。如果没有什么新的东西，它就会留下来
   完全沉默。用户仅在有更新时才听到更新
   值得升级到。
## 如何验证
1. **运行check-update并验证检测。**执行
   `gbrain 检查更新 --json`。验证它返回当前版本并
   正确报告更新是否可用。如果“update_available”
   为 false，请验证版本是否与 GitHub 上的最新版本匹配。
2. **验证迁移文件可读。** 列出 `skills/migrations/` 和
   检查每个文件是否遵循命名约定“vX.Y.Z.md”。打开一个
   并验证它包含分步代理说明，而不是原始脚本。
   代理应该能够读取并执行每个步骤。
3. **端到端测试完整的升级流程。** 如果有可用更新，例如
   “是”并观看代理执行整个流程：升级、重新读取技能、
   运行迁移、同步架构、报告。验证每个步骤是否完成以及
   代理报告发生了什么变化。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*