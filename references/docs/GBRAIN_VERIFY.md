# GBrain 安装验证运行手册

安装后运行这些检查，以确认 GBrain 的每个部分都在正常工作。
每次检查都包含命令、预期输出以及失败时的处理方法。

最重要的检查是 #4（实时同步）。“同步已运行”与“同步已生效”并不相同。如果同步由于池化器错误而默默地跳过页面，这比根本没有同步还要糟糕，因为你会认为它正在工作。

---

## 1. 架构验证

**命令：**

```bash
gbrain doctor --json
```

**预期：** 所有检查返回 `"ok"`：
- `connection`：已连接，N 个页面
- `pgvector`：扩展已安装
- `rls`：在所有表上启用
- `schema_version`：最新
- `embeddings`：覆盖率百分比

**如果失败：** doctor 输出包含每个检查的特定修复说明。请参阅 `skills/setup/SKILL.md` 错误恢复表。

---

## 2. 技能包已加载

**检查：** 问代理：“什么是 brain-agent 循环？”

**预期：** 代理引用 GBRAIN_SKILLPACK.md 第 2 节并描述读写周期：检测实体、读取大脑、回复上下文、写入大脑、同步。

**如果失败：** 代理尚未加载技能包。运行安装粘贴文本中的第 6 步（阅读 `docs/GBRAIN_SKILLPACK.md`）。

---

## 3. 自动更新已配置

**命令：**

```bash
gbrain check-update --json
```

**预期：** 返回包含 `current_version`、`latest_version`、`update_available`（布尔值）的 JSON。cron 任务 `gbrain-update-check` 已注册。

**如果失败：** 运行安装粘贴文本中的第 7 步。请参阅 GBRAIN_SKILLPACK.md 第 17 节。

---

## 4. 实时同步真正有效

这是最重要的检查。分三部分。

### 4a. 覆盖率检查

将数据库中的页面数与仓库中可同步的文件数进行比较：

```bash
gbrain stats
```

然后计算可同步文件数：

```bash
find /data/brain -name '*.md' \
  -not -path '*/.*' \
  -not -path '*/.raw/*' \
  -not -path '*/ops/*' \
  -not -name 'README.md' \
  -not -name 'index.md' \
  -not -name 'schema.md' \
  -not -name 'log.md' \
  | wc -l
```

**预期：** `gbrain stats` 中的页面数应该接近文件数。存在一些差异是正常的（自上次同步以来添加的文件），但如果页面数不到文件数的一半，则说明同步正在默默地跳过页面。

**如果页面数太低：** 头号原因是连接池化器错误。检查你的 `DATABASE_URL`：
- 如果它包含 `pooler.supabase.com:6543`，请验证它使用的是**Session 模式（会话模式）**，而不是 Transaction 模式（事务模式）。
- Transaction 模式会破坏 `engine.transaction()` 并导致 `.begin() is not a function` 错误。
- 修复方法：切换到 Session 模式池化器连接字符串，然后运行 `gbrain sync --full` 以重新导入所有内容。

### 4b. 嵌入检查

```bash
gbrain stats
```

**预期：** 已嵌入的块数量应该接近总块数。

**如果已嵌入数量远低于总数：**

```bash
gbrain embed --stale
```

如果没有设置 `OPENAI_API_KEY`，就无法生成嵌入。关键字搜索在没有嵌入的情况下仍然有效，但混合/语义搜索将无法工作。

### 4c. 端到端测试

这是真正的测试。编辑大脑页面，推送，等待，搜索。

1. 在大脑仓库中编辑一个页面（例如，纠正某人页面上的一个事实）：

```bash
# 示例：修复 Gustaf 页面中的一行
cd /data/brain
# 对任何 .md 文件进行少量修改
git add -A && git commit -m "test: verify live sync" && git push
```

2. 等待下一个同步周期（cron 间隔或 `--watch` 轮询）。

3. 搜索已纠正的文本：

```bash
gbrain search "<来自更正的文本>"
```

**预期：** 搜索返回**已纠正**的文本，而不是旧版本。

**如果返回旧文本：** 同步默默地失败了。检查：
- 同步 cron 任务是否已注册并在运行？
- `gbrain sync --watch` 是否仍然处于活动状态（如果使用了观察模式）？
- 运行 `gbrain config get sync.last_run` 以查看上次同步运行的时间。
- 手动运行 `gbrain sync --repo /data/brain` 并检查错误。
- 如果你看到 `.begin() is not a function`，请修复池化器（请参阅上面的 4a）。

---

## 5. 嵌入覆盖率

**命令：**

```bash
gbrain stats
```

**预期：** 已嵌入的块数量与总块数匹配（或接近）。

**如果为零或极低：** 可能是 `OPENAI_API_KEY` 丢失或无效。检查：

```bash
echo $OPENAI_API_KEY | head -c 10
```

如果为空，请设置密钥。然后：

```bash
gbrain embed --stale
```

---

## 6. 大脑优先查找协议

**检查：** 向代理询问一个存在于大脑中的人物或概念。

**预期：** 代理**首先（FIRST）**使用 `gbrain search` 或 `gbrain query`，而不是 grep 或外部 API。响应包含来源于大脑的上下文，并带有来源归属。

**如果失败：** 大脑优先查找协议没有注入到代理的系统上下文中。请参阅 `skills/setup/SKILL.md` 的 Phase D。

---

## 快速验证（一次性完成所有检查）

```bash
# 1. 架构
gbrain doctor --json

# 2. 同步近况
gbrain config get sync.last_run

# 3. 页面数 + 嵌入覆盖率
gbrain stats

# 4. 搜索有效
gbrain search "来自你的大脑内容的测试查询"

# 5. 捕捉任何未嵌入的块
gbrain embed --stale

# 6. 自动更新
gbrain check-update --json
```

如果所有六项都成功返回，则安装健康。对于完整的端到端同步测试 (4c)，推送一个真实的更改并验证它是否出现在搜索中。