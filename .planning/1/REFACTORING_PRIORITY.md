# `libsql.ts` 重构优先级与增量验证策略

本文档基于对 `METHOD_MAPPING.md` 和 `TEST_COVERAGE.md` 的分析，将 `libsql.ts` 中的核心方法拆分为按依赖顺序递进的五个增量重构块（Tags, Pages, Links, Chunks, Search），并提供了每个阶段的 `bun test` 验证策略。

## 测试验证总则

重构应当保证不破坏现有业务逻辑。在完成每个重构块后，必须使用 `bun test` 进行验证。
常用的测试命令模式如下：
```bash
# 运行所有测试
bun test

# 运行特定测试文件
bun test test/libsql.test.ts

# 根据测试名称匹配运行（过滤运行特定模块）
bun test -t "关键字"
```

---

## 第一阶段：Tags (标签系统)
**优先级**：最高
**理由**：逻辑最为独立且简单，没有复杂的依赖关系，且测试覆盖率非常充分。是验证 Effect 封装机制（`Eff.fn` 和 `catchStoreError`）的最佳切入点。

**涉及方法**：
- `addTag(slug, tag)`
- `removeTag(slug, tag)`
- `getTags(slug)`

**验证方法**：
运行针对标签逻辑的独立单元测试：
```bash
bun test test/libsql.test.ts -t "tag"
```

---

## 第二阶段：Pages (页面与核心内容)
**优先级**：高
**理由**：页面是知识库的基础实体，后续的 Links、Chunks 和 Search 都必须依赖 Pages 的存在。需要注意的是，版本控制相关的逻辑目前**缺乏测试覆盖**。

**涉及方法**：
- `getPage(slug)`
- `listPages(filters)`
- `resolveSlugs(partial)` *(需补充测试)*
- `putPage(slug, page)`
- `deletePage(slug)`
- `updateSlug(oldSlug, newSlug)` *(需补充测试)*
- `createVersion(slug)` *(缺乏测试)*
- `getVersions(slug)` *(缺乏测试)*
- `revertToVersion(slug, versionId)` *(缺乏测试)*

**验证方法**：
运行页面及其增删改查相关的单元测试与集成导入测试：
```bash
bun test test/libsql.test.ts -t "page"
bun test test/integration.test.ts -t "bulkImport"
```
*注意：建议在重构 `createVersion` 等方法前，先补充 Promise 版本的基准测试。*

---

## 第三阶段：Links (链接与图谱)
**优先级**：中高
**理由**：构建在 Pages 之上，用于描述页面间的拓扑关系。部分基础方法有测试，但高级图谱遍历和移除操作目前未被测试覆盖。

**涉及方法**：
- `addLink(fromSlug, toSlug, ...)`
- `removeLink(fromSlug, toSlug)` *(缺乏测试)*
- `getLinks(slug)`
- `getBacklinks(slug)` *(缺乏测试)*
- `rewriteLinks(oldSlug, newSlug)` *(缺乏测试)*
- `traverseGraph(slug, depth)` *(缺乏测试)*

**验证方法**：
运行链接和关系相关的测试：
```bash
bun test test/libsql.test.ts -t "link"
bun test test/integration.test.ts -t "linksTool"
```

---

## 第四阶段：Chunks (文本块与嵌入向量)
**优先级**：中
**理由**：用于将页面内容拆分并保存为向量，是后续混合检索的基石。基础插入和清理已有测试，但部分向量进阶查询和状态维护方法缺乏测试。

**涉及方法**：
- `upsertChunks(slug, chunks)`
- `deleteChunks(slug)`
- `getChunks(slug)`
- `getChunksWithEmbeddings(slug)` *(缺乏测试)*
- `getStaleChunks()` *(缺乏测试)*
- `markChunksEmbedded(chunkIds)` *(缺乏测试)*
- `upsertVectors(vectors)` *(缺乏测试)*
- `getEmbeddingsByChunkIds(ids)` *(缺乏测试)*

**验证方法**：
运行文本块数据处理相关的测试：
```bash
bun test test/libsql.test.ts -t "chunk"
```

---

## 第五阶段：Search (混合检索)
**优先级**：中
**理由**：综合性最强的功能，依赖于 Pages 和 Chunks 的正确处理。FTS 和向量检索在现有测试集中均有良好的覆盖。

**涉及方法**：
- `searchKeyword(query, opts)`
- `searchVector(queryVector, opts)`

**验证方法**：
运行各类语言的全文检索与向量相似度检索测试：
```bash
bun test test/libsql.test.ts -t "search"
bun test test/libsql.test.ts -t "FTS"
bun test test/libsql.test.ts -t "vector"
```

---

## 补充阶段：其他模块 (Timeline, Files, System)
在完成核心的五个增量块重构并确保 `bun test` 全部通过后，再处理其余支撑模块：

- **时间线 (Timeline)**：`addTimelineEntry`, `getTimeline` 等。
  - *验证*：`bun test test/integration.test.ts -t "timelineTool"`
- **文件与原始数据 (Files & Raw Data)**：`upsertFile`, `getFile`, `putRawData`, `getRawData`。
  - *验证*：缺乏覆盖，需手工补充测试。
- **系统监控与配置 (Config, Logs, Health)**：`getHealthReport`, `getStats`, `setConfig`, `logIngest`。
  - *验证*：缺乏覆盖，需手工补充测试。
- **生命周期 (Lifecycle)**：`init`, `dispose`。
  - *验证*：在全局的 `beforeAll` / `afterAll` 中自动验证。

> **💡 重构建议**：
> 针对 `TEST_COVERAGE.md` 中指出的“缺乏测试/需要关注”的方法（如页面版本控制、图谱遍历等），请严格采用 **TDD (测试驱动开发)** 模式。在将其从 `Promise` 转换为 `Effect` 前，务必先在 `test/libsql.test.ts` 中编写相应的测试用例，确保后续重构的安全性和等效性。
