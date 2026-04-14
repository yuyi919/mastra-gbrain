---
id: twilio-voice-brain
name: Voice-to-Brain
version: 0.8.1
description: Phone calls create brain pages via Twilio + voice pipeline + GBrain MCP. Two architectures -- OpenAI Realtime (turnkey) or DIY STT+LLM+TTS (full control). Callers talk, brain pages appear.
category: sense
requires: [ngrok-tunnel]
secrets:
  - name: TWILIO_ACCOUNT_SID
    description: Twilio account SID (starts with AC)
    where: https://www.twilio.com/console — visible on the main dashboard after login
  - name: TWILIO_AUTH_TOKEN
    description: Twilio auth token (click "Show" next to the SID on the dashboard)
    where: https://www.twilio.com/console — click "Show" under Auth Token on the main dashboard
  - name: OPENAI_API_KEY
    description: OpenAI API key (needs Realtime API access enabled on your account)
    where: https://platform.openai.com/api-keys — click "+ Create new secret key", copy immediately (you can't see it again)
health_checks:
  - type: http
    url: "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json"
    auth: basic
    auth_user: "$TWILIO_ACCOUNT_SID"
    auth_pass: "$TWILIO_AUTH_TOKEN"
    label: "Twilio API"
  - type: http
    url: "https://api.openai.com/v1/models"
    auth: bearer
    auth_token: "$OPENAI_API_KEY"
    label: "OpenAI API"
setup_time: 30 min
cost_estimate: "$15-25/mo (Twilio number $1-2 + voice $0.01/min, OpenAI Realtime $0.06/min input + $0.24/min output)"
---

# 语音到大脑：创建大脑页面的电话
拨打电话号码。讲话。出现实体检测的结构化大脑页面，
交叉引用以及发布到您的消息应用程序的摘要。
## 重要提示：代理说明
**你是安装者。** 这个秘籍是为你（AI代理）编写的来执行的
代表用户。严格遵循这些说明。
**为什么顺序执行很重要：** 每一步都依赖于前一步：
- 步骤 1 验证先决条件。如果未配置 GBrain，则其他任何操作都不起作用。
- 第 2 步收集凭据。如果凭据错误，步骤 5-7 将默默失败。
- 步骤 3 创建 ngrok 隧道。步骤 5 需要 Twilio webhook 的 ngrok URL。
- 步骤 5 配置 Twilio。步骤 7（冒烟测试）需要配置 Twilio 才能访问您的服务器。
**不要跳过步骤。不要重新排序步骤。不要批处理多个步骤。**
**停止点（在继续之前必须暂停并验证）：**
- 第 1 步之后：所有先决条件都通过了吗？如果没有，请在继续之前修复。
- 第 2 步中的每个凭证之后：验证是否通过？如果没有，请帮助用户修复它。
- 第 6 步之后：健康检查通过了吗？如果没有，请在冒烟测试前进行调试。
- 第 7 步之后：大脑页面已创建？如果没有，请在宣布成功之前排除故障。
**当出现故障时：** 准确地告诉用户什么失败了，它意味着什么，以及什么
去尝试。永远不要说“出了什么问题”。说“Twilio 返回了 401，这意味着
身份验证令牌不正确。我们重新输入一下吧。”
＃＃ 建筑学
两种管道选项：
### 选项 A：OpenAI Realtime（交钥匙，更简单）```
Caller (phone)
  ↓ Twilio (WebSocket, g711_ulaw audio — no transcoding)
Voice Server (Node.js, your machine or cloud)
  ↓↑ OpenAI Realtime API (STT + LLM + TTS in one pipeline)
  ↓ Function calls during conversation
GBrain MCP (semantic search, page reads, page writes)
  ↓ Post-call
Brain page created (meetings/YYYY-MM-DD-call-{caller}.md)
Summary posted to messaging app (Telegram/Slack/Discord)
```

### 选项 B：DIY STT+LLM+TTS（完全控制，生产级）```
Caller (phone or WebRTC browser)
  ↓ Twilio WebSocket OR WebRTC
Voice Server (Node.js)
  ↓ Deepgram STT (streaming speech-to-text, speaker diarization)
  ↓ Claude API (streaming SSE, sentence-boundary dispatch)
  ↓ Cartesia / OpenAI TTS (text-to-speech, low latency)
  ↓ Function calls during conversation
GBrain MCP (semantic search, page reads, page writes)
  ↓ Post-call
