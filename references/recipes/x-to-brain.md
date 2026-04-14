---
id: x-to-brain
name: X-to-Brain
version: 0.8.1
description: Twitter timeline, mentions, and keyword monitoring flow into brain pages. Tracks deletions, engagement velocity, OCR on images, and real-time alerts.
category: sense
requires: []
secrets:
  - name: X_BEARER_TOKEN
    description: X API v2 Bearer token (Basic tier minimum, $200/mo for full archive search)
    where: https://developer.x.com/en/portal/dashboard — create a project + app, copy the Bearer Token from "Keys and tokens"
health_checks:
  - type: http
    url: "https://api.x.com/2/users/me"
    auth: bearer
    auth_token: "$X_BEARER_TOKEN"
    label: "X API"
setup_time: 15 min
cost_estimate: "$0-200/mo (Free tier: 1 app, read-only. Basic: $200/mo for search + higher limits)"
---

# X-to-Brain：更新你大脑的 Twitter 监控
你的时间线、提及和关键词搜索都会流入大脑页面。收藏家
跟踪删除、参与速度和叙事模式。你醒来就知道
当你睡觉时 X 发生了什么。
## 重要提示：代理说明
**您是安装者。** 严格按照这些步骤操作。
**核心模式：代码用于数据，LLM用于判断。**
X 收集器是确定性代码。它提取推文、检测删除、跟踪
参与。它从不解释内容。您（代理人）阅读收集的数据
并做出判断：谁是重要的，提到了哪些实体，什么
叙事正在形成。
**为什么顺序执行很重要：**
- 步骤 1 验证 API 密钥。没有它，X 就没有任何连接。
- 第 2 步设置收集器。没有它，你就没有数据。
- 步骤 3 运行第一个集合。没有数据，你就无法丰富。
- 第 4 步是你的工作：阅读收集的推文，更新大脑页面。
**不要跳过步骤。不要重新排序。每个步骤后进行验证。**
＃＃ 建筑学
```
X API v2 (Bearer token auth)
  ↓ Three collection streams:
  ├── Own timeline: GET /users/{id}/tweets
  ├── Mentions: GET /users/{id}/mentions
  └── Keyword searches: GET /tweets/search/recent
  ↓
X Collector (deterministic Node.js script)
  ↓ Outputs:
  ├── data/tweets/{own,mentions,searches}/{id}.json
  ├── data/deletions/{id}.json (detected via diff)
  ├── data/engagement/{id}.json (velocity snapshots)
  └── data/state.json (pagination, rate limits)
  ↓
Agent reads collected data
  ↓ Judgment calls:
  ├── Entity detection (people, companies mentioned)
  ├── Brain page updates (timeline entries)
  ├── Narrative pattern detection
  └── Engagement spike alerts
```

## 固执己见的默认值
**三个收集流：**
1. **自己的时间表** - 您的推文，用于您自己的存档和参与跟踪
2. **提及**——谁在谈论你，用于关系跟踪
3. **关键词搜索**——您关心的主题，用于信号检测
**删除检测：**
- 比较之前运行和当前运行的推文 ID
- 如果 ID 丢失且推文发布时间小于 7 天，请调用 GET /tweets/{id}
- 404 = 确认删除。保存原始推文+删除时间戳。
- 当您跟踪的帐户被删除时发出警报。
**接合速度：**
- 跟踪推文的点赞/转发/回复快照
- 如果点赞数翻倍并且之前的计数 >= 50，则会发出警报
- 如果自上次检查以来获得的绝对点赞数 > 100，则会发出警报
- 仅在指标实际发生变化时才写入快照（幂等）
**速率限制意识：**
- 基本层：时间线 1500 次请求/15 分钟，提及 450 次，搜索 60 次
- 收集器跟踪 state.json 中的速率限制
- 接近极限时自动后退
## 先决条件
1. **GBrain安装并配置**（`gbrain doctor`通过）
2. **Node.js 18+**（用于收集器脚本）
3. **X 开发者帐户** 具有 API 访问权限
## 设置流程
### 第 1 步：获取 X API 凭证
告诉用户：
“我需要您的 X API Bearer 令牌。以下是获取它的具体位置：
1. 访问 https://developer.x.com/en/portal/dashboard
2. 如果您没有开发者帐户，请点击“注册”（提供免费套餐）
3. 创建一个新项目（随意命名，例如“GBrain”）
4. 在项目中，创建一个新的App
5. 转到应用程序的“密钥和令牌”选项卡
6. 在“承载令牌”下，单击“生成”（或“重新生成”）
7. 复制 Bearer Token 并将其粘贴给我
注意：免费套餐提供低限制的只读访问权限。基本层（$200/月）
给出搜索/最近的端点和更高的限制。专业级获得完整的档案搜索。”
立即验证：```bash
curl -sf -H "Authorization: Bearer $X_BEARER_TOKEN" \
  "https://api.x.com/2/users/me" \
  && echo "PASS: X API connected" \
  || echo "FAIL: X API token invalid"
```

