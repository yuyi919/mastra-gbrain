# 模板：@yuyi919/tslibs-effect 导入与边界

## 什么时候用它
- Bun 环境测试：优先用 `@yuyi919/tslibs-effect/BunTester` 与 `@yuyi919/tslibs-effect/effect-next`
- 想减少 `effect/*` 分散导入：可以用主入口 `@yuyi919/tslibs-effect`

## 推荐导入

```ts
import { Effect, Layer, Option } from "@yuyi919/tslibs-effect"
```

```ts
import * as Eff from "@yuyi919/tslibs-effect/effect-next"
```

## 稳定子路径入口（更稳定）
- `@yuyi919/tslibs-effect/<Name>`（例如 `.../Cause`、`.../Effect`）

## 避免耦合（不推荐/不稳定）
- `core/*`（实现细节/兼容层）
- `libs/*`、`cluster/*`（内部/实验性，不保证长期稳定）
- `internal/*`（严禁直接耦合）

## 版本对齐提示（peerDependencies）
该包依赖 `effect` 的 beta 版本作为 peerDependencies。安装前先确认你的 `effect` 版本与其要求一致；若出现依赖冲突，优先在独立目录验证/对齐版本后再合并到主项目。

