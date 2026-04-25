# 模板：Service + Layer + 业务入口（Effect v4）

## 目标
用 `Context.Service` 定义服务，用 `Layer.succeed` / `Layer.effect` 提供实现，并用 `Effect.fn`/`Effect.gen` 作为业务入口。

## 代码骨架

```ts
import { Context, Effect, Layer, Schema } from "effect"

export class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", {
  message: Schema.String
}) {}

export class MyService extends Context.Service<MyService, {
  readonly doThing: (input: string) => Effect.Effect<string, MyError>
}>()("MyService") {}

export const MyServiceLive = Layer.succeed(
  MyService,
  MyService.of({
    doThing: (input) =>
      Effect.gen(function* () {
        if (input.length === 0) {
          return yield* new MyError({ message: "empty input" })
        }
        return input.toUpperCase()
      })
  })
)

export const main = Effect.fn("main")(function* () {
  const svc = yield* MyService
  return yield* svc.doThing("hello")
}).pipe(
  Effect.provide(MyServiceLive)
)
```

## 检查点
- 是否使用 `Context.Service`（不是 Tag/GenericTag）？
- 是否用 `Effect.fn` / `Effect.gen` + `yield*`？
- 抛错是否是 `return yield* new ...`？
```
