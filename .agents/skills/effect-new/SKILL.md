---
name: effect-new
description: Generate new Effect v4 code using this repo’s conventions (Context.Service, Layer, Effect.fn/gen). Includes self-check and banned-pattern scan.
argument-hint: "[需求/功能描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `/effect-v4` 的所有规则与本地文档，然后完成下面任务。

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

## 你必须按以下格式输出
1. 实现计划（分步骤，最多 8 条）
2. 关键设计决策（Service/Layer 边界、错误类型、并发策略、测试策略）
3. 代码实现（严格 Effect v4 风格）
4. 自检清单（逐条确认未命中 v3 禁用 API；Yieldable 使用正确；测试工具选择正确）

## 强制约束
- 服务用 `Context.Service`，不要 static accessor proxy。
- 优先用 `Effect.fn("...")(function*(){ ... })`。
- 错误类用 `Schema.TaggedErrorClass`。
- 测试：Bun 环境优先 BunTester（`@yuyi919/tslibs-effect/BunTester` + `it.gen`）。
