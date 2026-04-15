# node-llama-cpp 可行性探索 Spec

## Why
当前检索链路依赖云端 embedding 或 mock embedding，难以在离线、低成本、可复现测试环境中稳定验证向量检索质量。需要评估 `node-llama-cpp`（llama.cpp 的 Node/Bun 绑定）在本项目中作为本地 Embedding（以及可选 reranker）的可行性与集成成本，并明确多语言测试场景下的模型选择策略。

## What Changes
- 调研 `node-llama-cpp` 在本项目技术栈（Bun + ESM + Linux）上的安装与运行可行性（预编译二进制、源码编译依赖、CPU 路径）。
- 以最小变更集成 `EmbeddingProvider`：
  - 在测试场景按语言选择 embedding 模型：`bge-base-en-v1.5-gguf` 或 `bge-base-zh-v1.5-gguf`
  - 通过 `node-llama-cpp` CLI 下载模型（避免在代码中内置 fetch/下载器逻辑）
- 探索可选 reranker（仅探索，不强制落地到默认检索链路）：
  - 使用 `node-llama-cpp` ranking context 对 topK 候选进行 rerank 的可行性、接口形态与性能边界
- 明确模型文件（GGUF）管理策略：本地路径约定、缓存与版本控制边界（不纳入 git）。

## Impact
- Affected specs: EmbeddingProvider、离线/本地检索评估、（可选）reranker 评估。
- Affected code:
  - [interface.ts](file:///workspace/src/store/interface.ts)（EmbeddingProvider 接口的实现与可选能力扩展）
  - [store/index.ts](file:///workspace/src/store/index.ts)（默认 embedder 工厂）
  - `src/store/`（新增：基于 node-llama-cpp 的 embedder 实现，若决定实施）
  - `src/search/`（新增：reranker 适配层，若决定实施）

## ADDED Requirements
### Requirement: Local LLM Feasibility Gate
系统 SHALL 提供一个可重复执行的评估流程，用于判断 `node-llama-cpp` 是否能在项目目标环境中稳定安装与运行，并输出结论与集成建议（聚焦 embedding 与可选 reranker）。

#### Scenario: Success case
- **WHEN** 在干净环境中执行可行性验证（安装、加载 GGUF、embedding、可选 rerank）
- **THEN** 能得到可复现的结果：安装是否成功、是否需要额外编译依赖、CPU 路径是否可用、延迟/吞吐的大致范围、以及集成到现有 `EmbeddingProvider` 的最小变更点

### Requirement: Local Embedding Provider
系统 SHALL 提供一个基于 `node-llama-cpp` 的 `EmbeddingProvider` 实现，用于在测试与评估场景中生成可复现的向量。

#### Scenario: Success case
- **WHEN** 用户提供 EN 与 ZH 的 GGUF 模型路径，并输入英文/中文文本
- **THEN** embedder 能按语言选择模型生成 embedding，且 vector 维度与 store 配置一致

### Requirement: Optional Reranker Exploration
系统 SHOULD 支持通过 `node-llama-cpp` ranking context 对检索得到的 topK 文本进行 rerank 的 POC，以评估质量与性能收益。

## MODIFIED Requirements
### Requirement: EmbeddingProvider Factory
默认 embedder 工厂 SHALL 支持根据配置返回不同实现（现有 DummyEmbeddingProvider / 未来 node-llama-cpp embedder），并保持调用方（tools/workflow/search）无感知。

## REMOVED Requirements
无
