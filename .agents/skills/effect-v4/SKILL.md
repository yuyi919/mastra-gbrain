---
name: effect-v4
description: Systematically enforce and teach Effect v4 beta (services, yieldable, runtime, errors, concurrency, testing). Uses local docs as source of truth; prevents v3 patterns.
when_to_use: Use when writing/modifying any Effect code, or when user mentions Effect, Layer, Context.Service, Yieldable, BunTester, @yuyi919/tslibs-effect, v3->v4 migration.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.test.*"
  - "**/*.spec.*"
allowed-tools: Bash Read Grep
---

你在一个使用 Effect v4 beta 的 TypeScript 代码库中工作。你的目标不是“把 v3 API 换成 v4 API”，而是系统性地用 Effect v4 的范式组织代码：Service/Layer、错误通道、作用域资源、并发与测试。

## Source of Truth（先读本地文档，不要猜）
在输出任何 Effect 相关代码前，你必须优先查阅并遵循：
- `docs/effect/v4-systematic-guide.md`
- `docs/effect/v4-playbook.md`
- `docs/effect/v4-banned-patterns.md`
- `docs/effect/tslibs-effect.md`（当用户提到 `@yuyi919/tslibs-effect` 或 Bun 相关时）

如果你不确定某个 API 是否存在：先在上述文档中检索（而不是凭记忆猜测）。

## Supporting Files（模板/示例/校验）
你可以按需加载本技能包内的 supporting files 来减少样板代码与提升一致性：
- `templates/`：常见用例模板（Service/Layer、错误、资源、并发、Yieldable、BunTester/Vitest 测试、tslibs-effect 导入）
- `examples/`：完整示例输出，用于对齐“最终交付物形态”
- `scripts/validate.sh`：生成/迁移后执行的自检脚本（优先调用仓库已有 `scripts/check-effect-v4.sh`）

## Hard Rules（违反即重写）
1. 服务只能用 `Context.Service`（禁止 `Context.Tag` / `Context.GenericTag` / `Effect.Tag` / `Effect.Service`）。
2. 主体逻辑优先用 `Effect.fn("name")(function* () { ... })` 或 `Effect.fnUntraced(function* () { ... })`，并在内部用 `yield*`。
3. 不要写 `async/await` 或 `try/catch`；基于 Promise 的逻辑用 `Effect.tryPromise`。
4. Yieldable：`Option/Result/Config/Context.Service` 参与 combinator 时必须 `.asEffect()` 或改写为 `Effect.gen`。
5. 错误处理：使用 `Schema.TaggedErrorClass` 定义错误；捕获用 `Effect.catch` / `catchTag`；在 generator 内抛错用 `return yield* new ...`。
6. 并发/fork：使用 `Effect.forkChild` / `forkDetach`（按项目文档），等待用 `Fiber.join`。
7. 时间：不要用 `Date.now()`/`new Date()`，使用 `Clock`/`TestClock`。

## Testing Policy（优先 BunTester）
当用户在 Bun 环境写测试、或项目使用 `bun:test` 时：
- 优先使用 `@yuyi919/tslibs-effect/BunTester`
- 优先使用 `it.gen(...)` / `it.scopedGen(...)` 语法糖

当用户明确使用 Vitest 时：
- 使用 `node:assert` 进行断言（不要用 `expect`）

## Output Protocol（每次写代码前后都执行）
1. 先输出“实现计划”（简短即可）。
2. 输出代码。
3. 输出“自检清单”：确认没有出现 v3 禁用清单 API。
4. 运行自检脚本：优先执行 `${CLAUDE_SKILL_DIR}/scripts/validate.sh`；失败则自行修复后再交付。