Brain page + audio upload + transcript storage
```

**为什么选择 v2（选项 B）？** OpenAI Realtime 是一个黑匣子 — 您无法控制 STT
质量、交换法学硕士或调试音频问题。 DIY堆栈给你透明
Deepgram+Claude+TTS，完全控制每个阶段。权衡：更多集成
工作，但你拥有管道。
**经过生产测试的 v2 架构（pipeline.mjs，约 250 行）：**
- 从 Claude 流式传输 SSE，并进行句子边界 TTS 调度
- 20 轮对话历史记录上限（防止上下文膨胀）
- STT/TTS 断开连接时具有指数退避功能的重新连接逻辑
- 定期保持活动以防止 WebSocket 超时
- 自然轮流的音频端点
- 默认为智能 VAD (Silero)，具有一键通回退功能
## 固执己见的默认值
这些是实际部署中经过生产测试的默认值。设置后自定义。
**呼叫者路由（基于提示，强制服务器端）：**
- 所有者：通过安全通道进行 OTP 质询，然后完全访问（读 + 写 + 网关）
- 可信联系人：回调验证、范围写入访问
- 已知联系人（大脑得分 >= 4）：通过名字热情问候，主动提出转接
- 未知来电者：屏幕、询问姓名+原因、留言
**安全：**
- `/voice` 端点上的 Twilio 签名验证（X-Twilio-Signature 标头）
- 未经身份验证的调用者永远看不到写入工具
- 身份验证不信任来电显示（需要 OTP 或回调）
---

## 设置流程
### 第 1 步：检查先决条件
**如果任何检查失败则停止。在继续之前先修复。**
运行这些检查并向用户报告结果：
```bash
# 1. Verify GBrain is configured
gbrain doctor --json
```
如果失败：“GBrain 尚未设置。让我们先运行 `gbrain init --supabase`。”
```bash
# 2. Verify Node.js 18+
node --version
```
如果缺少或 < 18：“需要 Node.js 18+。安装它：https://nodejs.org/en/download”
```bash
# 3. Check if ngrok is installed
which ngrok
```
如果丢失：
- **Mac：** “在终端中运行 `brew install ngrok`。”
- **Linux:** “运行 `snap install ngrok` 或从 https://ngrok.com/download 下载”
告诉用户：“已检查所有先决条件。[N/3 通过]。[列出失败的项目以及如何修复。]”
### 第 2 步：收集并验证凭证
一次索取每份凭证。立即验证。不要继续
下一个凭证，直到当前凭证验证为止。
**凭证 1：Twilio 帐户 SID + 身份验证令牌**
告诉用户：
“我需要您的 Twilio 帐户 SID 和身份验证令牌。以下是找到它们的确切位置：
1. 访问 https://www.twilio.com/console（如果没有帐户，请免费注册）
2. 登录后，您将在主仪表板上看到您的 **帐户 SID**
   （以“AC”开头，后跟 32 个字符）
3. 在其下方，您将看到 **Auth Token** — 单击 **“显示”** 以显示它
4. 复制这两个值并将其粘贴给我”
用户提供后，立即验证：
```bash
curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  | grep -q '"status"' \
  && echo "PASS: Twilio credentials valid" \
  || echo "FAIL: Twilio credentials invalid — double-check the SID starts with AC and the auth token is correct"
```

**如果验证失败：** “那不起作用。常见问题：(1) SID 应启动
使用“AC”，(2) 确保单击“显示”以显示身份验证令牌并复制
完整值，(3) 如果您刚刚创建帐户，请等待 30 秒，然后重试。”
**在此停止，直到 Twilio 验证为止。**
**凭证 2：OpenAI API 密钥**
告诉用户：
“我需要您的 OpenAI API 密钥。以下是获取密钥的确切位置：
1. 访问https://platform.openai.com/api-keys
2.点击**'+创建新密钥'**（右上角）
3. 将其命名为“gbrain-voice”
4. 单击**“创建密钥”**
5. **立即复制密钥** — 关闭对话框后您将无法再看到它
6.粘贴给我
注意：您的 OpenAI 帐户需要实时 API 访问权限。大多数帐户默认都有它。”
用户提供后，立即验证：
```bash
curl -sf -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models > /dev/null \
  && echo "PASS: OpenAI key valid" \
  || echo "FAIL: OpenAI key invalid — make sure you copied the full key (starts with sk-)"
