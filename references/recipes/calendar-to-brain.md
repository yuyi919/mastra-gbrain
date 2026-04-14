---
id: calendar-to-brain
name: Calendar-to-Brain
version: 0.7.0
description: Google Calendar events become searchable brain pages. Daily files with attendees, locations, and meeting prep context.
category: sense
requires: [credential-gateway]
secrets:
  - name: CLAWVISOR_URL
    description: ClawVisor gateway URL (Option A — recommended, handles OAuth for you)
    where: https://clawvisor.com — create an agent, activate Google Calendar service
  - name: CLAWVISOR_AGENT_TOKEN
    description: ClawVisor agent token (Option A)
    where: https://clawvisor.com — agent settings, copy the agent token
  - name: GOOGLE_CLIENT_ID
    description: Google OAuth2 client ID (Option B — direct API access, you manage tokens)
    where: https://console.cloud.google.com/apis/credentials — create OAuth 2.0 Client ID
  - name: GOOGLE_CLIENT_SECRET
    description: Google OAuth2 client secret (Option B)
    where: https://console.cloud.google.com/apis/credentials — same page as client ID
health_checks:
  - type: any_of
    label: "Auth provider"
    checks:
      - type: http
        url: "$CLAWVISOR_URL/health"
        label: "ClawVisor"
      - type: env_exists
        name: GOOGLE_CLIENT_ID
        label: "Google OAuth"
setup_time: 20 min
cost_estimate: "$0 (both options are free)"
---

# 日历到大脑：你的日程安排变成可搜索的记忆

每一个日历事件都会变成一个可搜索的大脑页面。你的代理知道你明天要见谁，上次讨论了什么，以及重要的背景信息。会议准备会自动进行，因为大脑已经有了历史记录。

## 重要提示：代理说明

**你是安装者。** 严格按照这些步骤操作。

**为什么这很重要：** 日历数据是关系历史的最丰富来源。13 年的日历数据告诉你见过谁、见面的频率、地点以及和谁一起。当有人给你发电子邮件时，大脑已经知道了你们的会议历史。当明天有会议时，代理会自动提取与会者档案。

**输出是每日 Markdown 文件：** 每天一个文件，位于 `brain/daily/calendar/{YYYY}/{YYYY-MM-DD}.md`，包含所有事件、与会者和地点。这些文件是会议准备、关系追踪和模式检测的素材。

**不要跳过任何步骤。在每一步之后进行验证。**

## 架构

```
Google Calendar (多个账户)
  ↓ (ClawVisor 凭证网关, 分页处理)
Calendar Sync Script (确定性的 Node.js 脚本)
  ↓ 输出:
  ├── brain/daily/calendar/{YYYY}/{YYYY-MM-DD}.md   (每日事件文件)
  ├── brain/daily/calendar/.raw/events-{range}.json  (原始 API 响应)
  └── brain/daily/calendar/INDEX.md                  (日期范围 + 月度摘要)
  ↓
代理读取每日文件
  ↓ 判断决策:
  ├── 与会者丰富 (为人物创建/更新大脑页面)
  ├── 会议准备 (在明天的会议前提取上下文)
  └── 模式检测 (会议频率, 关系温度)
```

## 极具主观观点的默认设置

**多个日历帐户：**
- 工作日历（公司域）
- 个人日历 (gmail.com)
- 以前的公司日历（如果仍然可以访问）

**每日文件格式：**
```markdown
# 2026-04-10 (Thursday)

- 09:00-09:30 **Team standup** (Work) — 与 Alice, Bob, Carol
- 10:00-11:00 **Board meeting** (Work) 📍 Office — 与 Diana, Eduardo, Fiona
- 12:00-13:00 **Lunch with Pedro** (Personal) 📍 Chez Panisse — 与 Pedro Franceschi
- 14:00-14:30 **1:1 with Jordan** (Work) — 与 Jordan Lee
```

