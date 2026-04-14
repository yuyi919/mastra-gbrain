# 参考 Cron 时间表
＃＃ 目标
生产大脑运行 20 多项重复性工作，以保持其活力、最新状态和
复合。本指南展示了时间表、模式以及如何设置。
## 用户得到什么
如果没有这个：大脑只会在您手动摄取数据时更新。翻页
陈旧、实体薄弱、引用中断、代理从旧上下文中回答。
这样：大脑就能自我维持。电子邮件、社交、日历和会议
自动流入。薄页面一夜之间变得丰富起来。损坏的引用得到
固定。当你醒来时，大脑比你睡觉时更聪明。
## 时间表
|频率|工作 |大脑互动|食谱|
|------------|-----|--------------------|--------|
|每 30 分钟 |邮件监控 |搜索发件人、更新人员页面 | [电子邮件到大脑](../../recipes/email-to-brain.md) |
|每 30 分钟 | X/Twitter合集|创建/更新媒体页面、实体提取 | [x-to-brain](../../recipes/x-to-brain.md) |
| 3 次/天（工作日）|会议同步 |完全摄取+与会者传播| [会议同步](../../recipes/会议同步.md) |
|每周 |日历同步 |每日文件 + 丰富与会者 | [日历到大脑](../../recipes/calendar-to-brain.md) |
|每日上午 |早间简报 |搜索日历与会者、交易状态、活动话题 | [简报技能](../../skills/briefing/SKILL.md) |
|每周 |大脑保养| `gbrain doctor`、嵌入陈旧、孤儿检测 | [维持技能](../../skills/maintain/SKILL.md) |
|每晚 |梦想循环|实体清扫、丰富薄弱环节、修复引文 |见下文 |
## 实现：设置 Cron 作业
```bash
# Email collector — every 30 minutes
*/30 * * * * cd /path/to/email-collector && node email-collector.mjs collect && node email-collector.mjs digest

# X/Twitter collector — every 30 minutes
*/30 * * * * cd /path/to/x-collector && node x-collector.mjs collect >> /tmp/x-collector.log 2>&1

# Meeting sync — 10 AM, 4 PM, 9 PM on weekdays
0 10,16,21 * * 1-5 cd /path/to/meeting-sync && node meeting-sync.mjs >> /tmp/meeting-sync.log 2>&1

# Calendar sync — Sundays at 10 AM
0 10 * * 0 cd /path/to/calendar-sync && node calendar-sync.mjs --start $(date -v-7d +%Y-%m-%d) --end $(date +%Y-%m-%d)

# Brain health — weekly Mondays at 6 AM
0 6 * * 1 gbrain doctor --json >> /tmp/gbrain-health.log 2>&1 && gbrain embed --stale

# Dream cycle — nightly at 2 AM
0 2 * * * /path/to/dream-cycle.sh
```

### 门禁安静时间（强制）
每个发送通知的 cron 作业必须首先检查安静时间。
有关完整模式，请参阅[安静时间](quiet-hours.md)。
```bash
# In every cron script:
if ! bash scripts/quiet-hours-gate.sh; then
  mkdir -p /tmp/cron-held
  echo "$OUTPUT" > /tmp/cron-held/$(basename "$0" .sh).md
  exit 0
fi
# Not quiet hours — send normally
```

### 旅行感知时区处理
客服人员会读取您的日历中的航班、酒店和外出区域信息，以便
推断您当前的位置和时区。所有时间均以您当地时区显示。
```
// Example: user flew to Tokyo
// 2 PM Pacific = 3 AM Tokyo = quiet hours
// Hold the notification, fold into morning briefing

get_user_timezone():
  calendar = gbrain search "flight" --type calendar --recent 7d
  if recent_flight:
    return infer_timezone(flight.destination)
  return config.default_timezone  // fallback: US/Pacific
```