```

**如果验证失败：**“这不起作用。常见问题：(1) 密钥以
'sk-'，(2) 确保您复制了整个密钥（很长），(3) 如果您刚刚创建
它会立即生效——无需延迟。”
**在此停止，直到 OpenAI 验证为止。**
**凭证 3：ngrok 帐户（推荐爱好级别）**
告诉用户：
“我需要您的 ngrok 身份验证令牌。**我强烈推荐 Hobby 层（8 美元/月）**
因为它给了你一个永远不会改变的固定域。通过免费套餐，
每次 ngrok 重新启动时，您的 URL 都会发生变化，从而破坏 Twilio 和 Claude Desktop。
1. 前往 https://dashboard.ngrok.com/signup（注册）
2. **推荐：** 前往 https://dashboard.ngrok.com/billing 并升级到
   **爱好**（8 美元/月）。这给了你一个固定的域。
3. 如果您已升级：请转至 https://dashboard.ngrok.com/domains 并单击
   **'+新域'**。选择一个名称（例如“your-brain-voice.ngrok.app”）。
4. 访问 https://dashboard.ngrok.com/get-started/your-authtoken
5. 复制您的 **Authtoken** 并将其粘贴给我
6. 另请告诉我您的固定域名（如果您创建了一个）”
```bash
ngrok config add-authtoken $NGROK_TOKEN \
  && echo "PASS: ngrok configured" \
  || echo "FAIL: ngrok auth token rejected"
```

如果用户有固定域，请使用 `--url` 标志（下面的步骤 3）。
如果用户仍使用免费套餐，则 URL 将在重新启动时更改（看门狗会处理此问题）。
**证书 4：消息传递平台（用于通话摘要）**
询问用户：“我应该在哪里发送通话摘要？选项：Telegram、Slack 或 Discord。”
根据他们的选择：
- **Telegram:** “通过 Telegram 上的 @BotFather 创建一个机器人，复制机器人令牌，然后
  告诉我将摘要发送到哪个聊天/组。”
  验证： `curl -sf "https://api.telegram.org/bot$TOKEN/getMe" | grep -q '“确定”：true'`
- **Slack：**“在 https://api.slack.com/apps → 您的应用程序 → 创建传入 Webhook
  传入 Webhook → 添加新的。复制 Webhook URL。”
  验证： `curl -sf -X POST -d '{"text":"GBrain 语音测试"}' $WEBHOOK_URL`
- **Discord：**“转到您的服务器→通道设置→集成→Webhooks→
  新的网络钩子。复制 Webhook URL。”
  验证： `curl -sf -X POST -H "Content-Type: application/json" -d '{"content":"GBrain voice test"}' $WEBHOOK_URL`
告诉用户：“所有凭据均已验证。转向服务器设置。”
### 步骤 3：启动 ngrok 隧道
```bash
# With fixed domain (Hobby tier — recommended):
ngrok http 8765 --url your-brain-voice.ngrok.app