全天活动首先列出。定时事件按开始时间排序。取消的事件被跳过。提取与会者姓名（输出中没有电子邮件地址）。括号中为日历标签。带有 📍 表情符号的位置。

**历史回填：** 同步多年的日历数据，而不仅仅是最近的。常见范围：
- 工作时间：2020 年至今
- 个人时间：2014 年至今
这从第一天起就构建了完整的关系图。

## 先决条件

1. **已安装并配置 GBrain**（`gbrain doctor` 通过）
2. **Node.js 18+**（用于同步脚本）
3. **通过以下方式之一访问 Google 日历**：
   - **选项 A：ClawVisor**（推荐，为你处理 OAuth，无令牌管理）
   - **选项 B：直接 Google OAuth2**（你管理令牌，无额外服务）

## 设置流程

### 步骤 1：选择并配置日历访问

问用户：“你想如何连接到 Google 日历？

**选项 A：ClawVisor（推荐）**
ClawVisor 处理 OAuth、令牌刷新和加密。你永远不会直接接触 Google 凭证。如果你已经使用 ClawVisor 将电子邮件发送到大脑，它将使用相同的设置。

**选项 B：直接 Google OAuth2**
直接连接到 Google Calendar API。没有额外的服务，但你自己使用 OAuth 令牌管理。如果你不想要任何额外的依赖，这就很棒。”

#### 选项 A：ClawVisor 设置

告诉用户：
“我需要你的 ClawVisor URL 和代理令牌。
1. 前往 https://clawvisor.com
2. 创建代理（或使用现有代理）
3. 激活 **Google Calendar** 服务
4. 创建一个具有广泛目标的常设任务：‘全面日历访问以进行历史回填和持续同步。列出事件、读取事件详情、搜索所有日历。’
   重要提示：任务目的要广泛。狭隘的目的会阻止请求。
5. 复制网关 URL 和代理令牌”

验证：
```bash
curl -sf "$CLAWVISOR_URL/health" && echo "PASS: ClawVisor reachable" || echo "FAIL"
```

**在 ClawVisor 验证通过之前请停止。**

#### 选项 B：Google OAuth2 设置

告诉用户：
“我需要 Google OAuth2 凭证。设置方法如下：
1. 前往 https://console.cloud.google.com/apis/credentials
   （如果没有 Google Cloud 项目，请创建一个）
2. 点击顶部的 **'+ CREATE CREDENTIALS'**，选择 **'OAuth client ID'**
3. 如果出现提示，请先配置 OAuth 同意屏幕：
   - 用户类型：**外部**（如果拥有 Google Workspace，则为内部）
   - 应用名称：任何名称（例如 'GBrain Calendar'）
   - 范围：添加 **'Google Calendar API .../auth/calendar.readonly'**
   - 测试用户：添加你自己的电子邮件
4. 返回凭证，创建 OAuth 客户端 ID：
   - 应用类型：**桌面应用**
   - 名称：任何名称（例如 'GBrain'）
5. 点击 **'Create'**。你将看到客户端 ID 和客户端密钥。
6. 复制并粘贴给我。

还要启用 Calendar API：
7. 前往 https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
8. 点击 **'Enable'**”

验证凭证是否已设置：
```bash
[ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ] \
  && echo "PASS: Google OAuth credentials set" \
  || echo "FAIL: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"
```

然后运行 OAuth 流程以获取访问令牌：
```bash
# 同步脚本应该处理 OAuth 流程:
# 1. 打开浏览器前往 Google 认证 URL，带有 calendar.readonly 范围
# 2. 用户授予访问权限
# 3. 脚本接收认证码，交换获取访问令牌 + 刷新令牌
# 4. 将令牌存储在 ~/.gbrain/google-tokens.json 中
# 5. 过期时自动刷新
```

**在 OAuth 流程完成并存储令牌之前请停止。**

### 步骤 2：识别日历帐户

问用户：“我应该同步哪些 Google 日历帐户？常见的设置有：
- 工作电子邮件（例如 you@company.com）
- 个人电子邮件（例如 you@gmail.com）
- 任何具有日历历史记录的以前的公司电子邮件”

