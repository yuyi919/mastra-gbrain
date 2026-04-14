# 搜索模式
## 目标
知道使用哪个搜索命令以及何时使用 - 关键字、混合或直接 - 因此每次查找都可以快速并返回正确的结果。
## 用户得到什么
如果没有这个：代理会在搜索命令之间摸索，在需要整页时返回块，在直接获取时运行昂贵的语义搜索，或者完全错过结果。这样：每次查找都使用最佳模式，尊重代币预算，并且用户在最少的调用中获得正确的信息。
＃＃ 执行
```
on user_asks_about(topic):
    # Decision tree: pick the right search mode

    if know_exact_slug(topic):
        # MODE 3: Direct get -- instant, no search overhead
        result = gbrain get <slug>
        # e.g., "Tell me about Pedro" -> gbrain get pedro-franceschi
        # Returns the FULL page -- compiled truth + timeline

    elif topic.is_exact_name or topic.is_keyword:
        # MODE 1: Keyword search -- fast, no embeddings needed, day-one ready
        results = gbrain search "{name_or_keyword}"
        # e.g., "Find anything about Series A" -> gbrain search "Series A"
        # Returns CHUNKS, not full pages

        # IMPORTANT: keyword search returns chunks
        # If the chunk confirms relevance, THEN load the full page:
        if chunk.confirms_relevance:
            full_page = gbrain get <slug_from_chunk>

    elif topic.is_semantic_question:
        # MODE 2: Hybrid search -- semantic + keyword, needs embeddings
        results = gbrain query "{natural language question}"
        # e.g., "Who do I know at fintech companies?" -> gbrain query "fintech contacts"
        # Returns ranked chunks via vector + keyword + RRF

        # Same rule: chunks first, then get full page if needed
        if chunk.confirms_relevance:
            full_page = gbrain get <slug_from_chunk>

# Quick reference:
# | Mode    | Command              | Needs Embeddings | Speed   | Best For                        |
# |---------|----------------------|------------------|---------|---------------------------------|
# | Keyword | gbrain search "term" | No               | Fastest | Known names, exact matches      |
# | Hybrid  | gbrain query "..."   | Yes              | Fast    | Semantic questions, fuzzy match  |
# | Direct  | gbrain get <slug>    | No               | Instant | When you know the slug          |

# Progression over time:
#   Day 1:  keyword search (works without embeddings)
#   After first embed: hybrid search unlocked
#   Once you know slugs: direct get for speed

# Precedence for conflicting information within a page:
#   1. User's direct statements (always wins)
#   2. Compiled truth sections (synthesized from evidence)
#   3. Timeline entries (raw signal, reverse chronological)
#   4. External sources (web search, APIs)
```

## 棘手的地方
1. **搜索返回块，而不是整页。** 在“gbrain search”或“gbrain query”之后，您会得到摘录。当块确认相关性时，始终运行“gbrain get <slug>”来加载整个页面。当完整的上下文很重要时，不要只回答大块的问题。
2. **关键字搜索无需嵌入即可工作。** 在任何嵌入运行之前的第一天，“gbrain search”仍然有效。不要告诉用户“搜索尚不可用”——关键字搜索始终可用。
3. **不要对已知名称使用混合搜索。** `gbrain 查询“Pedro Franceschi”`会浪费嵌入计算。使用“gbrain 搜索“Pedro Franceschi””或者更好的是“gbrain get pedro-franceschi”（如果您知道该弹头）。
4. **代币预算意识。** 通过“gbrain get”的完整页面可能很大。在拉出整个页面之前，首先阅读搜索块以确认相关性。 “有人提到A轮融资了吗？” -- 搜索结果（块）可能就足够了。 “告诉我关于佩德罗的一切”——获取整页。
5. **混合搜索需要嵌入才能运行。** 如果“gbrain query”不返回任何内容，但“gbrain search”找到结果，则嵌入尚未生成。首先运行嵌入管道。
## 如何验证
1. 运行 `gbrain search "Pedro"` -- 确认它返回具有匹配文本和 slug 引用的块。
2. 运行“gbrain 查询“谁在金融科技公司工作””——确认它返回语义相关的结果（不仅仅是“金融科技”上的关键字匹配）。
3. 运行“gbrain get pedro-franceschi”——确认它返回包含已编译真相和时间线的完整页面。
4. 比较：使用所有三种模式搜索相同的实体。关键字应该是最快的，混合应该表面概念匹配，直接应该返回完整的页面。
5. 搜索返回块后，对该块中的 slug 运行“gbrain get”。确认整个页面包含比单独的块更多的上下文。
---
*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*