# Without fixed domain (free tier — URL changes on restart):
ngrok http 8765
```

如果使用固定域，则 URL 始终为“https://your-brain-voice.ngrok.app”。
如果使用免费套餐，请从 ngrok 输出复制 URL（每次重新启动时都会更改）。
注意：ngrok 在前台运行。在后台进程或新的终端选项卡中运行它。
同一个 ngrok 帐户还可以为您的 GBrain MCP 服务器提供服务（请参阅
[ngrok-tunnel 配方](recipes/ngrok-tunnel.md) 用于完整的多服务模式）。
### 步骤 4：创建语音服务器
创建语音服务器目录并安装依赖项：
```bash
mkdir -p voice-agent && cd voice-agent
npm init -y
npm install ws express
```

语音服务器需要`server.mjs`中的这些组件：
1. **HTTP 服务器** 在端口 8765 上：
   - `POST /voice` — 返回打开 WebSocket 媒体流到 `/ws` 的 TwiML
   - `GET /health` — 返回 `{ ok: true }`
   -“/voice”上的 Twilio 签名验证（“X-Twilio-Signature”标头）
2. `/ws` 处的 **WebSocket 处理程序**：
   - 接受 Twilio 媒体流（g711_ulaw 音频）
   - 打开第二个 WebSocket 到 `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`
   - 双向桥接音频（无转码 - 双方均使用 g711_ulaw）
   - 处理来自 OpenAI 的 `response.function_call_arguments.done` 事件（工具执行）
   - 通过“conversation.item.create”以“function_call_output”类型发送回工具结果
3. **系统提示生成器**，获取呼叫者电话号码并返回：
   - 基于呼叫者路由规则的适当问候语
   - 可用工具（未经身份验证为只读，经过身份验证为完整）
   - 说明：“你是语音助手。回答前先搜索一下大脑
     问题。接收来自未知呼叫者的消息。千万不要先挂断电话。”
4. **工具执行器**：
   - 生成 GBrain MCP 客户端（`gbrainserve` 作为 stdio 子进程）
   - 路由函数调用：`search_brain`→`gbrain query`、`lookup_person`→`gbrain search`+`gbrain get`
   - 盖茨在身份验证背后编写工具
5. **调用后处理程序**：
   - 将记录保存到 `brain/meetings/YYYY-MM-DD-call-{caller}.md`
   - 将摘要发布到用户的消息平台
   - 运行“gbrainsync --no-pull --no-embed”来索引新页面
6. **WebRTC端点**（可选，用于基于浏览器的调用）：
   - `POST /session` — 接受 SDP 提议，将其作为多部分表单数据转发到 OpenAI Realtime `/v1/realtime/calls`，返回 SDP 应答
   - `GET /call` — 提供一个 Web 客户端 HTML 页面：
     - WebRTC 连接到 OpenAI 实时 API
     - RNNoise WASM 噪声抑制（AudioWorklet）
     - 一键通和自动 VAD 模式切换
     - 管道：麦克风 → RNNoise 降噪 → MediaStream → WebRTC → OpenAI
   - `POST /tool` — 从 WebRTC 数据通道接收工具调用，执行它们，返回结果
   - 这允许用户从浏览器选项卡而不是电话呼叫语音代理
**WebRTC 会话创建伪代码：**   ```
   POST /session:
     sdp = request.body  // caller's SDP offer

     sessionConfig = JSON.stringify({
       type: 'realtime',
       model: 'gpt-4o-realtime-preview',
       audio: { output: { voice: VOICE } },
       instructions: buildPrompt(null),
       tools: TOOL_SETS.unauthenticated,
     })

     // Use native FormData (Node 18+) — NOT manual multipart
     fd = new FormData()
     fd.set('sdp', sdp)
     fd.set('session', sessionConfig)

     response = POST 'https://api.openai.com/v1/realtime/calls'
       Authorization: Bearer OPENAI_API_KEY
       body: fd   // fetch() sets Content-Type automatically

     return response.text()  // SDP answer
   ```

**重要的 WebRTC 陷阱：**
   - `voice` 位于 `audio.output.voice` 下，而不是顶级
   - 不要在会话配置中发送“turn_detection”（“/v1/realtime/calls”不接受）
   - 不要在连接时发送`session.update`（服务器已经配置它）
   - 所有 `session.update` 调用必须包含 `type: 'realtime'` 以避免 session.type 错误
   - WebRTC 数据通道不支持“input_audio_transcription” - 对录制的音频使用 Whisper 通话后功能
   - WebRTC连接后通过数据通道触发问候语
**参考实现：** 上面的架构和OpenAI Realtime API
文档 (https://platform.openai.com/docs/guides/realtime) 提供了构建块。
### 步骤 5：配置 Twilio 电话号码
告诉用户：
“现在我需要设置您的 Twilio 电话号码。具体操作如下：
1. 访问 https://www.twilio.com/console/phone-numbers/search
2. 搜索号码（选择您的区号或任何可用的号码）
3. 点击您想要的号码旁边的**“购买”**（费用为 1-2 美元/月）
4. 购买后，前往https://www.twilio.com/console/phone-numbers/incoming
5. 单击您的新号码
6. 滚动到**“语音配置”**
7. 在 **“有呼叫进来”** 下，选择 **“Webhook”**
8. 输入：“https://YOUR-NGROK-URL.ngrok-free.app/voice”
9. 方法：**HTTP POST**
10. 单击**“保存配置”**
11.告诉我你购买的电话号码”
或者，如果用户更喜欢 CLI：```bash
# Buy a number (US local)
twilio phone-numbers:buy:local --area-code 415

# Configure webhook
twilio phone-numbers:update PHONE_SID \
  --voice-url https://YOUR-NGROK-URL.ngrok-free.app/voice \
  --voice-method POST
