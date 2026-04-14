# 将 GBrain 连接到 Claude 桌面
**重要提示：** Claude Desktop 不通过以下方式连接到远程 MCP 服务器
`claude_desktop_config.json`。该文件仅适用于本地 stdio 服务器。
必须通过 GUI 添加远程 HTTP 服务器。
＃＃ 设置
1.打开克劳德桌面
2. 转到 **设置 > 集成**
3. 单击“**添加集成**”（或“**添加连接器**”）
4. 输入 MCP 服务器 URL：   ```
   https://YOUR-DOMAIN.ngrok.app/mcp
   ```
将 `YOUR-DOMAIN` 替换为您的 ngrok 域（请参阅
   [ngrok-tunnel 配方](../../recipes/ngrok-tunnel.md) 用于设置）。
5. 将身份验证设置为 **Bearer Token** 并粘贴您的令牌
   （使用 `bun run src/commands/auth.ts create "claude-desktop"` 创建一个）
6. 保存
＃＃ 核实
开始新的对话并尝试：
```
Search my brain for [any topic]
```

Claude Desktop 将自动使用您的 GBrain 工具。
## 常见错误
**对远程服务器使用 claude_desktop_config.json** — 这会默默地失败
没有错误消息。 JSON 配置仅适用于本地 stdio MCP 服务器。
必须通过 GUI 中的“设置”>“集成”添加远程 HTTP 服务器。
**使用错误的 URL** — 确保 URL 以 `/mcp` 结尾（而不是 `/health`
或者只是基本域）。