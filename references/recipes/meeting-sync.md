---
id: meeting-sync
name: Meeting Sync
version: 0.7.0
description: Meeting transcripts from Circleback auto-import into brain pages with attendee detection and entity propagation.
category: sense
requires: []
secrets:
  - name: CIRCLEBACK_TOKEN
    description: Circleback API token for meeting data access
    where: https://app.circleback.ai — Settings > API > generate token
health_checks:
  - type: http
    url: "https://app.circleback.ai/api/mcp"
    method: POST
    headers:
      Authorization: "Bearer $CIRCLEBACK_TOKEN"
      Content-Type: "application/json"
    body: '{"jsonrpc":"2.0","method":"tools/list","id":1}'
    label: "Circleback API"
setup_time: 15 min
cost_estimate: "$0-17/mo (Circleback free for 10 meetings/mo, Pro $17/mo unlimited)"
---

# 会议同步：成为大脑页面的记录
每次会议都会自动记录、转录并导入您的大脑
具有与会者检测、实体传播和操作项提取。你从来没有
再次做笔记。大脑会记住说过的话、谁说的以及需要什么
接下来发生的。
## 重要提示：代理说明
**您是安装者。** 严格按照这些步骤操作。
**为什么这是高价值的：** 会议记录是最丰富的信号源。
30 分钟的会议提及 5-10 个人、3-5 个公司，并产生 2-3 个行动
项目。每一个都应该传播到相关的大脑页面。如果没有这个食谱，
会议是黑洞。有了它，每次会议都会使大脑变得更加复杂。
**流量：**
1. Circleback 记录并转录会议（自动，无需用户操作）
2. 同步脚本从 Circleback API 中提取已完成的会议
3. 每个会议都会成为“brain/meetings/{YYYY-MM-DD}-{slug}.md”的大脑页面
4. 您（代理）将实体传播到人员/公司页面
**不要跳过步骤。每个步骤后进行验证。**
＃＃ 建筑学
```
Video Call (Zoom, Google Meet, Teams)
  ↓ Circleback bot joins automatically
Circleback (recording + transcription + AI summary)
  ↓ API (JSONRPC 2.0 over HTTP, SSE responses)
Meeting Sync Script (deterministic Node.js)
  ↓ Outputs:
  └── brain/meetings/{YYYY-MM-DD}-{slug}.md
      - Frontmatter: source_id, date, duration, attendees, location
      - Transcript with speaker labels and timestamps
      - Tags inferred from title
  ↓
Agent reads meeting page
  ↓ Judgment calls:
  ├── Entity detection (people, companies, topics)
  ├── Propagate to attendee brain pages (timeline entries)
  ├── Action item extraction
  └── Cross-reference with calendar data
```

## 固执己见的默认值
**会议页面格式：**```markdown
---
type: meeting
source_id: cb_abc123
source_type: circleback
title: Weekly Team Sync
date: 2026-04-10
duration: 32 min
attendees: [Alice Chen, Bob Park, Carol Wu]
location: Google Meet
tags: [team, weekly, sync]
---

## Key Points
- Discussed Q2 roadmap priorities
- Alice is blocked on the API migration
- Bob's prototype is ready for review

## Action Items
- [ ] Alice: unblock API migration by Friday
- [ ] Bob: share prototype link in Slack
- [ ] Carol: schedule design review for next week

---

## Transcript

**Alice Chen** (00:00): Let's start with the roadmap update...
**Bob Park** (02:15): The prototype is basically done...
**Carol Wu** (05:30): I have some design feedback on the new flow...
```

