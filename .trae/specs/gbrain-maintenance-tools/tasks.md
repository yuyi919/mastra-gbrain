# Tasks

- [x] Task 1: 准备引用文档与翻译
  - [x] SubTask 1.1: 将 `/tmp/gbrain/TODOS.md` 和 `/tmp/gbrain/docs/` 复制到本地 `references/` 目录下。
  - [x] SubTask 1.2: 使用中文全面翻译 `TODOS.md` 和整个 `docs` 目录下的所有文件内容。
  - [x] SubTask 1.3: 更新 `CLAUDE.md`，在“日常运维与定期任务”章节记录：拉取文档、对齐 gbrain 实现和翻译。

- [x] Task 2: 重新实现 `check-backlinks`
  - [x] SubTask 2.1: 在 `package.json` 中安装 `remark` 相关依赖（如 `remark-parse`, `unist-util-visit`）。
  - [x] SubTask 2.2: 在 `src/scripts/backlinks.ts` 中编写 AST 遍历逻辑，提取所有的链接。
  - [x] SubTask 2.3: 实现 `check` 模式，在终端输出缺失反向链接的目标页面和对应的源。
  - [x] SubTask 2.4: 实现 `fix` 模式，将反向链接（如 `- [Source](../path/to/source.md)`）自动插入到目标文件底部的 `---` (Timeline) 区域。

- [x] Task 3: 重新实现 `doctor`
  - [x] SubTask 3.1: 在 `src/scripts/doctor.ts` 中实现。
  - [x] SubTask 3.2: 检查 SQLite 数据库的连接状态、`pages` 等表是否存在。
  - [x] SubTask 3.3: 检查 `chunks_fts` (FTS5虚拟表) 是否存在。
  - [x] SubTask 3.4: 扫描 `content_chunks` 表，计算并报告已有向量（通过 VectorStore）的块比例（向量覆盖率）。

- [x] Task 4: 重新实现 `stale` (增量更新)
  - [x] SubTask 4.1: 在 `src/scripts/embed.ts` 中实现带有 `--stale` 参数的执行逻辑。
  - [x] SubTask 4.2: 查询底层存储中那些缺少向量记录或自上次向量化后已被修改过的块。
  - [x] SubTask 4.3: 对筛选出的块进行批量的 `embedBatch` 操作，并将生成的向量更新回库中。

- [x] Task 5: 对齐 `searchKeyword` 功能
  - [x] SubTask 5.1: 在 `GBrainStore` 接口中更新 `SearchOpts`，支持 `type`, `exclude_slugs`, `detail`, `dedupe` (控制是否单页面去重，默认 true) 和 `offset` 等参数。
  - [x] SubTask 5.2: 在 `LibSQLStore` 中修改 SQL 查询：支持以上过滤条件，并在 `dedupe` 为 true 时利用 `GROUP BY p.slug` 机制实现结果去重，确保每个页面只返回得分最高的块。
  - [x] SubTask 5.3: 添加最大 limit 限制与超时保护逻辑。

- [x] Task 6: 依赖注入与工厂模式重构 (Providers)
  - [x] SubTask 6.1: 定义 `StoreProvider` (别名 `GBrainStore`) 和 `EmbeddingProvider` 接口 (`embedBatch`, `embedQuery`)。
  - [x] SubTask 6.2: 创建工厂函数，例如 `createTools(store, embedder)`、`createGBrainAgent(store, embedder)` 替代原先直接 `import store` 的静态常量。
  - [x] SubTask 6.3: 在 `src/store/index.ts` 等入口点，提供默认工厂实现：默认生成 `file::memory:` 的 `LibSQLStore` 和 Mock 数组生成的 `DummyEmbeddingProvider`。
  - [x] SubTask 6.4: 修复所有相关代码和测试，将其转换为调用工厂函数生成依赖。

- [x] Task 7: 阶段总结
  - [x] SubTask 7.1: 总结重构的 AST 解析和依赖注入（DI）带来的健壮性与可扩展性提升，并在 `CLAUDE.md` 记录 `doctor` 和 `stale` 脚本在知识库维护中的定位。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 6