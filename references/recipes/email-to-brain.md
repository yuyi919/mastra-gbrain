---
id: email-to-brain
name: Email-to-Brain
version: 0.7.0
description: Gmail messages flow into brain pages. Deterministic collector pulls emails, agent analyzes and enriches entities.
category: sense
requires: [credential-gateway]
secrets:
  - name: CLAWVISOR_URL
    description: ClawVisor gateway URL (Option A — recommended, handles OAuth for you)
    where: https://clawvisor.com — create an agent, activate Gmail service
  - name: CLAWVISOR_AGENT_TOKEN
    description: ClawVisor agent token (Option A)
    where: https://clawvisor.com — agent settings, copy the agent token
  - name: GOOGLE_CLIENT_ID
    description: Google OAuth2 client ID (Option B — direct Gmail API access)
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

# 电子邮件到大脑：使用 Gmail 消息更新你的大脑

电子邮件到达。大脑页面变得更智能。代理解析你的收件箱，检测实体，更新人物和公司页面，提取待办事项，并将一切附上来源归属。

## 重要提示：代理说明

**你是安装者。** 严格按照这些步骤操作。

**核心模式：代码用于数据，LLM 用于判断。**
电子邮件收集分为两层：
1. 确定性：代码提取电子邮件、生成 Gmail 链接、检测噪音/签名。这永远不会失败。链接始终正确。时间戳始终准确。
2. 潜在性：你（代理）阅读收集到的电子邮件并做出判断。谁重要？提到了哪些实体？存在哪些待办事项？

**不要尝试自己提取电子邮件。** 使用收集器脚本。它处理分页、去重、Gmail 链接生成和噪音过滤。如果你尝试通过原始 API 调用来执行此操作，你会弄错链接、漏掉电子邮件或中断分页。收集器的存在是因为 LLM 在这方面一直失败。

**为什么顺序执行很重要：**
- 步骤 1 验证凭证网关。没有它，就无法连接到 Gmail。
- 步骤 2 设置收集器。没有它，你就无法分析电子邮件。
- 步骤 3 进行第一次收集。没有数据，步骤 4 就无法丰富。
- 步骤 4 是你的工作：阅读摘要，更新大脑页面。

## 架构

```
Gmail 账户
  ↓ (ClawVisor E2E 加密网关)
Email Collector (确定性的 Node.js 脚本)
  ↓ 输出:
  ├── messages/{YYYY-MM-DD}.json     (结构化的电子邮件数据)
  ├── digests/{YYYY-MM-DD}.md        (供代理使用的 markdown 摘要)
  └── state.json                     (分页状态，已知的 ID)
  ↓
代理读取摘要
  ↓ 判断决策:
  ├── 实体检测 (提到的人物、公司)
  ├── 大脑页面更新 (时间线条目、编译的真相)
  ├── 待办事项提取
  └── 优先级分类 (紧急 / 正常 / 噪音)
```

## 极具主观观点的默认设置

**噪音过滤（确定性的，在收集器中）：**
- 跳过：noreply@, notifications@, calendar-notification@
- 标记：DocuSign, Dropbox Sign, HelloSign, PandaDoc（需要操作的签名）
- 保留：其他所有内容

**电子邮件帐户：** 配置多个帐户。常见的设置：
- 工作电子邮件（公司域）
- 个人电子邮件 (gmail.com)

**摘要格式：** 每日 markdown 文件，包含以下部分：
- 待签名（DocuSign 等需要采取行动的）
- 待分类消息（来自真实人类的真实电子邮件）
- 噪音（已过滤，在需要时可用）

每封电子邮件都会有一个内置的 Gmail 链接：`[Open in Gmail](https://mail.google.com/mail/u/?authuser=ACCOUNT#inbox/MESSAGE_ID)` — 这些链接是由代码生成的，而不是由 LLM 生成的，因此它们始终是正确的。

## 先决条件

1. **已安装并配置 GBrain**（`gbrain doctor` 通过）
2. **Node.js 18+**（用于收集器脚本）
3. **通过以下方式之一访问 Gmail**：
   - ClawVisor（推荐：端到端加密的凭证网关）
   - Google OAuth 凭证（直接 API 访问）
   - Hermes Gateway（如果你使用 Hermes Agent，则内置的 Gmail 连接器）

## 设置流程

### 步骤 1：验证凭证网关

问用户：“你想如何以编程方式访问 Gmail？选项：
1. ClawVisor（推荐，处理 OAuth 和加密）
2. Google OAuth 凭证（你自己管理令牌）
3. Hermes Gateway（如果你正在使用 Hermes Agent）”

