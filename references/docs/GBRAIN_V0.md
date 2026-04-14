# GBrain v0: 原生 Postgres 的个人知识大脑
## 这是什么
GBrain 是一个编译的智能系统。不是笔记应用。也不是“与你的笔记聊天”。
每个页面都是一份情报评估。横线之上：编译的真相（你目前最好的理解，当证据改变时重写）。横线之下：时间线（仅追加的证据追踪）。 AI 代理维护大脑。 MCP 客户端查询它。智能存在于胖 markdown 技能中，而不是应用程序代码中。
核心洞见：大规模的个人知识是一个智能问题，而不是存储问题。
## 为什么它存在
一个包含 7,471 个文件 / 2.3GB 的 markdown wiki 正在让 git 窒息。对于类似 wiki 的使用方式，Git 无法扩展到超过约 5000 个文件。编译的真相 + 时间线模型（Karpathy 风格的知识页面）是正确的，但它下面需要一个真正的数据库。
现在已经有一个生产级的 RAG 系统（Ruby on Rails，Postgres + pgvector），具有 3 层分块、带 RRF 的混合搜索、多查询扩展和 4 层去重。 GBrain 将这些经过验证的模式移植到了一个独立的 Bun + TypeScript 工具中。
## 知识模型
```
+--------------------------------------------------+
|  页面：concepts/do-things-that-dont-scale         |
|                                                   |
|  --- 前言 (YAML) ---                              |
|  type: concept                                    |
|  tags: [startups, growth, pg-essay]               |
|                                                   |
|  === 编译的真相 (COMPILED TRUTH) ===              |
|  目前最好的理解。                                   |
|  基于新证据重写。                                   |
|  这是“我们现在知道什么”部分。                        |
|                                                   |
|  ---                                              |
|                                                   |
|  === 时间线 (TIMELINE) ===                        |
|  仅追加的证据追踪。                                 |
|  - 2013-07-01: 发表在 paulgraham.com              |
|  - 2024-11-15: 在批次启动演讲中被引用               |
|  从不编辑，只追加。                                 |
+--------------------------------------------------+
          |                    |
          v                    v
  [语义分块]            [递归分块]
  (编译真相的            (时间线的
   最佳质量)             可预测格式)
          |                    |
          v                    v
     [嵌入: text-embedding-3-large, 1536 维度]
          |
          v
  [HNSW 索引 + tsvector + pg_trgm]
          |
          v
  [混合搜索：向量 + 关键字 + RRF 融合]
```

