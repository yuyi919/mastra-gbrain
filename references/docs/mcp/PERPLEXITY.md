# 将 GBrain 连接到 Perplexity 计算机
Perplexity Computer 支持具有不记名令牌身份验证的远程 MCP 服务器。
＃＃ 设置
1.打开Perplexity（需要订阅Pro）
2. 转至 **设置 > 连接器**（或 **MCP 服务器**）
3. 添加新的远程连接器：
   - **URL：** `https://YOUR-DOMAIN.ngrok.app/mcp`
   - **身份验证：** API 密钥/不记名令牌
   - **令牌：** 您的 GBrain 访问令牌
     （使用 `bun run src/commands/auth.ts create "perplexity"` 创建一个）
4. 保存
将 `YOUR-DOMAIN` 替换为您的 ngrok 域（请参阅
[ngrok-tunnel 配方](../../recipes/ngrok-tunnel.md) 用于设置）。
＃＃ 核实
在困惑对话中，要求它使用你的大脑：
```
Use my GBrain to search for [topic]
```

## 注释
- Pro 订阅者可以使用 Perplexity Computer
- Perplexity Mac 应用程序和网页版均支持 MCP 连接器
- 如果您喜欢“gbrainserve”（stdio），Mac 应用程序还支持本地 MCP 服务器