**如果验证失败：** “那不起作用。常见问题：(1) 确保您复制了
Bearer Token，而不是 API Key 或 API Secret，(2) Bearer Tokens 是长字符串
以“AAA...”开头，(3) 如果您刚刚创建应用程序，则令牌立即有效。”
**停止直至 X API 验证。**
### 第 2 步：获取您的 X 用户 ID
```bash
# Look up the user's X user ID from their handle
curl -sf -H "Authorization: Bearer $X_BEARER_TOKEN" \
  "https://api.x.com/2/users/by/username/USERNAME" | grep -o '"id":"[^"]*"'
```

询问用户他们的 X 句柄（例如，@yourhandle）。查找他们的用户 ID。
保存它 - 收集器需要数字 ID，而不是句柄。
### 步骤 3：配置收集器
创建收集器目录：```bash
mkdir -p x-collector/data/{tweets/{own,mentions,searches},deletions,engagement}
cd x-collector
```

收集器脚本需要以下功能：
1. **收集** — 从三个流中提取推文：
   - 自己的时间线：“GET /2/users/{id}/tweets”，max_results=100
   - 提及：“GET /2/users/{id}/mentions”，max_results=100
   - 关键字搜索：通过“GET /2/tweets/search/recent”可配置搜索词
2. **删除检测** — 比较之前运行的推文 ID 与当前运行的推文 ID。对于丢失的 ID，请通过单独的推文查找进行验证。 404=删除。
3. **参与度跟踪** — 所跟踪推文的快照指标。仅在指标发生变化时才写入。
4. **状态管理** — 将分页标记、上次运行时间戳、速率限制状态保存到“data/state.json”
5. **原子写入** — 写入 .tmp 文件，然后重命名（防止崩溃时损坏数据）
根据用户关心的内容配置关键字搜索：```json
{
  "searches": [
    "\"your name\" -from:yourhandle",
    "\"your company\" OR \"your product\"",
    "topic you track"
  ]
}
```

### 步骤 4：运行第一个集合
```bash
node x-collector.mjs collect
```

验证：`ls data/tweets/own/` 应包含 tweet JSON 文件。
向用户展示一个示例：“从您的时间线中找到 N 条推文，M 条提及，K 条搜索结果。”
### 步骤 5：丰富大脑页面
这是你的工作（代理人）。阅读收集的推文：
1. **检测实体**：谁发了推文？提到了谁？什么公司/主题？
2. **检查大脑**：`gbrain 搜索“人名”` — 我们有页面吗？
3. **更新大脑页面**：对于提到的每个著名人物或公司：
   `- 年-月-日 |关于 {topic} 的推文 [来源：X，@handle，{date}]`
4. **跟踪叙述**：如果有人在一周内就同一主题发布 3 次以上推文，请注意他们整理的真相中的模式
5. **标记删除**：如果被跟踪的帐户删除了一条推文，请记下：
   `- 年-月-日 |已删除的推文：“{content}”[来源：X 删除，检测到 {date}]`
6. **同步**：`gbrain 同步 --no-pull --no-embed`
### 第 6 步：设置 Cron
收集器应每 30 分钟运行一次：```bash
*/30 * * * * cd /path/to/x-collector && node x-collector.mjs collect >> /tmp/x-collector.log 2>&1
```

代理应每天检查收集的数据 2-3 次并运行浓缩。
### 第 7 步：日志设置完成
```bash
mkdir -p ~/.gbrain/integrations/x-to-brain
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","event":"setup_complete","source_version":"0.8.1","status":"ok","details":{"user_id":"X_USER_ID"}}' >> ~/.gbrain/integrations/x-to-brain/heartbeat.jsonl
```

