---
name: effect-test-bun
description: Write Effect v4 tests for Bun using BunTester from @yuyi919/tslibs-effect (it.effect/it.gen, layer(), waitFor(), TestClock/TestConsole).
argument-hint: "[要测试的模块/文件/行为描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `../effect-v4/SKILL.md` 的所有规则与本地文档，然后完成下面任务。Bun 测试必须同时遵守 Effect v4 规则与本仓库测试隔离约束。

ARGUMENTS: $ARGUMENTS

## 模板库（按需引用）
优先参考 `${CLAUDE_SKILL_DIR}/../effect-v4/templates/test-bun-buntester.md` 与 examples：
- `${CLAUDE_SKILL_DIR}/../effect-v4/examples/module-service-layer-error-test.md`
- `${CLAUDE_SKILL_DIR}/../effect-v4/examples/buntester-time-concurrency.md`

如果运行环境没有 `CLAUDE_SKILL_DIR`，从当前技能目录的相邻路径解析：`.agents/skills/effect-v4/templates/` 与 `.agents/skills/effect-v4/examples/`。

## 目标
为 Bun 环境（`bun:test`）生成 Effect v4 测试代码，优先使用：
- `@yuyi919/tslibs-effect/BunTester`
- `it.gen` / `it.scopedGen`（优先于 `it.effect(() => Effect.gen(...))`）
- `layer(...)` / `it.layer(...)` 进行依赖注入
- `waitFor(...)` 等待并发状态
- `TestClock` / `Clock` 处理时间，不使用 `Date.now()` / `new Date()`
- `Effect.forkChild` / `forkDetach` + `Fiber.join` 处理并发，不使用 v3 的 fork 写法

## 本仓库测试隔离要求
- 测试数据库必须落在 `./tmp/`。
- Store / database 资源必须通过 scoped layer 或显式 `dispose()` 释放。
- 多语言分词/检索测试不要只按空格构造断言；涉及中文/英文时考虑 `Intl.Segmenter` 行为。

## 输出要求
1. 先说明测试策略（要测什么、Layer 如何提供、是否需要 TestClock/Scope）
2. 输出测试代码
3. 自检：是否使用了 BunTester；是否避免了 Vitest-only 的写法；是否避免 v3 禁用 API；数据库是否落在 `./tmp/` 并释放资源
4. 校验结果：优先运行 `bun test <target>` 和 `pwsh ./scripts/check-effect-v4.ps1` / `sh ./scripts/check-effect-v4.sh`。