```

### 步骤 6：启动语音服务器并验证
```bash
cd voice-agent && node server.mjs
```

**停止并验证：**```bash
curl -sf http://localhost:8765/health && echo "Voice server: running" || echo "Voice server: NOT running"
```

如果未运行：检查服务器日志是否有错误。常见问题：
- 端口 8765 已在使用中：`lsof -i :8765` 查找正在使用它的内容
- 缺少环境变量：确保设置了 OPENAI_API_KEY
- 找不到模块：再次运行“npm install”
### 步骤 7：冒烟测试（呼出）
**这是神奇的时刻。** 代理致电用户以证明系统正常工作。
告诉用户：“您的电话即将响起，请拿起并通话约 30 秒。
可以这样说：‘嘿，我正在测试我的新语音到大脑系统。提醒我
明天查看季度数据。”说完就挂电话。”
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Calls.json" \
  --data-urlencode "To=USER_PHONE_NUMBER" \
  --data-urlencode "From=TWILIO_PHONE_NUMBER" \
  --data-urlencode "Url=https://YOUR-NGROK-URL.ngrok-free.app/voice" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

**通话结束后，验证所有这些：**
1. 短信通知已到达，并附有通话摘要
2.大脑页面存在：   ```bash
   gbrain search "call" --limit 1
   ```
3.大脑页面有：文字记录、实体提及、行动项目
**如果冒烟测试失败：**
- 无响铃：检查 Twilio 控制台的错误日志：https://www.twilio.com/console/debugger
- 有响铃但没有声音：检查 ngrok 隧道是否已启动，检查 OpenAI 密钥是否有效
- 语音可以工作，但没有大脑页面：检查呼叫后处理程序日志，手动运行“gbrainsync”
- 大脑页面但没有消息传递：检查消息传递机器人令牌是否有效
**在此停止，直到烟雾测试通过。直到用户才宣告成功
确认他们收到消息通知并且大脑页面存在。**
### 步骤 8：设置入站呼叫
告诉用户：“烟雾测试已通过 - 语音到大脑已上线！您的号码是
[TWILIO_NUMBER]。现在让我们设置入站呼叫。”
1. Twilio webhook 已在步骤 5 中配置
2. 询问：“您是否希望将现有电话的呼叫转接至此号码
   响几声后？这样你就可以回答，并且语音代理
   如果你不接的话。”
3.在系统提示符中配置来电路由规则
4.将用户的电话号码添加为“所有者”号码以实现完全访问
### 步骤 9：看门狗（自动重启）
```bash
# Cron watchdog (every 2 minutes) — add to crontab
*/2 * * * * curl -sf http://localhost:8765/health > /dev/null || (cd /path/to/voice-agent && node server.mjs >> /tmp/voice-agent.log 2>&1 &)
```

如果使用 ngrok，还需设置 URL 监控（重新启动时免费的 ngrok URL 会发生变化）：```bash
# Check if ngrok URL changed, update Twilio if so
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep -o 'https://.*')
if [ -n "$NGROK_URL" ]; then
  twilio phone-numbers:update PHONE_SID --voice-url "$NGROK_URL/voice"
fi
```

### 第10步：日志设置完成
```bash
mkdir -p ~/.gbrain/integrations/twilio-voice-brain
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.8.1","status":"ok","details":{"phone":"TWILIO_NUMBER","deployment":"local+ngrok"}}' >> ~/.gbrain/integrations/twilio-voice-brain/heartbeat.jsonl
```

告诉用户：“语音到大脑已完全设置。您的号码是 [NUMBER]。这是
现在发生了什么：任何打电话的人都会受到语音代理的筛选。已知联系人
得到温暖的问候。未知来电者留言。每一次通话都会创造一个大脑
包含完整文字记录的页面，您可以在[他们的消息平台]上获得摘要。
如果服务器崩溃，看门狗会重新启动服务器。”
## 成本估算
|组件|每月费用|来源 |
|------------|-------------|--------|
| Twilio 电话号码 | $1-2/月 | [Twilio 定价](https://www.twilio.com/en-us/voice/pricing) |
| Twilio 语音分钟数（100 分钟）| $1-2/月 | $0.0085-0.015/分钟，取决于方向 |
| OpenAI 实时输入（100 分钟）| $6/月 | [$0.06/分钟](https://openai.com/api/pricing/) |
| OpenAI 实时输出（50 分钟）| $12/月 | [$0.24/分钟](https://openai.com/api/pricing/) |
| ngrok（免费套餐）| 0 美元 |静态域名：$8/月 |
| **总估算** | **20-22 美元/月** |通话约 100 分钟 |
## 故障排除
**通话无法接通：**
- 检查 ngrok: `curl http://localhost:4040/api/tunnels` — 如果为空，则 ngrok 未运行
- 检查语音服务器：`curl http://localhost:8765/health` — 应该返回 `{"ok":true}`
- 检查 Twilio 调试器：https://www.twilio.com/console/debugger — 显示 webhook 错误
- 检查 webhook URL：转到 https://www.twilio.com/console/phone-numbers/incoming，单击您的号码，验证 webhook URL 与您的 ngrok URL 匹配
**语音代理没有回应：**
- 检查 OpenAI 密钥：步骤 2 中的验证命令仍应通过
- 检查服务器日志中是否有 WebSocket 错误（查找“连接被拒绝”或“401”）
- 验证实时 API 访问：并非所有 OpenAI 帐户都拥有它。检查 https://platform.openai.com/docs/guides/realtime
**调用后未创建大脑页面：**
- 运行“gbrain doctor”——如果失败，则数据库连接断开
- 检查调用后处理程序是否运行（在服务器日志中查找“脚本已保存”）
- 手动运行“gbrainsync”以强制索引
- 检查大脑存储库目录的文件权限
**ngrok URL 不断变化：**
- 每次 ngrok 重新启动时，免费的 ngrok URL 都会更改
- 看门狗（步骤 9）自动处理此问题
- 对于永久 URL：升级到静态域付费 ngrok（8 美元/月），或部署到 Fly.io/Railway
**关于选项 B 凭据的注意事项：** 如果使用 DIY 管道（选项 B），您将
还需要您选择的 STT 提供商（例如 Deepgram）和 TTS 提供商的 API 密钥
（例如 Cartesia、OpenAI TTS）。在第 2 步中收集并验证这些内容
上面列出的 Twilio 和 OpenAI 凭据。
## 关键生产修复 (v0.8.1)
这些不是可选的。它们可以防止在实际生产中发现的故障
部署处理日常呼叫。
### Unicode 崩溃修复（严重）
**问题：** 破折号 (--)、箭头 (->) 和其他非 ASCII 字符
提示上下文导致代理对损坏，导致 Twilio WebSocket 崩溃
连接。电话无声地掉线。
**修复：** 将整个文件中的所有非 ASCII 字符替换为 ASCII 等效字符
发送到 Twilio 之前的整个提示文件。这在开发中是看不见的
（浏览器可以很好地处理 unicode）并且在生产中是灾难性的。
```javascript
function sanitizeForTwilio(text) {
  return text
    .replace(/[\u2014\u2013]/g, '--')   // em/en dash
    .replace(/[\u2018\u2019]/g, "'")     // smart quotes
    .replace(/[\u201C\u201D]/g, '"')     // smart double quotes
    .replace(/\u2192/g, '->')              // right arrow
    .replace(/\u2190/g, '<-')              // left arrow
    .replace(/[\u2026]/g, '...')         // ellipsis
    .replace(/[^\x00-\x7F]/g, '')        // strip remaining non-ASCII
}
```

