---
id: ngrok-tunnel
name: Public Tunnel
version: 0.7.0
description: Fixed public URL for your brain (MCP server, voice agent, any service). One ngrok account, never changes.
category: infra
requires: []
secrets:
  - name: NGROK_AUTHTOKEN
    description: ngrok auth token (Hobby tier recommended for fixed domain)
    where: https://dashboard.ngrok.com/get-started/your-authtoken — sign up, then copy your authtoken
health_checks:
  - type: command
    argv: ["pgrep", "-f", "ngrok.*http"]
    label: "ngrok process"
  - type: http
    url: "http://localhost:4040/api/tunnels"
    label: "ngrok API"
setup_time: 10 min
cost_estimate: "$8/mo for Hobby tier (fixed domain). Free tier works but URLs change on restart."
---

# 公共隧道：为你的大脑固定 URL
您的 GBrain MCP 服务器和语音代理需要公共 URL，因此 Claude Desktop，
困惑，而 Twilio 可以达到它们。 ngrok 为您提供了一个固定域
永远不会改变。
## 重要提示：代理说明
**您是安装者。**这是基础设施。其他食谱
（语音到大脑、远程 MCP）取决于此。先设置一下吧。
**为什么这很重要：**
- 语音到大脑需要 Twilio webhooks 的公共 URL
- 远程 MCP 需要 Claude Desktop 和 Perplexity 的公共 URL
- 每次重新启动时，免费的 ngrok URL 都会发生变化，从而破坏了所有集成
- 爱好层（8 美元/月）提供固定域。设置一次，切勿再次触摸。
**不要跳过步骤。每个步骤后进行验证。**
＃＃ 建筑学
```
Local services (your machine)
  ├── GBrain MCP server (port 3000)    gbrain serve
  └── Voice agent (port 8765)          node server.mjs
         │
         ▼
ngrok tunnel (fixed domain)
  └── https://your-brain.ngrok.app
         │
         ├── /mcp   → Claude Desktop, Claude Code, Perplexity
         └── /voice  → Twilio webhooks
```

## 设置流程
### 第 1 步：创建 ngrok 帐户 + 获取兴趣等级
告诉用户：
“我需要你创建一个 ngrok 帐户。我强烈推荐 Hobby tier（8 美元/月）
对于一个永远不会改变的固定域。没有它，每次重新启动都会破坏您的
Twilio webhooks 和 Claude Desktop 连接。
1. 前往 https://dashboard.ngrok.com/signup（注册）
2. 前往 https://dashboard.ngrok.com/billing 并升级至 **Hobby**（8 美元/月）
3. 访问 https://dashboard.ngrok.com/get-started/your-authtoken
4. 复制您的 **Authtoken** 并将其粘贴给我”
证实：```bash
ngrok config add-authtoken $NGROK_AUTHTOKEN \
  && echo "PASS: ngrok configured" \
  || echo "FAIL: ngrok auth token rejected"
```

如果未安装 ngrok：
- **Mac：** `brew 安装 ngrok`
- **Linux:** `curl -sL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar xz -C /usr/local/bin`
**停止直到 ngrok 验证。**
### 第 2 步：声明固定域
告诉用户：
“1. 转到 https://dashboard.ngrok.com/domains
2.点击**'+新域名'**
3. 选择一个名称（例如“your-brain.ngrok.app”）
4. 单击**“创建”**
5.告诉我您选择的域名”
如果用户停留在免费层（无固定域），请注意 URL 将在
重新启动，看门狗将需要更新 Twilio。建议以后升级。
### 第 3 步：启动隧道
```bash
# With fixed domain (Hobby):
ngrok http 8765 --url your-brain.ngrok.app

# Without fixed domain (free):
ngrok http 8765
```

核实：```bash
curl -sf http://localhost:4040/api/tunnels \
  && echo "PASS: ngrok tunnel active" \
  || echo "FAIL: ngrok not running"
```

