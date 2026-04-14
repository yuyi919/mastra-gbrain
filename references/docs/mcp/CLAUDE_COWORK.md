# 将 GBrain 连接到 Claude Cowork

让 GBrain 加入 Cowork 会话的两种方法：

## 选项 1：远程（通过自托管服务器 + 隧道）

对于团队/企业计划，组织所有者添加连接器：

1. 转至 **组织设置 > 连接器**
2. 添加带有 MCP 服务器 URL 的新连接器：
   ```
   https://YOUR-DOMAIN.ngrok.app/mcp
   ```
3. 在高级设置中添加 Bearer 令牌认证（使用 `bun run src/commands/auth.ts create "cowork"` 创建一个）
4. 保存

注意：Cowork 从 Anthropic 的云而不是您的设备进行连接。你的服务器必须可公开访问（ngrok、Tailscale Funnel 或云托管）。

## 选项 2：本地桥接（通过 Claude Desktop）

如果您已经在 Claude Desktop 中配置了 GBrain（通过 `gbrainserve` stdio 或远程集成），Cowork 自动获取访问权限。Claude Desktop 通过其 SDK 层将本地 MCP 服务器桥接至 Cowork。

这意味着：如果 `gbrainserve` 正在 Claude Desktop 中运行并配置，您不需要为 Cowork 配备单独的服务器。

## 使用哪个？

- **远程服务器：**即使您的笔记本电脑关闭也可以工作，可供所有组织成员使用
- **本地桥接：**如果 Claude Desktop 已经有 GBrain，但需要您的计算机正在运行，则零额外设置