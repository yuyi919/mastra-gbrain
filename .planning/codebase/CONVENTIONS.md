# 编码规范与架构指南 (Conventions)

本项目（mastra-gbrain）是一个基于 TypeScript、Bun 和 Mastra 的极速 AI 助手知识库。为了保持系统的高性能、强类型安全以及全球化多语言支持，所有的开发与重构必须严格遵守以下规范。

## 1. 核心架构与模式 (Architecture & Patterns)

### 1.1 模块化与接口解耦 (Modularity & Interface Abstraction)
- **接口优先 (Interface-First)**：在实现具体的业务类或存储类之前，**必须先定义 Abstract Interfaces**（例如 `src/store/interface.ts` 中的 `GBrainStore` 或 `StoreProvider`），所有的上游业务代码必须依赖接口而非具体实现。
- **职责分离 (Separation of Concerns)**：坚决抵制底层存储驱动（如 Drizzle ORM 实例或 SQLite Database 对象）泄露到外部脚本中。所有的数据库交互、监控和诊断必须完全封装在 `StoreProvider` 内部。

### 1.2 依赖注入与单例管理 (Dependency Injection)
- **禁止魔法单例**：绝对禁止使用临时实例（如 `new VectorStore()`）去规避异步或事务问题，这会导致连接泄漏。
- **工厂模式 (Factory Pattern)**：所有的 Agent、Tools 和 Workflows 都必须通过工厂函数（Factory Functions）动态生成，并通过依赖注入的方式传入 `StoreProvider` 和 `EmbeddingProvider` 实例。这极大增强了系统的可测试性与扩展性。

## 2. 编码风格与类型安全 (Coding Style & Type Safety)

### 2.1 格式化与 Linting (Biome)
- 本项目使用 **Biome** 替代 Prettier 和 ESLint。
- **缩进与引号**：2 空格缩进，双引号 (Double Quotes)，LF 换行符。
- **导入规范**：禁止使用 `lodash`，推荐使用原生的 ES 特性或 `@effect`。

### 2.2 极致类型安全 (Strict Type Safety)
- 开启 `tsc --noEmit` 检查。
- 坚决杜绝 `any` 的滥用。任何代码变更后，必须处理掉所有潜在的 `null/undefined`，确保 **0 Error** 才能交付。
- 在与数据库的交互中，必须 **1:1 严格对齐核心数据模型**（如使用 `id` 作为主键而不是 `slug`），保证元数据生命周期的完整联动。

### 2.3 拒绝硬编码与魔法数字 (No Hardcoding & Magic Numbers)
- **配置驱动**：任何可能变动的参数（如 Vector Dimension，Database URL 等），必须提供配置入口，严禁在代码中写死。
- **安全的 ORM**：坚决抵制原生的 SQL 字符串拼接。必须引入 `drizzle-orm` 构建类型安全的 QueryBuilder，利用 `eq`, `notInArray`, `and` 等表达式动态构建查询，彻底杜绝 SQL 注入风险。

## 3. 全球化与多语言原生支持 (Global & i18n Native)

- **废弃正则分词**：绝不允许使用仅匹配英文字母或空格的正则表达式来处理分词、slug 生成或文本提取。
- **使用标准 API**：处理长文本或进行 FTS5 全文检索前，**必须**使用 `Intl.Segmenter(undefined)`（封装于 `src/segmenter.ts`）等原生标准 API 进行分词。这确保了中、日、韩、俄语等语言的词素和特殊标点符号能够被正确切分与检索。

## 4. 工作流纪律 (Workflow Discipline)

- **AI 助手自治法则**：每次 Spec（规范）执行完成、代码修改与测试验证结束时，AI 助手必须主动进行阶段总结，并自动执行 Git 提交（语义化 `git commit`）。不需要等待用户的反复指令。
