# 模板：BunTester（Bun 环境测试首选）

## 前置
- 使用 `@yuyi919/tslibs-effect/BunTester`
- 断言统一使用 `node:assert` (如 `assert.ok`, `assert.strictEqual`)，**禁止使用 `expect`**，以避免类型断言问题。
- 优先使用 `it.gen` / `it.scopedGen`

```ts
import { describe, it, layer, waitFor } from "@yuyi919/tslibs-effect/BunTester"
import { Context, Effect, Layer, TestClock, TxRef } from "@yuyi919/tslibs-effect/effect-next"
import assert from "node:assert"

class Counter extends Context.Service<Counter, {
  readonly get: Effect.Effect<number>
  readonly inc: Effect.Effect<void>
}>()("Counter") {}

const CounterLive = Layer.succeed(
  Counter,
  Counter.of({
    get: Effect.succeed(0),
    inc: Effect.void
  })
)

describe("BunTester + Effect", () => {
  it.gen("basic", function* () {
    assert.strictEqual(yield* Effect.succeed(1), 1)
  })

  it.gen("testclock", function* () {
    let ran = false
    yield* Effect.fork(Effect.sleep("10 seconds").pipe(Effect.tap(() => { ran = true })))
    yield* TestClock.adjust("10 seconds")
    assert.strictEqual(ran, true)
  })

  layer(CounterLive)("with layer", (it) => {
    it.gen("service ok", function* () {
      const svc = yield* Counter
      yield* svc.inc
      assert.strictEqual(yield* svc.get, 0)
    })
  })

  it.gen("waitFor stm", function* () {
    const ref = yield* TxRef.make(0)
    yield* Effect.fork(Effect.sleep("10 millis").pipe(Effect.andThen(TxRef.update(ref, (n) => n + 1))))
    yield* waitFor(ref, (val) => {
      if (val !== 1) throw new Error("not ready")
    })
    assert.strictEqual(yield* TxRef.get(ref), 1)
  })
})
```
