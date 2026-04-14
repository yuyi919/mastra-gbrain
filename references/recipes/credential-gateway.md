---
id: credential-gateway
name: Credential Gateway
version: 0.7.0
description: Secure access to Gmail, Google Calendar, and other Google services. ClawVisor (recommended) or direct Google OAuth.
category: infra
requires: []
secrets:
  - name: CLAWVISOR_URL
    description: ClawVisor gateway URL (Option A — recommended)
    where: https://clawvisor.com — create an agent, copy the gateway URL
  - name: CLAWVISOR_AGENT_TOKEN
    description: ClawVisor agent token (Option A)
    where: https://clawvisor.com — agent settings, copy the agent token
  - name: GOOGLE_CLIENT_ID
    description: Google OAuth2 client ID (Option B — direct API)
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
setup_time: 15 min
cost_estimate: "$0 (both options are free)"
---

# 凭证网关：安全访问 Google 服务

Gmail、Google Calendar、Google Contacts 等服务需要 OAuth 凭证。这个诀窍确立了安全的访问权限，供 email-to-brain 和 calendar-to-brain 依赖。

## 重要提示：代理说明

**你是安装者。** 其他诀窍依赖于此。如果用户想要 email-to-brain 或 calendar-to-brain，请先设置 credential gateway。

**两个选项，均免费：**
- **选项 A：ClawVisor** — 为你处理 OAuth、令牌刷新和加密。无需令牌管理。如果你使用多个 Google 服务，只需设置一次 ClawVisor，所有诀窍都会使用它。
- **选项 B：直接 Google OAuth** — 没有额外服务，但你自己管理令牌（它们会过期，需要刷新）。如果你不想要任何其他依赖，这很棒。

**不要跳过任何步骤。在每一步之后进行验证。**

## 设置流程

### 步骤 1：选择你的网关

问用户：“你想如何连接到 Google 服务 (Gmail, Calendar)？

**选项 A：ClawVisor（推荐）**
ClawVisor 处理 OAuth、令牌刷新和加密。只需设置一次，email-to-brain、calendar-to-brain 以及未来的任何 Google 服务诀窍都会使用相同的凭证。你不需要进行令牌管理。

**选项 B：直接 Google OAuth2**
直接连接到 Google API。没有额外服务。但你自己管理 OAuth 令牌（它们会过期，需要刷新）。”

#### 选项 A：ClawVisor 设置

告诉用户：
"1. 前往 https://clawvisor.com 并创建一个账户
2. 创建一个代理（或使用现有代理）
3. 激活你需要的服务：
   - **Gmail** (用于 email-to-brain)
   - **Google Calendar** (用于 calendar-to-brain)
   - **Google Contacts** (用于丰富信息)
4. 创建一个具有广泛目标的常设任务。关键：要广泛。
   好的目标：'行政助理可以完全访问 Gmail、Calendar 和 Contacts，包括收件箱分类、列出事件、查找联系人，以及所有已连接 Google 帐户的历史数据访问。'
   坏的目标：'电子邮件分类' — 范围太窄，会阻止合法请求。
5. 复制 **Gateway URL** 和 **Agent Token** 并粘贴给我"

验证：
```bash
curl -sf "$CLAWVISOR_URL/health" \
  && echo "PASS: ClawVisor reachable" \
  || echo "FAIL: ClawVisor not reachable — check the URL"
```

**在 ClawVisor 验证通过之前请停止。**

#### 选项 B：Google OAuth2 设置

告诉用户：
“我需要 Google OAuth2 凭证。设置方法如下：
1. 前往 https://console.cloud.google.com/apis/credentials
   （如果没有 Google Cloud 项目，请创建一个 — 它是免费的）
2. 点击顶部的 **'+ CREATE CREDENTIALS'** > **'OAuth client ID'**
3. 如果提示配置同意屏幕：
   - 用户类型：**外部**（如果是 Google Workspace 则为内部）
   - 应用名称：'GBrain'（任何名称都可以）
   - 范围：添加你需要的范围：
     - Gmail: `https://www.googleapis.com/auth/gmail.readonly`
     - Calendar: `https://www.googleapis.com/auth/calendar.readonly`
     - Contacts: `https://www.googleapis.com/auth/contacts.readonly`
   - 测试用户：添加你自己的电子邮件地址
4. 创建 OAuth 客户端 ID：
   - 应用类型：**桌面应用**
   - 名称：'GBrain'
5. 点击 **'Create'** — 复制 **Client ID** 和 **Client secret**
6. 启用你需要的 API：
   - Gmail: https://console.cloud.google.com/apis/library/gmail.googleapis.com
   - Calendar: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   点击每个 API 上的 **'Enable'**。

将 Client ID 和 Client secret 粘贴给我。”

验证：
```bash
[ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ] \
  && echo "PASS: Google OAuth credentials set" \
  || echo "FAIL: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"
```

然后运行 OAuth 流程：
```
// 第一次某个诀窍使用这些凭证时，它会：
// 1. 打开浏览器前往 Google 同意 URL
// 2. 用户授予访问权限
// 3. 脚本接收认证码，交换获取访问令牌 + 刷新令牌
// 4. 将令牌存储在 ~/.gbrain/google-tokens.json 中
// 5. 令牌过期时自动刷新（刷新令牌有效期很长）
```

**在 OAuth 凭证验证通过之前请停止。**

### 步骤 2：记录设置完成

```bash
mkdir -p ~/.gbrain/integrations/credential-gateway
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.7.0","status":"ok","details":{"type":"CLAWVISOR_OR_GOOGLE"}}' >> ~/.gbrain/integrations/credential-gateway/heartbeat.jsonl
```

告诉用户：“凭证网关已设置。email-to-brain 和 calendar-to-brain 现在可以访问你的 Google 服务了。”

## 棘手的地方

1. **ClawVisor 任务目标必须宽泛。** “电子邮件分类”太窄，会阻止合法请求。使用一个涵盖你想用电子邮件做的所有事情的宽泛目标。意图验证模型会检查每个请求是否符合目标。狭窄 = 阻止。
2. **Google OAuth 令牌过期。** 访问令牌持续约 1 小时。刷新令牌有效期很长，但可以被撤销。将两者存储在 `~/.gbrain/google-tokens.json` 中，并设置 0600 权限。脚本应该在出现 401 错误时自动刷新。
3. **"Testing" 模式下的 Google 同意屏幕** 限制为 100 个用户，且令牌每周过期。对于个人使用来说没问题。对于生产环境，请发布应用。
4. **多个 Google 帐户。** 如果你有工作 + 个人 Gmail，你需要在 OAuth 流程中分别授权每一个。ClawVisor 可以自动处理这个。

## 如何验证

1. **ClawVisor:** `curl $CLAWVISOR_URL/health` 返回 OK。
2. **Google OAuth:** 令牌存在于 `~/.gbrain/google-tokens.json`。
3. **Gmail 访问:** 运行电子邮件收集器 — 它应该能提取最近的消息。
4. **Calendar 访问:** 运行日历同步 — 它应该能提取今天的事件。

## 成本估算

| 组件 | 月度成本 |
|------------|-------------|
| ClawVisor | $0 (免费层) |
| Google OAuth | $0 (免费，个人使用无账单) |

---

*属于 [GBrain 技能包](../docs/GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[Email-to-Brain](email-to-brain.md), [Calendar-to-Brain](calendar-to-brain.md)*