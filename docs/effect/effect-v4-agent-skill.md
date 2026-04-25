# Effect v4 (Beta) Agent Skill & Systematic Guide

This file serves as a direct prompt and rule set for Code Agents (e.g., Claude Code, Codex, Cursor, Windsurf) working on this project. 

**Instructions for Agent:**
When you are asked to write, modify, or migrate Effect TypeScript code, you MUST strictly adhere to the rules and templates defined below. Do not just blindly replace v3 syntax; you must systematically understand and apply Effect v4's architectural paradigms.

---

## 1. 【Systematic Best Practices (架构与最佳实践)】

1. **一律使用 Effect.gen 与 Effect.fn：**
   - 拒绝使用 `async/await`，所有的异步与业务逻辑流程应置于 `Effect.gen(function* () { ... })` 中。
   - 当需要编写一个返回 Effect 的函数时，**强烈推荐使用 `Effect.fn("functionName")(function* (...) { ... })`**，这不仅提升堆栈可读性，还会自动附加 tracing span。不要使用箭头函数包裹 `Effect.gen`。

2. **上下文与依赖注入 (Context.Service)：**
   - 必须使用类语法声明服务：`class MyService extends Context.Service<MyService, { ... }>()("MyService") {}`
   - 使用服务时，在 `Effect.gen` 中 `const svc = yield* MyService`。
   - 提供服务实现时，使用 `Layer.succeed` 或 `Layer.effect`。

3. **错误处理 (Schema.TaggedErrorClass)：**
   - 不推荐使用普通的 `Error`，应定义具有强类型的自定义错误：`class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", { message: Schema.String }) {}`。
   - 在 generator 中抛出错误必须使用 `return yield* new MyError(...)` 以确保 TypeScript 正确的控制流推断。
   - 捕获错误统一使用 `Effect.catch` 或 `Effect.catchTag`。

4. **资源生命周期与作用域 (Scope)：**
   - 禁止使用手动的 `try/finally` 管理资源。涉及需要打开和释放的外部资源时，使用 `Effect.acquireRelease`，它会自动注册到 Scope 中。

5. **时钟与时间 (Clock)：**
   - **禁止**使用 `Date.now()` 或 `new Date()`。请使用 Effect 内置的 `Clock` 模块获取当前时间，以保证测试时时间可被 `TestClock` 完美模拟。

6. **测试 (Testing & BunTester)：**
   - 所有的 Effect 测试用例必须使用对应的 `it.effect`。
   - **对于 Bun 环境**：强烈约束必须使用 `@yuyi919/tslibs-effect/BunTester`，并优先推荐使用 `it.gen("name", function*() { ... })` 语法糖来编写测试。
   - **对于非 Bun 环境**：必须导入并使用 `@effect/vitest` 的 `assert` 模块，禁止在 Effect 测试中使用 vitest 的 `expect`。

---

## 2. 【Effect v4 Beta Rules (语法迁移与约束)】

1. **仅按 Effect v4 beta + effect-smol 迁移指南写代码**；遇到冲突时以本地文档 `docs/effect/v4-playbook.md` 和 `docs/effect/v4-systematic-guide.md` 为准。  
2. **服务定义一律使用 `Context.Service`**（禁止 `Context.Tag` / `Context.GenericTag` / `Effect.Tag` / `Effect.Service`）。  
3. 禁止 v3 的 **static accessor proxy**（例如 `Notifications.notify("x")` 这种直接挂在 Tag 类上的调用）。
4. 注意 **Yieldable**：`Option/Result/Config/Context.Service` 等不再是 `Effect` 子类型；凡是传给 `Effect.map/flatMap/...` 这类 combinator 时，需要显式 `.asEffect()`。  
5. 运行/Runtime：v4 **没有 `Runtime<R>`**；需要上下文时用 `Effect.context<R>()`，执行带 services 的 effect 用 `Effect.runForkWith(services)(effect)`。  
6. 错误处理：`Effect.catchAll` 在 v4 改为 `Effect.catch`；`catchSome` 家族改为 `catchFilter/catchCauseFilter`。  
7. 并发/fork：`Effect.fork`→`Effect.forkChild`；`forkDaemon`→`forkDetach`；`Fiber.join` 用于等待 fiber。

### 【禁止清单（Banned Patterns）】
出现以下内容即视为严重违反规范，需要重构：
- `Context.Tag(` / `Context.GenericTag(` / `Effect.Tag(` / `Effect.Service(`
- `Runtime.runFork` / `Effect.runtime<...>()`
- `Effect.catchAll` / `Effect.catchAllCause` / `Effect.catchSome`
- `Effect.fork(` / `Effect.forkDaemon(`
- 原生的 `async/await` 或 `try/catch` (在 Effect 代码块中)
- 原生的 `Date.now()` / `new Date()`
- 在 `it.effect` 测试中使用原生的 `expect()`

---

## 3. 任务提示词模板 (Task Prompt Templates)

### 3.1 架构设计与新功能开发模板
**Prompt:**
> 你在一个使用 Effect v4 beta 的 TypeScript 项目里工作。请仔细阅读 `docs/effect/v4-systematic-guide.md`。
> 先输出“架构设计与实现计划”，再输出代码。写代码前必须自检：代码中不得出现 v3 禁用清单的 API 或反模式。
> 约定：
> - 业务流程一律使用 `Effect.fn` 和 `Effect.gen` 编排。
> - 服务声明必须使用 `Context.Service` 类语法，并通过 `Layer` 注入。
> - 错误类使用 `Schema.TaggedErrorClass` 声明，抛出时使用 `return yield*`。
> - 任何依赖清理的资源必须接入 `Effect.acquireRelease`。
> - 如果在 Bun 环境下编写测试，必须使用 `@yuyi919/tslibs-effect/BunTester` 及 `it.gen` 语法糖。
> 如果你不确定某个 API 或模式，请先查阅本地知识库，绝不凭空猜测。

### 3.2 迁移旧代码模板
**Prompt:**
> 下面这段代码疑似是 Effect v3 写法或不符合 Effect 范式的原生代码。请把它重构到符合 Effect v4 beta 系统性规范的代码：  
> 1) 列出代码中的坏味道（如：使用了 `async/await`、`Date.now`、`Context.Tag` 等）。
> 2) 给出对应的 Effect v4 最佳实践替代方案，并解释原因。
> 3) 输出重构后的完整代码。
> 约束：必须使用 `Effect.fn`、`Context.Service`、`Schema.TaggedErrorClass`，确保代码风格统一。
