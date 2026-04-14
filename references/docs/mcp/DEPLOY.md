# 部署 GBrain 远程 MCP 服务器
从任何设备、任何 AI 客户端访问你的大脑。 GBrain 的 MCP 服务器通过 `gbrain serve` (stdio) 在本地运行。为了进行远程访问，请将其包装在公共隧道后面的 HTTP 服务器中。
## 两条路径
### 本地（零设置）
```bash
gbrain serve
```

适用于 Claude Code、Cursor、Windsurf 以及任何支持 stdio 的 MCP 客户端。不需要服务器、不需要隧道、不需要令牌。
### 远程（任何设备、任何 AI 客户端）
```
你的 AI 客户端 (Claude Desktop, Perplexity, 等等)
  → ngrok 隧道 (https://YOUR-DOMAIN.ngrok.app)
  → 你的 HTTP 服务器 (包装 gbrain serve)
  → Supabase Postgres (通过池化器连接字符串)
```

这需要：
1. 一台在 HTTP 包装器后面运行 `gbrain serve` 的机器
2. 一个公共隧道（ngrok、Tailscale 或云主机）
3. 用于安全保障的不记名令牌（Bearer token）认证
## 远程设置
### 1. 设置隧道
完整设置请参阅 [ngrok-tunnel 诀窍](../../recipes/ngrok-tunnel.md)。
简易版：
```bash
brew install ngrok
ngrok config add-authtoken YOUR_TOKEN
ngrok http 8787 --url your-brain.ngrok.app  # 固定域名的 Hobby 层级
```

### 2. 创建访问令牌
```bash
# 为每个客户端创建一个令牌
bun run src/commands/auth.ts create "claude-desktop"

# 列出所有令牌
bun run src/commands/auth.ts list

# 撤销一个令牌
bun run src/commands/auth.ts revoke "claude-desktop"
```

令牌是每个客户端独有的。为每个设备/应用创建一个令牌。如果被泄露，则单独撤销。令牌以 SHA-256 哈希的形式存储在你的数据库中。
### 3. 连接你的 AI 客户端
- **Claude Code:** [设置指南](CLAUDE_CODE.md)
- **Claude Desktop:** [设置指南](CLAUDE_DESKTOP.md) (必须使用 GUI，而不是 JSON 配置)
- **Claude Cowork:** [设置指南](CLAUDE_COWORK.md)
- **Perplexity:** [设置指南](PERPLEXITY.md)
### 4. 验证
```bash
bun run src/commands/auth.ts test \
  https://YOUR-DOMAIN.ngrok.app/mcp \
  --token YOUR_TOKEN
```

## 操作
所有 30 个 GBrain 操作都可远程使用，包括 `sync_brain` 和 `file_upload`（使用自托管服务器没有超时限制）。
## 部署选项
有关 ngrok、Tailscale Funnel 和云主机（Fly.io、Railway）的比较，请参阅 [ALTERNATIVES.md](ALTERNATIVES.md)。
## 故障排除
**"missing_auth" 错误**
包含 Authorization 标头：`Authorization: Bearer YOUR_TOKEN`
**"invalid_token" 错误**
运行 `bun run src/commands/auth.ts list` 查看活动令牌。
**"service_unavailable" 错误**
数据库连接失败。检查你的 Supabase 仪表板是否出现中断。
**Claude Desktop 无法连接**
远程服务器必须通过“设置 > 集成”添加，而不是 `claude_desktop_config.json`。请参阅 [CLAUDE_DESKTOP.md](CLAUDE_DESKTOP.md)。
## 预期延迟
| 操作 | 典型延迟 | 备注 |
|-----------|----------------|-------|
| get_page | < 100ms | 单次 DB 查询 |
| list_pages | < 200ms | 带有过滤器的 DB 查询 |
| search (关键字) | 100-300ms | 全文搜索 |
| query (混合) | 1-3s | 嵌入 + 向量 + 关键字 + RRF |
| put_page | 100-500ms | 写入 + 触发 search_vector 更新 |
| get_stats | < 100ms | 聚合查询 |
**注意：** `gbrain serve --http`（内置 HTTP 传输）已计划但尚未实现。目前，远程 MCP 需要自定义 HTTP 包装器。参考实现请参阅 [语音诀窍](../../recipes/twilio-voice-brain.md) 中的生产部署模式。