# 会议和通话 Webhooks

## 1. Circleback — 通过 Webhooks 摄取会议

[Circleback](https://circleback.ai) 记录会议，生成带说话者分类的文字记录，并在会议结束时触发 webhooks。

**Webhook 设置：**
1. 在 Circleback 仪表板 -> Automations (自动化) -> Add webhook (添加 webhook)
2. URL: `{your_agent_gateway}/hooks/circleback-meetings`
3. Circleback 提供一个用于 HMAC-SHA256 签名验证的 signing secret（签名密钥）
4. 将签名密钥存储在 Webhook 转换层中以进行验证

**Webhook 负载：** 包含 ID、标题、与会者、笔记、待办事项、完整文字记录、日历事件上下文的会议 JSON。

**签名验证：** `X-Circleback-Signature` 标头包含 `sha256=<hex>`。
使用 `HMAC-SHA256(body, signing_secret)` 进行验证。拒绝未经验证的 webhooks。

**用于 API 访问的 OAuth：** Circleback 使用动态客户端注册 (OAuth 2.0)。
访问令牌在大约 24 小时后过期，通过刷新令牌自动刷新。将凭据存储在代理记忆中。

**流程：** Webhook 触发 -> 转换层验证签名 + 标准化 -> 唤醒代理 -> 通过 API 获取完整文字记录 -> 创建大脑会议页面 -> 传播到实体页面 -> 提交到大脑仓库 -> `gbrain sync`。

## 2. Quo (OpenPhone) — 短信和通话集成

[Quo](https://openphone.com)（前身为 OpenPhone）提供商务电话号码、短信、通话、语音邮件和 AI 文字记录。

**Webhook 设置：**
1. 在 Quo 仪表板 -> Integrations (集成) -> Webhooks
2. 注册 webhooks：`message.received`, `call.completed`, `call.summary.completed`, `call.transcript.completed`
3. 全部指向：`{your_agent_gateway}/hooks/quo-events`
4. 将注册的 webhook IDs 存储在代理记忆中

**呼入短信的工作原理：**
- Webhook 触发，携带发件人电话、消息文本、对话上下文
- 代理通过电话号码在大脑中查找发件人
- 将消息连同发件人身份 + 大脑上下文一起显示在用户的消息平台上
- 起草回复供批准（未经明确许可，绝不自动回复）

**呼入通话的工作原理：**
- `call.completed` 触发 -> 如果持续时间 > 30秒，通过 API 获取文字记录 + AI 摘要
- 摄取到大脑（会议风格的页面，放在 `meetings/` 下）
- 更新相关的人物和公司页面

**API 认证：** `Authorization` 标头中的裸 API 密钥（没有 Bearer 前缀）。

**关键端点：** `POST /v1/messages` (发送短信), `GET /v1/messages` (列表),
`GET /v1/call-transcripts/{id}`, `GET /v1/conversations`.

---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[获取数据](README.md)*