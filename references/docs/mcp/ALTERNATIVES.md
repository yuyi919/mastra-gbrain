# 远程 MCP 部署选项
GBrain 的 MCP 服务器通过“gbrainserve”（stdio 传输）运行。为了做到这一点
从其他设备和 AI 客户端访问，您需要一个 HTTP 包装器
一条公共隧道。这是您的选择。
## ngrok（推荐）
[ngrok](https://ngrok.com) 提供即时公共隧道。爱好层
（8 美元/月）为您提供一个永不改变的固定域。
```bash
# 1. Install ngrok
brew install ngrok

# 2. Start your MCP server (behind an HTTP wrapper)
# See docs/mcp/DEPLOY.md for the server setup

# 3. Expose via ngrok
ngrok http 8787 --url your-brain.ngrok.app
```

有关完整设置，请参阅 [ngrok-tunnel 配方](../../recipes/ngrok-tunnel.md)
包括身份验证令牌配置和固定域设置。
## 尾鳞漏斗
[Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel) 为您提供
具有自动 TLS 的永久公共 HTTPS URL。提供免费套餐。最适合
您控制两个端点的专用网络。
```bash
# 1. Install Tailscale
brew install tailscale

# 2. Expose your MCP server
tailscale funnel 8787
# Your brain is now at https://your-machine.ts.net
```

## Fly.io / Railway（始终在线）
对于需要在没有计算机的情况下 24/7 运行的生产部署：
- **Fly.io：** 5-10 美元/月，全球边缘，“飞行部署”
- **铁路：** 5 美元/月，git 推送部署
两者都原生运行 Bun。无捆绑、无 Deno、无冷启动、无超时限制。
＃＃ 比较
| |恩格罗克 |尾鳞| Fly.io/铁路 |
|--|---|---|---|
|成本| $8/月（爱好）|免费| $5-10/月 |
|固定网址 |是的（爱好）|是的 |是的 |
|笔记本电脑关闭时也能工作 |没有 |没有 |是的 |
|冷启动|无 |无 |无 |
|超时限制 |无 |无 |无 |
|所有 30 项行动 |是的 |是的 |是的 |
|设置时间| 5 分钟 | 10 分钟 | 15 分钟 |
**注意：** `gbrainserve --http`（内置 HTTP 传输）已计划但尚未
已实施。目前，远程 MCP 需要一个围绕“gbrainserve”的自定义 HTTP 包装器。
有关详细信息，请参阅[DEPLOY.md](DEPLOY.md)。