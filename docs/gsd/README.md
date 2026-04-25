# GSD 中文使用指南

这套文档不是把 `$gsd-*` 命令逐个翻译一遍，而是把 GSD 真正常用的几种工作模式整理成可执行流程。你应该先理解“项目、里程碑、阶段、计划、执行、验证、归档”之间的关系，再决定当前该跑哪条命令链。

## 先理解 5 个对象

### 1. 项目（Project）

项目是最大边界。`$gsd-new-project` 会建立一套长期存在的工作文档，例如 `.planning/PROJECT.md`、`.planning/ROADMAP.md`、`.planning/STATE.md`。

### 2. 里程碑（Milestone）

里程碑是一段相对完整、可以对外说明“这一版完成了什么”的交付周期。它通常对应一个版本目标、一批阶段，以及一轮最终验收与归档。

### 3. 阶段（Phase）

阶段是里程碑内部的交付单元。一个阶段应该有明确目标，例如“接入混合检索”或“重构存储边界”，而不是一句模糊的“继续开发”。

### 4. 快速任务（Quick Task）

快速任务不进入 `ROADMAP.md`，适合处理中小型、临时性、跨阶段但不值得新开阶段的工作。它们会落在 `.planning/quick/`，只更新 `STATE.md`，不改阶段路线图。

### 5. 产物（Artifacts）

GSD 的文档分为三类：

- 常驻文档：`.planning/PROJECT.md`、`ROADMAP.md`、`STATE.md`、`RETROSPECTIVE.md`
- 当前工作文档：`.planning/phases/`、`.planning/quick/`、`.planning/debug/`、`.planning/todos/`
- 归档文档：`.planning/milestones/` 下的快照与历史阶段目录

里程碑完成后，文档不会“自动消失”，而是从“当前工作文档”转为“历史快照”或“待清理的工作痕迹”。文档生命周期见 [document-lifecycle.md](./document-lifecycle.md)。

## 什么时候把工作做成“里程碑”

满足下面任意两条，就应该按里程碑组织，而不是一直用 quick task：

- 你能说清楚这一轮结束后项目会进入什么新状态
- 这轮工作需要多个阶段串联完成
- 你需要在结束时做一次验收、补缺和归档
- 这轮工作值得形成版本号或发布节点

如果只是“一两个小修复、一次文档整理、一个局部排障”，优先用 quick task；如果已经变成“下一版要做什么”，就该开新里程碑。

## 推荐阅读顺序

1. [workflows.md](./workflows.md)：先看 4 条最常用的命令流程
2. [exceptions.md](./exceptions.md)：再看流程中断、计划跑偏、任务膨胀时怎么救
3. [document-lifecycle.md](./document-lifecycle.md)：最后看里程碑完成后文档会被怎么处理

## 一句话判断当前该走哪条流程

- 我在开新一轮版本目标：看 [workflows.md](./workflows.md) 的“模式一”
- 我在推进当前里程碑的某个阶段：看 [workflows.md](./workflows.md) 的“模式二”
- 我遇到临时插单、小改动、排障：看 [workflows.md](./workflows.md) 的“模式三”
- 我这轮工作差不多做完了，想验收、封版、归档：看 [workflows.md](./workflows.md) 的“模式四”