## 架构决策
### v0 技术栈
| 层级 | 选择 | 原因 |
|-------|--------|-----|
| 数据库 | Postgres + pgvector | 经过验证的 RAG 模式，经过生产测试。世界级的混合搜索。 |
| 托管 | Supabase Pro ($25/月) | 零运维。托管的 Postgres、pgvector、连接池。 8GB 存储。 |
| 运行时 | Bun + TypeScript | 与 GStack 生态系统一致。速度快。编译为单个二进制文件。 |
| 嵌入 | OpenAI text-embedding-3-large | 1536 维度（通过维度 API 从 3072 缩减）。约 $0.13/100万 tokens。 |
| LLM（分块/扩展） | Claude Haiku | 用于主题边界检测和查询扩展的最便宜模型。 |
| 后台任务 | Trigger.dev | 无服务器。嵌入回填、过时检测、孤儿审计、标签一致性。 |
| 分发 | npm 包 + 编译好的二进制文件 + MCP 服务器 | OpenClaw 的库，人类的 CLI，代理的 MCP。 |
### 我们选择了什么以及为什么
**选择 Postgres 而不是 SQLite。 ** 我们在 Postgres 上运行经过验证的 RAG 模式已有 3 年多时间。用于全文搜索的 tsvector，用于语义搜索的 pgvector HNSW，用于模糊 slug 匹配的 pg_trgm。将这些移植到 SQLite 意味着从头开始重新实现搜索。 SQLite 是未来为轻量级开源用户准备的可插拔引擎（参见 `docs/ENGINES.md`）。
**选择 Supabase 而不是自托管。 ** 零维护。大脑应该是 AI 代理使用的基础设施，而不是你需要管理的东西。免费层有 pgvector，但只有 500MB（不足以容纳带有嵌入的 7K+ 页面，这需要大约 750MB）。 $25/月的 Pro 层提供 8GB。 v1 中没有 Docker，没有自托管的 Postgres。
**完全移植而不是最小可行。 ** 这些模式是经过验证的。移植是机械性的。提供完整的 3 层分块 + 混合搜索 + 4 层去重意味着从第一天起就拥有世界级的 RAG。 “我们以后再加”意味着以后要重建一切。
**库优先分发。 ** gbrain 是一个 npm 包。 OpenClaw 将其安装为依赖项（`bun add gbrain`），直接导入引擎。零开销的函数调用，共享连接池，TypeScript 类型。 CLI 和 MCP 服务器是同一个引擎之上的薄包装。
**基于触发器的 tsvector（而不是生成列）。 ** 为了在全文搜索中包含 timeline_entries 的内容，tsvector 需要跨越多个表。生成列不能进行跨表引用。 pages + timeline_entries 上的触发器会更新 search_vector。
**导入时自动嵌入。 ** 没有单独的嵌入步骤。 `gbrain import` 一次性完成分块和嵌入。进度条显示状态。为想要推迟嵌入的用户提供 `--no-embed` 标志。 `embedded_at` 列启用了 `gbrain embed --stale` 进行回填。
## 分发模型
```
+-------------------+     +-------------------+     +-------------------+
|   npm package     |     |  编译好的二进制文件 |     |   MCP 服务器        |
|   (库)            |     |  (CLI)            |     |   (stdio)         |
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| bun add gbrain    |     | GitHub Releases   |     | gbrain serve      |
| import { Postgres |     | npx gbrain        |     | 在 mcp.json 中    |
|   Engine }        |     |                   |     |                   |
|                   |     |                   |     |                   |
| WHO: OpenClaw,    |     | WHO: 人类         |     | WHO: Claude Code, |
| AlphaClaw         |     |                   |     | Cursor, 等等.     |
+-------------------+     +-------------------+     +-------------------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                          +--------v--------+
                          |  BrainEngine    |
                          |  (可插拔        |
                          |   接口)         |
                          +-----------------+
                                   |
                     +-------------+-------------+
                     |                           |
              +------v------+            +-------v-------+
              | Postgres    |            | SQLite        |
              | 引擎        |            | 引擎          |
              | (v0, 随附)  |            | (未来, 参见   |
              +-------------+            | ENGINES.md)   |
                                         +---------------+
```

package.json 导出：
- 库：`src/core/index.ts`（BrainEngine 接口、PostgresEngine、类型）
- CLI 二进制文件：`src/cli.ts`
## 首次使用体验
### 路径 1：OpenClaw 用户（主要）
OpenClaw 是将 gbrain 作为其知识后端的 AI 编排器。这是最常见的安装路径。
```bash
# 1. 将 gbrain 作为 ClawHub 技能安装
clawhub install gbrain

# 2. 该技能在首次使用时运行引导设置：
#    - 检测是否可用 Supabase CLI
#    - 如果是：自动配置新的 Supabase 项目
#    - 如果否：提示输入连接 URL
#    - 运行架构迁移
#    - 扫描 markdown 仓库并导入用户的内容
#    - 显示实时的实体/边提取动画
#    - 大脑准备就绪

# 3. 在 OpenClaw 中，大脑工具现在可用：
#    "Search the brain for [topic from your data]"
#    "Ingest my meeting notes from today"
#    "How many pages are in the brain?"
```

