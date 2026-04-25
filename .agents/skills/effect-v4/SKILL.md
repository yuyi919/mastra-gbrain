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
- `docs/effect/effect-v4-agent-skill.md`（当你需要完整任务提示词或自检格式时）

如果你不确定某个 API 是否存在：先在上述文档中检索（而不是凭记忆猜测）。

## Execution Workflow（每次 Effect 任务都按这个顺序）
1. 先读本技能文件，再按任务类型只加载必要的本地 docs / templates；不要批量吞上下文。
2. 识别任务类型：新功能用 `effect-new` 规则，迁移用 `effect-migrate` 规则，Bun 测试用 `effect-test-bun` 规则；被直接调用时在本技能内完成同等检查。
3. 写代码前先说明短计划，并明确 Service/Layer、错误、资源/Scope、并发、测试策略是否适用。
4. 修改后运行仓库校验脚本：Windows 优先 `pwsh ./scripts/check-effect-v4.ps1`，Unix 优先 `sh ./scripts/check-effect-v4.sh`；若只生成片段不能运行脚本，必须做文本自检并说明原因。
5. 最后给出自检清单，明确是否命中禁用 API、Yieldable 是否 `.asEffect()` 或 `yield*`、测试入口是否匹配 Bun/Vitest。

## Supporting Files（模板/示例/校验）
你可以按需加载本技能包内的 supporting files 来减少样板代码与提升一致性：
- `templates/`：常见用例模板（Service/Layer、错误、资源、并发、Yieldable、BunTester/Vitest 测试、tslibs-effect 导入）
- `examples/`：完整示例输出，用于对齐“最终交付物形态”
- `scripts/validate.sh`：生成/迁移后执行的自检脚本（优先调用仓库已有 `scripts/check-effect-v4.sh`；Windows 环境优先仓库的 `scripts/check-effect-v4.ps1`）

## Project-Specific Store / BrainStore Overlay
当 Effect 代码触及 `src/store/**`、`src/ingest/**`、`src/search/**` 或 Mastra tools 时，除通用 v4 规则外还必须遵守：
- `BrainStore.ts` 只保留根 `BrainStore` Context；分层模块自己的 Context、service contract、输入类型放在 `src/store/brainstore/**/interface.ts`。
- `libsql-store.ts` 负责装配 database、branch factory、tree、compat、ext 与 root layer；具体能力放到分层 factory / `makeLayer`，不要在装配层重复实现或重新投影已有 Context。
- 依赖传递优先用 `Layer` 组合解决。新增 store 分支时同时提供 factory 与 `makeLayer`，并让 runtime wiring 真实消费这些 layer。
- Store 实现文件中不要用 `as unknown` / `as any` 绕开类型问题；优先调整分层 contract，使源头类型正确。
- `Context.Service` accessor：取完整 service 用 `XXX.asEffect()`；取同步字段用 `XXX.useSync((xxx) => xxx.field)`；调用返回 Effect 的方法用 `XXX.use((xxx) => xxx.method())`。回调参数不要显式标注类型。
- `createVersion`、`putPage` 等写入 API 保留延迟解析返回类型语义；不要为了压平类型而提前解析。

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
- 测试数据库必须落在 `./tmp/`，并在测试结束释放 store/database 资源（例如调用 `dispose()` 或使用 scoped layer）。

当用户明确使用 Vitest 时：
- 使用 `node:assert` 进行断言（不要用 `expect`）

## Output Protocol（每次写代码前后都执行）
1. 先输出“实现计划”（简短即可）。
2. 输出代码。
3. 输出“自检清单”：确认没有出现 v3 禁用清单 API。
4. 运行自检脚本：优先执行仓库 `scripts/check-effect-v4.ps1` / `scripts/check-effect-v4.sh`，或 `${CLAUDE_SKILL_DIR}/scripts/validate.sh`；失败则自行修复后再交付。