当你旅行时： cron 作业会在你醒着的时候在家里触发，但是
在目的地达到你的睡眠时间 被抱起来并折叠到下一个
上午简报。需要零配置更改。
## 梦想循环
最重要的 cron 作业。当你睡觉时运行。
### 它的作用
```
dream_cycle():
  // Phase 1: Entity Sweep
  conversations = get_todays_conversations()
  for message in conversations:
    entities = detect_entities(message)
    for entity in entities:
      page = gbrain search "{entity.name}"
      if not page:
        create_page(entity)        // new entity, create + enrich
      elif page.is_thin():
        enrich_page(entity)        // thin page, fill it out
      else:
        update_timeline(entity)    // existing page, add today's mentions

  // Phase 2: Fix Broken Citations
  pages = gbrain list --type person --limit 100
  for page in pages:
    for entry in page.timeline:
      if not entry.has_source_attribution():
        fix_citation(entry)        // add [Source: ...] where missing
      if entry.has_tweet_url() and not entry.url_is_valid():
        fix_url(entry)             // broken tweet links

  // Phase 3: Consolidate Memory
  patterns = detect_patterns_across_conversations()
  for pattern in patterns:
    promote_to_memory(pattern)     // ephemeral → durable knowledge

  // Phase 4: Sync
  gbrain sync --no-pull --no-embed
  gbrain embed --stale
```

### 设置梦想周期
**OpenClaw：** 附带 DREAMS.md 作为默认技能。三相（光、
深度、快速眼动睡眠）在安静时间自动运行。
**爱马仕代理商：**```bash
/cron add "0 2 * * *" "Dream cycle: search today's sessions for
  entities I mentioned. For each person, company, or idea: check
  if a brain page exists (gbrain search), create or update it if
  thin. Fix any broken citations. Then consolidate: read MEMORY.md,
  promote important signals, remove stale entries."
  --name "nightly-dream-cycle"
```

**克劳德代码/自定义代理：** 创建脚本：```bash
#!/bin/bash
# dream-cycle.sh

# Check quiet hours (should be quiet — that's when we run)
echo "Dream cycle starting at $(date)"

# Phase 1: Entity sweep (spawn sub-agent)
# Read today's conversation logs, extract entities, update brain

# Phase 2: Citation hygiene
gbrain doctor --json | jq '.checks[] | select(.status=="warn")'

# Phase 3: Embed any stale content
gbrain embed --stale

echo "Dream cycle complete at $(date)"
```

## 棘手的地方
1. **梦想周期不是可选的。** 没有它，信号会从每个
   谈话。有了它，就没有什么损失。这是之间的区别
   一个会忘记的代理人，一个会记住的代理人。
2. **每个通知作业的安静时间门。** 如果您跳过它，用户
   凌晨 3 点收到 ping 通知。凌晨 3 点 ping 一次，他们就会禁用整个系统。
3. **不要过度计划。** 20 多个工作听起来很多。首先：电子邮件（30 分钟）、
   梦周期（每晚）、大脑健康（每周）。添加时添加更多
   整合食谱。
4. **时区更改是自动的。** 不要让用户重新配置 cron
   当他们旅行时。阅读日历，推断时区，调整交付。
5. **必须拾取保留的消息。** 如果安静时间保留通知，
   早上的简报必须包括它。否则信息就会丢失。
## 如何验证
1. **安静时间：** 将安静时间设置为当前时间。运行通知 cron。
   验证输出是否已发送到“/tmp/cron-held/”，而不是消息传递。
2. **梦想循环：** 手动运行梦想循环。检查精简实体页面
   内容得到了丰富，损坏的引用也得到了修复。
3. **电子邮件收集器 cron:** 等待 30 分钟。检查“data/digests/”是否有新的摘要。
4. **早间简报：** 检查保留的消息是否出现在简报中。
5. **健康检查：** 运行 `gbrain doctor --json`。所有检查都应该通过。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[安静时间](quiet-hours.md)、[操作纪律](operative-disciplines.md)*