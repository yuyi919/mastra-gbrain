---
name: effect-new
description: Generate new Effect v4 code using this repo’s conventions (Context.Service, Layer, Effect.fn/gen). Includes self-check and banned-pattern scan.
argument-hint: "[需求/功能描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `../effect-v4/SKILL.md` 的所有规则与本地文档，然后完成下面任务。新代码必须从架构边界开始设计，而不是先写局部实现。

ARGUMENTS: $ARGUMENTS

## 模板库（按需引用）
优先从 `${CLAUDE_SKILL_DIR}/../effect-v4/templates/` 选择最匹配的模板并套用：
- `service-layer.md`
- `errors.md`
- `resources-scope.md`
- `concurrency.md`
- `yieldable.md`
- `test-bun-buntester.md` / `test-vitest-effect.md`
- `tslibs-effect-imports.md`

如果运行环境没有 `CLAUDE_SKILL_DIR`，从当前技能目录的相邻路径解析：`.agents/skills/effect-v4/templates/`。

## 写代码前必须判定
- 这是应用层流程、Store 分层能力、Mastra tool、搜索/ingest 流程，还是测试？不同层只依赖自己需要的 Context。
- 新增服务时是否需要 `interface.ts` 定义 contract、factory、`makeLayer`，以及 runtime wiring 消费 layer。
- 是否需要错误类型；需要时使用 `Schema.TaggedErrorClass`，不要抛普通 `Error`。
- 是否有资源生命周期；有则用 `Effect.acquireRelease` / scoped layer。
- 是否有时间、并发或后台任务；时间用 `Clock` / `TestClock`，并发用 `Effect.forkChild` / `forkDetach` + `Fiber.join`。

## 你必须按以下格式输出
1. 实现计划（分步骤，最多 8 条）
2. 关键设计决策（Service/Layer 边界、错误类型、并发策略、测试策略）
3. 代码实现（严格 Effect v4 风格）
4. 自检清单（逐条确认未命中 v3 禁用 API；Yieldable 使用正确；测试工具选择正确）
5. 校验结果：优先运行 `pwsh ./scripts/check-effect-v4.ps1` 或 `sh ./scripts/check-effect-v4.sh`；失败必须修复后再交付。

## 强制约束
- 服务用 `Context.Service`，不要 static accessor proxy。
- 优先用 `Effect.fn("...")(function*(){ ... })`。
- 错误类用 `Schema.TaggedErrorClass`。
- 测试：Bun 环境优先 BunTester（`@yuyi919/tslibs-effect/BunTester` + `it.gen`）。
- Store 实现文件禁止用 `as unknown` / `as any` 作为类型逃生；先修正 contract。