对于每个帐户，记录：
- 电子邮件地址
- 开始年份（要同步多远的数据）
- 标签（工作、个人等）

### 步骤 3：设置日历同步脚本

创建同步目录：
```bash
mkdir -p calendar-sync
cd calendar-sync
npm init -y
```

同步脚本需要这些功能：
1. **分页事件检索** — Google Calendar API 每次请求最多返回 50 个事件。脚本必须跨大日期范围进行分页。对于稀疏时期使用每月分块，对于密集时期使用每周分块。
2. **每日 Markdown 生成** — 按日期将事件分组，使用时间、与会者、位置、日历标签的 Markdown 格式。
3. **与现有文件合并** — 如果每日文件已经有手动记录的笔记，则在更新日历数据时保留它们。
4. **索引生成** — 创建包含日期范围、事件计数、每月摘要的 INDEX.md。
5. **原始 JSON 保存** — 将原始 API 响应保存到 `.raw/` 供参考。

### 步骤 4：运行历史回填

这是一次大的初始同步。可能需要 10-30 分钟，具体取决于你拥有多少年的日历数据。

```bash
node calendar-sync.mjs --start 2020-01-01 --end $(date +%Y-%m-%d)
```

告诉用户：“正在同步从 [开始年份] 起的日历历史记录。这会为每一天创建一个 markdown 文件。对于 4 年的数据，预计会有大约 1,400 个每日文件。”

验证：
```bash
ls brain/daily/calendar/2026/ | head -10
```

应该显示每日文件如 `2026-04-01.md`, `2026-04-02.md` 等。

### 步骤 5：将日历数据导入 GBrain

```bash
gbrain import brain/daily/calendar/ --no-embed
gbrain embed --stale
```

验证：
```bash
gbrain search "meeting" --limit 3
```

应该返回带有事件详细信息的日历页面。

### 步骤 6：丰富与会者

这是你的工作（代理）。对于出现在日历事件中的每个人：
1. **检查大脑**：`gbrain search "与会者姓名"` — 他们有页面吗？
2. **如果缺失则创建页面**：值得注意的与会者（出现超过 3 次）获得一个大脑页面。
3. **更新现有页面**：将会议历史添加到时间线：
   `- YYYY-MM-DD | 会议：{事件标题} [来源：Google Calendar]`
4. **关系追踪**：在编译的真相中记录会议频率：
   “过去 6 个月内会面 12 次。定期的 1:1 节奏。”

### 步骤 7：设置每周同步

日历应该每周同步以保持最新状态：
```bash
# Cron: 每周日上午 10 点
0 10 * * 0 cd /path/to/calendar-sync && node calendar-sync.mjs --start $(date -v-7d +%Y-%m-%d) --end $(date +%Y-%m-%d)
```

同步后，导入新数据：
```bash
gbrain sync --no-pull --no-embed && gbrain embed --stale
```

### 步骤 8：记录设置完成

```bash
mkdir -p ~/.gbrain/integrations/calendar-to-brain
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.7.0","status":"ok","details":{"accounts":"ACCOUNT_COUNT","start_year":"YYYY"}}' >> ~/.gbrain/integrations/calendar-to-brain/heartbeat.jsonl
```

告诉用户：“日历到大脑已设置完毕。[N] 天的日历历史记录已被索引。现在，我可以通过从大脑中提取与会者的背景信息来为你准备会议。每周同步使其保持最新。”

## 实现指南

这些是用于同步 13 年日历数据的经过生产测试的模式。

### 智能分块（每月 vs 每周）

```
generate_chunks(start, end, dense_after='2023-01-01'):
  chunks = []
  current = start

  while current < end:
    if current < dense_after:
      next = current + 1_MONTH    // 稀疏时期：每月
    else:
      next = current + 7_DAYS     // 密集时期：每周

    chunks.append({from: current, to: min(next, end)})
    current = next

  return chunks
```