### 从语音上下文中删除 PII（重要）
**问题：** 加载到语音提示中的大脑上下文可能包含电话号码，
电子邮件地址和其他 PII。语音代理向呼叫者大声朗读这些内容。
**修复：** 在注入提示之前，正则表达式从所有语音上下文中剥离 PII：
- 电话号码：`/\+?\d[\d\s\-().]{7,}\d/g`
- 电子邮件地址：`/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`
- 带有身份验证令牌或 API 密钥的 URL
- 与常见凭证模式匹配的任何字符串
### 身份优先提示（重要）
**问题：** 语音代理在对话中丢失身份。说“你不是
克劳德”不坚持。该模型恢复到其基本角色。
**修复：** 在系统提示符中将身份放在任何上下文或规则之前：```
# You ARE [Agent Name]
You are [Name], a voice assistant who works with [Brain Name].
You are NOT Claude. You are NOT a general AI assistant.
[Name] has their own personality: [traits].

# Context
[... brain context, calendar, tasks ...]

# Rules
[... behavioral rules ...]
```

将身份定位在上下文之前可确保模型首先看到它并
在整个对话过程中保持它。
### 自动上传通话音频（推荐）
**问题：** 如果呼叫后处理失败，呼叫音频将永远丢失。
**修复：** 在通话结束时立即自动上传所有通话音频：
- Twilio 通话：从 Twilio 下载 MP3 录音 URL
- WebRTC 调用：通过 MediaRecorder 捕获（webm/opus 格式）
- 通过 `gbrain files upload-raw <audio-file> --page Meetings/call-slug --type call-recording` 上传
- GBrain 自动路由：小文件保留在 git 中，大文件转到云存储
  使用“.redirect.yaml”指针。文件 >= 100 MB 使用 TUS 断点续传上传。
- 生成用于播放的签名 URL：`gbrain filessigned-url <storage-path>`
- 这确保每个呼叫都有可恢复的音频源，无论
  记录或大脑页面是否创建成功