## 生产模式 (v0.8.1)
这些模式来自跟踪 19 个以上帐户的生产部署
实时监控。
### 图像 OCR（新）
**问题：** 纯文本集合错过了推文图像中的视觉上下文 --
屏幕截图、图表、带有文本覆盖的模因、引用屏幕截图。
**修复：** 通过视觉模型（Claude Sonnet 或同等模型）对推文图像运行 OCR：
- 对于每条带有图像的推文，通过视觉 API 提取全文内容
- 将 OCR 输出与推文数据一起存储
- 在实体检测和大脑页面更新中包含提取的文本
- 图表/数据可视化：提取数据点，描述发现结果
这捕捉到了纯文本收藏家完全错过的信号。
### 通过过滤流进行实时监控（新）
**问题：** 30 分钟投票意味着您晚了 30 分钟才发现事情。
对于时间敏感的内容（参与度峰值、删除、断线），
那太慢了。
**修复：** 使用 Twitter 的 Filtered Stream API (`GET /2/tweets/search/stream`)
近乎实时的监控。在几秒钟内捕获出站推文。
**设置：**
1. 添加过滤规则：`POST /2/tweets/search/stream/rules` 以及您的跟踪术语
2. 打开持久连接：`GET /2/tweets/search/stream`
3. 在推文到达时对其进行处理（无轮询延迟）
**要求：** 过滤流访问的最低基本层（200 美元/月）。
**与轮询一起使用：** 流式传输实时警报，轮询完整性
（流可能会在断开连接期间丢弃推文）。
### 推文评级标准（新）
**问题：** 并非所有推文都值得同样的关注。没有得分，每
推文获得同等权重。
**修复：** 在 6 维标题上对推文进行评分：
1. **覆盖面** -- 关注者数量、参与率
2. **相关性**——与您的兴趣/工作的联系
3. **情绪**——对你的积极/消极/中立
4. **新颖性**——新信息与重复信息
5. **可操作性**——这需要回应吗？
6. **病毒式传播潜力**——参与速度、引用推文比率
60 分钟后重新评分以跟踪参与轨迹。一条推文获得 50 点赞
一小时内达到 500 与保持在 50 的信号是不同的信号。
### 出站推文监控（新）
**问题：** 您发了一些推文，但没有注意到参与模式，直到
几个小时后。
**修复：** 每条出站推文后 60 秒的监控窗口：
- 检查参与速度（点赞、回复、引用）
- 标记不寻常的回复率（高回复率表明存在争议）
- 如果引用推文比率 > 转发比率（评论，而不是分享），则进行标记
- 交叉引用提到的针对大脑的描述以了解背景
### X-to-Brain 管道（新）
每个推文交互都可以自动创建/更新大脑页面：
- 提到的人有大脑页面吗？附加到他们的时间表
- 提到了新人？检查知名度门，如果值得注意则创建页面
- 推文中的文章 URL？通过文章工作流程获取和摄取
- 推文中的视频 URL？转录管道队列
- 图片？ OCR并提取文本内容
按照“skills/_brain-filing-rules.md”进行归档决定。
### Cron 惊人（重要）
**问题：** 同时触发多个 cron 作业会导致资源争用
和超时。
**修复：** 错开所有收集计划，以便每分钟最多运行 1 次：```
# Good: staggered
*/30 * * * * x-collector       # :00, :30
5,35 * * * * x-bundle-ingest   # :05, :35
10 */3 * * * social-monitor     # :10 every 3h

# Bad: overlapping
*/30 * * * * x-collector
*/30 * * * * x-bundle-ingest   # fires at same time!
```

## 实施指南
这些是来自跟踪 19 个以上帐户的部署的经过生产测试的模式。
### 删除检测算法
```
detect_deletions(prevIds, currentIds):
  for id in prevIds:
    if id in currentIds: continue          // still exists

    stored = load_tweet(id)
    if not stored: continue                // never stored

    // HEURISTIC 1: Only check tweets < 7 days old
    age = now - stored.created_at
    if age > 7_DAYS: continue              // aged out of API window

    // HEURISTIC 2: Skip if last seen > 48h ago
    staleness = now - stored.last_updated
    if staleness > 48_HOURS: continue      // fell out of window, not deleted

    // HEURISTIC 3: Already logged?
    if deletion_file_exists(id): continue

    // VERIFY via direct API call
    res = GET /tweets/{id}
    if res.status == 404 OR (res.ok AND no data):
      save_deletion(id, original_tweet, detected_at)
      alert(f"DELETION: {author} deleted: {preview}")
```