**原因：** 稀疏年份 (2014-2023) 每月块 = 8 年大约 96 次 API 调用。如果一切都按周进行，则大约需要 600+ 次调用。每个日历的 `startYear` 避免了获取空月份（例如，不要查询 2014-2020 年以获取 2020 年创建的日历）。

### 与会者过滤

```
filter_attendees(attendees):
  return attendees.filter(a =>
    !a.email?.includes('@resource.calendar.google.com') AND  // 会议室
    !a.email?.includes('@group.calendar.google.com') AND     // 邮件列表
    !a.name?.startsWith('YC-SF-')                            // 内部邮件组
  )
```

如果没有这个，你的与会者列表会被“Conference Room A”和“engineering-all@company.com”污染。你需要的是真实的人。

### 与现有文件合并（保留手动记录的笔记）

```
write_daily_file(date, events, dir):
  path = f'{dir}/{date}.md'
  calendar_md = format_events(events)

  if file_exists(path):
    existing = read(path)
    if '## Calendar' in existing:
      // 仅替换日历部分，保留其他所有内容
      before = existing.split('## Calendar')[0]
      after_match = regex_search(existing, /## [A-Z](?!alendar)/)  // 下一部分
      after = after_match ? existing[match_index:] : ''
      write(path, f'{before}## Calendar\n\n{calendar_md}\n{after}')
    else:
      write(path, f'## Calendar\n\n{calendar_md}\n---\n\n{existing}')
  else:
    write(path, calendar_md)
```

**重要提示：** 仅修改 `## Calendar` 部分。保留其他所有内容。如果你手动向每日文件中添加了 `## Notes`，它在日历重新同步后仍然存在。

### 日期/时间解析的边缘情况

```
parse_event_date(event):
  // 全天: event.start = "2024-01-15" (没有 T)
  // 定时: event.start = "2024-01-15T10:00:00-08:00" (有 T)
  if 'T' in event.start:
    return event.start[0:10]    // 从 datetime 中提取日期
  return event.start            // 已经是日期了

format_time(iso_str):
  if not iso_str or 'T' not in iso_str: return 'all-day'
  // 提取小时:分钟，转换为 12 小时制
  // 边缘情况: 00:00 = 12:00 AM, 12:00 = 12:00 PM, 13:00 = 1:00 PM
```

### 代理在设置后应该测试什么

1. **每月 vs 每周：** 从 2014 年开始运行，`dense_after=2023`。验证 2023 年之前的调用每年大约 12 次 API 调用，2023 年之后的调用每月大约 4 次。
2. **与会者过滤：** 创建一个包含会议室和邮件列表的会议。同步。验证两者都没有出现在每日文件中。
3. **合并保留：** 手动向每日文件中添加 `## Notes`。同步日历。验证笔记是否被保留。
4. **全天事件：** 创建一个全天事件和一个同日的定时事件。验证全天事件首先出现，定时事件按开始时间排序。
5. **取消的事件：** 取消一个会议。同步。确认它没有出现。
6. **按日历 startYear 限制：** 同步一个 2022 年创建的日历，`startYear=2022`。验证在 2022 年之前没有发生 API 调用。

## 成本估算

| 组件 | 月度成本 |
|------------|-------------|
| ClawVisor (免费层) | $0 |
| Google Calendar API | $0 (免费配额内) |
| **总计** | **$0** |

## 故障排除

**没有返回事件：**
- 检查日历帐户电子邮件是否正确
- 检查 ClawVisor 是否启用了 Google Calendar 服务
- 检查常设任务的目标是否足够广泛
- 有些日历在请求的日期范围内可能为空

**缺少与会者姓名：**
- Google Calendar 有时会返回电子邮件地址而不是显示名称
- 同步脚本应从与会者对象中提取显示名称
- 如果没有显示名称，请使用电子邮件的前缀（@之前的部分）

**重复的事件：**
- 同步脚本应该是幂等的（相同的日期范围 = 相同的输出）
- 如果运行多次，现有的每日文件会被覆盖（而不是追加）