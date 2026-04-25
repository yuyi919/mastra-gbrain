# 模板：Yieldable（Option/Result/Config）参与 combinator

## 要点
- v4 下 `Option/Result/Config` 不是 `Effect` 子类型
- 参与 `Effect.map/flatMap/...` 时用 `.asEffect()`，或改写为 `Effect.gen`

```ts
import { Effect, Option } from "effect"

export const a = Option.some(1).asEffect().pipe(
  Effect.map((n) => n + 1)
)

export const b = Effect.gen(function* () {
  const n = yield* Option.some(1)
  return n + 1
})
```
