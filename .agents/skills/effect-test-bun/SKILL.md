---
name: effect-test-bun
description: Write Effect v4 tests for Bun using BunTester from @yuyi919/tslibs-effect (it.effect/it.gen, layer(), waitFor(), TestClock/TestConsole).
argument-hint: "[要测试的模块/文件/行为描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `/effect-v4` 的所有规则与本地文档，然后完成下面任务。

ARGUMENTS: $ARGUMENTS

## 模板库（按需引用）
优先参考 `${CLAUDE_SKILL_DIR}/../effect-v4/templates/test-bun-buntester.md` 与 examples：
- `${CLAUDE_SKILL_DIR}/../effect-v4/examples/module-service-layer-error-test.md`
- `${CLAUDE_SKILL_DIR}/../effect-v4/examples/buntester-time-concurrency.md`

## 目标
为 Bun 环境（`bun:test`）生成 Effect v4 测试代码，优先使用：
- `@yuyi919/tslibs-effect/BunTester`
- `it.gen` / `it.scopedGen`（优先于 `it.effect(() => Effect.gen(...))`）
- `layer(...)` / `it.layer(...)` 进行依赖注入
- `waitFor(...)` 等待并发状态

## 输出要求
1. 先说明测试策略（要测什么、Layer 如何提供、是否需要 TestClock/Scope）
2. 输出测试代码
3. 自检：是否使用了 BunTester；是否避免了 Vitest-only 的写法；是否避免 v3 禁用 API
