---
phase: 2
wave: 3
---

# Wave 3: 链接管理与图谱 (Links & Graph)

## 目标
替换双向链接的维护及图谱遍历方法。

## 任务
- [ ] 1. **重构基础 Links**:
  - `addLink(from, to, type, ctx)` -> `runPromise`
  - `removeLink(from, to)` -> `runPromise`
  - `getLinks(slug)` / `getBacklinks(slug)` -> `runPromise`
- [ ] 2. **图谱与路径**:
  - `traverseGraph(slug, depth)` -> `runPromise`

## 验证
运行 `bun test test/integration.test.ts`，重点检查 backlinks 生成和遍历测试。
