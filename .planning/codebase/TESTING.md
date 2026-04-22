# 测试策略与规范 (Testing)

本项目（mastra-gbrain）依托 `bun test` 作为核心测试框架。由于本系统包含底层的向量数据库、全文检索（FTS5）、大语言模型工作流和高并发爬取工具，我们的测试策略必须保障数据层的绝对隔离与执行环境的纯净。

## 1. 测试框架 (Testing Framework)

- **主框架**: `bun test`。其原生支持 TypeScript 与高速执行，是我们的首选工具。
- **环境要求**: 所有测试必须在本地能够通过 `bun test` 无缝、静默地通过，不得出现未捕获的错误日志。当前核心的数十个底层测试均全面通过。

## 2. 隔离与资源清理 (Isolation & Resource Cleanup)

### 2.1 临时独立数据库 (Temporary Isolated DB)
- 每一项重构或新功能测试，**必须**分配相互隔离的临时数据库资源。所有的测试数据库生成路径必须统一收敛到 `./tmp/` 目录下。
- 严禁在测试中通过 `Object.defineProperty` 等 Hack 手段修改全局单例对象。

### 2.2 测试结束的强制释放 (Teardown Discipline)
- **必须调用 `dispose()`**：每个包含数据库读写操作的测试用例结束时（或在 `afterAll` 钩子中），必须通过依赖注入传入的 `StoreProvider` 调用 `.dispose()` 或 `cleanDBFile(true)` 释放资源，并清理物理文件。
- 不允许任何游离的文件句柄或连接泄漏影响后续的集成测试。

## 3. 测试设计与策略 (Testing Strategy)

### 3.1 依赖注入 (Dependency Injection in Tests)
- 所有被测 Agent、工具（Tools）、工作流（Workflows）以及运维脚本，均应通过工厂函数传入**独立的** `StoreProvider` 和 `EmbeddingProvider` 实例。
- 默认在测试中提供基于内存的 `file::memory:` LibSQL 实例与 Mock Embedding 服务，以便实现开箱即用的单元测试。

### 3.2 真实场景的集成测试 (Real-world Scenario Integration)
- 对于系统维护脚本（如 `backlinks.ts`, `doctor.ts`, `embed.ts`），不仅要进行单元测试，还必须通过真实的 Markdown 夹具（Fixtures 存放于 `test/fixtures/`）进行集成测试。
- **故障注入 (Fault Injection)**：通过刻意制造损坏的数据库状态（如死链、未向量化的 Chunk、过时的文本），验证这些运维脚本在“修复模式”和“体检模式”下的绝对可靠性。

### 3.3 核心业务逻辑测试 (Core Logic Coverage)
- 混合检索逻辑 (`hybridSearch`, `searchKeyword`, `searchVector`) 及其去重融合机制，必须有详细的多模态（关键词+向量）结果测试。
- 多语言分词与检索（基于 `Intl.Segmenter`），必须包含中、日、韩等语言边界用例，确保 FTS5 能够精准匹配。

## 4. 测试驱动与交付 (Test-Driven & Verification)

- **红-绿-重构 (Red-Green-Refactor)**：每一项重构或代码新增，必须配套编写对应的测试用例。
- **交付要求**：交付代码变更前，**必须自行运行 `bun test`**，并且主动排查并修复所有的失败断言（Assertions），坚决杜绝向用户提交未经测试验证的半成品代码。
