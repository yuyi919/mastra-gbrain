# 个人 AI 基础设施的自制程序

GBrain 集成系统的 10 星愿景。发布方法 B (v0.7.0)，并以此作为后续版本的目标。

## 愿景

GBrain 将成为个人基础设施的操作系统，你生活中的每一个信号都会自动流经你的大脑。集成分为**感官 (Senses)**（数据输入）和**反射 (Reflexes)**（对模式的自动响应）。用户订阅创造者的实际操作系统，然后对其进行自定义。

```
$ gbrain integrations

  SENSES (数据输入)                             STATUS (状态)
  -------------------------------------------------------
  voice-to-brain    电话 -> 大脑页面            ACTIVE    上次通话: 2小时前
  email-to-brain    Gmail -> 实体更新           ACTIVE    今天 47 封邮件
  x-to-brain        Twitter -> 媒体页面         ACTIVE    追踪了 312 条推文
  calendar-to-brain Google 日历 -> 会议准备     ACTIVE    明天 3 场会议
  photos-to-brain   相机相册 -> 视觉记忆        AVAILABLE (可用)
  slack-to-brain    Slack -> 对话索引           AVAILABLE (可用)
  rss-to-brain      RSS 订阅 -> 媒体页面        AVAILABLE (可用)

  REFLEXES (自动响应)                           STATUS (状态)
  -------------------------------------------------------
  meeting-prep      在会议前向我做简报          ACTIVE    下次: 明天上午 9 点
  entity-enrich     自动丰富新联系人            ACTIVE    今天丰富了 12 个
  dream-cycle       夜间大脑维护                ACTIVE    上次运行: 凌晨 3 点
  deal-tracker      交易状态变更警报            AVAILABLE (可用)
  follow-up-nudge   提醒过期的对话线索          AVAILABLE (可用)

  本周：摄取了 1,247 个信号。主要来源：电子邮件 (47%)，语音 (23%)，X (18%)。
  创建了 34 个新的实体页面。转录了 7 次通话。

  运行 'gbrain integrations show <id>' 获取设置详细信息。
```

用户感觉：“我的大脑是活的。它正在监视我关心的一切，而且每天都变得越来越聪明。我不需要写任何代码。当代理询问时，我只需说‘是’。”

## 架构：感官与反射

### 诀窍格式 (YAML 前言 + markdown 正文)

```yaml
---
id: voice-to-brain
name: Voice-to-Brain
version: 0.7.0
description: Phone calls create brain pages via Twilio + OpenAI Realtime + GBrain MCP
category: sense
requires: [credential-gateway]
secrets:
  - name: TWILIO_ACCOUNT_SID
    description: Twilio account SID
    where: https://console.twilio.com
  - name: OPENAI_API_KEY
    description: OpenAI API key (for Realtime voice)
    where: https://platform.openai.com/api-keys
health_checks:
  - curl -s https://api.twilio.com/2010-04-01 > /dev/null
  - curl -s https://api.openai.com/v1/models > /dev/null
setup_time: 30 min
---

[代理执行的带有主观观点的设置说明...]
```

### 依赖图谱

诀窍在前言中声明 `requires`。CLI 在设置前解析依赖关系。如果 voice-to-brain 需要 credential-gateway，代理会先设置 credential-gateway。

```
credential-gateway
  ├── voice-to-brain (需要 Twilio 的凭证)
  ├── email-to-brain (需要 Gmail 的凭证)
  └── calendar-to-brain (需要 Google 日历的凭证)

x-to-brain (独立的，直接使用 X API)
```

### 健康仪表板

`gbrain integrations doctor` 运行每个配置诀窍的 `health_checks`：

```
$ gbrain integrations doctor
  voice-to-brain:   ✓ Twilio 可达  ✓ OpenAI 密钥有效  ✓ ngrok 隧道开启
  email-to-brain:   ✓ Gmail 认证有效   ✗ 48 小时内没有邮件 (检查 cron)
  OVERALL: 1 个警告
```

### 感知分析

`gbrain integrations stats` 聚合心跳数据：

```
$ gbrain integrations stats
  本周：摄取了 1,247 个信号
  主要来源：电子邮件 (47%)，语音 (23%)，X (18%)，日历 (12%)
  创建了 34 个新的实体页面
  转录了 7 次通话
  大脑增长：12,400 → 12,834 页面 (+434)
```

### 反射规则引擎（未来）

反射是触发大脑状态变更的诀窍：

```yaml
---
id: deal-tracker
category: reflex
triggers:
  - type: page_updated
    filter: {type: deal, field: status}
  - type: timeline_entry
    filter: {source: email, mentions: deal}
action: alert
---

当交易页面的状态改变，或者一封新邮件提到该交易时，
用大脑中的上下文向用户发出警报。
```

## 路线图

| 版本 | 交付内容 | 关键诀窍 |
|--------|------------|------------|
| v0.7.0 | 诀窍格式, CLI, SKILLPACK 拆分 | voice-to-brain (语音到大脑) |
| v0.8.0 | 另外 3 种感官, 反射格式 | email, x, calendar (电子邮件, X, 日历) |
| v0.9.0 | 社区诀窍, 设置执行器 | 社区提交 |
| v1.0.0 | 全面的感官/反射, 健康仪表板 | meeting-prep, dream-cycle (会议准备, 做梦周期) |

## 关键设计决策

1. **GBrain 是确定性基础设施。** 跨感官关联、模式检测和智能响应是代理（OpenClaw/Hermes）的工作。GBrain 提供管道连接。
2. **代理是运行时。** 没有 npm 包、Docker 镜像或确定性脚本。诀窍的 markdown 就是安装程序。代理阅读它并执行工作。
3. **极具主观观点的默认设置。** 默认情况下，将创作者确切的生产环境设置提供给用户。用户从那里进行定制。未知呼叫者会被筛选。强制执行安静时间。每次通话时都会进行大脑优先查找。
4. **代理可读的输出。** 所有 CLI 输出必须能被代理解析（`--json` 标志）。迁移文件包括代理说明。代理是一级消费者，而不是人类。