在幕后，`clawhub install gbrain`：
1. 安装 `gbrain` npm 包
2. 提供 SKILL.md 文件（摄取、查询、维护、丰富、简报、迁移）
3. 向编排器注册大脑工具
4. 首次使用时运行 `gbrain init --supabase`（引导向导）
### 路径 2：CLI 用户（独立）
```bash
# 1. 安装
npm install -g gbrain
# 或者：从 GitHub Releases 下载二进制文件

# 2. 使用 Supabase 初始化
gbrain init --supabase
# 引导向导：
#   尝试 1：Supabase CLI 自动配置 (npx supabase)
#   尝试 2：如果未安装 CLI 或未登录，则回退：
#          "Enter your Supabase connection URL:"
#   然后：运行架构迁移，验证 pgvector 扩展
#   然后：验证数据库已准备好进行导入
#   输出："Brain ready. Run: gbrain import <your-repo>"

# 3. 导入你的数据
gbrain import /path/to/markdown/wiki/
# 进度条：7,471 个文件，自动分块，自动嵌入
# 文本导入约 30 秒，嵌入约 10-15 分钟

# 4. 查询
gbrain query "what does PG say about doing things that don't scale?"
```

### 路径 3：MCP 用户（Claude Code, Cursor）
```json
// ~/.config/claude/mcp.json
{
  "mcpServers": {
    "gbrain": {
      "command": "gbrain",
      "args": ["serve"]
    }
  }
}
```

然后在 Claude Code 中：“在我的大脑中搜索了解机器人技术的人”
### 初始化向导详解
`gbrain init --supabase` 贯穿以下步骤：
```
Step 1: Database Setup (数据库设置)
  ├── 检查 Supabase CLI (npx supabase --version)
  │   ├── 找到 + 已登录 → 自动创建项目
  │   │   ├── 通过 supabase CLI 创建项目
  │   │   ├── 等待项目准备就绪
  │   │   └── 提取连接字符串
  │   ├── 找到 + 未登录 →
  │   │   └── 错误："Supabase CLI found but not logged in."
  │   │         原因："You need to authenticate first."
  │   │         修复："Run: npx supabase login"
  │   │         文档："https://supabase.com/docs/guides/cli"
  │   └── 未找到 → 回退到手动
  │       └── 提示："Enter your Supabase connection URL:"
  │
Step 2: Schema Migration (架构迁移)
  ├── 连接到数据库
  ├── CREATE EXTENSION IF NOT EXISTS vector
  ├── CREATE EXTENSION IF NOT EXISTS pg_trgm
  ├── 运行 src/schema.sql（所有表、索引、触发器）
  └── 验证：测试插入 + 向量查询
  
Step 3: Config (配置)
  ├── 写入 ~/.gbrain/config.json（0600 权限）
  │   { "database_url": "...", "service_role_key": "..." }
  └── 验证连接

Step 4: Kindling Import (引子导入)
  ├── 导入 10 篇捆绑的 PG 文章作为演示数据
  ├── 对每篇文章进行分块 + 嵌入
  ├── 显示实时的实体/边提取动画：
  │   "Extracting entities... Paul Graham (person), Y Combinator (company)..."
  │   "Creating links... Paul Graham → Y Combinator (founded)..."
  └── 输出："Brain ready. 10 pages imported."

Step 5: First Query (首次查询)
  └── "Try: gbrain query 'what does PG say about doing things that don't scale?'"
```

