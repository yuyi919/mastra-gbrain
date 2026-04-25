# Effect v4 (Beta) Systematic Guide & Best Practices

> 本指南基于 `effect-smol` 的官方 `LLMS.md` 与 `AGENTS.md` 提取，专门用于指导 AI Agent 如何**系统性、符合架构直觉地**编写 Effect v4 代码。不要仅停留在语法层面的查找替换，必须深刻理解 Effect v4 的设计哲学。

## 1. 核心编写范式 (Core Writing Style)

### 1.1 `Effect.gen` 与 `Effect.fn`
Effect v4 强烈推崇生成器语法，以实现类似于 `async/await` 的命令式体验。

- **`Effect.gen`**：用于一般的 Effect 块。
- **`Effect.fn("name")`**：用于返回 Effect 的函数。**强烈推荐**使用 `Effect.fn` 替代返回 `Effect.gen` 的箭头函数，这能极大改善堆栈跟踪并自动附加 Tracing Span。

**❌ 错误示范：**
```ts
const fn = (param: string) =>
  Effect.gen(function*() {
    // ...
  })
```

**✅ 正确示范：**
```ts
const fn = Effect.fnUntraced(function*(param: string) {
  // ...
})

// 或带追踪与名称的完整 Effect.fn
export const effectFunction = Effect.fn("effectFunction")(
  function*(n: number): Effect.fn.Return<string, SomeError> {
    yield* Effect.logInfo("Received number:", n)
    return yield* new SomeError({ message: "Failed" })
  },
  Effect.catch((error) => Effect.logError(`Error: ${error}`))
)
```

### 1.2 绝对禁止的语法
- **Never use `async / await` or `try / catch`**: 一切基于 Promise 的操作必须用 `Effect.tryPromise` 包装。一切逻辑流程控制应交由 `Effect.gen` 和 `yield*`。
- **Never use `Date.now` or `new Date`**: 时间相关操作必须通过 `Clock` 模块进行获取，以便于 `TestClock` 的时钟模拟。

---

## 2. 架构与依赖注入：Context.Service

Effect 服务的构建是 Effect 架构中最基础的部分。

### 2.1 定义服务 (Class Syntax)
在 v4 中，**必须使用类语法**构建 `Context.Service`：

```ts
import { Context, Effect } from "effect"

// 1. 声明服务
export class UsersService extends Context.Service<UsersService, {
  readonly getUser: (id: string) => Effect.Effect<User, UserNotFoundError>
}>()("UsersService") {}
```

### 2.2 使用与实现服务 (Layer)
```ts
import { Layer } from "effect"

// 2. 在业务逻辑中使用服务
export const program = Effect.gen(function*() {
  const users = yield* UsersService
  const user = yield* users.getUser("123")
  return user
})

// 3. 实现服务并生成 Layer
export const UsersServiceLive = Layer.succeed(
  UsersService,
  UsersService.of({
    getUser: (id) => Effect.succeed({ id, name: "Alice" })
  })
)
```
> **提示：** 如果服务实现内部也依赖 Effect 环境或其他服务，请使用 `Layer.effect`。

---

## 3. 错误处理与定义 (Error Handling)

Effect 的错误被显式追踪。为了让 TS 完美推断并生成自定义错误，v4 推崇 `Schema.TaggedErrorClass`（而不是早期的 `Data.TaggedError` 或直接继承 `Error`）。

### 3.1 错误定义
```ts
import { Schema } from "effect"

export class FileProcessingError extends Schema.TaggedErrorClass<FileProcessingError>()("FileProcessingError", {
  message: Schema.String
}) {}
```

### 3.2 抛出与捕获错误
```ts
Effect.gen(function*() {
  // 提前返回错误：必须 return yield* 
  return yield* new FileProcessingError({ message: "Failed" })
}).pipe(
  // 捕获错误：v4 使用 Effect.catch
  Effect.catch((error) => Effect.logError(`An error occurred: ${error}`))
)
```
> **注意：** 当你在 `Effect.gen` 中抛出错误时，必须加上 `return` 关键字（即 `return yield* new Error(...)`），以便 TypeScript 知道函数在此处终止，实现控制流分析 (CFA)。

---

## 4. 资源获取与生命周期 (Acquire / Release)

Effect 处理包含外部资源的生命周期管理（如数据库连接、文件句柄）有系统级的最佳实践。不要尝试手动 `try/finally` 释放。

使用 `Effect.acquireRelease` (以前可能是 `Effect.acquireUseRelease` 的一部分，现通过 Scope 进行管理)：
```ts
const resource = Effect.acquireRelease(
  Effect.log("Acquiring resource"),
  () => Effect.log("Releasing resource") // 在 Scope 关闭时自动执行
)
```

