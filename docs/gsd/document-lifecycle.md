# GSD 文档生命周期

这份文档专门回答两个问题：

1. 里程碑应该如何帮助你完成项目
2. 里程碑完成后，那些散落在 `.planning/` 里的文档会怎么处理

## 里程碑在项目中的作用

里程碑不是“阶段的别名”，它是更高一级的交付容器。

一个健康的 GSD 项目通常是这样推进的：

1. 项目层定义长期方向：`PROJECT.md`
2. 当前里程碑定义这一轮要交付什么：`ROADMAP.md`、`REQUIREMENTS.md`
3. 每个阶段把里程碑拆成可执行块：`phases/*/PLAN.md`
4. 执行结果写回：`SUMMARY.md`、`VERIFICATION.md`
5. 里程碑收尾时做审计、补缺、归档

也就是说，里程碑的价值不只是“分批做事”，而是把以下三件事绑定到一起：

- 目标边界：这一轮到底要交付什么
- 验收边界：做到什么程度算完成
- 历史边界：哪些文档属于当前轮，哪些属于过去一轮

没有里程碑时，项目很容易退化成“一堆 todo 和一些做过的计划”；有了里程碑，文档才有明确归属。

## 文档不是一起生成，也不会一起消失

GSD 的文档天然分层，不同层的处理方式不同。

## 第一层：常驻主文档

这些文档会持续存在，并随着项目前进不断更新：

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/RETROSPECTIVE.md`
- `.planning/config.json`

它们不属于某一个阶段，而属于整个项目或当前活跃里程碑。

## 第二层：当前工作文档

这些文档服务于“正在做”的工作：

- `.planning/phases/`
- `.planning/quick/`
- `.planning/debug/`
- `.planning/todos/`
- `.planning/spikes/`
- `.planning/sketches/`

它们通常最杂，也最像“散落的文档”。这是正常的，因为它们承载的是进行中的工作痕迹。

## 第三层：历史归档文档

当里程碑完成后，GSD 会逐步把本轮信息沉淀到归档层：

- `.planning/milestones/vX.Y-ROADMAP.md`
- `.planning/milestones/vX.Y-REQUIREMENTS.md`
- `.planning/milestones/vX.Y-phases/`
- `MILESTONES.md` 中的里程碑条目

这层的意义不是继续指导当前工作，而是保留“当时为什么这样做”的历史快照。

## 里程碑完成后，文档实际会怎么走

### 第一步：完成里程碑

```bash
$gsd-complete-milestone 1.0.0
```

完成后，通常会发生这些事：

- 生成或更新里程碑记录
- 保留这一轮的统计和版本信息
- 为下一轮工作腾出语义空间

但这一步不等于“当前工作区立刻变干净”。

### 第二步：开始下一里程碑

```bash
$gsd-new-milestone "Next milestone"
```

这一步会把当前关注点切换到下一轮目标。此后顶层 `ROADMAP.md`、`STATE.md` 会继续服务新里程碑，而不是冻结不动。

### 第三步：清理旧阶段目录

```bash
$gsd-cleanup
```

这一步才是在处理“散落文档”的关键动作。它会把已经完成里程碑遗留在 `.planning/phases/` 里的阶段目录迁移到 `.planning/milestones/vX.Y-phases/`，从而减少当前工作区噪音。

换句话说：

- `$gsd-complete-milestone` 负责“完成并记账”
- `$gsd-cleanup` 负责“搬档和收纳”

## 哪些文档通常不会自动归档

下面这些更像长期工作台，不会因为一个里程碑结束就自动消失：

- `STATE.md`
- `RETROSPECTIVE.md`
- `todos/`
- `quick/`
- `debug/`
- `spikes/`
- `sketches/`

原因很简单：它们记录的是跨里程碑状态、沉淀知识、临时工作或尚未清理的上下文，不一定只属于一个版本。

## 面对“散落文档”，推荐的整理策略

### 策略一：把阶段文档当成正式历史

适合需要高追溯性的项目。做法是：

```bash
$gsd-complete-milestone X.Y.Z
$gsd-cleanup
```

保留历史快照，不主动删。

### 策略二：把 quick、spike、sketch 的结论抽出来，再保留原始痕迹

适合探索型项目。可选命令：

```bash
$gsd-spike-wrap-up
$gsd-sketch-wrap-up
```

这样原始实验仍在，但结论被提炼成可复用技能。

### 策略三：对 planning 文档只本地保留

如果你不想把 planning 文档纳入版本库，就把 `commit_docs` 设为 `false`。这样文档仍存在，但不会进入 git 主历史。

## 一个实用判断

看到 `.planning/` 很乱时，不要先问“删不删”，先问这份文档属于哪一类：

- 还在指导当前工作吗
- 是不是已经变成里程碑历史
- 是不是只是还没做 wrap-up 或 cleanup

只要分类清楚，GSD 的文档不会越用越乱；真正导致混乱的，通常不是文档太多，而是没有按里程碑切换文档身份。