每个错误都遵循风格指南：问题 + 原因 + 修复方法 + 文档链接。
## CLI 命令
```
gbrain init [--supabase|--url <conn>]     # 创建大脑
gbrain get <slug>                          # 阅读一个页面
gbrain put <slug> [< file.md]             # 写入/更新一个页面
gbrain search <query>                      # 关键字搜索 (tsvector)
gbrain query <question>                    # 混合搜索 (RRF + expansion)
gbrain ingest <file> [--type ...]         # 摄取源文档
gbrain link <from> <to> [--type <type>]   # 创建类型化链接
gbrain unlink <from> <to>                 # 移除链接
gbrain graph <slug> [--depth 5]           # 遍历链接图谱 (递归 CTE)
gbrain backlinks <slug>                    # 传入链接
gbrain tags <slug>                         # 列出标签
gbrain tag <slug> <tag>                    # 添加标签
gbrain untag <slug> <tag>                  # 移除标签
gbrain timeline [<slug>]                   # 查看时间线
gbrain timeline-add <slug> <date> <text>  # 添加时间线条目
gbrain list [--type] [--tag] [--limit]    # 使用过滤器列出
gbrain stats                               # 大脑统计信息
gbrain health                              # 大脑健康仪表板
gbrain import <dir> [--no-embed]          # 从 markdown 目录导入
gbrain export [--dir ./export/]           # 导出为 markdown (往返)
gbrain embed [<slug>|--all|--stale]       # 生成/刷新嵌入
gbrain serve                               # MCP 服务器 (stdio)
gbrain call <tool> '<json>'               # 原始工具调用
gbrain upgrade                             # 自我更新 (npm, 二进制文件, ClawHub)
gbrain version                             # 版本信息
gbrain config [get|set] <key> [value]     # 大脑配置
```

CLI 和 MCP 暴露了相同的操作。漂移测试断言所有操作在两个界面上都能产生相同的结果。
## 数据库架构
Postgres + pgvector 中的 9 个表：
```
+------------------+     +-------------------+     +------------------+
|     pages        |---->|  content_chunks   |     |     links        |
|------------------|     |-------------------|     |------------------|
| id (PK)          |     | id (PK)           |     | id (PK)          |
| slug (UNIQUE)    |     | page_id (FK)      |     | from_page_id(FK) |
| type             |     | chunk_index       |     | to_page_id (FK)  |
| title            |     | chunk_text        |     | link_type        |
| compiled_truth   |     | chunk_source      |     | context          |
| timeline         |     | embedding (1536)  |     +------------------+
| frontmatter(JSONB)|    | model             |
| search_vector    |     | token_count       |     +------------------+
| created_at       |     | embedded_at       |     |     tags         |
| updated_at       |     +-------------------+     |------------------|
+------------------+                                | id (PK)          |
       |                                            | page_id (FK)     |
       +-----> +--------------------+               | tag              |
       |       | timeline_entries   |               +------------------+
       |       |--------------------|
       |       | id (PK)            |               +------------------+
       |       | page_id (FK)       |               |   page_versions  |
       |       | date               |               |------------------|
       |       | source             |               | id (PK)          |
       |       | summary            |               | page_id (FK)     |
       |       | detail (markdown)  |               | compiled_truth   |
       |       +--------------------+               | frontmatter      |
       |                                            | snapshot_at      |
       +-----> +--------------------+               +------------------+
       |       |    raw_data        |
       |       |--------------------|               +------------------+
       |       | id (PK)            |               |    config        |
       |       | page_id (FK)       |               |------------------|
       |       | source             |               | key (PK)         |
       |       | data (JSONB)       |               | value            |
       |       +--------------------+               +------------------+
       |
       +-----> +--------------------+
               |   ingest_log       |
               |--------------------|
               | id (PK)            |
               | source_type        |
               | source_ref         |
               | pages_updated      |
               | summary            |
               +--------------------+
```

