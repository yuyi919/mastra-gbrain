# 凭证网关 (Credential Gateway)
为了让 GBrain 发挥其作为个人操作系统的全部潜力，你的代理需要访问你的电子邮件、日历和联系人。但你绝不应该将你的 Google 凭据交给一个在不受信任的环境中运行黑盒模型的代理。
**凭证网关** 模式通过在本地运行一个处理 OAuth 的“瘦线束 (thin harness)”，然后通过代理可以调用​​的受限工具（例如“获取今天的会议”）暴露数据，从而解决了这个问题。代理永远不会看到令牌。
## 架构
```
[Google OAuth] <--> [ClawVisor (本地安全带)] <--> [AI 代理 (OpenClaw/Hermes)] <--> [GBrain MCP]
                        |                                |
                   凭据存储                          (不知道令牌)
                 (AES-256 加密)
```

1. **ClawVisor（或等效的线束）** 管理 OAuth 流程并安全地存储刷新令牌。
2. **代理** 通过 MCP 工具（`get_emails`、`read_calendar`）请求数据。
3. **线束** 拦截工具调用，注入访问令牌，调用 Google API，并仅将相关数据返回给代理。
## 步骤 1：设置 Google Cloud Console
1. 转到 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建一个新项目（例如，“GBrain Gateway”）
3. 启用 API：
   - Gmail API
   - Google Calendar API
   - People API (用于联系人)
4. 转到 **API 和服务 > OAuth 同意屏幕**
   - 用户类型：外部（因为它是供你个人使用的）
   - 应用名称：GBrain Gateway
   - 添加范围：`.../auth/gmail.readonly`、`.../auth/calendar.readonly`、`.../auth/contacts.readonly`
   - 将你自己的 Google 帐户添加为**测试用户**
5. 转到 **凭据 > 创建凭据 > OAuth 客户端 ID**
   - 应用程序类型：桌面应用程序
   - 下载 JSON（这包含你的 `client_id` 和 `client_secret`）
## 步骤 2：配置你的线束
*如果你使用的是 OpenClaw / ClawVisor：*
1. 将下载的客户端 JSON 移动到你的配置目录：
   `mv ~/Downloads/client_secret_*.json ~/.claw/google_client_secret.json`
2. 运行授权流程：
   `claw auth google`
3. 这将打开一个浏览器。使用你的测试用户帐户登录。由于该应用未经验证，Google 会显示警告——点击“继续”。
4. ClawVisor 将交换代码以获取刷新令牌，使用机器的密钥对其进行加密，并将其存储在 `~/.claw/credentials.enc` 中。
## 步骤 3：为代理暴露工具
线束现在需要为代理提供无需令牌即可使用的工具。
### 日历工具
**`get_calendar_events(start_date, end_date)`**
- 线束解密刷新令牌，获取访问令牌。
- 调用 `GET https://www.googleapis.com/calendar/v3/calendars/primary/events`
- **过滤掉私人事件详细信息**，仅将相关的摘要、时间、与会者电子邮件传递给代理。
### Gmail 工具
**`search_emails(query, max_results)`**
- 线束使用令牌调用 Gmail API。
- 将原始 MIME 消息解析为干净的纯文本。
- 将发件人姓名、电子邮件、主题和干净的文本返回给代理。
### 联系人工具
**`get_contact(email_or_name)`**
- 线束查询 People API。
- 返回合并的联系人资料（电话号码、备用电子邮件、关联的公司）。
## 步骤 4：连接到 GBrain 摄取
现在代理有了数据，它可以为 GBrain 供源：
- **早晨简报 cron** 调用 `get_calendar_events` 来查看你今天见谁，然后调用 `gbrain get <slug>` 来获取他们的背景信息。
- **电子邮件分流 cron** 调用 `search_emails("is:unread")`，使用 GBrain 评估重要性，并起草回复。
- 当代理发现一个未知联系人时，它会调用 `get_contact`，然后使用提取的数据在 GBrain 中创建/更新人物页面。
## 安全护栏
1. **只读范围：** 如果你只想要摄取，只能申请 `.readonly` 范围。如果代理受损，它无法发送电子邮件或删除日历事件。
2. **本地加密：** 刷新令牌必须在静止时加密。
3. **不要将令牌传递给代理：** 永远不要让代理直接调用 `fetch("https://googleapis.com/...", { headers: { Authorization: "Bearer " + token } })`。始终让线束进行调用。这可以防止代理在提示注入攻击中泄露令牌。
---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[获取数据](README.md)*