# GBrain: Effect 重构里程碑 (Effect Refactoring Milestone)

## 1. 项目愿景 (Project Vision)
将 `LibSQLStore` 内部实现替换为经过 `effect` (Effect-ts) 重构的 `BrainStore` 运行时。通过引入函数式控制流和更优雅的依赖注入机制，彻底重塑数据访问层的稳定性与可测试性，验证核心存储和混合检索功能的正确性，并为整个系统的下一步 Effect 重构（如 Agent 层、工具链层）奠定坚实的运行时基础。

## 2. 核心目标 (Core Objectives)
- **底层运行时替换**：平滑地将现有的 `LibSQLStore` 内部针对 SQLite / Drizzle 的直接调用，迁移至新重构的 `BrainStore` 运行时。
- **功能等价与正确性验证**：确保原有的 Markdown 摄入 (Ingestion)、混合搜索 (Hybrid Search)、标签 (Tags)、双链 (Backlinks) 等业务功能在底层替换后表现一致，100% 通过现有测试用例。
- **重构架构演进**：通过验证该层级的 `effect` 改造，为项目后续使用 Effect-ts 全面替代原有 Promise / Async 流程提供范本和路径。

## 3. 当前背景 (Current Context)
在早期的重构中，系统已经引入了 `Drizzle ORM` 移除了硬编码的 SQL，并通过抽象 `GBrainStore` 等接口解耦了业务逻辑与底层实现。同时，基于 `node-llama-cpp` 与 FTS5 的混合检索架构已经稳定。目前的瓶颈在于异步操作的组合、错误处理的统一以及依赖环境（如数据库连接、配置环境）的安全注入，而这正是 Effect-ts 发挥优势的领域。

## 4. 关键指标 (Success Metrics)
- `bun test` 全量测试用例（包括 `libsql.test.ts` 和各个运维脚本的集成测试）无一失败，达到 0 报错。
- TypeScript 严格模式 (`tsc --noEmit`) 0 警告，不引入新的 `any` 类型或 `@ts-expect-error`。
- `LibSQLStore` 对外接口签名保持稳定，外部调用方（如 `src/tools/`、`src/agent/`）感知不到底层的运行时变更。
