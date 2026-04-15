# 执行记录（Bun + node-llama-cpp）

## Bun 安装与 postinstall（bun pm trust）
- Bun 默认会跳过未信任依赖的生命周期脚本（含 postinstall）。
- 本项目已在 package.json 中配置 trustedDependencies: ["node-llama-cpp"]，用于允许 node-llama-cpp 的 postinstall 在 bun install 时正常执行。
- 若在干净环境发现 node-llama-cpp 的 postinstall 被跳过，可执行 `bun pm trust node-llama-cpp` 后重新安装依赖。

## 模型下载（统一用 node-llama-cpp pull）
- 推荐下载到仓库外或仓库内的临时目录（例如 ./tmp/models），并保持不纳入版本控制。
- 下载命令：
  - `node-llama-cpp pull --dir ./tmp/models <model-uri-or-url>`
  - 支持一次传多个 URI/URL；对 split/binary-split 模型只需传第一段文件即可自动补齐。
- HuggingFace URI 示例（推荐使用带 quant 的形式）：
  - `hf:<user>/<model>:Q4_K_M`

## 已知 warning（tokenizer config）与规避建议
- 部分 embedding/reranker GGUF 在加载时可能出现与 tokenizer 配置相关的 warning，例如：
  - `special_eos_id is not in special_eog_ids - the tokenizer config may be incorrect`
  - `Using this model ... to tokenize text and then detokenize it resulted in a different text ...`
- 建议：
  - 优先选用经过验证的 GGUF 转换（同一模型不同转换源可能差异很大），并对“检索是否命中预期”做最小自测再纳入评估结论。
  - 遇到可疑结果时，升级 node-llama-cpp 并更换同模型的其他 GGUF 转换版本（含不同 quant），避免把 tokenizer 不一致带来的问题误判为检索质量问题。

