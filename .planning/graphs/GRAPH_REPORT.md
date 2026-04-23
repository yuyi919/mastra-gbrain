# Graph Report - brain-mastra  (2026-04-23)

## Corpus Check
- 67 files · ~86,223 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 352 nodes · 518 edges · 13 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `SqlBuilder` - 64 edges
2. `LibSQLStore` - 56 edges
3. `createGBrainAgent()` - 10 edges
4. `embedStale()` - 8 edges
5. `bulkImport()` - 8 edges
6. `parseMarkdown()` - 6 edges
7. `init()` - 6 edges
8. `chunkText()` - 5 edges
9. `recursiveSplit()` - 5 edges
10. `runDoctor()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `bulkImport()` --calls--> `createDefaultEmbedder()`  [INFERRED]
  src\scripts\import.ts → src\store\index.ts
- `createGBrainAgent()` --calls--> `createPageTools()`  [INFERRED]
  src\agent\index.ts → src\tools\page.ts
- `createGBrainAgent()` --calls--> `createLinksTools()`  [INFERRED]
  src\agent\index.ts → src\tools\links.ts
- `createGBrainAgent()` --calls--> `createConfigTools()`  [INFERRED]
  src\agent\index.ts → src\tools\config.ts
- `createGBrainAgent()` --calls--> `createRawDataTools()`  [INFERRED]
  src\agent\index.ts → src\tools\raw.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (28): StoreError, castArray(), countDeadLinks(), countDistinctTags(), countEntitiesWithLinks(), countEntitiesWithTimeline(), countOrphanPages(), countPagesWithTimeline() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (1): SqlBuilder

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (1): LibSQLStore

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (12): BrainStore, GraphNode, Page, PageVersion, dedupResults(), hybridSearch(), hybridSearchEffect(), make() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (15): createConfigTools(), DummyEmbeddingProvider, bulkImport(), createBulkImportTool(), defaultWorkers(), findMarkdownFiles(), createGBrainAgent(), createIngestTool() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (8): runDoctor(), embedBatch(), embedStale(), BrainStoreProvider, createDefaultEmbedder(), createDefaultStore(), init(), LlamaEmbeddingProvider

### Community 6 - "Community 6"
Cohesion: 0.26
Nodes (10): applyOverlap(), chunkText(), extractTrailingContext(), greedyMerge(), recursiveSplit(), splitAtDelimiters(), splitOnWhitespace(), countWords() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (7): extractTags(), inferSlug(), inferTitle(), inferType(), parseMarkdown(), splitBody(), slugifyPath()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (3): DB, make(), makeLayer()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (1): UnsafeSql

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (1): LlamaReranker

### Community 11 - "Community 11"
Cohesion: 0.6
Nodes (3): checkBacklinks(), extractPageTitle(), findMarkdownFiles()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (1): PageService

## Knowledge Gaps
- **4 isolated node(s):** `DB`, `BrainStore`, `BrainStoreProvider`, `PageService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 1`** (57 nodes): `.getConfig()`, `.getOutgoingLinks()`, `.verifyAccessToken()`, `SqlBuilder`, `.constructor()`, `.countChunksFts()`, `.countContentChunks()`, `.countDeadLinks()`, `.countDistinctTags()`, `.countEntities()`, `.countEntitiesWithLinks()`, `.countEntitiesWithTimeline()`, `.countLinks()`, `.countOrphanPages()`, `.countPages()`, `.countPagesWithTimeline()`, `.countStalePages()`, `.countTags()`, `.countTimelineEntries()`, `.deleteContentChunksByPageId()`, `.deleteContentChunksNotIn()`, `.deleteFtsByPageId()`, `.deleteFtsChunksNotIn()`, `.deleteLink()`, `.deletePageBySlug()`, `.deleteTag()`, `.getBacklinksBySlug()`, `.getChunksBySlug()`, `.getConfigByKey()`, `.getIngestLog()`, `.getLinksOutgoingBySlug()`, `.getMostConnectedPages()`, `.getOutgoingLinksBySlug()`, `.getPageBasicBySlug()`, `.getPageBySlug()`, `.getPageForVersionBySlug()`, `.getPageTypeCounts()`, `.getRawData()`, `.getTagsBySlug()`, `.getTimeline()`, `.getValidAccessTokenByHash()`, `.getVersionsBySlug()`, `.insertFtsChunks()`, `.insertLink()`, `.insertPageVersion()`, `.insertTag()`, `.listPages()`, `.markChunksEmbeddedByIds()`, `.resolveSlugExact()`, `.resolveSlugFuzzy()`, `.revertToVersionBySlug()`, `.searchVectorRows()`, `.updateAccessTokenLastUsedAt()`, `.updateSlug()`, `.upsertContentChunk()`, `.upsertFile()`, `.upsertPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 2`** (55 nodes): `LibSQLStore`, `.addLink()`, `.addTag()`, `.addTimelineEntriesBatch()`, `.addTimelineEntry()`, `.cleanDBFile()`, `.cleanVector()`, `.createVersion()`, `.deleteChunks()`, `.deletePage()`, `.dispose()`, `.dropDBFile()`, `.getBacklinks()`, `.getChunks()`, `.getChunksWithEmbeddings()`, `.getFile()`, `.getHealth()`, `.getIngestLog()`, `.getLinks()`, `.getPage()`, `.getRawData()`, `.getStaleChunks()`, `.getStats()`, `.getTags()`, `.getTimeline()`, `.getVersions()`, `.init()`, `._inTransaction()`, `.listPages()`, `.logIngest()`, `.logMcpRequest()`, `.putPage()`, `.putRawData()`, `.removeLink()`, `.removeTag()`, `.resolveSlugs()`, `.revertToVersion()`, `.rewriteLinks()`, `.searchKeyword()`, `.setConfig()`, `.[Symbol.asyncDispose]()`, `.[Symbol.dispose]()`, `.transaction()`, `.traverseGraph()`, `.updateSlug()`, `.upsertChunks()`, `.upsertFile()`, `.getFileByStoragePath()`, `.getPageIdBySlug()`, `.insertIngestLog()`, `.insertMcpRequestLog()`, `.insertTimelineEntry()`, `.insertTimelineEntryReturningId()`, `.upsertConfig()`, `.upsertRawData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (7 nodes): `.getEmbeddingsByChunkIds()`, `UnsafeSql.ts`, `UnsafeSql`, `.checkFtsIntegrity()`, `.constructor()`, `.queryVectorStoreByIds()`, `.traverseGraph()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (6 nodes): `LlamaReranker`, `.constructor()`, `.getRankingContext()`, `.rerank()`, `llama-reranker.ts`, `llama-reranker.optional.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (4 nodes): `makeRepository()`, `PageService`, `page.ts`, `test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SqlBuilder` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.295) - this node is a cross-community bridge._
- **Why does `LibSQLStore` connect `Community 2` to `Community 1`, `Community 3`, `Community 5`, `Community 9`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createGBrainAgent()` (e.g. with `createPageTools()` and `createLinksTools()`) actually correct?**
  _`createGBrainAgent()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `embedStale()` (e.g. with `createDefaultStore()` and `init()`) actually correct?**
  _`embedStale()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `bulkImport()` (e.g. with `createDefaultStore()` and `init()`) actually correct?**
  _`bulkImport()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DB`, `BrainStore`, `BrainStoreProvider` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._