# 内容和媒体摄取
## 目标
YouTube 视频、社交媒体、PDF 和文档通过代理自己的分析和对提到的每个实体的完整交叉引用，成为可搜索的大脑页面。
## 用户得到什么
如果没有这个：媒体链接就像会腐烂的书签——你记得观看过一个视频，但找不到所说的内容、是谁说的，或者为什么它很重要。这样：每一个媒体都是一个永久的大脑页面，代理的分析位于顶部，每个提到的实体都有一个反向链接，并且完整的内容可以永远搜索。
＃＃ 执行
```
on user_shares_media(url_or_file):

    # PATTERN 1: YouTube Video Ingestion
    if media.type == "youtube":
        # Step 1: Get FULL transcript with speaker diarization
        #   WHO said WHAT -- not just a wall of text
        #   Use Diarize.io or equivalent service
        transcript = diarize(video_url)  # speaker-attributed transcript
        # NEVER use YouTube's auto-generated summary or AI summary

        # Step 2: Agent writes OWN analysis (this is the value)
        #   NOT a summary. NOT regurgitation. The agent's TAKE:
        #   - What matters and why (given the user's worldview)
        #   - Key quotes attributed to specific speakers
        #   - Connections to existing brain pages
        #   - Implications and follow-up angles
        analysis = agent_analyze(transcript, user_context)

        # Step 3: Create brain page
        slug = f"media/youtube/{video_slug}"
        gbrain put <slug> --content """
            # {title}
            **Channel:** {channel} | **Date:** {date} | **Link:** {url}

            ## Analysis
            {agent_analysis}

            ## Key Quotes
            - **{Speaker}** ({timestamp}): "{quote}" -- {why_it_matters}

            ---
            ## Full Transcript
            {diarized_transcript}
        """

        # Step 4: Extract and cross-reference entities
        for person in transcript.mentioned_people:
            gbrain add_link <slug> <person_slug>
            gbrain add_link <person_slug> <slug>
            gbrain add_timeline_entry <person_slug> \
                --entry "Discussed in {video_title}: {what_was_said}" \
                --source "YouTube: {url}"

    # PATTERN 2: Social Media Bundles
    elif media.type == "tweet" or media.type == "social":
        # Don't just save a tweet -- reconstruct FULL context
        bundle = {
            "original": fetch_tweet(url),
            "thread": reconstruct_thread(url),        # quoted tweets, replies
            "linked_articles": fetch_linked_urls(),    # fetch and summarize
            "engagement": get_engagement_data(),       # what resonated
        }

        slug = f"media/social/{platform}-{author}-{date}"
        gbrain put <slug> --content """
            # {author}: {topic}
            {agent_analysis_of_full_bundle}

            ## Thread
            {reconstructed_thread}

            ## Linked Articles
            {article_summaries}

            ---
            ## Raw
            {original_tweet_text}
        """

        # Extract entities and cross-reference
        for entity in bundle.mentioned_entities:
            gbrain add_link <slug> <entity_slug>
            gbrain add_link <entity_slug> <slug>

    # PATTERN 3: PDFs and Documents
    elif media.type == "pdf" or media.type == "document":
        # OCR if needed (scanned PDFs)
        content = ocr_if_needed(file) or extract_text(file)

        # For books and long-form:
        slug = f"sources/{document_slug}"
        gbrain put <slug> --content """
            # {title}
            **Author:** {author} | **Date:** {date}

            ## Chapter Summaries
            {per_chapter_summary}

            ## Key Quotes
            - p.{page}: "{quote}" -- {why_it_matters}

            ## Cross-References
            {links_to_brain_pages_for_people_and_concepts}

            ---
            ## Source
            {full_text_or_key_sections}
        """

        for entity in document.mentioned_entities:
            gbrain add_link <slug> <entity_slug>
            gbrain add_link <entity_slug> <slug>

    # Always sync after ingestion
    gbrain sync
```

## 棘手的地方
1. **始终是完整的文字记录，绝不是人工智能摘要。** YouTube 的自动摘要和人工智能生成的摘要失去了质感：谁说了什么、准确的措辞、语气、未说的内容。完整的日记记录是证据基础。代理人的分析高于此。
2. **代理人自己的分析才是价值，而不是反省。** “讨论人工智能安全的视频”毫无价值。 “Dario 对计算扩展提出了一个具体的主张，这与 Ilya 在 NeurIPS 演讲中所说的相矛盾——请参阅 media/youtube/ilya-neurips-2025”是有用的。分析将新媒体与现有大脑连接起来。
3. **社交媒体是一个捆绑包，而不是一条推文。** 没有线索、引用的推文、链接的文章和参与上下文的推文是一个片段。在创建大脑页面之前重建完整的上下文。
4. **交叉引用使媒体页面充满活力。** 没有指向所提到的人和公司的反向链接的 YouTube 页面是一个死档案。每个提到的实体都会获得一个链接和一个时间线条目。
5. **随着时间的推移，“media/”将成为可搜索的档案。** 用户消费过的每个视频、播客、谈话、采访、文章和推文，代理的评论都位于顶部。这是全功率的 memex。
## 如何验证
1. 摄取 YouTube 视频。运行“gbrain get media/youtube/{slug}”。确认页面包含：代理的分析（不仅仅是摘要）、带有演讲者归属的关键引述以及完整的日志记录。
2. 运行“gbrain get_links media/youtube/{slug}”。确认视频中提到的每个人和公司的大脑页面都存在反向链接。
3. 选择视频中提到的人物。运行“gbrain get <person_slug>”。确认他们的时间线有一个新条目引用具有特定上下文的视频。
4. 提取推文。确认大脑页面包括线程上下文、链接的文章摘要和实体交叉引用——而不仅仅是推文文本。
5. 运行`gbrain 搜索“{topic_from_video}”`。确认媒体页面出现在搜索结果中（验证内容已编入索引且可搜索）。
---
*[GBrain 技能包](../GBRAIN_SKILLPACK.md) 的一部分。*