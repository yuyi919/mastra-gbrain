# 示例：BunTester 并发 + 虚拟时间 + waitFor

```ts
import { describe, it, waitFor } from "@yuyi919/tslibs-effect/BunTester"
import { Effect, TestClock, TxRef } from "effect"
import assert from "node:assert"

describe("并发与时间测试", () => {
  it.gen("可以模拟时间", function* () {
    let ran = false
    yield* Effect.forkChild(Effect.sleep("1 seconds").pipe(Effect.tap(() => { ran = true })))
    yield* TestClock.adjust("1 seconds")
    assert.ok(ran, "should have run")
  })

  it.gen("可以等待并发状态", function* () {
    const ref = yield* TxRef.make(0)
    yield* Effect.forkChild(TxRef.update(ref, n => n + 1).pipe(Effect.delay("10 millis")))
    
    yield* waitFor(ref, val => {
      if (val !== 1) throw new Error("not ready")
    })
    
    assert.strictEqual(yield* TxRef.get(ref), 1)
  })
})
```
