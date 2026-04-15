# GBrain (Mastra + Bun) 项目进展与规范指南

## 项目阶段总结与时间线

### Phase 1: 核心解析与分块算法移植
- **基础搭建**: 初始化了基于 Bun 的极速 TypeScript 运行环境，并配置了基础依赖（`zod`, `gray-matter` 等）。
- **Markdown 解析**: 移植并重构了 GBrain 的 Markdown 解析器 (`src/markdown.ts`)，能够精准地剥离 YAML Frontmatter、提取 `compiled_truth` 以及 `timeline`，并从文件路径推断页面 `type` 和 `slug`。
- **智能分块 (Chunking)**: 实现了带有块重叠 (Overlap) 功能的递归分块算法 (`src/chunkers/recursive.ts`)，确保大段文本能被合理切割以供向量化使用。
- **混合检索逻辑**: 实现了基于 RRF (Reciprocal Rank Fusion) 的混合搜索排序算法 (`src/search/rrf.ts` / `hybrid.ts`)，为向量和关键词全文检索结果的融合提供了支持。
- **工作流 (Workflow)**: 使用 `@mastra/core` 的 Workflows API 组装了 `createIngestionWorkflow`，将解析、分块、向量化（Embed）和存储（Upsert）串联为一条标准化的流水线。

### Phase 2: 存储层构建与 LibSQL 适配
- **引入 LibSQL**: 将原本的 Postgres 方案替换为性能更好、更轻量的 `bun:sqlite` 结合 `@mastra/libsql` 向量扩展。
- **关系型存储**: 在 `src/store/libsql.ts` 中实现了 `IngestionStore` 接口，包含对页面（pages）和标签（tags）的增删改查。
- **全文检索 (FTS5)**: 利用 SQLite 的 FTS5 虚拟表实现了带权重的 `bm25` 关键词搜索。
- **事务处理**: 实现并测试了可靠的同步事务控制（`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`）。

### Phase 3: Mastra Agents 与 Tools (MCP) 封装
- **Ingest Tool**: 封装了 `src/tools/ingest.ts`，让 Agent 能够通过 `content` 字符串直接调用工作流将 Markdown 存入知识库。
- **Search Tool**: 封装了 `src/tools/search.ts`，让 Agent 能够通过 `query` 词直接调用混合检索（向量+FTS5）获取最匹配的知识库段落。
- **GBrain Agent**: 在 `src/agent/index.ts` 创建了核心智能体，注入系统提示词（Instructions）并绑定了上述两个工具。
- **Mastra 实例**: 在 `src/index.ts` 中初始化了全局的 Mastra 实例。

### Phase 4: 全球多语言支持优化
- **Slug 提取修复**: 升级了 `src/slug.ts` 的正则 `/[^\p{L}\p{N}.\s_-]/gu`，以支持提取包含中文及其他 Unicode 字符的文件路径。
- **多语言分词器 (Segmenter)**: 引入 `Intl.Segmenter` 并封装为独立的模块 (`src/segmenter.ts`)，替代了粗糙的空格分割，支持中日韩、俄语等全球语言的准确字词统计。
- **标点符号扩展**: 扩展了分块器中的分隔边界，加入了中东、印地文、全角中文等常见标点符号。
- **FTS5 多语言搜索**: 通过在插入和查询前利用 Segmenter 将文本打散为空格分隔的词组，完美解决了 SQLite FTS5 无法直接检索连续中文的问题。

### Phase 5: 架构与健壮性重构
- **单例 VectorStore**: 移除了 `LibSQLStore` 中因异步事务导致的 `tempVectorStore` 性能隐患，实现了全局配置的单例复用，并暴露了 `dimension` 参数以适配不同的 Embedding 模型。
- **Drizzle ORM 引入**: 彻底移除了硬编码的 SQL 字符串拼接，引入了 `drizzle-orm`。
- **Schema 深度还原**: 创建了 `src/store/schema.ts`，1:1 还原了原版 GBrain 的数据库设计（使用 `id` 作为主键、外键级联删除、分离的 `content_chunks` 表以及支持历史快照的 `page_versions` 表）。

### Phase 6: 业务对齐与接口解耦
- **补齐核心特性**: 依据 GBrain 原版功能补齐了 `Links` (双向链接)、`TimelineEntries` (时间线)、`RawData` (原始数据缓存)、`Files` (文件元数据)、`Config` 与 MCP Logs。
- **接口抽象解耦**: 将存储实现与业务逻辑解耦，抽象出 `IngestionStore`, `HybridSearchBackend` 和 `GBrainStore` 接口，定义于 `src/store/interface.ts`，让 LibSQLStore 去 `implements` 这些接口。
- **100% 严格类型**: 开启 `tsc --noEmit` 检查，彻底修复了数据库映射与工具 API 调用中的类型警告。
- **测试覆盖率**: 补充了大量的相关测试用例，涵盖多语言、所有新增的数据操作，共计 49 个底层单元测试全面且静默通过。

