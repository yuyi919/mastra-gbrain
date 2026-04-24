---
phase: 2
wave: 1
---

# Wave 1: 基础设施搭建与 Tags 模块重构

## 目标
搭建 Effect Layer 环境并适配基础且相互独立的 Tags 方法。

## 任务
- [ ] 1. **初始化 Layer 注入**: 修改 `src/store/libsql.ts` 构造函数，初始化 `SqliteClient.layer` 和 `Mappers.makeLayer`，并合成 `DatabaseLive`。
- [ ] 2. **初始化 BrainStore 服务**: 在 `LibSQLStore` 类内部添加一个私有属性 `brainStore`，保存通过 `Effect.runSync(Effect.provide(BrainStore, DatabaseLive))` 构建出的服务实例。
- [ ] 3. **重构 Tags 操作**: 
  - 修改 `addTag(slug, tag)`：调用 `this.brainStore.addTag` 并 `runPromise`。
  - 修改 `removeTag(slug, tag)`：调用 `this.brainStore.removeTag` 并 `runPromise`。
  - 修改 `getTags(slug)`：调用 `this.brainStore.getTags` 并 `runPromise`。

## 验证
运行 `bun test test/libsql.test.ts -t "tag"` 确保绿灯。
