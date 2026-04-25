# Quick Task 260425-q01: GSD 中文使用文档整理 - Research

**Researched:** 2026-04-25
**Mode:** quick-full
**Confidence:** HIGH

## Summary

`$gsd-help` 的原始内容本质上是完整命令参考，而不是面向项目成员的操作手册。它覆盖面很全，但信息组织方式是“命令分组”，不适合回答两个常见问题：

1. 现在我应该走哪条完整流程
2. 里程碑完成后，当前这些 planning 文档会发生什么

因此，本次中文文档应该从“命令目录”重组为“工作模式指南”。

## 推荐的信息架构

### 1. 总览页

作用：

- 先解释项目、里程碑、阶段、quick task、文档产物之间的关系
- 告诉读者应该从哪个流程读起

### 2. 常用流程页

应覆盖 4 条主线：

- 新项目 / 新里程碑启动
- 里程碑内标准推进
- 快速任务 / 临时插单
- 里程碑收尾与归档

### 3. 异常处置页

应覆盖下列高频异常：

- 不知道该用哪个命令
- 会话中断
- 计划理解偏差
- quick task 膨胀
- 验证没过
- 想做发布但不想把 planning 带进 PR

### 4. 文档生命周期页

必须明确回答：

- 哪些文档是常驻的
- 哪些文档属于当前活跃工作
- 哪些文档在里程碑完成后会进入 `.planning/milestones/`
- `$gsd-complete-milestone` 与 `$gsd-cleanup` 的职责区别

## Key Findings from `$gsd-help`

### 里程碑相关的关键命令

- `$gsd-new-project`
- `$gsd-new-milestone`
- `$gsd-complete-milestone`
- `$gsd-audit-milestone`
- `$gsd-plan-milestone-gaps`
- `$gsd-cleanup`

这些命令共同定义了“里程碑从启动到归档”的闭环。

### 阶段推进的关键命令

- `$gsd-plan-phase`
- `$gsd-execute-phase`
- `$gsd-verify-work`
- `$gsd-progress`
- `$gsd-discuss-phase`
- `$gsd-research-phase`
- `$gsd-list-phase-assumptions`

这些命令适合被组织为“阶段循环”而非分散说明。

### 临时工作的关键命令

- `$gsd-fast`
- `$gsd-quick`
- `$gsd-add-todo`
- `$gsd-check-todos`
- `$gsd-insert-phase`

这些命令最好用一条“如何处理插单”的判断流程串起来。

## Documentation Requirements

- 必须给出可直接复制的命令序列。
- 必须解释什么时候不该继续使用某个流程，例如 quick task 何时应该升级为阶段。
- 必须说明里程碑完成后文档不会自动消失，而是进入不同生命周期。

## RESEARCH COMPLETE
