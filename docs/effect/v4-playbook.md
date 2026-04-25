# Effect v4 (Beta) Playbook

> 本文档基于 Effect-TS v4 beta 的官方迁移指南生成，是 Agent 编写 Effect 代码的“唯一真相来源”。

## 核心范式 (The 5 Core Paradigms)

### 1. 服务定义与使用 (Services)
- **禁止使用** `Context.Tag` / `Context.GenericTag` / `Effect.Tag` / `Effect.Service`
- **必须使用** `Context.Service`
- **禁止** v3 的 static accessor proxy (例如 `Notifications.notify("x")`)。
- **推荐写法**：`Effect.gen(function*(){ const svc = yield* Svc; ... })`
- Layer 需要显式构建，v4 不会自动 Default。

### 2. Yieldable (不再自动解包)
- `Option/Result/Config/Context.Service` 等不再是 `Effect` 的子类型。
- 凡是传给 `Effect.map/flatMap/...` 这类 combinator 时，**必须显式调用** `.asEffect()`，或者改写为 `Effect.gen` 并在里面 `yield*`。

### 3. Runtime
- v4 **移除了 `Runtime<R>`**。
- 如果需要获取上下文并 fork，使用 `Effect.context<R>()` 和 `Effect.runForkWith(services)(effect)`。

### 4. 错误处理 (Error Handling)
- `Effect.catchAll` 重命名为 `Effect.catch`。
- `catchSome` 家族重命名为 `catchFilter / catchCauseFilter`。

### 5. 并发与 Fork
- `Effect.fork` 重命名为 `Effect.forkChild`。
- `forkDaemon` 重命名为 `forkDetach`。
- 等待 fiber 使用 `Fiber.join`。

---

## 详细官方文档附录

（以下为从 Effect-TS 官方抓取的迁移指南备份，供遇到疑问时查阅细节）

### MIGRATION.md
## Migrating from Effect v3 to Effect v4

> **Note:** Effect v4 is currently in beta. APIs may change between beta releases. This guide will evolve as the beta progresses and community feedback is incorporated.

## Background

Effect v4 is a major release with structural and organizational changes across the ecosystem. The core programming model — `Effect`, `Layer`, `Schema`, `Stream`, etc. — remains the same, but how packages are organized, versioned, and imported has changed significantly.

### Versioning

All Effect ecosystem packages now share a **single version number** and are released together. In v3, packages were versioned independently (e.g. `effect@3.x`, `@effect/platform@0.x`, `@effect/sql@0.x`), making compatibility between packages difficult to track. In v4, if you use `effect@4.0.0-beta.0`, the matching SQL package is `@effect/sql-pg@4.0.0-beta.0`.

### Package Consolidation

Many previously separate packages have been merged into the core `effect` package. Functionality from `@effect/platform`, `@effect/rpc`, `@effect/cluster`, and others now lives directly in `effect`.

Packages that remain separate are platform-specific, provider-specific, or technology-specific:

- `@effect/platform-*` — platform packages
- `@effect/sql-*` — SQL driver packages
- `@effect/ai-*` — AI provider packages
- `@effect/opentelemetry` — OpenTelemetry integration
- `@effect/atom-*` — framework-specific atom bindings
- `@effect/vitest` — Vitest testing utilities

These packages must be bumped to matching v4 beta versions alongside `effect`.

### Unstable Module System

v4 introduces **unstable modules** under `effect/unstable/*` import paths. These modules may receive breaking changes in minor releases, while modules outside `unstable/` follow strict semver.

Unstable modules include: `ai`, `cli`, `cluster`, `devtools`, `eventlog`, `http`, `httpapi`, `jsonschema`, `observability`, `persistence`, `process`, `reactivity`, `rpc`, `schema`, `socket`, `sql`, `workflow`, `workers`.

As these modules stabilize, they graduate to the top-level `effect/*` namespace.

### Performance and Bundle Size

The fiber runtime has been rewritten for reduced memory overhead and faster execution. The core `effect` package supports aggressive tree-shaking — a minimal Effect program bundles to ~6.3 KB (minified + gzipped). With Schema, ~15 KB.

---

## Migration Guides

### Core

