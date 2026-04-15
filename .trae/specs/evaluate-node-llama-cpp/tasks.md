# Tasks
- [ ] Task 1: 可行性调研（安装与运行）
  - [ ] 在 Bun + Linux 环境验证 `node-llama-cpp` 的安装路径：预编译二进制是否命中；若回退编译，明确所需工具链（cmake、编译器等）
  - [ ] 记录运行时能力：CPU embedding 性能、并发策略、常见告警与规避方式
  - [ ] 明确模型格式与来源：GGUF、量化建议（Q4_K_M 优先）与体积/内存要求
  - [ ] 明确模型下载方式：统一使用 `node-llama-cpp pull --dir ./tmp/models <url>`，不在代码中实现下载器

- [ ] Task 2: 最小集成方案设计（仅 Embedding）
  - [ ] 评估以 `EmbeddingProvider` 方式接入：输入文本批量 embedding、维度（预期 768）、性能与内存上限
  - [x] 设计语言路由策略：测试场景根据输入语言选择 `bge-base-en-v1.5-gguf` 或 `bge-base-zh-v1.5-gguf`
  - [x] 定义配置开关：启用本地 embedder、模型路径（EN/ZH）、并发与批处理大小

- [ ] Task 3: POC 与对齐验证（最小可运行）
  - [x] 实现一个最小可用的本地 EmbeddingProvider（node-llama-cpp）
  - [ ] 增加测试：英文与中文分别 ingest，使用对应语言 query embedding，验证 hybridSearch 命中
  - [ ] 明确并记录维度兼容策略（**BREAKING** 风险：从 1536 切到 768 需要重建向量索引；测试用独立 store 维度）

- [ ] Task 4: Reranker 探索（可选）
  - [ ] 调研 `node-llama-cpp` ranking context 的 API 与可用 GGUF reranker 模型
  - [x] 设计最小接口：`rerank(query, candidates[]) -> ranked[]`
  - [x] 增加一个轻量测试或脚本验证 rerank 能运行（不要求默认启用）

- [ ] Task 5: 决策与落地建议
  - [ ] 输出结论：是否引入；若引入，选择“可选依赖”还是“默认依赖”
  - [ ] 列出已知风险与边界：模型体积、冷启动时间、跨平台差异、许可证/模型分发合规、Bun install 的 postinstall 信任策略

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 1, Task 2
- Task 5 depends on Task 1, Task 2, Task 3, Task 4
