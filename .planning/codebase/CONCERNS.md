# 代码库关注点分析 (CONCERNS)

## 1. 技术债务 (Technical Debt)
* **未完全 ORM 化的不安全 SQL 访问**：在 `src/store/UnsafeSql.ts` 等模块中，仍保留着对原生 SQLite 数据库的不安全访问封装（如 `db.all<any>` 和 `db.run` ）。虽然已有重构计划 (`refactor-unsafe-sql-with-drizzle`) 准备将其迁移至 Drizzle ORM，但该过程尚未彻底完成。
* **类型安全妥协**：代码库在底层存储或外部依赖调用时使用了 `@ts-expect-error` 和大量的 `any` 类型（如 `src/store/libsql.ts` 中的 `this.vectorStore.turso.close()` 以及 `UnsafeSql` 泛型返回值），这削弱了 TypeScript 静态检查带来的安全性。
* **Schema 频繁解析与转换**：数据存储和检索层频繁调用 `decodeUnsafe` （如 `Page.decodeUnsafe` 和 `GraphNode.decodeUnsafe`）以适配 Effect Schema。Drizzle 结果到领域模型的强制解码增加了运行时的维护成本。

## 2. 安全风险 (Security Risks)
* **SQL 拼接隐患**：当前系统中的部分健康检查（如 `getHealthReport()`）或统计功能，仍遗留有依赖原生 SQL 字符串拼接的情况（包含动态表名）。这类不安全边界如果不严格约束输入，会带来潜在的 SQL 注入风险，应尽快推进 Drizzle 强类型查询重构规范落地。

## 3. 性能问题 (Performance Issues)
* **循环内串行数据库写入 (N+1)**：在 `src/store/libsql.ts` 的 `upsertChunks` 方法中，使用了 `for (const chunk of chunks) { await this.mappers.upsertContentChunk(...) }` 这种循环内 `await` 的模式。当处理长文档生成的大量文本块 (Chunks) 时，串行插入会造成极大的性能损耗，应尽快重构为批量插入 (Batch Insert)。
* **缺乏跨工作线程的 Embedding 批处理**：当前实现中，每个 Worker 独立处理 Embedding 批处理，导致产生过多的小批量 API 调用（见 `TODOS.md` 中的“跨文件批处理嵌入队列”）。这不仅降低了整体导入和处理的速度（受制于网络请求延迟），也未充分优化大批量向量化 API 的成本。

## 4. 已知 Bug (Known Bugs)
* **`getEmbeddingsByChunkIds` 功能缺失 (静默失败)**：在 `src/store/libsql.ts` 中，`getEmbeddingsByChunkIds` 方法存在明显的逻辑断层。因为 `vector_store` 使用的 ID 格式（`${slug}::${chunk_index}`）与参数 `chunk_ids` 不匹配，内部代码被注释掉，且使用 `catch (e)` 吞掉了异常直接返回一个空 Map，这会导致相关业务逻辑拿不到 Embedding 数据且不会报错。
* **PGLite WASM 编译崩溃问题 (P0)**：由于 `bun build --compile` 产生的虚拟文件系统路径无法被 PGLite 解析，大约 3MB 的 WASM 文件无法被正确嵌入。这导致单文件编译后的二进制程序在尝试使用 PGLite 引擎时会直接崩溃（需要等待 Bun 上游 PR 修复或采用其他 workaround）。