**与会者过滤：**
- 跳过日历资源（例如“YC-SF会议室”）
- 跳过群组地址（例如“team@company.com”）
- 提取显示名称，而不是电子邮件地址
**source_id 幂等：** 如果具有相同 `source_id` 的会议已存在
在大脑中，跳过它。没有重复项。
## 先决条件
1. **GBrain安装并配置**（`gbrain doctor`通过）
2. **Node.js 18+**（用于同步脚本）
3. **Circleback 帐户** (https://circleback.ai) 并记录会议
## 设置流程
### 第 1 步：获取 Circleback API 令牌
告诉用户：
“我需要您的 Circleback API 令牌。在哪里可以找到它：
1. 访问 https://app.circleback.ai
2. 单击您的个人资料图标（右上角）> 设置
3. 转到API部分
4. 生成新的 API 令牌（或复制现有令牌）
5.粘贴给我
注意：Circleback 的免费套餐每月最多可记录 10 次会议。专业版（$17/月）
是无限的。您至少需要一次录制的会议才能进行同步。”
立即验证：```bash
curl -sf -H "Authorization: Bearer $CIRCLEBACK_TOKEN" \
  "https://app.circleback.ai/api/mcp" \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  | grep -q '"result"' \
  && echo "PASS: Circleback API connected" \
  || echo "FAIL: Circleback token invalid"
```

**如果验证失败：** “那不起作用。常见问题：(1) 确保您复制了
完整的令牌，(2) 令牌是长十六进制字符串，(3) 检查您的 Circleback
帐户已激活。”
**停止直到 Circleback 验证。**
### 第 2 步：设置会议同步脚本
```bash
mkdir -p meeting-sync
cd meeting-sync
npm init -y
```

同步脚本需要以下功能：
1. **列出会议** — 调用 Circleback API `list_meetings` 并指定日期范围
   （SSE响应格式，解析流事件）
2. **提取会议数据** — 标题、与会者、记录、持续时间、日期
3. **Slugify 标题** —“每周团队同步”→ `每周团队同步`
4. **检查是否存在** — 如果 `brain/meetings/{date}-{slug}.md` 存在则跳过
5. **格式为 markdown** — 标题 + 要点 + 行动项 + 文字记录
6. **过滤与会者** — 删除日历资源、组、提取显示名称
7. **推断标签** — 从标题关键字（例如，“board”→ board、“1:1”→ 1-on-1）
### 步骤 3：运行首次同步
```bash
node meeting-sync.mjs --days 7
```

这会同步最近 7 天的会议。对于完全回填：```bash
node meeting-sync.mjs --start 2026-01-01 --end $(date +%Y-%m-%d)
```

核实：```bash
ls brain/meetings/ | head -10
```

应显示类似“2026-04-10-weekly-team-sync.md”的文件。
告诉用户：“找到并同步了 N 个会议。以下是最近的会议：[​​列表 3]。”
### 步骤 4：导入 GBrain
```bash
gbrain import brain/meetings/ --no-embed
gbrain embed --stale
```

核实：```bash
gbrain search "meeting" --limit 3
```

### 步骤 5：传播到实体页面
这是你的工作（代理人）。对于每次会议：
1. **阅读会议页面** — 了解谁参加了会议以及讨论了什么
2. **对于每个与会者**，检查 Brain：`gbrain 搜索“与会者姓名”`
   - 如果页面存在：附加时间线条目：
     `- 年-月-日 |会议：{标题}。讨论：{与此人相关的要点}[来源：Circleback]`
   - 如果没有值得注意的页面和人物：创建一个大脑页面
3. **对于提到的每家公司**：更新公司页面时间表
4. **行动项目**：如果会议有行动项目，请确保对其进行跟踪
5. **与日历交叉引用**：将会议页面链接到日历活动
6. **同步**：`gbrain 同步 --no-pull --no-embed`
### 第 6 步：设置 Cron
工作日每天同步 3 次：```bash
# 10 AM, 4 PM, 9 PM PT on weekdays
0 10,16,21 * * 1-5 cd /path/to/meeting-sync && node meeting-sync.mjs >> /tmp/meeting-sync.log 2>&1
```

默认（无标志）：同步昨天和今天。
### 第 7 步：日志设置完成
```bash
mkdir -p ~/.gbrain/integrations/meeting-sync
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.7.0","status":"ok"}' >> ~/.gbrain/integrations/meeting-sync/heartbeat.jsonl
```

告诉用户：“会议同步已设置。Circleback 记录的每个会议
自动成为可搜索的大脑页面。与会者页面更新为
会议历史。提取操作项。同步在工作日每天运行 3 次。”
## 实施指南
这些是同步 280 多个会议记录并经过生产测试的模式。
### SSE 响应解析
Circleback 通过 SSE 返回 JSONRPC 2.0（服务器发送事件）：```
call_circleback(tool_name, args):
  body = {jsonrpc: '2.0', id: next_id(), method: 'tools/call',
          params: {name: tool_name, arguments: args}}

  res = POST CIRCLEBACK_ENDPOINT, body,
        headers: {Authorization: Bearer TOKEN, Accept: 'application/json, text/event-stream'}

  text = res.text()
  for line in text.split('\n'):
    if line.startsWith('data: '):
      json = JSON.parse(line[6:])             // strip "data: "
      if json.result?.content?.[0]?.text:
        return JSON.parse(json.result.content[0].text)  // double-parse
      if json.error:
        throw json.error
```

**不明显：** 响应是 JSONRPC 内的 SSE 内的 JSON。你必须：
1. 去掉 `data:` 前缀
2.将SSE行解析为JSON
3. 深入查看 `result.content[0].text`
4. 再次将 THAT 解析为 JSON（这是一个包含 JSON 的字符串）
### 幂等性（双重检查）
```
meeting_exists(source_id):
  // Method 1: grep all meeting files for source_id
  result = shell(f'grep -rl "source_id: {source_id}" {MEETINGS_DIR}/')
  if result: return true

  // Method 2: check filename (backup)
  slug = slugify(meeting.name)
  if file_exists(f'{MEETINGS_DIR}/{date}-{slug}.md'): return true

  return false
```

**为什么要仔细检查：** 即使文件名发生更改，grep 也会捕获 source_id 匹配项。
文件存在会捕获 grep 失败的情况（例如权限问题）。
### 根据会议名称自动标记
```
auto_tag(meeting_name):
  name = meeting_name.toLowerCase()
  tags = []
  if 'office hours' in name or ' oh ' in name: tags.push('oh')
  if 'standup' in name or 'sync' in name: tags.push('sync')
  if '1:1' in name or '1on1' in name: tags.push('1on1')
  if 'board' in name: tags.push('board')
  if 'policy' in name or 'civic' in name: tags.push('civic')
  if not tags: tags.push('meeting')
  return tags
```

### 会议页面结构
```
---
title: "Weekly Team Sync"
type: meeting
date: 2026-04-10
duration: 32 min
source: circleback
source_id: cb_abc123
attendees:
  - {name: Alice Chen, email: alice@company.com}
  - {name: Bob Park, email: bob@company.com}
tags: [sync]
---

# Weekly Team Sync

## Summary
[Circleback AI summary]

## Attendees
- Alice Chen
- Bob Park

## Action Items
- [ ] Alice: unblock API migration by Friday

---

## Transcript

**Alice Chen** (00:00): Let's start with the roadmap...
**Bob Park** (02:15): The prototype is basically done...
```

### 同步后 Git 提交
```
if new_meetings_created > 0:
  shell('git add -A', cwd=BRAIN_DIR)
  msg = f'sync: {count} meeting(s) from Circleback ({start} to {end})'
  shell(f'git commit -m "{msg}"', cwd=BRAIN_DIR)
  shell('git push', cwd=BRAIN_DIR)
```

同步脚本自动提交并推送。这会触发 GBrain
实时同步以索引新页面。
### 设置后代理应测试什么
1. **SSE解析：** 验证`SearchMeetings`返回可解析数据（双JSON
   解析是最常见的失败点）。
2. **幂等性：** 同步会议，手动向文件添加注释，再次同步。
   验证会议是否已跳过（未重新创建或覆盖）。
3. **与会者过滤：** 同步包含与会者的会议室的会议。
   验证该房间未出现在与会者列表中。
4. **自动标记：** 同步名为“1:1 with Sarah”的会议。验证标签是“1on1”。
5. **记录格式：** 验证演讲者姓名和时间戳是否已格式化
   正确（扬声器粗体，括号内为时间戳）。
6. **Git 提交：** 同步 2 个以上会议。验证 git 提交消息包含计数。
## 成本估算
|组件|每月费用|
|------------|-------------|
| Circleback 免费套餐 | $0（每月 10 次会议）|
| Circleback 专业版 | $17/月（无限制）|
| **推荐** | **17 美元/月（专业版）** |
## 故障排除
**未找到会议：**
- 检查 Circleback 是否已录制会议（打开 Circleback 仪表板）
- Circleback 机器人必须加入会议才能进行录制
- 检查日期范围：“--days 30”以扩大搜索范围
**成绩单为空：**
- 某些会议可能没有文字记录（例如，没有音频、机器人已被删除）
- 检查 Circleback 仪表板以了解特定会议的状态
**重复会议：**
- 同步脚本通过 source_id 检查现有文件
- 如果出现重复项，则幂等性检查可能失败
- 手动删除重复项并重新运行同步