索引：
- `pages.slug`：UNIQUE 约束（隐式 B-tree）
- `pages.type`：B-tree
- `pages.search_vector`：GIN（全文搜索）
- `pages.frontmatter`：GIN（JSONB 查询）
- `pages.title`：带 pg_trgm 的 GIN（模糊 slug 解析）
- `content_chunks.embedding`：带余弦操作的 HNSW（向量搜索）
- `content_chunks.page_id`：B-tree
- `links.from_page_id`, `links.to_page_id`：B-tree
- `tags.tag`, `tags.page_id`：B-tree
- `timeline_entries.page_id`, `timeline_entries.date`：B-tree
## 搜索架构
```
Query: "when should you ignore conventional wisdom?"
           |
           v
+---------------------+
| 多查询扩展           |
| (Claude Haiku)       |
| "contrarian thinking"|
| "going against the crowd"|
+---------------------+
     |   |   |
     v   v   v
  [嵌入所有 3 个查询]
     |   |   |
     +---+---+
         |
    +----+----+
    |         |
    v         v
+--------+ +--------+
| 向量    | | 关键字   |
| 搜索    | | 搜索     |
| (HNSW  | | (tsv + |
| cosine)| | ts_rank)|
+--------+ +--------+
    |         |
    +----+----+
         |
         v
+------------------+
| RRF 融合         |
| score = sum(     |
|   1/(60 + rank)) |
+------------------+
         |
         v
+------------------+
| 4 层去重         |
| 1. 按来源        |
| 2. Cosine > 0.85 |
| 3. 类型上限 60%  |
| 4. 每页最大值    |
+------------------+
         |
         v
+------------------+
| 过时警报         |
| (compiled_truth  |
|  比最新的        |
|  timeline 旧)    |
+------------------+
         |
         v
     [结果]
```

