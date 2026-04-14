# 实时同步：保持索引最新 (Live Sync: Keep the Index Current)

## 目标

大脑仓库中的每一个 markdown 更改都会在几分钟内自动变得可搜索，无需任何手动干预。

## 用户得到什么

如果没有这个：你纠正了大脑页面中的一个幻觉，但向量数据库继续提供旧文本，因为没有人运行 `gbrain sync`。过时的搜索结果会削弱信任。大脑变得不可靠。

有了这个：编辑会在几分钟内出现在搜索结果中。向量数据库自动与大脑仓库保持同步。你永远不需要记住去运行同步。

## 实现

### 前提条件：Session 模式池化器 (Session Mode Pooler)

同步在每次导入时使用 `engine.transaction()`。如果 `DATABASE_URL` 指向 Supabase 的 **Transaction 模式** 池化器，同步将抛出 `.begin() is not a function` 并**静默跳过大多数页面**。这是导致“运行了同步但什么也没发生”的头号原因。

修复方法：使用 **Session 模式** 池化器连接字符串（端口 6543，Session 模式）或直接连接（端口 5432，仅 IPv6）。通过运行 `gbrain sync` 并检查 `gbrain stats` 中的页面数是否与仓库中可同步的文件数匹配来进行验证。

### 原语

始终将同步 (sync) + 嵌入 (embed) 链接起来：

```bash
gbrain sync --repo /path/to/brain && gbrain embed --stale
```

- `gbrain sync --repo <path>` —— 单次增量同步。通过 `git diff` 检测更改，仅导入已更改的内容。对于小变更集（<= 100 个文件），嵌入会在导入期间内联生成。
- `gbrain embed --stale` —— 为任何没有嵌入的块回填嵌入。这是对大变更集（>100 个文件）或先前运行过 `--no-embed` 的安全保障。
- `gbrain sync --watch --repo <path>` —— 前台轮询循环，每 60 秒一次（可通过 `--interval N` 配置）。对于小变更集内联嵌入。在连续 5 次失败后退出，因此请在进程管理器下运行或与 cron 后备配对使用。

### 方法 1：Cron 任务（推荐）

每 5-30 分钟运行一次。适用于任何 cron 调度程序。

```bash
gbrain sync --repo /data/brain && gbrain embed --stale
```

**OpenClaw:**
```
Name: gbrain-auto-sync
Schedule: */15 * * * *
Prompt: "运行: gbrain sync --repo /data/brain && gbrain embed --stale
  记录结果。如果同步因 .begin() is not a function 而失败，
  说明 DATABASE_URL 正在使用 Transaction 模式池化器。"
```

**Hermes:**
```
/cron add "*/15 * * * *" "Run gbrain sync --repo /data/brain &&
  gbrain embed --stale. Log the result." --name "gbrain-auto-sync"
```

### 方法 2：长时间运行的观察者 (Long-Lived Watcher)

用于近乎即时的同步（60 秒轮询）。在退出时自动重启的进程管理器下运行。与 cron 后备配对使用，因为 `--watch` 在反复失败时会退出。

```bash
gbrain sync --watch --repo /data/brain
```

### 方法 3：Git 钩子 / Webhook

在推送事件上触发同步，实现即时同步（<5 秒）。

- **GitHub webhook:** 设置 webhook 以调用
  `gbrain sync --repo /data/brain && gbrain embed --stale`。
  对照共享密钥验证 `X-Hub-Signature-256`。
- **Git post-receive 钩子:** 如果大脑仓库在同一台机器上。

### 什么会被同步

同步仅索引“可同步的” markdown 文件。根据设计，排除以下内容：
- 隐藏路径（`.git/`、`.raw/` 等）
- `ops/` 目录
- 元文件：`README.md`、`index.md`、`schema.md`、`log.md`

### 同步是幂等的

并发运行是安全的。在同一提交上的两次同步是不操作 (no-op) 的，因为内容哈希匹配。如果 cron 和 `--watch` 同时触发，也不会发生冲突。

## 棘手的地方

1. **始终将同步 + 嵌入链接起来。** 在没有 `gbrain embed --stale` 的情况下运行 `gbrain sync` 会留下没有嵌入的新块。它们存在于数据库中，但对向量搜索是不可见的。始终一起运行这两个命令。`&&` 确保仅在同步成功时才运行嵌入。
2. **--watch 是轮询，而不是流式传输。** `--watch` 标志每 60 秒（可配置）轮询一次。它不是文件系统观察者或 git 钩子。它在连续 5 次失败后退出，因此它需要一个进程管理器（systemd、pm2）或一个 cron 后备来保持活动状态。不要假设它会永远运行。
3. **Webhook 需要服务器运行。** 如果你使用 GitHub webhook 进行即时同步，接收服务器必须正在运行且可达。如果在推送发生时服务器已关闭，则会错过该次同步。将 webhooks 与捕获 webhook 遗漏的任何内容的 cron 后备配对使用。

## 如何验证

1. **编辑文件并搜索更改。** 编辑一个大脑 markdown 文件，提交并推送。等待下一个同步周期（cron 间隔或 `--watch` 轮询）。运行 `gbrain search "<来自编辑的文本>"`。更新后的内容应出现在结果中。如果返回旧内容，则同步失败。
2. **比较页面数与文件数。** 运行 `gbrain stats` 并计算大脑仓库中可同步的 markdown 文件数。数据库中的页面数应与之匹配。如果它们出现分歧，则说明文件正被静默跳过（可能是 Transaction 模式池化器问题）。
3. **检查嵌入的块数。** 在 `gbrain stats` 中，嵌入的块数应接近总块数。巨大的差距意味着 `gbrain embed --stale` 在同步后没有运行，使块对向量搜索不可见。

---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*