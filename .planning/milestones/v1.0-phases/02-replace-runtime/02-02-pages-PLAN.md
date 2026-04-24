---
phase: 2
wave: 2
---

# Wave 2: 页面生命周期与版本控制 (Pages & Versions)

## 目标
重构页面的增删改查及快照生成机制。

## 任务
- [ ] 1. **重构基础读取**: 
  - `getPage(slug)` -> `runPromise(this.brainStore.getPage)`
  - `listPages(filters)` -> `runPromise(this.brainStore.listPages)`
- [ ] 2. **重构复杂写入与事务**:
  - `putPage(slug, page)`: 修改为使用 `this.brainStore.transaction(tx => tx.putPage(slug, page))` 并执行。
  - `deletePage(slug)`: 修改为 `runPromise(this.brainStore.deletePage)`。
- [ ] 3. **重构版本控制**:
  - `createVersion(slug)` -> `runPromise`
  - `getVersions(slug)` -> `runPromise`
  - `revertToVersion(slug, versionId)` -> `runPromise`

## 验证
运行 `bun test test/libsql.test.ts -t "page"` 以及 `bun test test/integration.test.ts`。