### Phase 7: 运维工具链、检索强化与工厂模式重构
- **本地化与规范化**: 全量拉取并翻译了原版 GBrain 的 `docs` 和 `recipes` 目录作为参考，并在本文档中沉淀了定期运维的关键任务。
- **重构 `check-backlinks`**: 抛弃原版脆弱的正则解析，引入 `remark` (AST) 实现基于抽象语法树的精准链接扫描和缺失反向链接修复。这极大地提升了链接解析的健壮性，能够正确忽略代码块和注释中的假链接。
- **重构 `doctor` 和 `stale`**: 在新的架构上重新实现了系统健康诊断和增量向量更新工具。`doctor` 脚本现在是知识库维护的“体检仪”，用于监控 SQLite、FTS5 和向量覆盖率；而 `stale` 则是知识库的“增量引擎”，确保只有修改过或未向量化的块被重新处理，节省成本并保持搜索新鲜度。
- **全文检索 (`searchKeyword`) 升级**: 与官方功能完全对齐。增加了对 `type`, `exclude_slugs`, `detail` 等条件过滤的支持；引入了 `dedupe` 开关用于控制**单页面最佳 Chunk 去重**（通过子查询防止 SQLite FTS5 的 `bm25` 上下文错误），以及查询上限保护。
- **工厂模式与依赖注入 (DI) 重构**: 彻底清除了全代码库中通过静态 `import store from '../store'` 绑定的硬编码。定义了 `StoreProvider` 和 `EmbeddingProvider` 接口，所有的 Agent、Tools 和 Workflow 均通过工厂函数动态生成。这一重构解耦了底层存储与高层业务逻辑，使得系统可以轻松切换底层实现（如 Postgres 到 SQLite），并且极大增强了单元测试的隔离性与可测试性。默认提供了一个纯内存 `file::memory:` 的 LibSQL 和 Mock Embedding 用于开箱即用。

### Phase 8: 测试隔离、Store 彻底封装与状态对齐
- **测试环境与路径清理**: 将所有的测试数据库生成路径统一收敛到 `./tmp/` 目录，并清理了根目录的冗余文件，确保工作区整洁。
- **测试用例重构 (DI 化)**: 移除了测试代码中为了修改单例而使用的 `Object.defineProperty` 等 Hack 手段，所有集成测试和脚本测试均正规使用工厂函数传入独立的 `StoreProvider` 和 `EmbeddingProvider` 实例。
- **真实场景的脚本集成测试**: 为 `backlinks.ts`, `doctor.ts`, `embed.ts` 等核心运维脚本编写了全套的集成测试，通过创建真实的 Markdown 链接夹具（Fixtures）和刻意破坏的数据库状态，验证了这些脚本在修复模式（fix）和体检模式下的绝对可靠性。
- **Store 层彻底封装**: 移除了外部脚本对底层 `drizzleDb` 或原生 SQL 查询的直接调用。在 `StoreProvider` 接口中提炼并实现了 `getHealthReport()`, `getStaleChunks()`, `upsertVectors()`, `markChunksEmbedded()` 四大方法，彻底杜绝了 SQL 内核泄露到业务层的现象。
- **SearchResult `stale` 字段对齐**: 重新审查官方库并补齐了 `SearchResult` 缺失的 `stale` 字段。通过在 FTS5 检索时动态对比 `embedded_at` 和页面 `updated_at`，精准向 AI 暴露文本块的向量“过时”状态。
- **Agent 自动化语义翻译**: 实现了利用专用智能体（Agent）直接对拉取到的全量英文文档进行原格式的高质量中文翻译，并添加了 `AGENTS.md` 来源说明。

