# Effect v4 禁用清单 (Banned Patterns)

出现以下 API 即视为 v3 旧写法，必须进行改写：

| 禁用词 (v3 API) | 替代方案 (v4 API) |
| --- | --- |
| `Context.Tag(` | `Context.Service` |
| `Context.GenericTag(` | `Context.Service` |
| `Effect.Tag(` | `Context.Service` |
| `Effect.Service(` | `Context.Service` + `Layer.effect` |
| `Runtime.runFork` | `Effect.runForkWith(services)(effect)` |
| `Effect.runtime<...>()` | `Effect.context<...>()` |
| `Effect.catchAll` | `Effect.catch` |
| `Effect.catchAllCause`| `Effect.catchCause` |
| `Effect.catchSome` | `Effect.catchFilter` / `Effect.catchCauseFilter` |
| `Effect.fork(` | `Effect.forkChild(` |
| `Effect.forkDaemon(` | `Effect.forkDetach(` |

> 任何旧版本的静态访问器模式（例如 `Svc.method()` 直接调用）都被禁止，必须显式 `yield* Svc` 后再调用 `svc.method()`。