### 步骤 4：设置看门狗
如果隧道失效，它必须自动重新启动。创建看门狗：
```bash
#!/bin/bash
# ngrok-watchdog.sh — run via cron every 2 minutes

# Check if ngrok is running
if ! pgrep -f "ngrok.*http" > /dev/null 2>&1; then
  echo "[watchdog] ngrok not running — starting..."

  # Install if missing
  if ! command -v ngrok > /dev/null 2>&1; then
    echo "[watchdog] ngrok not installed"
    exit 1
  fi

  # Start with fixed domain (if configured) or free
  if [ -n "$NGROK_DOMAIN" ]; then
    nohup ngrok http 8765 --url "$NGROK_DOMAIN" > /dev/null 2>&1 &
  else
    nohup ngrok http 8765 > /dev/null 2>&1 &
  fi
  sleep 5

  # If no fixed domain, update Twilio webhook with new URL
  if [ -z "$NGROK_DOMAIN" ] && [ -n "$TWILIO_ACCOUNT_SID" ]; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
      | grep -o '"public_url":"https://[^"]*' | grep -o 'https://.*')
    if [ -n "$NGROK_URL" ] && [ -n "$TWILIO_NUMBER_SID" ]; then
      curl -s -X POST -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
        "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_NUMBER_SID.json" \
        -d "VoiceUrl=${NGROK_URL}/voice" > /dev/null
      echo "[watchdog] Twilio updated: $NGROK_URL"
    fi
  fi

  echo "[watchdog] ngrok started"
else
  echo "[watchdog] ngrok running"
fi
```

添加到crontab：```bash
*/2 * * * * NGROK_DOMAIN=your-brain.ngrok.app /path/to/ngrok-watchdog.sh >> /tmp/ngrok-watchdog.log 2>&1
```

### 步骤5：日志设置完成
```bash
mkdir -p ~/.gbrain/integrations/ngrok-tunnel
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.7.0","status":"ok","details":{"domain":"NGROK_DOMAIN","tier":"hobby"}}' >> ~/.gbrain/integrations/ngrok-tunnel/heartbeat.jsonl
```

## 连接AI客户端（隧道运行后）
**克劳德代码：**```bash
claude mcp add gbrain -t http https://your-brain.ngrok.app/mcp \
  -H "Authorization: Bearer YOUR_GBRAIN_TOKEN"
```

**克劳德桌面：**
转至设置 > 集成 > 添加。输入：
`https://your-brain.ngrok.app/mcp`
重要提示：Claude Desktop 不支持通过 JSON 配置进行远程 MCP。
您必须使用 GUI 中的设置 > 集成。这是#1 设置失败。
**困惑计算机：**
设置 > 连接器 > 添加远程 MCP。
网址：`https://your-brain.ngrok.app/mcp`
## 实施指南
### 看门狗模式（来自生产）
```
watchdog():
  // Check: is ngrok running?
  if not process_running("ngrok.*http"):
    start_ngrok()
    sleep(5)

    // If no fixed domain, must update Twilio
    if no_fixed_domain AND twilio_configured:
      new_url = get_ngrok_url()  // from localhost:4040/api/tunnels
      update_twilio_webhook(new_url + "/voice")

  // Check: is the service behind ngrok running?
  if not curl_succeeds("http://localhost:PORT/health"):
    restart_service()
```

### ngrok 检查仪表板
`http://localhost:4040` 显示流经隧道的所有请求。用这个
调试 MCP 连接问题（请参阅请求/响应标头、延迟、错误）。
## 棘手的地方
1. **Claude Desktop 需要 GUI 设置。** 通过以下方式添加远程 MCP 服务器
   `claude_desktop_config.json` 不起作用。它默默地失败，没有错误。
   您必须使用“设置”>“集成”。
2. **免费层 URL 是短暂的。** 它们会在每次 ngrok 重新启动时发生变化。的
   看门狗处理 Twilio，但 Claude Desktop 和 Perplexity 必须手动
   重新配置。这就是为什么 Hobby（8 美元/月）值得。
3. **一个域名，多种服务。** Hobby赠送1个免费域名。按路径路线
   （`/mcp`、`/voice`）在一个域上，或者为第二个域支付 8 美元/月的费用。
4. **看门狗必须在启动时运行。** 如果机器重新启动，ngrok 将不会运行
   自动启动，除非您有看门狗 cron 或 systemd 服务。
## 如何验证
1. 启动隧道。在浏览器中访问“https://your-brain.ngrok.app”。
   您应该会看到响应（运行状况检查或默认页面）。
2. 从 Claude Desktop 运行 `gbrain search "test"`。结果应该会回来。
3.杀死ngrok。等待 2 分钟。检查看门狗是否重新启动了它。
4. 从不同的设备（电话）访问相同的 URL。验证它是否有效。
## 成本估算
|组件|每月费用|
|------------|-------------|
| ngrok 免费 | $0（临时 URL，重新启动时更改）|
|恩格罗克爱好| $8/月（1 个固定域，足以用于 MCP + 语音）|
| ngrok 专业版 | $20/月（2 个以上域名，IP 限制）|
| **推荐** | **$8/月（爱好）** |
---

*[GBrain 技能包](../docs/GBRAIN_SKILLPACK.md) 的一部分。另请参阅：[语音到大脑](twilio-voice-brain.md)、[远程 MCP 部署](../docs/mcp/DEPLOY.md)*