## 分块策略
| 策略 | 输入 | 算法 | 何时使用 |
|----------|-------|-----------|-------------|
| 递归 (Recursive) | 任何文本 | 5 级分隔符层次结构（段落 > 行 > 句子 > 从句 > 空白）。 300 个单词的块，50 个单词的重叠。 | 时间线（可预测的格式），批量导入 |
| 语义 (Semantic) | 优质文本 | 嵌入每个句子，使用 Savitzky-Golay 滤波器寻找主题边界，使用余弦相似度极小值。回退到递归。 | 编译的真相（情报评估） |
| LLM 引导 (LLM-guided) | 高价值文本 | 预分割为 128 个单词的候选项，Claude Haiku 在滑动窗口中寻找主题转换。每个窗口重试 3 次。 | 通过 `--chunker llm` 显式请求时 |
分发：compiled_truth 获得语义分块器。时间线获得递归分块器。通过 `--chunker` 标志或前言中的 `chunk_strategy` 进行覆盖。
## 技能（胖 markdown，没有代码）
每个技能都是一个 markdown 文件，供 AI 代理（Claude Code、OpenClaw）阅读并遵循。技能包含工作流、启发式方法和质量规则。二进制文件中没有技能逻辑。
| 技能 | 它的作用 |
|-------|-------------|
| `skills/ingest/SKILL.md` | 摄取会议、文档、文章。更新编译的真相，追加时间线，创建链接。 |
| `skills/query/SKILL.md` | 3 层搜索（FTS + 向量 + 结构化）。综合带有引用的答案。 |
| `skills/maintain/SKILL.md` | 查找矛盾、过时信息、孤儿、死链接、标签不一致。 |
| `skills/enrich/SKILL.md` | 从外部 API（Crustdata、Happenstance、Exa）丰富数据。存储原始数据，提炼为编译的真相。 |
| `skills/briefing/SKILL.md` | 每日简报：带有上下文的会议、活跃的交易、未决问题。 |
| `skills/migrate/SKILL.md` | 从 Obsidian、Notion、Logseq、纯 markdown、CSV、JSON、Roam 进行通用迁移。 |
## CEO 范围扩展（在 v0 中接受）
1. **带有漂移测试的 CLI/MCP 奇偶校验。 ** 两个界面都是引擎上的薄包装。测试断言相同的输出。
2. **智能 slug 解析。 ** 对于读取，通过 pg_trgm 进行模糊匹配。写入需要精确的 slug。 `gbrain get "dont scale"` 解析为 `concepts/do-things-that-dont-scale`。
3. **大脑健康仪表板。 ** `gbrain health` 显示页面数、嵌入覆盖率、过时页面、孤儿、死链接。
4. **标准化的时间线。 ** 仅限 `timeline_entries` 表（无 TEXT 列）。 `detail` 字段支持 markdown。
5. **页面版本控制。 ** `page_versions` 表存储完整的快照（compiled_truth + frontmatter + links + tags）。 `gbrain history`、`gbrain diff`、`gbrain revert` 命令。恢复会重新分块并重新嵌入。
6. **类型化链接 + 图谱遍历。 ** `link_type` 列（认识、投资于、工作于等）。 `gbrain graph` 使用具有最大深度的递归 CTE（默认为 5，可通过 `--depth` 配置）。
7. **Trigger.dev 数据清理任务。 ** 每日嵌入回填，每周过时检测 + 孤儿审计 + 标签一致性。
8. **过时警报注释。 ** 搜索结果标记那些 compiled_truth 早于最新 timeline_entries 的页面。
9. **摄取时时间线合并。 ** 在所有被提及的实体中创建相同的事件。
## 安全模型 (v0)
单用户，仅限本地：
- `~/.gbrain/config.json` 中的 Supabase service role key（0600 权限）
- MCP stdio 传输本质上是本地的（客户端将 `gbrain serve` 作为子进程生成）
- 在 v0 中没有多用户，没有 RLS，没有 OAuth
- 多用户路径（未来）：Supabase RLS + 每用户 API 密钥
## 升级机制
`gbrain upgrade` 检测安装方法并相应地进行更新：
| 路径 | 方法 |
|------|-----|
| npm | `bun update gbrain`（或 npm 等效命令） |
| 编译的二进制文件 | 将新二进制文件下载到临时目录，原子重命名交换，执行新进程 |
| ClawHub | `clawhub update gbrain` |
版本检查：将本地版本与最新的 GitHub release 标签进行比较。
## 存储和成本估算
### 存储（7,471 个页面约 750MB）
| 组件 | 大小 |
|-----------|------|
| 页面文本 (compiled_truth + timeline) | ~150MB |
| JSONB 前言 | ~20MB |
| tsvector + GIN 索引 | ~50MB |
| 内容块（约 2.2 万，文本） | ~80MB |
| 嵌入（2.2 万 x 1536 浮点数 x 4 字节） | ~134MB |
| HNSW 索引开销（约为嵌入的 2 倍） | ~270MB |
| 链接、标签、时间线、原始数据、版本 | ~50MB |
| **总计** | **~750MB** |
Supabase 免费层（500MB）装不下。 Supabase Pro（$25/月，8GB）是起点。
### 嵌入成本（首次导入约 $4-5）
| 步骤 | 成本 |
|------|------|
| 语义分块器句子嵌入（约 37.4 万个句子） | ~$1 |
| 块嵌入（约 2.2 万个块） | ~$0.30 |
| 查询扩展（每个查询，约 3 个嵌入） | 可忽略不计 |
| **首次导入总计** | **~$4-5** |
预算替代方案：`gbrain import --chunker recursive` 跳过句子级嵌入，然后稍后使用 `gbrain embed --rechunk --chunker semantic` 进行升级。
## 无服务器操作技术栈
```
+------------------+     +------------------+     +------------------+
|    Supabase      |     |    Vercel         |     |   Trigger.dev    |
|  (Postgres +     |     |  (web/API,        |     |  (后台            |
|   pgvector)      |     |   可选)           |     |   任务)           |
+------------------+     +------------------+     +------------------+
| 数据库            |     | 未来的 web UI     |     | 嵌入回填          |
| 连接池            |     | API 端点          |     | 过时检测          |
| pgvector HNSW    |     | 边缘函数          |     | 孤儿审计          |
| tsvector FTS     |     |                   |     | 标签一致性        |
| pg_trgm fuzzy    |     |                   |     | 每日简报          |
+------------------+     +------------------+     +------------------+
```

