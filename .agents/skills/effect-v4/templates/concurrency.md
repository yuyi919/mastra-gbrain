# 模板：并发（forkChild/forkDetach + Fiber.join + 取消）

## 要点
- 创建 fiber：优先 `Effect.forkChild`（或按项目约定 `forkDetach`）
- 等待：`Fiber.join`

```ts
import { Effect, Fiber } from "effect"

const worker = Effect.succeed("ok")

export const program = Effect.gen(function* () {
  const fiber = yield* Effect.forkChild(worker)
  const result = yield* Fiber.join(fiber)
  return result
})
```
