# 安静时间与时区感知的投递 (Quiet Hours and Timezone-Aware Delivery)
## 目标
在睡眠时间拦截所有通知，将拦截的消息合并到早晨简报中，并在用户旅行时自动调整。
## 用户得到什么
如果没有这个：凌晨 3 点会收到来自 cron 任务的 ping。一次糟糕的通知就会让用户禁用整个系统。
有了这个：大脑在夜间工作（做梦周期、收集器、信息丰富），但通知会被保留到早晨。去东京旅行？系统会根据你的日历自动调整，无需更改配置。
## 实现
### 安静时间闸门
每个发送通知的 cron 任务都必须首先（FIRST）检查安静时间。
```
QUIET_START = 23  // 当地时间晚上 11 点
QUIET_END = 8     // 当地时间早上 8 点

is_quiet(local_hour):
  return local_hour >= QUIET_START OR local_hour < QUIET_END
```

**在发送任何通知之前：**
1. 确定用户当前的时区（从配置或心跳状态中获取）
2. 将当前 UTC 时间转换为当地时间
3. 如果是安静时间：拦截消息，不要发送
### 被拦截的消息
在安静时间段内，输出会进入一个保留目录，而不是被发送：
```
if is_quiet():
  mkdir -p /tmp/cron-held/
  write("/tmp/cron-held/{job-name}.md", output)
  exit  // 不发送
else:
  send(output)
```

早晨简报会提取被拦截的消息：
```
morning_briefing():
  held_files = list("/tmp/cron-held/*.md")
  if held_files:
    briefing += "## 夜间更新\n\n"
    for file in held_files:
      briefing += read(file)
      delete(file)
```

这样就不会丢失任何东西。夜间 cron 任务的结果会被折叠进用户早晨看到的第一件事中。
### 时区感知
代理应该知道用户所在的时区。将其存储在代理的操作状态中：
```json
{
  "currentLocation": {
    "timezone": "US/Pacific",
    "city": "San Francisco"
  }
}
```

**在以下情况下更新时区：**
- 日历显示用户飞往某地（检查航空公司/酒店事件）
- 用户提到在另一个城市
- 用户的活动时间发生偏移（他们在太平洋时间凌晨 3 点回复 = 他们可能在旅行）
**向用户显示的所有时间都应采用他们当地的时区。 ** 永远不要显示 UTC 或用户不在其中的时区。
### Shell 实现
```bash
#!/bin/bash
# quiet-hours-gate.sh — run before any notification

TIMEZONE="${USER_TIMEZONE:-US/Pacific}"
LOCAL_HOUR=$(TZ="$TIMEZONE" date +%H)

if [ "$LOCAL_HOUR" -ge 23 ] || [ "$LOCAL_HOUR" -lt 8 ]; then
  echo "QUIET_HOURS=true"
  exit 1  # don't send
fi

echo "QUIET_HOURS=false"
exit 0  # ok to send
```

**在 cron 任务脚本中：**```bash
# Check quiet hours first
if ! bash scripts/quiet-hours-gate.sh; then
  mkdir -p /tmp/cron-held
  echo "$OUTPUT" > /tmp/cron-held/$(basename "$0" .sh).md
  exit 0
fi

# Not quiet hours — send normally
send_notification "$OUTPUT"
```

### 可配置的时间
一些用户希望有不同的安静时间。存储配置：
```json
{
  "quiet_hours": {
    "start": 23,
    "end": 8,
    "enabled": true
  }
}
```

设置 `enabled: false` 可以完全禁用安静时间（例如，用于 24/7 监控）。
## 棘手的地方
1. **在每个（EVERY）任务上设置闸门。 ** 安静时间检查必须在每一个产生通知的 cron 任务之前运行。如果哪怕有一个任务跳过了这个闸门，用户在凌晨 3 点收到 ping 消息，就会对整个系统失去信任。没有例外。
2. **被拦截的消息必须（MUST）被提取。 ** 如果早晨简报没有读取 `/tmp/cron-held/`，夜间的结果就会默默消失。验证简报技能是否读取并清空了保留目录。孤立的被保留文件意味着提取集成已损坏。
3. **时区自动检测很脆弱。 ** 基于日历的时区检测依赖于用户拥有带有位置数据的航空公司/酒店事件。如果用户预订了旅行而没有日历条目，系统就不会检测到移动。回退到活动时间分析（在太平洋时间凌晨 3 点回复 = 可能不再在太平洋时间了），如果不确定，就询问用户。
## 如何验证
1. **将安静时间设置为当前时间。 ** 暂时将 `QUIET_START` 设置为现在的前一个小时，将 `QUIET_END` 设置为现在的一个小时后。触发一个 cron 任务。验证输出进入了 `/tmp/cron-held/` 而不是被发送。
2. **检查保留消息提取。 ** 在第 1 步之后，运行或模拟早晨简报。验证被拦截的消息出现在“夜间更新”部分，并且文件已从 `/tmp/cron-held/` 中删除。
3. **验证时区调整。 ** 将时区配置更改为一个目前处于安静时间的区域。触发通知。验证它被拦截了。在活动时间切换回你的真实时区。再次触发。验证它被发送了。
---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *