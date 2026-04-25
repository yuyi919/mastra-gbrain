# GSD 常用流程

本页只总结最常用的完整命令链。关键原则是：先选工作模式，再跑对应的流程，不要在每一步都重新发明流程。

## 模式一：从“新目标”进入一个里程碑

适用场景：

- 你要启动一个新项目
- 你已经有项目，但要开启下一轮版本目标
- 你希望先把目标、范围、阶段拆分清楚，再开始写代码

### 新项目流程

```bash
$gsd-new-project
$gsd-plan-phase 1
$gsd-execute-phase 1
$gsd-progress
```

### 已有项目，开启新里程碑

```bash
$gsd-new-milestone "v2.0 Features"
$gsd-plan-phase 1
$gsd-execute-phase 1
$gsd-progress
```

### 这个流程在解决什么问题

- 先把“这一轮到底要交付什么”固定下来
- 再把目标拆成阶段，而不是一上来就写零散 todo
- 让 `ROADMAP.md` 成为当前里程碑的唯一主线

### 常见意外与处置

**情况：你说不清阶段边界，只知道一个大方向**

先跑：

```bash
$gsd-discuss-phase 1
```

如果问题不是“需求模糊”，而是“技术路径不确定”，改跑：

```bash
$gsd-research-phase 1
```

**情况：你担心代理理解错你的想法**

在计划前先看它准备怎么做：

```bash
$gsd-list-phase-assumptions 1
```

先校正，再执行 `$gsd-plan-phase 1`，比计划写出来后再返工更便宜。

**情况：你已经有成文 PRD 或需求文档**

直接跳过 discuss 流程：

```bash
$gsd-plan-phase 1 --prd path/to/requirements.md
```

这时 PRD 会被视为锁定决策，不要再让代理重新猜需求。

## 模式二：里程碑内的标准推进循环

适用场景：

- 当前里程碑已经建立
- 你要继续推进某个阶段
- 你需要一个“计划 -> 执行 -> 验证 -> 继续”的稳定节奏

### 标准循环

```bash
$gsd-progress
$gsd-plan-phase N
$gsd-execute-phase N
$gsd-verify-work N
$gsd-progress
```

如果阶段做完且准备交付：

```bash
$gsd-ship N
```

### 这个流程的核心纪律

- `ROADMAP.md` 只描述里程碑主线
- `PLAN.md` 负责把阶段拆成可执行任务
- `SUMMARY.md` 负责记录已经做了什么
- `VERIFICATION.md` 或 `$gsd-verify-work` 负责确认“做完”不是自我感觉

### 常见意外与处置

**情况：计划太大，执行一半发现收不住**

优先不要继续硬做。改成：

- 给当前阶段拆多个计划
- 或只执行指定 wave

```bash
$gsd-execute-phase N --wave 1
```

先把一波做完，再决定下一波，而不是一次把所有计划压上去。

**情况：执行中遇到难复现的问题或上下文快爆了**

进入调试流：

```bash
$gsd-debug "问题描述"
```

之后即使清上下文，也可以用：

```bash
$gsd-debug
```

继续之前的调查，而不是重新讲一遍问题。

**情况：你觉得计划质量一般，想先做同行评审**

在执行前插入：

```bash
$gsd-review --phase N --all
$gsd-plan-phase N --reviews
```

先把外部评审意见吃进计划，再执行。

**情况：验收发现 gaps**

不要把 “功能已经写了” 和 “阶段已完成” 混为一谈。正确做法是：

1. 看 `VERIFICATION.md` 或 `$gsd-verify-work N` 给出的缺口
2. 决定缺口是修补当前阶段，还是新开后续阶段
3. 如果缺口仍属于当前目标，就回到 `$gsd-execute-phase N`
4. 如果缺口已经形成新的明确交付，则把它放进后续阶段

## 模式三：处理中小型插单、修复和临时工作

适用场景：

- 一个任务值得被追踪，但不值得进入里程碑主线
- 你要处理文档整理、脚本修改、局部 bug、临时补丁
- 你已经在做阶段工作，但突然发现一件独立小事

### 先判断该用哪一种

**极小任务：**

```bash
$gsd-fast "fix the typo in README"
```

适用于非常小、可内联完成的变更。

**标准小任务：**

```bash
$gsd-quick
$gsd-quick --validate
$gsd-quick --full
```

当任务需要计划、总结、验证，但又不该进入 `ROADMAP.md` 时，用 quick。

**尚未决定要不要做：**

```bash
$gsd-add-todo "任务描述"
$gsd-check-todos
```

### 一条实用判断线

- 3 个文件以内、没有明显风险：优先 `$gsd-fast`
- 需要文档化过程、可能要验证：优先 `$gsd-quick`
- 还没准备开工，只想收集：优先 todo
- 已经影响主线版本目标：不要 quick，直接进阶段或插阶段

### 常见意外与处置

**情况：quick task 越做越大**

这是最常见的错误。出现下面任一迹象就要停止继续堆 quick：

- 需要拆多个 wave
- 需要跨多个子系统协同
- 需要改变里程碑目标或优先级
- 开始出现“做完这一项之后项目会进入新状态”

这时应该把 quick task 升格为阶段，或者用：

```bash
$gsd-insert-phase 现有阶段号 "紧急事项描述"
```

把它纳入路线图，而不是继续把主线工作藏在 `.planning/quick/`。

**情况：只是临时想到，不确定现在做不做**

不要直接开 quick。先记成 todo：

```bash
$gsd-add-todo "想法描述"
```

之后用 `$gsd-check-todos` 再决定是立刻做、塞进阶段，还是继续搁置。

**情况：突然有必须插队的线上问题**

如果它会改变当前里程碑顺序，用：

```bash
$gsd-insert-phase 现有阶段号 "Critical fix"
```

如果它只是独立的小修复，不改变里程碑主线，用 quick。

## 模式四：里程碑收尾、验收、封版、归档

适用场景：

- 你认为这一轮主要目标已经完成
- 你想确认有没有遗留验证债务
- 你准备发布版本或切入下一轮工作

### 推荐收尾顺序

```bash
$gsd-audit-uat
$gsd-audit-milestone
$gsd-plan-milestone-gaps
```

如果审计后没有明显缺口，继续：

```bash
$gsd-complete-milestone 1.0.0
$gsd-new-milestone "Next milestone name"
```

里程碑完成后，若 `.planning/phases/` 仍堆着旧阶段目录，再做：

```bash
$gsd-cleanup
```

### 这个流程真正做的事

- 先审计：确认“看起来做完”和“验收上做完”是一回事
- 再补缺：如果审计发现空洞，先生成补缺阶段
- 再封版：把本轮工作写入里程碑记录
- 最后清理：把旧阶段目录移出当前工作区，降低噪音

### 常见意外与处置

**情况：里程碑功能做完了，但还有很多 UAT 没补**

不要直接 `$gsd-complete-milestone`。先跑：

```bash
$gsd-audit-uat
```

把待人工验证项清干净，至少要知道哪些风险是显式接受的。

**情况：里程碑已完成，但 `.planning/phases/` 还是很乱**

这是正常的。`$gsd-complete-milestone` 负责标记和归档里程碑信息，不一定会把所有阶段目录都挪走。要减少当前目录噪音，再执行：

```bash
$gsd-cleanup
```

**情况：审计发现缺口，但你又不想把当前版本回滚成“未完成”**

不要硬改历史。更合理的做法是：

1. 用 `$gsd-audit-milestone` 形成缺口清单
2. 用 `$gsd-plan-milestone-gaps` 生成补缺阶段
3. 把这些阶段视为收尾或后补工作

这样既保留里程碑真实经过，也不会把遗漏藏掉。