### 默认为智能 VAD
**问题：** 打电话时一键通不自然。服务器端VAD有
质量参差不齐。
**修复：** 默认使用智能 VAD (Silero VAD) 进行语音活动检测：
- 比服务器端 VAD 更好的端点
- 嘈杂环境中的误触发更少
- PTT 可作为后备（WebRTC 客户端的 UI 切换）
- 预设：安静（0.7 阈值）、正常（0.85）、嘈杂（0.95）、very_noisy（0.98）
## 生产模式（推荐）
这些模式来自每天处理实际呼叫的生产语音部署。
基本设置不需要它们。 **在烟雾测试通过后实施它们。**
每个模式都是独立且可选的。
### 代理身份和参与
#### 身份分离
**问题：** 一个冒充完整人工智能系统的语音代理创造了恐怖谷。
**模式：** 语音代理选择自己的名字和个性，与主要语音代理不同
人工智能大脑。 “我与[大脑]、[所有者]的人工智能一起工作。”更轻松、更有趣、更好奇。
#### 预先计算的出价系统
**问题：** 空气不流通会影响交战。语音代理被动等待。
**模式：** 在通话开始时，扫描实时上下文并预先计算最多 10 个参与出价。
两种类型：信息型（任务、日历、社交监控）和关系型（好奇心模板）。
出价进入提示，以便代理从列表中进行选择。使用出价 #1 和 #2 进行问候，
在谈话过程中循环其余部分。永远不要问“还有什么吗？” — 提出下一个出价。
#### 上下文优先提示
**问题：** 语音代理一般打招呼，因为它不知道今天发生了什么。
**模式：** 在通话开始时加载实时上下文：任务、日历、位置、社交监控、
上午简报。将上下文放在提示中的第一个位置（规则之前），以便模型看到
立即使用它并在问候语中使用它。每个部分尝试/捕获。每个上限 500-1000 个字符。
#### 主动顾问模式
**问题：** 语音代理是反应式任务机器。
**模式：** 座席推动对话。预测对陈旧任务的决策。
建议利用热门商品。将即将发生的事件与大脑背景联系起来。
“死空气是你的敌人”——充满每一个停顿。永远不要被动等待。
#### 对话时间（#1 修复）
**问题：** 语音代理会打断正在思考的事情，并在呼叫者结束后保持沉默。
两人都感觉很糟糕。早期的“填补每个停顿”指令会导致客服人员进行交谈
当打电话的人正在思考时。
**模式：** 用细致入微的计时规则替换毯子“永不沉默”：
- **来电者说话或思考：** 闭嘴。即使思考中停顿 3-5 秒，等待。
  不完整的句子或故事的中间=仍在思考。不要打扰。
- **呼叫者完成**（完整的思考 + 2-3 秒的沉默）：现在回复。使用出价，
  询问后续内容，或转向下一个主题。
- **检测启发式：** 不完整的句子 = 仍在思考。完整声明+
  沉默=完成。针对您的问题 = 立即回复。
