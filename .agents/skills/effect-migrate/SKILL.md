---
name: effect-migrate
description: Migrate suspected Effect v3 / non-idiomatic code to Effect v4 beta using this repo’s playbook (Context.Service, Yieldable, catch, forkChild, BunTester).
argument-hint: "[代码片段/文件路径/需求描述]"
disable-model-invocation: true
allowed-tools: Bash Read Grep
---

先加载并遵循 `/effect-v4` 的所有规则与本地文档，然后完成下面任务。

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

## 迁移输出要求
1. 识别问题点（按：服务/运行时/错误/并发/Yieldable/测试/其他 进行分类）
2. v4 对应写法（逐条给出替代 API 或重构策略，并解释原因）
3. 迁移后完整代码
4. 自检清单（确保不含 v3 禁用 API，并符合本仓库编码风格）
