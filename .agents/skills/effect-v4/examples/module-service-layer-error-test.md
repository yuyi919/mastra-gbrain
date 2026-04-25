# 示例：完整模块（Service + Layer + Error + BunTester 测试）

> 这是一个“最终交付物形态”示例：包含服务定义、Layer 实现、业务函数，以及 BunTester 测试（可作为输出对齐样板）。

```ts
import { Context, Effect, Layer, Schema } from "effect"

export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String
}) {}

export type User = {
  readonly id: string
  readonly name: string
}

export class Users extends Context.Service<Users, {
  readonly get: (id: string) => Effect.Effect<User, UserNotFound>
}>()("Users") {}

export const UsersLive = Layer.succeed(
  Users,
  Users.of({
    get: (id) =>
      id === "u1"
        ? Effect.succeed({ id, name: "Alice" })
        : Effect.fail(new UserNotFound({ id }))
  })
)

export const getUserName = Effect.fn("getUserName")(function* (id: string) {
  const users = yield* Users
  const user = yield* users.get(id)
  return user.name
})
```

```ts
import { describe, it, layer } from "@yuyi919/tslibs-effect/BunTester"
import { Effect } from "@yuyi919/tslibs-effect/effect-next"
import assert from "node:assert"
import { Users, UsersLive, getUserName } from "./users"

layer(UsersLive)("Users module", (it) => {
  it.gen("get existing", function* () {
    assert.strictEqual(yield* getUserName("u1"), "Alice")
  })

  it.effect("get missing", () =>
    Effect.gen(function* () {
      const exit = yield* getUserName("u2").pipe(Effect.exit)
      assert.strictEqual(exit._tag, "Failure")
    })
  )
})
```