---

## 5. 测试 (Testing)

Effect v4 的测试有明确的范式要求。在普通的 Node/Vitest 环境下：
- 导入专门的断言方法：`import { assert, describe, it } from "@effect/vitest"` 或使用 Node 原生 `assert`。
- **强烈推荐使用 Node 的原生断言 `import assert from "node:assert"`**，如 `assert.ok`, `assert.strictEqual`, `assert.deepEqual`。
- **避免使用各种测试框架原生的 `expect`**，这可以避免复杂的类型断言问题以及测试文件报类型错误。
- **必须使用 `it.effect`** 编写测试用例，并在内部使用 `Effect.gen`：

```ts
import { describe, it } from "@effect/vitest"
import assert from "node:assert"
import { Effect } from "effect"

describe("My Module", () => {
  it.effect("should work", () => Effect.gen(function*() {
    const result = yield* myEffect
    assert.strictEqual(result, 42)
  }))
})
```

### 5.1 Bun 环境测试特供：@yuyi919/tslibs-effect 与 BunTester

如果项目运行在 Bun 环境中，**强烈建议使用 `@yuyi919/tslibs-effect/BunTester`** 替代 `@effect/vitest`。`BunTester` 是专门为 `bun:test` 量身定制的 Effect 测试封装层，API 高度对齐 `@effect/vitest`，同时补充了诸多清爽的语法糖。

#### 快速开始
安装依赖（确保与 effect 的 peerDependencies 匹配）：
```bash
npm i @yuyi919/tslibs-effect
```

#### 核心用法
- **统一使用 `node:assert` 进行断言**：在 `BunTester` 中，依然**避免使用 `expect`**，而是统一采用 `import assert from "node:assert"`。
- **特有语法糖 `it.gen` 和 `it.scopedGen`**：省去 `() => Effect.gen(function* () { ... })` 的样板代码。

```ts
import { describe, it } from "@yuyi919/tslibs-effect/BunTester";
import { Effect, TestClock } from "@yuyi919/tslibs-effect/effect-next";
import assert from "node:assert";

describe("基于 BunTester 的 Effect 测试", () => {
  // 1. 标准的 it.effect
  it.effect("基础测试", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(42);
      assert.strictEqual(result, 42);
    })
  );

  // 2. 使用特有语法糖 it.gen (最推荐)
  it.gen("更清爽的生成器测试", function* () {
    assert.strictEqual(yield* Effect.succeed(1), 1);
  });

  // 3. 虚拟时间快进 (内置 TestClock)
  it.gen("时间控制测试", function* () {
    let executed = false;
    yield* Effect.fork(Effect.sleep("10 seconds").pipe(Effect.tap(() => { executed = true })));
    yield* TestClock.adjust("10 seconds");
    assert.ok(executed === true, "executed should be true");
  });
});
```

#### 依赖注入测试 (`layer`)
通过顶层的 `layer` 函数或嵌套的 `it.layer` 可以方便地为测试块注入环境：
```ts
import { layer } from "@yuyi919/tslibs-effect/BunTester";
import assert from "node:assert";

// 为代码块注入 LiveDatabase 服务
layer(LiveDatabase)("数据库测试组", (it) => {
  it.gen("执行查询", function* () {
    const db = yield* Database;
    assert.strictEqual(yield* db.query(), "data");
  });
});
```

#### 优雅的并发状态等待 (`waitFor`)
测试基于 STM (如 `TxRef`) 或其他状态机制的并发变更时，利用内置的 `waitFor` 可以优雅地非阻塞轮询状态：
```ts
import { waitFor } from "@yuyi919/tslibs-effect/BunTester";
import assert from "node:assert";

it.gen("测试并发状态更新", function* () {
  const counter = yield* TxRef.make(0);
  yield* Effect.fork(Effect.sleep("10 millis").pipe(Effect.andThen(TxRef.update(counter, n => n + 1))));
  
  // 优雅等待值变为 1
  yield* waitFor(counter, (val) => {
    if (val !== 1) throw new Error("not ready");
  });
  assert.strictEqual(yield* TxRef.get(counter), 1);
});
```

---

## 总结

AI Agent 在编写代码时，必须将这些原则作为最高优先级：
1. 一切皆 Effect：拒绝 `async/await`，拥抱 `Effect.fn` / `Effect.gen`。
2. 上下文由 `Context.Service` 管理，用 `Layer` 组装。
3. 错误由 `Schema.TaggedErrorClass` 定义，由 `catch` 处理。
4. 资源必须接入 Effect 的 Scope 管理。