- [Services: `Context.Tag` → `Context.Service`](https://github.com/Effect-TS/effect-smol/blob/main/migration/services.md)
- [Cause: Flattened Structure](https://github.com/Effect-TS/effect-smol/blob/main/migration/cause.md)
- [Error Handling: `catch*` Renamings](https://github.com/Effect-TS/effect-smol/blob/main/migration/error-handling.md)
- [Forking: Renamed Combinators and New Options](https://github.com/Effect-TS/effect-smol/blob/main/migration/forking.md)
- [Effect Subtyping → Yieldable](https://github.com/Effect-TS/effect-smol/blob/main/migration/yieldable.md)
- [Fiber Keep-Alive: Automatic Process Lifetime Management](https://github.com/Effect-TS/effect-smol/blob/main/migration/fiber-keep-alive.md)
- [Layer Memoization Across `Effect.provide` Calls](https://github.com/Effect-TS/effect-smol/blob/main/migration/layer-memoization.md)
- [FiberRef: `FiberRef` → `Context.Reference`](https://github.com/Effect-TS/effect-smol/blob/main/migration/fiberref.md)
- [Runtime: `Runtime<R>` Removed](https://github.com/Effect-TS/effect-smol/blob/main/migration/runtime.md)
- [Scope](https://github.com/Effect-TS/effect-smol/blob/main/migration/scope.md)
- [Equality](https://github.com/Effect-TS/effect-smol/blob/main/migration/equality.md)

### services.md
## Services: Context.Tag → Context.Service

In v3, services were defined using `Context.Tag`, `Context.GenericTag`, `Effect.Tag`, or `Effect.Service`. In v4, all of these have been replaced by `Context.Service`.

The underlying runtime data structure is a typed map from service identifiers to their implementations.

## Defining Services

**v3: `Context.GenericTag`**

```
import { Context } from "effect"

interface Database {
  readonly query: (sql: string) => string
}

const Database = Context.GenericTag<Database>("Database")
```

**v4: `Context.Service` (function syntax)**

```
import { Context } from "effect"

interface Database {
  readonly query: (sql: string) => string
}

const Database = Context.Service<Database>("Database")
```

## Class-Based Services

**v3: `Context.Tag` class syntax**

```
import { Context } from "effect"

class Database extends Context.Tag("Database")<Database, {
  readonly query: (sql: string) => string
}>() {}
```

**v4: `Context.Service` class syntax**

```
import { Context } from "effect"

class Database extends Context.Service<Database, {
  readonly query: (sql: string) => string
}>()("Database") {}
```

Note the difference in argument order: in v3, the identifier string is passed to `Context.Tag(id)` before the type parameters. In v4, the type parameters come first via `Context.Service<Self, Shape>()` and the identifier string is passed to the returned constructor `(id)`.

## Effect.Tag Accessors → Context.Service with use

v3's `Effect.Tag` provided proxy access to service methods as static properties on the tag class (accessors). This allowed calling service methods directly without first yielding the service:

```
// v3 — static accessor proxy
const program = Notifications.notify("hello")
```

This pattern had significant limitations. The proxy was implemented via mapped types over the service shape, which meant **generic methods lost their type parameters**. A service method like `get<T>(key: string): Effect<T>` would have its generic erased when accessed through the proxy, collapsing to `get(key: string): Effect<unknown>`. For the same reason, overloaded signatures were not preserved.

In v4, accessors are removed. The most direct replacement is `Service.use`, which receives the service instance and runs a callback:

**v3**

```
import { Effect } from "effect"

class Notifications extends Effect.Tag("Notifications")<Notifications, {
  readonly notify: (message: string) => Effect.Effect<void>
}>() {}

// Static proxy access
const program = Notifications.notify("hello")
```

**v4 — `use`**

```
import { Context, Effect } from "effect"

class Notifications extends Context.Service<Notifications, {
  readonly notify: (message: string) => Effect.Effect<void>
}>()("Notifications") {}

// use: access the service and call a method in one step
const program = Notifications.use((n) => n.notify("hello"))
```

`use` takes an effectful callback `(service: Shape) => Effect<A, E, R>` and returns an `Effect<A, E, R | Identifier>`. `useSync` takes a pure callback `(service: Shape) => A` and returns an `Effect<A, never, Identifier>`. Both return Effects — `useSync` just allows the accessor function itself to be synchronous:

```
//      ┌─── Effect<void, never, Notifications>
//      ▼
const program = Notifications.use((n) => n.notify("hello"))

//      ┌─── Effect<number, never, Config>
//      ▼
const port = Config.useSync((c) => c.port)
```

**Prefer `yield*` over `use` in most cases.** While `use` is a convenient one-liner, it makes it easy to accidentally leak service dependencies into return values. When you call `use`, the service is available inside the callback but the dependency is not visible at the call site — making it harder to track which services your code depends on. Using `yield*` in a generator makes dependencies explicit and keeps service access co-located with the rest of your effect logic:

```
const program = Effect.gen(function*() {
  const notifications = yield* Notifications
  yield* notifications.notify("hello")
  yield* notifications.notify("world")
})
```

## Effect.Service → Context.Service with make

v3's `Effect.Service` allowed defining a service with an effectful constructor and dependencies inline. In v4, use `Context.Service` with a `make` option.

**v3**

In v3, `Effect.Service` automatically generated a `.Default` layer from the provided constructor, and wired `dependencies` into it:

```
import { Effect, Layer } from "effect"

class Logger extends Effect.Service<Logger>()("Logger", {
  effect: Effect.gen(function*() {
    const config = yield* Config
    return { log: (msg: string) => Effect.log(\`[${config.prefix}] ${msg}\`) }
  }),
  dependencies: [Config.Default]
}) {}

// Logger.Default is auto-generated: Layer<Logger, never, never>
// (dependencies are already wired in)
const program = Effect.gen(function*() {
  const logger = yield* Logger
  yield* logger.log("hello")
}).pipe(Effect.provide(Logger.Default))
```

**v4**

In v4, `Context.Service` with `make` stores the constructor effect on the class but does **not** auto-generate a layer. Define layers explicitly using `Layer.effect`:

```
import { Context, Effect, Layer } from "effect"

class Logger extends Context.Service<Logger>()("Logger", {
  make: Effect.gen(function*() {
    const config = yield* Config
    return { log: (msg: string) => Effect.log(\`[${config.prefix}] ${msg}\`) }
  })
}) {
  // Build the layer yourself from the make effect
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Config.layer)
  )
}
```

The `dependencies` option no longer exists. Wire dependencies via `Layer.provide` as shown above.

Note: v4 adopts the convention of naming layers with `layer` (e.g. `Logger.layer`) instead of v3's `Default` or `Live`. Use `layer` for the primary layer and descriptive suffixes for variants (e.g. `layerTest`, `layerConfig`).

## References (Services with Defaults)

**v3: `Context.Reference`**

```
import { Context } from "effect"

class LogLevel extends Context.Reference<LogLevel>()("LogLevel", {
  defaultValue: () => "info" as const
}) {}
```

**v4: `Context.Reference`**

```
import { Context } from "effect"

const LogLevel = Context.Reference<"info" | "warn" | "error">("LogLevel", {
  defaultValue: () => "info" as const
})
```

## Quick Reference

| v3 | v4 |
| --- | --- |
| `Context.GenericTag<T>(id)` | `Context.Service<T>(id)` |
| `Context.Tag(id)<Self, Shape>()` | `Context.Service<Self, Shape>()(id)` |
| `Effect.Tag(id)<Self, Shape>()` | `Context.Service<Self, Shape>()(id)` |
| `Effect.Service<Self>()(id, opts)` | `Context.Service<Self>()(id, { make })` |
| `Context.Reference<Self>()(id, opts)` | `Context.Reference<T>(id, opts)` |
| `Context.make(tag, impl)` | `Context.make(tag, impl)` |
| `Context.get(ctx, tag)` | `Context.get(map, tag)` |
| `Context.add(ctx, tag, impl)` | `Context.add(map, tag, impl)` |
| `Context.mergeAll(...)` | `Context.mergeAll(...)` |

### yieldable.md
## Effect Subtyping (v3) → Yieldable (v4)

In v3, many types were structural subtypes of `Effect` — they carried the Effect type ID at runtime and could be used anywhere an `Effect` was expected. This included `Ref`, `Deferred`, `Fiber`, `FiberRef`, `Config`, `Option`, `Either`, `Context.Tag`, and others.

While convenient, this created a class of subtle bugs. Because these types *were* Effects, they could be silently passed to Effect combinators when you intended to pass the value itself. For example, passing a `Ref` where you meant to pass the value inside the `Ref`, or accidentally mapping over a `Deferred` as an Effect instead of awaiting it.

v4 replaces this with the **`Yieldable`** trait: a narrower contract that allows `yield*` in generators but does **not** make the type assignable to `Effect`.

## The Yieldable Interface

```
interface Yieldable<Self, A, E = never, R = never> {
  asEffect(): Effect<A, E, R>
  [Symbol.iterator](): EffectIterator<Self>
}
```

Some example types that implement `Yieldable`:

- `Effect` itself
- `Option` — yields the value or fails with `NoSuchElementError`
- `Result` — yields the success or fails with the error
- `Config` — yields the config value or fails with `ConfigError`
- `Context.Service` — yields the service from the environment

Some example types that are **no longer** Effect subtypes and do **not** implement `Yieldable`:

- `Ref` — use `Ref.get(ref)` to read
- `Deferred` — use `Deferred.await(deferred)` to wait
- `Fiber` — use `Fiber.join(fiber)` to await

## yield\* Still Works

`yield*` in `Effect.gen` works with any `Yieldable`. The runtime calls `.asEffect()` internally when yielding.

```
import { Effect, Option } from "effect"

// The type of program is \`Effect<number, NoSuchElementError>\`
const program = Effect.gen(function*() {
  // yield* works with Yieldable types — same as v3
  const value = yield* Option.some(42)
  return value // 42
})
```

## Effect Combinators Require.asEffect()

In v3, you could pass a `Yieldable` type directly to Effect combinators because it was a subtype of `Effect`. In v4, you must explicitly convert with `.asEffect()`.

**v3** — Option is an Effect subtype, so this compiles:

```
import { Effect, Option } from "effect"

// Option<number> is assignable to Effect<number, NoSuchElementError>
const program = Effect.map(Option.some(42), (n) => n + 1)
```

**v4** — Option is not an Effect, so you must convert explicitly:

```
import { Effect, Option } from "effect"

// Option is Yieldable but not Effect — use .asEffect()
const program = Effect.map(Option.some(42).asEffect(), (n) => n + 1)

// Or more idiomatically, use a generator:
const program2 = Effect.gen(function*() {
  const n = yield* Option.some(42)
  return n + 1
})
```

## Types No Longer Subtypes of Effect

Several types that extended `Effect` in v3 no longer do so in v4. Use the appropriate module functions instead.

**v3** — `Ref` extends `Effect<A>`, yielding the current value:

```
import { Effect, Ref } from "effect"

const program = Effect.gen(function*() {
  const ref = yield* Ref.make(0)
  const value = yield* ref // Ref is an Effect<number>
})
```

**v4** — `Ref` is a plain value, use `Ref.get`:

```
import { Effect, Ref } from "effect"

const program = Effect.gen(function*() {
  const ref = yield* Ref.make(0)
  const value = yield* Ref.get(ref)
})
```

**v3** — `Deferred` extends `Effect<A, E>`, resolving when completed:

```
import { Deferred, Effect } from "effect"

const program = Effect.gen(function*() {
  const deferred = yield* Deferred.make<string, never>()
  const value = yield* deferred // Deferred is an Effect<string>
})
```

**v4** — `Deferred` is a plain value, use `Deferred.await`:

```
import { Deferred, Effect } from "effect"

const program = Effect.gen(function*() {
  const deferred = yield* Deferred.make<string, never>()
  const value = yield* Deferred.await(deferred)
})
```

**v3** — `Fiber` extends `Effect<A, E>`, joining on yield:

```
import { Effect, Fiber } from "effect"

const program = Effect.gen(function*() {
  const fiber = yield* Effect.fork(task)
  const result = yield* fiber // Fiber is an Effect<A, E>
})
```

**v4** — `Fiber` is a plain value, use `Fiber.join`:

```
import { Effect, Fiber } from "effect"

const program = Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(task)
  const result = yield* Fiber.join(fiber)
})
```

## Why This Changed

The v3 subtyping approach meant the type system could not distinguish between "I have a Ref" and "I have an Effect that reads the Ref." This ambiguity led to bugs that were difficult to diagnose:

- Passing a `Ref` to `Effect.map` would read the ref's value rather than transforming the ref itself — often not the intended behavior.
- A `Deferred` in a data structure could silently be treated as an Effect, causing unexpected awaits.
- Combinators like `Effect.all` would accept an array of `Ref` values and silently read all of them, instead of producing a type error.

The `Yieldable` trait preserves the ergonomic `yield*` syntax in generators while making the conversion to `Effect` explicit everywhere else.

### runtime.md
## Runtime: Runtime<R> Removed

In v3, `Runtime<R>` bundled a `Context<R>`, `RuntimeFlags`, and `FiberRefs` into a single value used to execute effects:

```
// v3
interface Runtime<in R> {
  readonly context: Context.Context<R>
  readonly runtimeFlags: RuntimeFlags
  readonly fiberRefs: FiberRefs
}
```

In v4, this type no longer exists and you can use `Context<R>` instead. Run functions live directly on `Effect`, and the `Runtime` module is reduced to process lifecycle utilities.

## Runtime.runFork(runtime) -> Effect.runForkWith(services)

In v3, running an effect with dependencies usually meant pulling the current runtime from `Effect.runtime<R>()` and calling `Runtime.runFork(runtime)` inside the main effect.

**v3**

```
import { Context, Effect, Runtime } from "effect"

class Logger extends Context.Tag("Logger")<Logger, {
  readonly log: (message: string) => void
}>() {}

const program = Effect.gen(function*() {
  const logger = yield* Logger
  logger.log("Hello from Logger")
})

const main = Effect.gen(function*() {
  const runtime = yield* Effect.runtime<Logger>()
  return Runtime.runFork(runtime)(program)
}).pipe(
  Effect.provideService(Logger, {
    log: (message) => console.log(message)
  })
)

const fiber = Effect.runFork(main)
```

In v4, use the same pattern with `Effect.context<R>()`, then run with `Effect.runForkWith(services)`:

**v4**

```
import { Context, Effect } from "effect"

class Logger extends Context.Service<Logger, {
  readonly log: (message: string) => void
}>()("Logger") {}

const program = Effect.gen(function*() {
  const logger = yield* Logger
  logger.log("Hello from Logger")
})

const main = Effect.gen(function*() {
  const services = yield* Effect.context<Logger>()
  return Effect.runForkWith(services)(program)
}).pipe(
  Effect.provideContext(Context.make(Logger, {
    log: (message) => console.log(message)
  }))
)

const fiber = Effect.runFork(main)
```

If your effect has no service requirements, use `Effect.runFork(effect)`.

## Runtime Module Contents

The `Runtime` module now only contains:

- `Teardown` — interface for handling process exit
- `defaultTeardown` — default teardown implementation
- `makeRunMain` — creates platform-specific main runners

### error-handling.md
## Error Handling: catch\* Renamings

The `catch` combinators on `Effect` have been renamed in v4. The general pattern: `catchAll*` is shortened to `catch*`, and the `catchSome*` family is replaced by `catchFilter` / `catchCauseFilter`.

## Renamings

| v3 | v4 |
| --- | --- |
| `Effect.catchAll` | `Effect.catch` |
| `Effect.catchAllCause` | `Effect.catchCause` |
| `Effect.catchAllDefect` | `Effect.catchDefect` |
| `Effect.catchTag` | `Effect.catchTag` (unchanged) |
| `Effect.catchTags` | `Effect.catchTags` (unchanged) |
| `Effect.catchIf` | `Effect.catchIf` (unchanged) |
| `Effect.catchSome` | `Effect.catchFilter` |
| `Effect.catchSomeCause` | `Effect.catchCauseFilter` |
| `Effect.catchSomeDefect` | Removed |

## Effect.catchAll → Effect.catch

**v3**

```
import { Effect } from "effect"

const program = Effect.fail("error").pipe(
  Effect.catchAll((error) => Effect.succeed(\`recovered: ${error}\`))
)
```

**v4**

```
import { Effect } from "effect"

const program = Effect.fail("error").pipe(
  Effect.catch((error) => Effect.succeed(\`recovered: ${error}\`))
)
```

## Effect.catchAllCause → Effect.catchCause

**v3**

```
import { Effect } from "effect"

const program = Effect.die("defect").pipe(
  Effect.catchAllCause((cause) => Effect.succeed("recovered"))
)
```

**v4**

```
import { Cause, Effect } from "effect"

const program = Effect.die("defect").pipe(
  Effect.catchCause((cause) => Effect.succeed("recovered"))
)
```

## Effect.catchSome → Effect.catchFilter

In v3, `catchSome` took a function returning `Option<Effect>`. In v4, `catchFilter` uses the `Filter` module instead.

**v3**

```
import { Effect, Option } from "effect"

const program = Effect.fail(42).pipe(
  Effect.catchSome((error) =>
    error === 42
      ? Option.some(Effect.succeed("caught"))
      : Option.none()
  )
)
```

**v4**

```
import { Effect, Filter } from "effect"

const program = Effect.fail(42).pipe(
  Effect.catchFilter(
    Filter.fromPredicate((error: number) => error === 42),
    (error) => Effect.succeed("caught")
  )
)
```

## New in v4

- **`Effect.catchReason(errorTag, reasonTag, handler)`** — catches a specific `reason` within a tagged error without removing the parent error from the error channel. Useful for handling nested error causes (e.g. an `AiError` with a `reason: RateLimitError | QuotaExceededError`).
- **`Effect.catchReasons(errorTag, cases)`** — like `catchReason` but handles multiple reason tags at once via an object of handlers.
- **`Effect.catchEager(handler)`** — an optimization variant of `catch` that evaluates synchronous recovery effects immediately.

### forking.md
## Forking: Renamed Combinators and New Options

The `fork*` family of combinators has been renamed in v4 for clarity, and all variants now accept an options object for controlling fiber startup behavior.

## Renamings

| v3 | v4 | Description |
| --- | --- | --- |
| `Effect.fork` | `Effect.forkChild` | Fork as a child of the current fiber |
| `Effect.forkDaemon` | `Effect.forkDetach` | Fork detached from parent lifecycle |
| `Effect.forkScoped` | `Effect.forkScoped` | Fork tied to the current `Scope` (unchanged) |
| `Effect.forkIn` | `Effect.forkIn` | Fork in a specific `Scope` (unchanged) |
| `Effect.forkAll` | — | Removed |
| `Effect.forkWithErrorHandler` | — | Removed |

## Effect.fork → Effect.forkChild

**v3**

```
import { Effect } from "effect"

const fiber = Effect.fork(myEffect)
```

**v4**

```
import { Effect } from "effect"

const fiber = Effect.forkChild(myEffect)
```

## Effect.forkDaemon → Effect.forkDetach

**v3**

```
import { Effect } from "effect"

const fiber = Effect.forkDaemon(myEffect)
```

**v4**

```
import { Effect } from "effect"

const fiber = Effect.forkDetach(myEffect)
```

## Fork Options

In v4, `forkChild`, `forkDetach`, `forkScoped`, and `forkIn` all accept an optional options object with the following fields:

```
{
  readonly startImmediately?: boolean | undefined
  readonly uninterruptible?: boolean | "inherit" | undefined
}
```
- **`startImmediately`** — When `true`, the forked fiber begins executing immediately rather than being deferred. Defaults to `undefined` (deferred).
- **`uninterruptible`** — Controls whether the forked fiber can be interrupted. `true` makes it uninterruptible, `"inherit"` inherits the parent's interruptibility, and `undefined` uses the default behavior.

**Usage as data-last (curried)**

```
import { Effect } from "effect"

const fiber = myEffect.pipe(
  Effect.forkChild({ startImmediately: true })
)
```

**Usage as data-first**

```
import { Effect } from "effect"

const fiber = Effect.forkChild(myEffect, { startImmediately: true })
```

## Removed Combinators

**`Effect.forkAll`** and **`Effect.forkWithErrorHandler`** have been removed in v4. For `forkAll`, fork effects individually with `forkChild` or use higher-level concurrency combinators. For error handling on forked fibers, observe the fiber's result via `Fiber.join` or `Fiber.await`.