CLI 直接连接到 Supabase Postgres。 Trigger.dev 和 Vercel 用于异步/计划任务。 CLI 可以在没有它们的情况下工作。
## 验证清单
1. `gbrain import /data/brain/` 无损迁移所有 7,471 个文件
2. `gbrain export` 往返生成语义上相同的 markdown
3. `gbrain query "what does PG say about doing things that don't scale?"` 返回相关的混合搜索结果
4. `gbrain serve` 启动可被 Claude Code 连接的 MCP 服务器
5. 所有 3 个分块器使用测试固定装置产生正确的输出
6. `gbrain init --supabase` 端到端工作正常
7. `bun test` 通过所有测试
8. `clawhub install gbrain` 安装技能并运行引导设置
9. `bun add gbrain` + `import { PostgresEngine } from 'gbrain'` 在外部项目中工作正常
10. 漂移测试通过：CLI 和 MCP 产生相同的结果
11. `gbrain health` 输出准确的大脑健康指标
12. 迁移技能成功导入一个 Obsidian vault
## 未来计划
有关可插拔引擎架构和未来的后端计划，请参阅 `docs/ENGINES.md`。
### v1 候选项（从 v0 推迟）
- **`gbrain ask` 自然语言 CLI 别名。 ** 添加起来很简单。 P1 TODO。
- **智能编译器。 ** 将每个事实视为具有源跨度、实体链接、有效性窗口、置信度和矛盾状态的一等声明。 “什么改变了，为什么改变，以及什么证据会再次推翻它？”来自 Codex 审查。建立在编译的真相模型之上。
- **通过 Trigger.dev 的主动技能。 ** 特定于应用程序的简报、会议准备。属于 OpenClaw，而不是通用大脑基础设施。
- **多用户访问。 ** Supabase RLS + 每用户 API 密钥。 v0 是单用户的。
- **SQLite 引擎。 ** 欢迎社区 PR。参见 `docs/SQLITE_ENGINE.md`。
- **用于自托管 Postgres 的 Docker Compose。 ** 欢迎社区 PR。
- **Web UI。 ** 可选的由 Vercel 托管的仪表板，用于浏览大脑页面。
### 接口抽象原则
所有操作都通过 `BrainEngine` 进行。引擎接口就是契约。 Postgres 特有的特性（tsvector、pgvector HNSW、pg_trgm、递归 CTE）是 `PostgresEngine` 内部的实现细节。接口暴露的是能力，而不是 SQL。
这意味着：
- SQLite 引擎可以使用 FTS5 而不是 tsvector 来实现 `searchKeyword`
- SQLite 引擎可以使用 sqlite-vss 而不是 pgvector 来实现 `searchVector`
- 未来的 DuckDB 引擎可以实现繁重的分析工作负载
- CLI、MCP 服务器和库使用者永远不知道底下运行的是哪个引擎
完整接口规范请参阅 `docs/ENGINES.md`，SQLite 实现计划请参阅 `docs/SQLITE_ENGINE.md`。
## 审查历史
| 审查 | 运行次数 | 状态 | 主要发现 |
|--------|------|--------|-------------|
| /office-hours | 1 | APPROVED (已批准) | 构建者模式。选择了完全移植方法。 |
| /plan-ceo-review | 1 | CLEAR (清除) | 11 个提案，10 个被接受，1 个被推迟。范围扩展模式。 |
| /codex review | 1 | issues_found (发现问题) | 24 个观点受到质疑，3 个被接受（模糊 slug，revert 规范，tsvector）。 |
| /plan-eng-review | 2 | CLEAR (清除) | 3 个问题（升级路径，导入护栏，初始化向导），0 个关键差距。 |
| /plan-devex-review | 1 | CLEAR (清除) | DX 得分 5/10 到 7/10。 TTHW 25 分钟到 90 秒。冠军层级。 |