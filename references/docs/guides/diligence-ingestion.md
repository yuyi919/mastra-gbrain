# 尽职调查摄取：从数据室到大脑页面
## 目标
将商业计划书、财务模型和数据室材料转化为可搜索、交叉引用的带有看涨/看跌分析的大脑页面。
## 用户得到什么
如果没有这个：商业计划书只能躺在电子邮件附件中。财务模型在 Google Drive 里。没有到公司大脑页面的交叉引用。你无法搜索 "Acme Corp 的 A 轮融资计划书中的关键指标是什么？"
有了这个：每个数据室文件都被提取、记录、交叉引用到公司页面，并且可搜索。 Index.md 让你一目了然地看到看涨/看跌理由。 `gbrain query "Acme Corp revenue growth"` 能找到确切的图表。
## 实现
通过包含 "Data Deck"、"Intro Deck"、"Data Room"、"Cap Table"、"Financial Model"、"Investor Memo"、"Pitch Deck" 或轮次名称的 PDF 文件名来识别数据室材料。包含收入（Revenue）、留存率（Retention）、同期群（Cohorts）、获客成本（CAC）、毛利率（Gross Margin）、单位经济效益（Unit Economics）、年度经常性收入（ARR）的电子表格标签页。用户使用诸​​如 "数据室"、"尽职调查"、"计划书"、"演示文稿"、"融资材料" 等语言。
### 9步流水线
**第 1 步：识别公司。 **
从文档内容或文件名中识别公司名称。
检查 `brain/companies/{slug}.md` 是否存在。
**第 2 步：创建尽职调查目录。 **
```bash
mkdir -p brain/diligence/{company-slug}/.raw
```

**第 3 步：提取内容。 **
- **PDF:** 使用 PDF 提取工具。对于扫描的/图像为主的 PDF，使用 OCR（例如，Mistral OCR 或类似工具）。
- **电子表格:** 将每个工作表导出为 CSV。对于 Google Sheets：  ```
  https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={Sheet Name}
  ```

**第 4 步：记录并保存。 **
将提取的内容写入 `brain/diligence/{company}/{doc-name}.md`：
- 文档标题和类型
- 带有关键指标的逐节分解
- 值得注意的脚注或警告
- 相关的原始数据表
**第 5 步：保存原始文件。 **
将原始 PDF/文件复制到 `brain/diligence/{company}/.raw/`
保留原件以供参考。记录的版本用于搜索。
**第 6 步：创建或更新 index.md。 **
每个尽职调查目录都需要一个 `index.md`：
```markdown
# {公司名称} — 尽职调查

## 轮次详情
- 阶段：Series A
- 金额：$10M
- 日期：2026-04

## 文档清单
- [Pitch Deck](pitch-deck.md) — 25 页幻灯片，公司概况 + 牵引力
- [Financial Model](financial-model.md) — 5 个标签页，3 年预测
- [Cap Table](cap-table.md) — 当前所有权 + 期权池

## 关键发现
- 过去 6 个月收入环比增长 30%
- CAC 投资回收期：4 个月
- 净留存率：135%

## 看涨理由 (Bull Case)
- 强烈的产品市场契合度信号（NPS 72）
- 扩展到相邻垂直领域

## 看跌理由 (Bear Case)
- 单个客户占收入的 40%
- 上个季度烧钱率增加了 3 倍

## 未决问题
- 盈利的路径是什么？
- 护城河有多坚固？
```

**第 7 步：丰富公司大脑页面。 **
更新 `brain/companies/{slug}.md`：
- 将文档来源添加到前言（frontmatter）中
- 用关键发现更新编译的真相
- 添加指向尽职调查目录的 "另见 (See Also)" 链接
- 如果没有公司页面，通过丰富 (enrich) 技能创建一个
**第 8 步：提交。 **
```bash
cd brain/ && git add -A && git commit -m "diligence: {Company} — {doc type} ingestion" && git push
```

**第 9 步：发布（如果需要）。 **
当用户想要一份可共享的简报时，创建一个受密码保护的发布版本。剥离内部注释和原始评估语言。
### 质量标准
一个好的尽职调查页面读起来就像一份情报评估：
- **他们说的** vs **数据显示的**（差距即是洞见）
- 明确的看涨/看跌理由（不仅仅是总结）
- 突出关键指标，而不是被埋没
- 决策前需要解答的未决问题
## 棘手的地方
1. **PDF 提取是有损的。 ** 扫描的演示文稿和图像为主的 PDF 在提取过程中会丢失表格和图表。始终将记录的输出与原始的 `.raw/` 文件进行核对。如果关键指标丢失，使用 OCR 重新提取或手动转录。
2. **重新提取时的幂等性。 ** 如果用户发送了同一家公司的更新版本演示文稿，不要创建重复的目录。检查现有的 `brain/diligence/{company-slug}/` 并就地更新。如果应保留旧版本，则在文档文件中附加版本后缀。
3. **index.md 的完整性。 ** index.md 是整个尽职调查包的入口点。如果它缺少看涨/看跌理由或未决问题，尽职调查就是不完整的。即使有些部分需要判断，也要始终生成所有部分——明确标记不确定的评估。
## 如何验证
1. **搜索关键指标。 ** 摄取后，运行 `gbrain search "revenue growth"` 或 `gbrain search "{company name} CAC"`。记录的内容应出现在结果中。如果没有，说明错过了同步或嵌入步骤。
2. **检查公司页面交叉引用。 ** 打开 `brain/companies/{slug}.md` 并验证它是否链接到尽职调查目录。编译的真相部分应包含来自演示文稿的关键发现。
3. **验证 index.md 具有所有部分。 ** 打开 `brain/diligence/{company}/index.md` 并确认它具有轮次详情、文档清单、关键发现、看涨理由、看跌理由和未决问题。缺少部分意味着流水线提前停止。
---

*属于 [GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。 *