**为什么启发式很重要：** 如果没有#2（48小时过时性检查），你会得到错误的结果
对刚刚超出 API 搜索窗口的旧推文的积极评价。没有#1
（7 天上限），您每次运行都会调查数千条旧推文。
### 参与速度跟踪
```
track_engagement(id, metrics):
  snapshots = load_snapshots(id)
  last = snapshots[-1] if snapshots else null

  if last AND metrics_equal(last, metrics): return  // no change

  snapshots.append({timestamp: now, metrics})
  if len(snapshots) > 100: snapshots = snapshots[-100:]  // cap growth

  // Alert conditions (OR logic):
  if last:
    old_likes = last.like_count
    new_likes = metrics.like_count

    // Condition 1: 2x on established tweets (>= 50 likes)
    if old_likes >= 50 AND new_likes >= old_likes * 2:
      alert(f"VELOCITY: {id} likes {old_likes} -> {new_likes}")

    // Condition 2: Absolute jump > 100
    elif (new_likes - old_likes) > 100:
      alert(f"VELOCITY: {id} likes {old_likes} -> {new_likes}")
```

**阈值设计：** `50` 最小值可防止小推文产生 2→4 的噪音。
“100”绝对跳跃可以捕获任何基线的推文上的大幅峰值。
### 原子文件写入
```
atomic_write(path, obj):
  tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(obj, null, 2))
  renameSync(tmp, path)  // atomic on most filesystems
```

如果进程在写入过程中终止，则会留下“.tmp”文件，但原始文件
未受影响。当您有数千个每条推文 JSON 文件时，这一点至关重要。
### 速率限制处理
```
rate_limits = {}  // per endpoint

after_each_request(endpoint, headers):
  rate_limits[endpoint] = {
    remaining: headers['x-rate-limit-remaining'],
    reset: headers['x-rate-limit-reset']
  }

is_rate_limited(endpoint, min_remaining=2):
  r = rate_limits[endpoint]
  return r AND r.remaining <= min_remaining
```

每个端点保留 2 个请求，以便其他流仍然可以工作。如果提到
达到限制，自己的时间线和搜索仍然可以运行。
### 标准输出合约
收集器打印 cron 代理可以解析的结构化行：```
RUN_START:{timestamp}
OWN_TWEETS:{total} ({new} new)
MENTIONS:{total} ({new} new)
DELETION_DETECTED:{id}:{author}:{preview}
VELOCITY_ALERT:{id}:likes:{old}->{new}:{minutes}min
RUN_COMPLETE:{timestamp}:tweets_stored={N}:deletions={N}:velocity_alerts={N}
```

### 设置后代理应测试什么
1. **删除检测：** 发布推文，收藏，删除，再次收藏。
   验证第二次运行时是否检测到删除。
2. **速率限制：** 以非常低的剩余配额运行收集。验证它是否停止
   优雅地报告哪些流被跳过。
3. **参与度：** 找到一条有 45 个赞的推文。模拟它跳到90（没有警报，
   < 50 阈值）。然后 50→100（警报：2x）。然后30→150（警报：>100跳跃）。
4. **去重：** 收集，然后像你自己的一条推文一样，再次收集。
   验证“_collected_at”是否保留（未覆盖）。
5. **原子写入：** 在收集过程中终止进程。验证没有损坏的 JSON。
## 成本估算
|组件|每月费用|
|------------|-------------|
| X API 免费层 | $0（只读，下限）|
| X API 基础层 | $200/月（搜索 + 更高限额）|
| X API 专业级 | $5,000/月（完整存档）|
| **推荐** | **0 美元（免费）或 200 美元（基本）** |
免费套餐适用于个人监控。关键字搜索所需的基本层。
## 故障排除
**API返回403：**
- 检查您的应用程序是否具有正确的访问级别（读取或读取+写入）
- 免费层应用程序只能使用基本端点
- 某些端点需要基本或专业级别
**速率限制（429）：**
- 收集器自动遵守速率限制
- 如果经常达到限制，请将 cron 间隔增加到 60 分钟
- 检查“data/state.json”以进行速率限制跟踪
**未收集推文：**
- 验证用户ID是否正确（数字，不是句柄）
- 检查 Bearer Token 是否有效（第 1 步验证）
- 某些帐户可能有受保护的推文（需要 OAuth 2.0 用户上下文）