- **硬性规则：** 在完成一个想法后，永远不要让沉默持续超过 5 秒。
将其添加为系统提示中的标记部分（例如“# CRITICAL：对话计时”）
放置在显眼的位置，以便模型尽早看到它。这来自于真实的使用反馈
这是影响最大的语音质量改进。
#### 无重复规则
**问题：** 语音代理在通话中多次循环回到相同的出价。
**模式：** 添加到系统提示：“不要重复自己。如果您已经说过
某事，转到下一个出价。改变你的反应。”简单但解决了实际问题
通话时间越长，烦恼就越多。
### 快速工程
#### 彻底的即时压缩
**问题：** 较长的系统提示会增加每回合的延迟和成本。
**模式：** 积极压缩。产量达到 13,000 至 4,700 个代币（削减 65%）。
子弹胜过散文，减少重复，行为第一。每个代币都会花费延迟+金钱。
#### OpenAI 实时提示指南结构
**问题：** 模型的散文段落解析缓慢。
**模式：** 使用标记的降价部分：`# Role & Objective`、`# Personality & Tone`、
`# Rules`, `# Conversation Flow` 与状态机子状态 (`## State 1: VERIFY`,
`## 状态 2：问候`、`## 状态 3：对话`)、`# 信任`。
#### 语音前验证
**问题：** 身份验证流程在通话开始时增加了死气沉沉的气氛。
**模式：** 在说出任何问候语之前调用身份验证工具。然后说“嘿，代码已开启
它的方式。”缩短往返时间。
#### 大脑升级
**问题：** 语音代理无法回答需要全脑思考的复杂问题。
**模式：** 如果呼叫者说“与 [Brain] 交谈”或问一个深入的问题，请立即转接
通过带有语言桥梁的网关工具连接到主 AI：“一秒钟，与 [Brain] 检查。”
### 呼叫可靠性
#### 看门狗卡住
**问题：** 当 VAD 停止或工具执行挂起时，调用将变得静默。
**模式：** 20 秒计时器。如果没有音频输出：清除输入缓冲区，注入“you still
那里？”系统消息，强制“response.create”。
#### 永不挂断
**问题：** AI 代理尝试结束通话。
**模式：** 硬提示规则：只有呼叫者才能决定呼叫何时结束。永远不要说
再见，“我会让你走”或总结语言。如果沉默，就问“你还在吗？”
#### 思维声音
**问题：** 缓慢执行工具时空气不流通。
**模式：** 在 JSON 数组中预生成 g711_ulaw 音频块。以 20ms 间隔循环
使用慢速工具（脑力搜索、网络查找）。当工具结果返回时停止。
#### 后备 TwiML
**问题：** 语音代理崩溃，呼叫者陷入沉默。
**模式：** `/fallback` 端点将 TwiML 转发返回到所有者的单元格。配置为
Twilio 后备 URL。
### 身份验证和授权
#### 工具集架构
**问题：** 未经身份验证的调用者访问写入操作。
**模式：** 四组：READ_TOOLS（所有调用者）、WRITE_TOOLS（所有者）、SCOPED_WRITE_TOOLS
（受信任的用户），GATEWAY_TOOLS（经过身份验证）。 LLM 在验证之前看不到写入工具
成功了。通过“session.update”使用新工具数组进行升级。所有“session.update”调用
必须包含`类型：'实时'`。
#### 带回调的可信用户身份验证
**问题：** 所有者以外的人需要经过身份验证的访问。
**模式：**电话注册+回调验证。每个用户都有一个范围：完整，
家庭、内容、操作。范围决定了他们访问哪些工具。
#### 呼叫者路由
**问题：** 不同的呼叫者需要不同的体验。
**模式：** `buildPrompt(callerPhone)` 返回不同的系统提示：所有者 (OTP)、
可信（回拨）、内圈（热情问候+转接）、已知（问候、消息）、
未知（屏幕+消息）。
### 语音质量
#### 动态 VAD/噪声模式
**问题：** 背景噪音会导致误触发或漏话。
**模式：** `set_noise_mode` 工具在通话中调整 VAD 阈值。预设：安静 (0.7)、
正常 (0.85)、嘈杂 (0.95)、非常嘈杂 (0.98)。代理主动呼叫噪音。
#### 屏幕调试用户界面
**问题：** 从手机进行测试时，console.log 毫无用处。
**模式：** WebRTC 客户端内联显示工具调用、结果、错误和关键事件。
### 实时感知
#### 实时捕捉瞬间
**问题：** 如果通话过程中掉线或电话中断，通话中所说的重要内容就会丢失。
通话后摘要工具不会启动。
**模式：** 当来电者分享一些重要的事情（反馈、想法、个人信息）时
故事、决策），使用“log_voice_request”工具实时记录。不要
等到通话结束。告诉呼叫者：“明白了，现在将其发送到 [Brain]。”
还在通话期间将关键时刻传输到[消息平台]，以便主要代理
在通话结束之前就有意识。
#### 通话后腰带和吊带
**问题：** 呼叫后处理取决于语音代理记得呼叫
`post_call_summary` 工具。如果呼叫掉线或座席忘记，呼叫就会丢失。
**模式：** 基于工具和自动呼叫结束处理程序都应该发布
结构化信号。呼叫结束处理程序（在 WebSocket 关闭或“/call-end”时触发）
应发布到[消息平台]：
- 音频文件路径
- 成绩单文件路径（如果丢失则发出警告）
- 通话期间使用的工具
- 明确指令：“[大脑]：阅读电话，总结，采取行动。”
这确保了每个呼叫都能得到处理，无论语音代理是否
记得调用摘要工具。腰带和吊带。
### 呼叫后处理
#### 通话后强制 3 步
**问题：** 主代理不知道发生了呼叫。
**模式：** 每个调用都以三个步骤结束：
1. **消息通知** — 总结至【消息平台】
2. **大脑记录** — `brain/meetings/YYYY-MM-DD-call-{caller}.md`
3. **音频到存储** — Twilio MP3 或 WebRTC webm/opus，上传到云存储
#### WebRTC 音频 + 脚本奇偶校验
**问题：** WebRTC 调用不通过 Twilio，没有自动记录。
**模式：** 客户端捕获音频（MediaRecorder、webm/opus）和文字记录（每回合
发布到“/transcript”）。通话结束时，POST 到 `/call-end` 保存 JSON 日志。两个频道
产生相同的输出格式。注意：不支持“input_audio_transcription”
通过 WebRTC 数据通道 — 使用 Whisper 呼叫后。
#### 双 API 事件处理
**问题：** OpenAI Realtime API 更改了事件名称。
**模式：** 处理 `response.audio.delta` （旧）和 `response.output_audio.delta`
（新）。对于“.done”事件也是如此。针对 API 更改的未来保障。
### Brain 查询优化
#### 报告感知查询路由
**问题：** 有关特定主题的语音查询会触发缓慢的矢量搜索。
**模式：** 在全脑搜索之前根据关键字图检查问题：
|关键词 |报告已加载 |
|---------|--------------|
|电子邮件、收件箱、邮件 |收件箱扫描报告|
|社交、推特、提及 |社会参与报告|
|上午简报|早间简报|
|会议|会议同步报告|
|松弛|松弛扫描报告|
|内容、想法|内容创意报告|
加载最多 2,500 个字符的匹配报告。第一场比赛后休息。回落至满
如果没有关键字匹配，请大脑搜索。