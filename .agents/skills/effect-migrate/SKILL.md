---
name: effect-migrate
description: Migrate suspected Effect v3 / non-idiomatic code to Effect v4 beta using this repo’s playbook (Context.Service, Yieldable, catch, forkChild, BunTester).
argument-hint: "[代码片段/文件路径/需求描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `../effect-v4/SKILL.md` 的所有规则与本地文档，然后完成下面任务。不要把迁移理解成 API 名称替换；必须按 Effect v4 的 Service/Layer、错误通道、Scope、Yieldable、并发和测试范式重构。

ARGUMENTS: $ARGUMENTS

## 模板库（按需引用）
当迁移涉及对应主题时，从 `${CLAUDE_SKILL_DIR}/../effect-v4/templates/` 引用并遵循：
- `service-layer.md`（服务与 Layer 重构）
- `errors.md`（错误模型重构）
- `resources-scope.md`（资源/作用域重构）
- `concurrency.md`（并发/fork 重构）
- `yieldable.md`（Yieldable 重构）
- `test-bun-buntester.md` / `test-vitest-effect.md`（测试迁移）
- `tslibs-effect-imports.md`（导入与边界）

如果运行环境没有 `CLAUDE_SKILL_DIR`，从当前技能目录的相邻路径解析：`.agents/skills/effect-v4/templates/`。

## 迁移前检查
- 先读取 `docs/effect/v4-systematic-guide.md`、`docs/effect/v4-playbook.md`、`docs/effect/v4-banned-patterns.md`。
- 涉及 Bun、`@yuyi919/tslibs-effect` 或测试时，同时读取 `docs/effect/tslibs-effect.md`。
- 涉及 `src/store/**` 时，套用 `effect-v4` 技能中的 Project-Specific Store / BrainStore Overlay：不要新增 flat-first Context，不要在 `libsql-store.ts` 重复实现分层能力，不要用 `as unknown` / `as any` 绕过类型。

## 迁移输出要求
1. 识别问题点（按：服务/运行时/错误/并发/Yieldable/测试/其他 进行分类）
2. v4 对应写法（逐条给出替代 API 或重构策略，并解释原因）
3. 迁移后完整代码
4. 自检清单（确保不含 v3 禁用 API，并符合本仓库编码风格）
5. 校验结果：优先运行 `pwsh ./scripts/check-effect-v4.ps1` 或 `sh ./scripts/check-effect-v4.sh`；若无法运行，说明原因并给出手动扫描结果。
