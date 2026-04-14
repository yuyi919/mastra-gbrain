# Tasks
- [x] Task 1: 拉取原始 gbrain 仓库：将 `garrytan/gbrain` 仓库克隆到 `/tmp/gbrain` 目录以供分析（如果本地尚未存在）。
- [x] Task 2: 委托 Search Agent 分析代码逻辑：调用 `search` agent 对 `/tmp/gbrain` 和本地 `src/` 目录中的核心功能（如 `searchKeyword` 去重逻辑、`check-backlinks`、`doctor`、导入逻辑等）进行深度比对。
- [x] Task 3: 识别并记录差异：生成一份对齐分析报告，详细说明哪些功能目前仅在特定测试用例下通过，但遗漏了上游的真实边缘用例。
- [x] Task 4: 修复仅通过测试的表面实现：重构本地代码，使其完全涵盖并对齐原始仓库的完整逻辑。

# Task Dependencies
- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 2
- Task 4 依赖于 Task 3