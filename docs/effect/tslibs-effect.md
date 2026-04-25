# 使用 @yuyi919/tslibs-effect 指南

## 1. 目标与边界

`@yuyi919/tslibs-effect` 是一个面向 Effect v4 beta 的个人 polyfill + 再导出库，其核心目标是：
- 提供统一入口，减少分散的 `effect/*` 导入。
- 在不改变语义的前提下，对齐/补齐常用的 effect-v3 风格命名与 API 组织方式。
- 以“可维护、可读、对 agent 友好”为优先目标。

**请注意：** 该库不以 tree-shaking 友好为目标，且并未覆盖 effect 的全部模块（按需增补）。

## 2. 导入入口选择约定

在项目中引用 Effect 相关的模块时，请严格遵守以下导入路径约定：

### 2.1 推荐入口（主入口与对齐入口）

- **主入口**（推荐快速开发与聚合使用）：
  ```typescript
  import { Effect, Layer, Option } from "@yuyi919/tslibs-effect";
  ```
- **v3 风格对齐入口**（如需要精确的旧命名空间）：
  ```typescript
  import * as Eff from "@yuyi919/tslibs-effect/effect-next";
  ```

### 2.2 稳定子路径入口

如果需要精确引用某个独立模块，推荐使用公开的稳定子路径：
- `@yuyi919/tslibs-effect/<Name>`：如 `@yuyi919/tslibs-effect/Effect`、`@yuyi919/tslibs-effect/Cause`。

### 2.3 禁用与警告入口

**绝对禁止或不推荐 Agent 在新代码中主动依赖以下路径：**
- `core/*`：为兼容/补齐层，偏向实现细节。
- `libs/*`、`cluster/*`：为内部/实验性能力。这些路径虽然可用，但不保证长期稳定。**任何需要稳定 API 的场景，都应向主入口或稳定子路径寻找。**
- `internal/*`：内部实现与测试，**严禁消费者直接耦合**。

## 3. 安装与版本对齐

`@yuyi919/tslibs-effect` 采用 `peerDependencies` 声明对 `effect` 及平台包的依赖。当前版本（例如 0.4.1）强依赖于 Effect v4 beta 系列：
- `effect: ~4.0.0-beta.47`
- `@effect/platform-bun: ~4.0.0-beta.47`
- `@effect/sql-pg: ~4.0.0-beta.47` 等

**Agent 操作须知：**
当为项目引入 `@yuyi919/tslibs-effect` 时，请务必检查并同步安装符合其 peerDependencies 的 `effect` 版本，以避免类型与运行时不匹配。

## 4. 与 Effect v4 约束的交叉说明

即便使用了 `@yuyi919/tslibs-effect`，**Effect v4 Beta 的硬性反模式约束依然生效**。
- **禁止** 借用对齐库的便利去写回 v3 的反模式（例如：使用 `Context.Tag` 替代 `Context.Service`、使用 `Effect.catchAll` 等）。
- **必须** 继续坚持 `Effect.gen` / `Effect.fn` 架构流、`Schema.TaggedErrorClass` 等系统性最佳实践。
