# 模板：@effect/vitest（非 Bun 环境测试）

## 要点
- `it.effect` + `Effect.gen`
- 断言使用 `node:assert`，如 `assert.strictEqual` 或 `assert.deepEqual`。
- **绝对禁止使用 vitest 的 `expect`**，以避免复杂的类型断言问题。

```ts
import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import assert from "node:assert"

describe("example", () => {
  it.effect("works", () =>
    Effect.gen(function* () {
      const n = yield* Effect.succeed(1)
      assert.strictEqual(n, 1)
    })
  )
})
```
