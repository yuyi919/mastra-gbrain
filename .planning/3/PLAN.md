# Phase 3: 测试验证与功能修复 (Test & Fix)

## 目标 (Objective)
修复在 Phase 2 重构 `BrainStore` Effect 运行时后，`bun test` 暴露出的 10 个回归测试失败和错误。确保整个知识库系统的事务机制、查询语法以及所有运维脚本都能在新的运行时下稳定绿灯。

## Wave 1: 修复 SQLite 语法与查询报错
**描述**: 修复导致 `SQLiteError: near "limit": syntax error` 以及 `WorkerError` 等崩溃的查询构造问题。
- [ ] 1. **移除非法的 Limit 语法**: 在 `src/store/libsql-store.ts` 等涉及 `update` 的地方，移除不支持的 `.limit(1)` 链式调用（如 `revertToVersion` 中的 update）。
- [ ] 2. **修复查询兼容性**: 检查是否有其他的 `.limit(1)` 不兼容的更新/删除查询并修正。
- **验证**: 运行 `bun test test/ext.test.ts -t "Versions management"` 和 `bun test test/libsql.test.ts -t "getPage"` 等相关出错测试。

## Wave 2: 修复事务机制失效 (Transaction Rollback)
**描述**: 修复 `LibSQLStore transaction rollback` 测试中出现的事务未回滚现象。
- [ ] 1. **排查并重构事务**: `this.brainStore.runPromise` 内部的 `this.brainStore.transaction(tx => ...)` 是否未能正确触发底层的 `sql.withTransaction` 或者错误没有正确冒泡？
- [ ] 2. **修正抛出逻辑**: 确保在 Effect 事务闭包内部抛出 `StoreError` 或异常时，底层的 `bun:sqlite` 能自动触发 `ROLLBACK`。
- **验证**: 运行 `bun test test/libsql.test.ts -t "transaction rollback"`。

## Wave 3: 修复工具与集成脚本问题
**描述**: 修复 Ingest 导入跳过、Timeline 数量重复以及 `embedStale` 的约束报错。
- [ ] 1. **修复 `embed.test.ts`**: 解决 `UNIQUE constraint failed: content_chunks.page_id, content_chunks.chunk_index`。检查测试前临时数据库的清空逻辑。
- [ ] 2. **修复 Timeline 条目重复**: 排查 `Timeline entries management` 测试为什么插入了 2 条而非 1 条。
- [ ] 3. **修复 Ingest 工具返回 `"skipped"`**: 分析 `test/tools.test.ts` 为什么内容被错误跳过（可能是由于 content_hash 比对在 Effect 引擎下返回格式异常）。
- **验证**: 运行对应的测试文件确保通过。

## Wave 4: 解决集成测试的性能超时
**描述**: `integration.test.ts` 因本地 `node-llama-cpp` 加载太慢而超时。
- [ ] 1. **延长超时或降级 Embedder**: 将该集成测试的默认 timeout 从 5000ms 提高到 30000ms 或更高，或者确保测试环境使用 `Dummy` embedder。
- **验证**: 运行 `bun test test/integration.test.ts`。

## Wave 5: 全量验证
**描述**: 最终确认测试绿灯。
- [ ] 1. **执行全量测试**: `bun test` 必须达到 0 Fail 0 Error。