#### 选项 A：ClawVisor（推荐）

告诉用户：
“我需要你的 ClawVisor URL 和代理令牌。
1. 前往 https://clawvisor.com
2. 创建代理（或使用现有代理）
3. 激活 Gmail 服务
4. 创建一个具有广泛目标的常设任务：‘全面的行政助理电子邮件管理，包括收件箱分类、按任何条件搜索、读取电子邮件、追踪对话线索’
   重要提示：任务目的要广泛。诸如‘电子邮件分类’之类的狭隘目标会导致合法请求未经验证。
5. 复制网关 URL 和代理令牌”

验证：
```bash
curl -sf "$CLAWVISOR_URL/health" && echo "PASS: ClawVisor reachable" || echo "FAIL"
```

**在 ClawVisor 验证通过之前请停止。**

#### 选项 B：直接 Google OAuth2

告诉用户：
“我需要 Google OAuth2 凭证来访问 Gmail。设置方法如下：
1. 前往 https://console.cloud.google.com/apis/credentials
   （如果没有 Google Cloud 项目，请创建一个）
2. 点击 **'+ CREATE CREDENTIALS'** > **'OAuth client ID'**
3. 如果出现提示，请配置 OAuth 同意屏幕：
   - 用户类型：**外部**（如果拥有 Google Workspace，则为内部）
   - 应用名称：'GBrain Email'（任何名称都可以）
   - 范围：添加 **'Gmail API .../auth/gmail.readonly'**
   - 测试用户：添加你自己的电子邮件地址
4. 创建 OAuth 客户端 ID：
   - 应用类型：**桌面应用**
   - 名称：'GBrain'
5. 复制 **Client ID** 和 **Client secret**
6. 也要启用 Gmail API：
   前往 https://console.cloud.google.com/apis/library/gmail.googleapis.com
   点击 **'Enable'**”

验证：
```bash
[ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ] \
  && echo "PASS: Google OAuth credentials set" \
  || echo "FAIL: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"
```

然后运行 OAuth 流程以获取令牌：
```bash
# 收集器脚本处理 OAuth 流程:
# 1. 打开浏览器前往 Google 同意 URL，带有 gmail.readonly 范围
# 2. 用户授予访问权限
# 3. 脚本接收认证码，交换获取访问令牌 + 刷新令牌
# 4. 将令牌存储在 ~/.gbrain/google-tokens.json 中
# 5. 过期时自动刷新
```

**在 OAuth 流程完成并存储令牌之前请停止。**

### 步骤 2：设置电子邮件收集器

创建收集器目录和脚本：
```bash
mkdir -p email-collector/data/{messages,digests}
cd email-collector
npm init -y
```

收集器脚本需要这些功能：
1. **收集 (collect)** — 通过凭证网关从 Gmail 中拉取电子邮件，按 message ID 去重，存储为 JSON，并内置 Gmail 链接
2. **摘要 (digest)** — 从收集到的电子邮件中生成 markdown 摘要，分组为：待签名、待分类消息、噪音
3. **状态追踪** — 记住上次收集的时间戳和已知的 message IDs，以避免重复处理

收集器的关键设计规则：
- Gmail 链接由 CODE 生成，不是由 LLM 生成。格式：`[Open in Gmail](https://mail.google.com/mail/u/?authuser=ACCOUNT#inbox/MESSAGE_ID)`
- 噪音过滤是确定性的：noreply, notifications, calendar invites
- 签名检测使用已知模式：DocuSign 邮件信封, Dropbox Sign, HelloSign, PandaDoc
- 所有状态都保存到 `data/state.json`（上次收集的时间戳，已知 message IDs）
- 输出为结构化 JSON（机器可读）和 markdown 摘要（代理可读）

### 步骤 3：运行第一次收集

```bash
node email-collector.mjs collect
node email-collector.mjs digest
```

验证：`ls data/digests/` 应该显示今天的摘要文件。
阅读摘要。确认它包含真实的电子邮件和有效的 Gmail 链接。

### 步骤 4：丰富大脑页面

这是你的工作（代理）。阅读摘要。对于每封电子邮件：
1. **检测实体**：谁发来的？提到了谁？什么公司？
2. **检查大脑**：`gbrain search "发件人姓名"` — 我们有页面吗？
3. **更新大脑页面**：如果发件人有大脑页面，追加一个时间线条目：
   `- YYYY-MM-DD | Email from {sender}: {subject} [Source: Gmail, {date}]`
