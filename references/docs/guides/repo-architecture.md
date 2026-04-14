# 两个 Repo 架构：代理行为与世界知识
＃＃ 目标
将代理行为（可替换）与世界知识（永久）分离成两个具有严格边界的存储库。
## 用户得到什么
如果没有这个：代理配置和世界知识就会混合在一起。切换代理
你就会失去你的知识。切换知识工具，您就会失去代理设置。
有了这个：你的大脑（14,700 多个人员、公司、会议、想法的文件）
在任何代理交换中仍然存在。您的代理配置可以在任何知识工具交换中幸存下来。
＃＃ 执行
### 边界测试
**“这是关于代理如何运作的，还是关于世界的知识？”**
|问题 |如果是 -> 代理回购 |如果是 -> Brain Repo |
|----------|---------------------|---------------------|
|如果你切换AI代理，这个文件会传输吗？ |是 | --|
|如果换一个人的话这个文件会转移吗？ | --|是 |
|这是关于代理人的行为方式吗？ |是 | --|
|这是关于个人、公司、交易、会议或想法吗？ | --|是 |
### 快速决策树
```
New file to create?
  |-- About a person, company, deal, project, meeting, idea? -> brain/
  |-- A spec, research doc, or strategic analysis? -> brain/
  |-- An original idea or observation? -> brain/originals/
  |-- A daily session log or heartbeat state? -> agent-repo/
  |-- A skill, config, cron, or ops file? -> agent-repo/
  |-- A task or todo? -> agent-repo/tasks/
```

### 代理存储库（操作配置）
代理如何运作。身份、配置、操作状态。
```
agent-repo/
├── AGENTS.md              # Agent identity + operational rules
├── SOUL.md                # Persona, voice, values
├── USER.md                # User preferences + context
├── HEARTBEAT.md           # Daily ops flow
├── TOOLS.md               # Available tools + credentials
├── MEMORY.md              # Operational memory (preferences, decisions)
├── skills/                # Agent capabilities (SKILL.md files)
│   ├── ingest/SKILL.md
│   ├── query/SKILL.md
│   ├── enrich/SKILL.md
│   └── ...
├── cron/                  # Scheduled jobs
│   └── jobs.json
├── tasks/                 # Current task list
│   └── current.md
├── hooks/                 # Event hooks + transforms
├── scripts/               # Operational scripts (collectors, gates)
└── memory/                # Session logs, state files
    ├── heartbeat-state.json
    └── YYYY-MM-DD.md      # Daily session logs
```

### Brain Repo（世界知识）
你知道什么。人、公司、交易、会议、想法、媒体。
这是存储库 GBrain 索引。
```
brain/
├── people/                # Person dossiers (compiled truth + timeline)
├── companies/             # Company profiles
├── deals/                 # Deal tracking
├── meetings/              # Meeting transcripts + analysis
├── originals/             # YOUR original thinking (highest value)
├── concepts/              # World concepts and frameworks
├── ideas/                 # Product and business ideas
├── media/                 # Video transcripts, books, articles
│   ├── youtube/
│   ├── podcasts/
│   └── articles/
├── sources/               # Source material summaries
├── daily/                 # Daily data (calendar, logs)
│   └── calendar/
│       └── YYYY/
│           └── YYYY-MM-DD.md
├── projects/              # Project specs and docs
├── writing/               # Essays, drafts, published work
├── diligence/             # Investment diligence materials
│   └── company-name/
│       ├── index.md
│       ├── pitch-deck.md
│       └── .raw/          # Original PDFs/files
└── Apple Notes/           # Imported Apple Notes archive
```

### 硬性规则
**切勿将知识写入代理存储库。**如果技能、子代理或 cron
工作需要创建一个关于个人、公司、交易、会议、项目的文件，
或者想法，它必须写入大脑存储库，而不是代理存储库。
大脑是永久的记录。代理存储库是可替换的。
### 为什么有两个存储库
**独立性。** 您可以切换AI代理（OpenClaw -> Hermes -> 自定义），无需
失去你的知识。您可以切换知识工具（GBrain -> 其他）
不会丢失您的代理设置。
**规模。** 大脑变大（10,000 多个文件）。代理仓库仍然很小
（< 100 个文件）。不同的备份策略，不同的同步节奏。
**隐私。** 大脑包含敏感信息（人物、交易、个人信息）
注释）。代理存储库包含操作配置。不同的访问控制。
**GBrain 索引 Brain repo。** 运行 `gbrainsync --repo ~/brain/` 以保留
当前搜索索引。代理存储库从未被 GBrain 索引。
## 棘手的地方
1. **永远不要将知识写入代理存储库。**这是最常见的
   违反。创建个人页面的技能，保存的 cron 作业
   会议记录、捕捉想法的子代理——所有这些都必须
   写入大脑存储库。如果它是关于世界的，它就会进入大脑。
2. **大脑是永久的记录。** 当有疑问时，问：“这会吗？
   切换到完全不同的 AI 代理后文件还能生存吗？”如果是的话，它
   属于大脑。代理配置、技能、cron 作业和操作
   状态是可替换的。人、公司、想法和会议都不是。
3. **不索引代理存储库。** GBrain 仅索引大脑存储库。
   针对代理存储库运行“gbrainsync”会污染搜索结果
   使用操作配置而不是世界知识。
## 如何验证
1. **检查文件放置。** 在任何技能或 cron 作业创建文件后，
   验证它是否位于正确的存储库中。个人/公司/想法/会议文件
   应该在“大脑/”中。 Skill/config/cron/state 文件应位于
   代理回购。代理存储库中的任何知识文件都是边界违规。
2. **运行边界测试。** 选择 5 个最近创建的文件并询问：“Would
   如果我更换人工智能特工，这个转移会怎样？”以及“如果我
   换了一个人？”如果答案与文件的不匹配
   位置，它位于错误的存储库中。
3. **验证 GBrain 仅索引 Brain。** 运行 `gbrain stats` 并检查
   索引路径。 None 不应指向代理存储库目录。如果代理
   配置文件出现在搜索结果中，则同步目标配置错误。
---

*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*