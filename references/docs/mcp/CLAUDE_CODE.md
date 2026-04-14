# 将 GBrain 连接到 Claude Code
## 选项 1：本地（推荐，无需服务器）
```bash
claude mcp add gbrain -- gbrain serve
```

就是这样。 Claude Code 会将 `gbrain serve` 作为 stdio 子进程生成。不需要服务器、不需要隧道、不需要令牌。适用于 PGLite 和 Supabase 引擎。
## 选项 2：远程（从任何机器访问）
如果你在带有公共隧道的服务器上运行 GBrain（参见 [ngrok-tunnel 诀窍](../../recipes/ngrok-tunnel.md)）：
```bash
claude mcp add gbrain -t http \
  https://YOUR-DOMAIN.ngrok.app/mcp \
  -H "Authorization: Bearer YOUR_TOKEN"
```

将 `YOUR-DOMAIN` 替换为你的 ngrok 域名，将 `YOUR_TOKEN` 替换为从 `bun run src/commands/auth.ts create "claude-code"` 获取的令牌。
## 验证
在 Claude Code 中，尝试：
```
search for [你大脑中的任何主题]
```

你应该能看到来自你的 GBrain 知识库的结果。
## 移除
```bash
claude mcp remove gbrain
```