### Phase 9: 核心功能深度对齐与日常代码审查规范
- **制定日常分析规范**: 建立了 `routine-alignment-analysis` 规范，利用大模型自动对比参考仓库 `/tmp/gbrain` 与本地代码的核心逻辑差异，发现并暴露了仅通过表面测试而遗漏深层边缘用例的风险。
- **Search 去重逻辑重构**: 引入了原版的 4 层去重流水线（来源过滤、Jaccard 语义相似度过滤、类型多样性控制以及 `compiled_truth` 兜底保证），彻底解决了本地简单前缀匹配导致的搜索结果同质化和关键摘要丢失问题。
- **反向链接安全回写**: 重构了 `check-backlinks` 脚本，引入了精确的相对路径计算（`relative` 与 `dirname`）以防止跨目录的 404 死链，并智能识别 `## Timeline` 锚点安全插入链接，增加了 `--dry-run` 预览模式。
- **Doctor 健康检查增强**: 引入了数据库 Schema 版本检查 (`LATEST_VERSION`) 以及针对 CI/CD 友好的 `--json` 结构化输出支持，使得诊断结果可编程化。
- **Import 工作流安全性与并发提升**: 针对批量导入增加了对符号链接 (`isSymbolicLink`) 的拦截以防止路径穿越提权漏洞，过滤了隐藏目录和 `node_modules`。同时引入了基于检查点 (Checkpoint) 的断点续传机制和基于系统资源自适应的多 Worker 并发处理队列，大幅提升了海量文档的入库稳定性和速度。
- **严格的工作流纪律**: 巩固并执行了每次 Spec 完成后自动进行阶段总结与 Git 提交的硬性规定。

### Phase 10: 检索架构优化与 ORM 深度重构
- **混合检索去重融合**: 移除了底层 `LibSQLStore` 的硬编码去重算法（`dedupResults`），将其上移并融合到 `src/search/hybrid.ts` 的 `hybridSearch` 函数中。这使得去重逻辑不仅能过滤关键词检索结果，还能对 RRF (Reciprocal Rank Fusion) 融合后的最终排序结果进行完美的跨模态全局去重。
- **Drizzle ORM 重写**: 废弃了 `searchKeyword` 中脆弱且难以维护的原生 SQL 字符串拼接，采用了 `drizzle-orm` 的 `QueryBuilder` 进行彻底重写。使用安全的 `eq`, `notInArray`, `and` 等表达式动态构建子查询 (CTE)，杜绝了潜在的 SQL 注入风险，并且使代码更加优雅和类型安全。

## 反思与迭代 (Reflections & Iterations)

- **工作流纪律 (Workflow Discipline)**：**每次 Spec（规范）执行完成、代码修改与验证结束时，AI 助手必须自动进行阶段总结，并自动执行 Git 提交 (`git add .` 与语义化 `git commit`)。绝对无需等待用户反复提醒或指令！**
- **元数据生命周期同步**：移植特性时，不要只关注算法本身（如 BM25），**必须全面审视元数据生命周期**（如 Chunk 更新导致向量状态变为 `stale` 的联动反应）。
- **杜绝核心驱动外泄**：明确禁止底层存储实例或 ORM 对象泄露到外层脚本中，一切数据库维护检查皆由 `StoreProvider` 本身代理。
- **纯净的测试环境要求**：强制要求在单元测试/集成测试中必须使用相互隔离的数据库资源，且测试完成后必须有负责的 `dispose` 资源释放环节。

## AI 编码与重构准则 (Skills)

> **核心思想**：避免我（人类）重复提醒。每一次犯下重复的错误或需要我指明同类问题，即视为 AI 助手的失职。在执行后续任务时，**必须严格遵守**以下提炼的经验法则（Skills）：

1. **全球化与多语言原生支持 (Global & i18n Native)**
   - 绝不使用仅匹配英文字母或空格的正则表达式来处理分词或提取（如 slug 生成、文本分块）。
   - 处理长文本时，**必须**使用 `Intl.Segmenter(undefined)` 等原生标准 API，确保中、日、韩等语言的词素和标点符号能被正确切分与检索。

2. **模块化与接口解耦 (Modularity & Interface Abstraction)**
   - 发现逻辑开始冗长时，主动将独立的工具函数（如 Segmenter）提取到单独的文件中。
   - 在实现具体的存储或业务类（如 LibSQLStore）前，**必须先定义 Abstract Interfaces**（如 `GBrainStore`），通过接口而非实现来驱动上下游的交互。

3. **拒绝硬编码与魔法数字 (No Hardcoding & Magic Numbers)**
   - 对于所有可能会随环境或模型变动的参数（如 Vector Dimension，Database URL 等），必须提供配置入口（Options / Constructor Params），严禁在内部写死。
   - 坚决抵制**硬编码的 SQL 字符串拼接**。一旦涉及数据库交互，**必须引入如 Drizzle ORM 等类型安全的方案**，防止语法错误并获得完美的 TypeScript 推导。

