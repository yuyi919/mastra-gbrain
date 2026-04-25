# 模板：错误模型（Schema.TaggedErrorClass + catch/catchTag）

## 要点
- 错误使用 `Schema.TaggedErrorClass`
- 在 `Effect.gen` 中“抛出错误”使用 `return yield* new ...`
- 捕获用 `Effect.catch` 或 `Effect.catchTag`

```ts
import { Effect, Schema } from "effect"

export class NotFound extends Schema.TaggedErrorClass<NotFound>()("NotFound", {
  id: Schema.String
}) {}

export const program = Effect.gen(function* () {
  return yield* new NotFound({ id: "u_1" })
}).pipe(
  Effect.catchTag("NotFound", (e) => Effect.succeed({ ok: false as const, missing: e.id }))
)
```
