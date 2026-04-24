# Phase 04 Performance Report

## Scope

本报告覆盖 Phase 4 约定范围：在不改变对外接口的前提下，分析 Effect 重构后关键路径性能行为，给出低风险优化建议，并定义可复现验证方案。

## Baseline

- Runtime: Bun + TypeScript + Effect v4 beta
- Milestone status before this report: Phase 3 completed, full test suite green（含既有 skip）
- Core code paths analyzed:
  - `src/store/libsql-store.ts`
  - `src/store/libsql.ts`
  - `src/search/hybrid.ts`

## Hot Paths

### 1) Chunk ingest/update path (`upsertChunks`)

Evidence:
- `src/store/libsql-store.ts` `upsertChunks`:
  - per-chunk loop upsert (`for (const chunk of chunks) { upsertContentChunk(...) }`)
  - whole-page FTS rebuild (`deleteFtsByPageId` + `insertFtsChunks(...)`)
  - vector upsert with full slug delete filter

Why hot:
- 对大文档或高频增量写入时，SQL round-trip 数量与 chunk 数线性增长；
- FTS 全量重建会放大“少量变更”的写放大成本。

### 2) Hybrid search pipeline

Evidence:
- `src/search/hybrid.ts` `hybridSearchEffect`:
  - keyword + vector 并行收集
  - optional query expansion + embedBatch
  - RRF fusion + cosine re-score + backlink boost + dedup

Why hot:
- 查询链路长，且多个阶段都在处理 `SearchResult[]`；
- 当 expansion 开启时，向量查询次数随变体数增长。

### 3) Adapter bridge overhead (`LibSQLStore` -> `BrainStore`)

Evidence:
- `src/store/libsql.ts` 多数方法通过 `brainStore.runPromise(Effect.gen(...))` 桥接；
- `transaction()` 目前直接执行 callback（规避 snapshot 问题），强调操作级事务。

Why hot:
- 虽然单次开销小，但在高频小调用场景会形成额外包装成本；
- 事务边界策略会影响批处理组合方式与吞吐。

## Bottlenecks

1. **N-per-row upsert in chunk writes**
- Impact: 大 chunk 批次时吞吐下降明显，尤其在同页频繁更新时。

2. **FTS full rebuild on each upsert cycle**
- Impact: 即使只有少量 chunk 变化，也触发整页 FTS 清空重建。

3. **Search post-processing chain can overwork large candidate sets**
- Impact: query expansion 与高 `limit*2` 候选集下，融合/去重成本上升。

4. **Timeline batch writes are sequential**
- Evidence: `addTimelineEntriesBatch` 逐条 slug lookup + insert
- Impact: 大批量导入时间线时延迟叠加。

## Low-risk Optimizations

### O1. Chunk upsert batching with bounded concurrency

- Proposal:
  - 将逐条 upsert 调整为受控并发批处理（例如分块 + `Effect.forEach` 并发上限）。
- Risk: Low
- Expected gain: 降低总写入时长，控制单事务内 SQL 往返。

### O2. Differential FTS refresh

- Proposal:
  - 对 unchanged chunk 跳过 FTS 重写，仅重建变更子集。
- Risk: Medium-Low（需要更严谨一致性验证）
- Expected gain: 显著降低“微小修改”成本。

### O3. Search candidate budget tuning

- Proposal:
  - 根据 query 意图与扩展变体数动态收缩 `innerLimit`；
  - 对低置信变体设置早停或 lower-weight。
- Risk: Low
- Expected gain: 减少后处理数组规模，降低融合/去重 CPU 开销。

### O4. Timeline batch lookup prefetch

- Proposal:
  - 批量预取 slug -> page_id，再执行批量 insert。
- Risk: Low
- Expected gain: 降低批量 timeline 导入时的重复 lookup 成本。

## Validation Plan

### Correctness guardrails

1. `bun test` 全量必须通过（允许既有 skip，禁止新增 fail）
2. `tsc --noEmit` 继续保持 0 error
3. 搜索结果行为回归检查：关键词命中、向量命中、融合排序稳定性

### Performance sampling (recommended)

1. Ingest sampling:
- 测量不同 chunk 数（10/100/500）下 `upsertChunks` 耗时
- 记录 FTS rebuild 时间占比

2. Search sampling:
- 对 detail=high/low、expansion on/off 进行 P50/P95 采样
- 记录候选集规模与总耗时关系

3. Timeline sampling:
- 评估批量写入（50/200/1000）线性增长斜率

### Exit signals

- 至少 2 个热点路径有明确可执行优化项 + 风险评估
- 路线图优先级直接引用本报告瓶颈，形成闭环