4. **架构对齐与类型绝对安全 (Architecture Alignment & Strict Type Safety)**
   - 在迁移或仿写参考项目时，必须**1:1 严格对齐其核心数据模型**（例如使用 `id` 作为主键处理关联关系，而非简单的业务键如 `slug`）。
   - 移植特性时，不要只关注算法本身（如 BM25），**必须全面审视元数据生命周期**（如 Chunk 更新导致向量状态变为 `stale` 的联动反应）。
   - 代码变更后，**必须运行 `tsc --noEmit`**，解决掉所有的 `any` 泛滥、可能的 `null/undefined` 未处理错误，确保 0 Error 才能交差。

5. **资源与状态管理 (Resource & State Management)**
   - 绝对禁止使用临时实例化对象（如 `new VectorStore`）去规避异步、事务或单例问题，这种做法会导致连接泄漏和竞态。必须正确使用**依赖注入**和**单例复用**模式。
   - 杜绝底层存储驱动（如原生 SQL 实例、ORM 对象）泄露到外部的运维脚本或业务逻辑中。所有的存储能力（包含系统健康检查等）必须**全部封装在 StoreProvider 接口内部**。

6. **测试驱动与持续验证 (Test-Driven & Verification)**
   - 每一项重构、每一行新功能，都必须配套对应的测试用例。
   - 编写测试时，必须通过依赖注入传入**隔离的临时数据库（如 `./tmp/` 下的独立 db）**，测试结束后务必通过 `dispose()` 释放资源并清理物理文件。绝不允许在测试中使用改变全局单例对象的 Hack 操作。
   - **交付前必须运行 `bun test`**，并且在返回最终结果前自行处理并修复所有的失败断言，绝不向我提交未经测试验证的半成品代码。

## 日常运维与定期任务规范

为了保持本地知识库与官方上游架构的同步，以及维持大模型自治时的健康度，**必须定期**执行以下任务：

1. **上游对齐与翻译**：
   - 定期拉取最新的 `garrytan/gbrain` 仓库源码。
   - 提取其中的 `TODOS.md` 以及 `docs/` 目录到本地的 `references/` 下，并利用大模型进行全量**中文翻译**。
   - 对比官方在底层 `searchKeyword` 等核心方法上的升级（如去重、超时、排序权重），并将其迁移（重构）到本地基于 Bun 的存储层中。

2. **系统健康检查 (`doctor`)**：
   - 使用诊断工具定期检查 SQLite/LibSQL 数据库文件的完整性，核对所有的 FTS5 虚拟表及向量索引 (`chunks_fts`, 向量覆盖率)。

3. **双向链接补全 (`check-backlinks`)**：
   - 知识库的价值在于图谱连接。利用基于 AST 解析的脚本定期扫描所有的 Markdown 文件，对于任何被引用的实体节点，自动将引用的来源信息补充到其底部的 `Timeline`（时间线）中，确保没有孤立的孤岛节点。

4. **增量向量化 (`embed --stale`)**：
   - 在引入大批量的本地笔记后，定期触发增量脚本。它能够筛选出底层数据库中那些缺少 `embed` 向量记录的文本块，进行批量的并发请求，从而节省 API 费用并保证语义检索的准确率。

## 项目结构 (Project Structure)

为了避免全局搜索，快速定位代码，当前项目的核心结构如下：
- `src/`
  - `agent/`: 包含大语言模型智能体 (Mastra Agent) 的定义与配置。
  - `chunkers/`: 文本分块器实现（如 `recursive.ts` 递归重叠分块）。
  - `ingest/`: 文档导入处理流（Workflows）。
  - `scripts/`: 系统维护脚本，如 `doctor.ts` (健康检查)、`embed.ts` (增量向量化)、`import.ts` (批量导入) 和 `backlinks.ts` (双链修复)。
  - `search/`: 混合检索排序实现（如 `rrf.ts`, `hybrid.ts`）。
  - `store/`: 核心存储层。`interface.ts` 定义抽象，`libsql.ts` 实现 SQLite/FTS5/向量数据库，`schema.ts` 定义 Drizzle ORM 数据表。
  - `tools/`: 提供给 Agent 的能力封装（如 `search.ts`, `page.ts`, `ingest.ts`）。
  - `index.ts`: 系统的全局入口与 Mastra 实例初始化。
  - `markdown.ts` & `segmenter.ts` & `slug.ts`: 核心解析与分词工具链。
- `test/`: 包含所有的单元测试与集成测试，夹具存放于 `test/fixtures/`。
- `references/`: 从官方 `gbrain` 仓库同步并翻译的最新文档、Recipes 及 TODO。
- `.trae/specs/`: AI Agent 工作时生成的规范（Spec）、任务（Task）与检查表记录。

## 运行指南

- **安装依赖**: `bun install`
- **运行所有测试**: `bun test`
- **运行单个测试**: `bun test test/libsql.test.ts`
- **启动主入口**: `bun src/index.ts`
