# 模板：资源生命周期（Effect.acquireRelease + Scope）

## 要点
- 不要手写 `try/finally`
- 用 `Effect.acquireRelease` 注册释放逻辑，依赖 Scope 自动释放

```ts
import { Effect } from "effect"

const acquire = Effect.sync(() => {
  return { close: () => void 0 }
})

export const resource = Effect.acquireRelease(
  acquire,
  (res) => Effect.sync(() => res.close())
)

export const program = Effect.scoped(
  Effect.gen(function* () {
    const res = yield* resource
    return res
  })
)
```