4. **创建新页面**：如果发件人引人注目但没有页面，则创建一个
5. **提取待办事项**：如果电子邮件需要回复或采取行动，请记录下来
6. **同步**：运行 `gbrain sync --no-pull --no-embed` 索引更改

### 步骤 5：设置 Cron

收集器应该每 30 分钟运行一次：
```bash
*/30 * * * * cd /path/to/email-collector && node email-collector.mjs collect && node email-collector.mjs digest
```

代理应该按计划阅读摘要（例如，每天 3 次：上午 9 点，中午 12 点，下午 3 点）并运行步骤 4 中的丰富流程。

### 步骤 6：记录设置完成

```bash
mkdir -p ~/.gbrain/integrations/email-to-brain
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.7.0","status":"ok"}' >> ~/.gbrain/integrations/email-to-brain/heartbeat.jsonl
```

## 实现指南

这些是经过生产测试的模式。完全按照它们来执行。

### 噪音过滤（确定性）

```
NOISE_SENDERS = ['noreply', 'no-reply', 'notifications@', 'calendar-notification',
                 'mailer-daemon', 'postmaster', 'donotreply']

is_noise(email):
  from = email.from.toLowerCase()
  return NOISE_SENDERS.some(p => from.includes(p))  // 子字符串匹配
```

简单的子字符串匹配，不要用正则表达式。`notifications@slack.com` 匹配是因为 `notifications@` 在模式列表中。顺序无关紧要。

### 签名检测

```
SIGNATURE_PATTERNS = [
  /docusign/i, /dropbox sign/i, /hellosign/i, /pandadoc/i,
  /please sign/i, /signature needed/i, /ready for your signature/i,
  /everyone has signed/i, /you just signed/i
]

is_signature(email):
  subject = email.subject || ''
  from = email.from || ''
  return SIGNATURE_PATTERNS.some(p => p.test(subject) || p.test(from))
```

测试主题和发件人。签名请求的“docusign”在发件人地址中，而不仅仅是在主题中。

### Gmail 链接生成（关键）

```
gmail_link(messageId, authuser):
  return `https://mail.google.com/mail/u/?authuser=${authuser}#inbox/${messageId}`
```

`authuser` 参数极其重要。如果没有它，链接将默认打开不正确的 Gmail 帐户。每条电子邮件记录分别存储其帐户。使用代码生成这些链接，而不是让 LLM 生成。链接必须 100% 可靠。

### 去重

```
collect():
  state = load_state()
  since = state.lastCollect ? `newer_than:${hours_since}h` : 'newer_than:1d'

  for account in accounts:
    inbox = gmail.list(query=since, max=50)
    for msg in inbox:
      if msg.id in state.knownMessageIds: continue  // 已见过的
      record = build_record(msg)
      state.knownMessageIds[msg.id] = record

    // 还要拉取已发送邮件以检测回复
    sent = gmail.list(query=`from:${account.email} ${since}`, max=30)
    for msg in sent:
      state.knownMessageIds[msg.id] = {is_sent: true}
```

**为什么已发送邮件很重要：** 如果没有它，摘要将把您已经回复过的邮件线程显示为“等待回复”。已发送邮件充当负面过滤器。

### 代理在设置后应该测试什么

1. **噪音过滤：** 发送一封测试邮件至 `noreply@test.com`。运行收集。验证它出现在噪音部分，而不是待分类部分。
2. **Gmail 链接：** 点击摘要中的链接。验证它打开了正确的帐户（而不是默认帐户）。
3. **去重：** 在 1 分钟内运行两次收集。验证没有重复的消息。
4. **已发送邮件：** 手动回复一封电子邮件。运行收集。验证该线索在摘要中被标记为已回复。

## 成本估算

| 组件 | 月度成本 |
|------------|-------------|
| ClawVisor (免费层) | $0 |
| Gmail API | $0 (在免费配额内) |
| **总计** | **$0** |

## 故障排除

**没有收集到电子邮件：**
- 检查 ClawVisor 健康状况：`curl $CLAWVISOR_URL/health`
- 检查常设任务是否激活并启用了 Gmail 服务
- 检查任务目标是否足够宽泛（狭窄的目标会阻止请求）

**Gmail 链接无法正常工作：**
- 验证 `authuser` 参数与账户邮箱相匹配
- Gmail 链接要求已登录正确的 Google 账户

**摘要为空，但收集已运行：**
- 检查 `data/messages/` 目录中的 JSON 文件
- 所有的邮件可能都被过滤为噪音了 — 检查噪音过滤规则