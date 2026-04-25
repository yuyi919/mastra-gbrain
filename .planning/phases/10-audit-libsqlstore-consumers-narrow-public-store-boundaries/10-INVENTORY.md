---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "01"
artifact: frozen-consumer-inventory
created: 2026-04-25T18:59:00Z
requirement: P10-01
decision_refs:
  - D-07
  - D-08
---

# Phase 10 Consumer Inventory

This is the frozen inventory required by D-07 and D-08 before any Phase 10 implementation changes. Implementation changes to `src/**` or `test/**` are blocked until later plans read this file and preserve the classifications below.

## Exact Commands Used

```powershell
rg -n "LibSQLStore|new\s+LibSQLStore|StoreProvider|BrainStore|vectorStore|getChunksWithEmbeddings" src test
rg -n "StoreProvider|EmbeddingProvider|bulkImport|embedStale|runDoctor|createIngestionWorkflow" src/ingest src/workflow src/tools src/scripts src/agent src/search test/ingest test/search test/scripts
rg -n "vectorStore|getChunksWithEmbeddings|makeLayer|Context\.Service" src/store/BrainStore.ts src/store/libsql-store.ts src/store/libsql.ts src/store/brainstore
```

## Classification Legend

Every row uses exactly one required classification:

- `public facade coverage`
- `provider wiring`
- `workflow/tool consumer`
- `script utility`
- `replaceable internal dependency`

Rows are match-complete by file and symbol: the `Usage` column lists every current grep line for that file/symbol pair from the commands above. Later plans must rerun the exact commands before editing and reconcile any drift here first.

## Current Match Inventory

| File | Symbol | Usage | Classification | Phase 10 action | Decision refs |
| --- | --- | --- | --- | --- | --- |
| `src/agent/index.ts` | `StoreProvider` | Lines 2, 14: public agent aggregator accepts full store for all tools. | workflow/tool consumer | Keep aggregate shape while narrowing individual tool contracts in Plan 10-05. | D-07, D-08, D-09 |
| `src/agent/index.ts` | `EmbeddingProvider` | Lines 2, 15: agent passes embedder into search/ingest/import tools. | workflow/tool consumer | Preserve structural compatibility with provider wiring. | D-07, D-08, D-09 |
| `src/agent/index.ts` | `bulkImport` | Lines 37, 52: prompt/tool wiring references bulk import tool. | workflow/tool consumer | Re-evaluate after tool import contract is narrowed. | D-07, D-08, D-09 |
| `src/ingest/workflow.ts` | `StoreProvider` | Lines 7, 18, 219: workflow store dependency and transaction callback are full `StoreProvider`. | replaceable internal dependency | Narrow to workflow-specific persistence contract in Plan 10-02. | D-04, D-05, D-07, D-08 |
| `src/ingest/workflow.ts` | `EmbeddingProvider` | Lines 7, 19: workflow embedder dependency. | workflow/tool consumer | Keep `{ store, embedder }` shape while narrowing only `store`. | D-04, D-07, D-08 |
| `src/ingest/workflow.ts` | `createIngestionWorkflow` | Line 23: workflow factory exported to provider, tools, and scripts. | workflow/tool consumer | Preserve factory name and caller shape in Plan 10-02. | D-04, D-06, D-07, D-08 |
| `src/search/hybrid.ts` | `BrainStore` | Lines 4, 5, 41, 43, 173, 294: narrow Effect path uses `BrainStoreSearch`; `BrainStoreError` path also matches guard. | replaceable internal dependency | Keep as model narrow branch dependency; remove only broad Promise fallback coupling if practical. | D-07, D-08, D-10 |
| `src/search/hybrid.ts` | `StoreProvider` | Lines 6, 168: Promise wrapper accepts full `StoreProvider`. | workflow/tool consumer | Narrow Promise backend type in Plan 10-05 without breaking public callers. | D-07, D-08, D-10 |
| `src/search/hybrid.ts` | `EmbeddingProvider` | Lines 6, 13: optional embedder for hybrid search options. | workflow/tool consumer | Preserve as search/tool dependency. | D-07, D-08, D-10 |
| `src/scripts/doctor.ts` | `StoreProvider` | Lines 2, 11: optional injected store. | script utility | Narrow to doctor script contract in Plan 10-06; keep default factory behavior. | D-07, D-08, D-09 |
| `src/scripts/doctor.ts` | `runDoctor` | Lines 10, 158: script entry and CLI call. | script utility | Preserve exported function while narrowing its store parameter. | D-07, D-08, D-09 |
| `src/scripts/embed.ts` | `StoreProvider` | Lines 2, 17: optional injected store. | script utility | Narrow to embedding maintenance contract in Plan 10-06. | D-07, D-08, D-09 |
| `src/scripts/embed.ts` | `embedStale` | Lines 15, 78: script function and CLI call. | script utility | Preserve exported function while narrowing store needs. | D-07, D-08, D-09 |
| `src/scripts/import.ts` | `StoreProvider` | Lines 13, 67: bulk import optional store. | script utility | Reuse narrowed workflow store contract in Plan 10-06. | D-04, D-07, D-08, D-09 |
| `src/scripts/import.ts` | `EmbeddingProvider` | Lines 13, 68: optional embedder. | script utility | Preserve provider-friendly injection. | D-07, D-08, D-09 |
| `src/scripts/import.ts` | `createIngestionWorkflow` | Lines 12, 112: bulk import builds workflow. | script utility | Keep `{ store, embedder }` workflow caller shape. | D-04, D-06, D-07, D-08 |
| `src/scripts/import.ts` | `bulkImport` | Lines 65, 240: exported helper and CLI call. | script utility | Preserve public helper behavior while narrowing internal store type. | D-07, D-08, D-09 |
| `src/store/BrainStore.ts` | `BrainStore` | Lines 5, 6, 15, 17, 22, 34, 40, 44, 45, 55, 68, 70-73, 78, 84, 88, 94, 96, 97, 100-107, 111-113, 115, 120-127, 136, 138, 158-162. | replaceable internal dependency | Keep root barrel/compat projection disciplined; do not add branch contracts here. | D-07, D-08, D-18, D-20 |
| `src/store/BrainStore.ts` | `StoreProvider` | Line 54: transitional ingestion comment. | replaceable internal dependency | Remove or update only after workflow/chunk ownership changes make it obsolete. | D-07, D-08, D-12 |
| `src/store/BrainStore.ts` | `getChunksWithEmbeddings` | Line 61: transitional ingestion contract. | replaceable internal dependency | Move ownership into content chunks branch in Plan 10-04. | D-07, D-08, D-12 |
| `src/store/BrainStore.ts` | `vectorStore` | Line 143: public options still accept raw vector store. | provider wiring | Keep as compatibility option; internal fan-out is narrowed by vector provider plans. | D-01, D-07, D-08, D-13 |
| `src/store/Mappers.ts` | `BrainStore` | Line 10: Context service identifier string. | replaceable internal dependency | No migration unless naming changes are explicitly planned. | D-07, D-08 |
| `src/store/index.ts` | `LibSQLStore` | Lines 5, 12, 14, 77: default store creation and options. | provider wiring | Do not migrate away from public facade default. | D-01, D-02, D-07, D-08 |
| `src/store/index.ts` | `StoreProvider` | Lines 4, 79, 88, 89: provider return and live wiring. | provider wiring | Preserve behavior; only narrow internals behind provider where possible. | D-01, D-03, D-07, D-08 |
| `src/store/index.ts` | `BrainStoreProvider` | Lines 82, 83, 95, 96, 104, 105: provider Context and layers. | provider wiring | Keep public provider entrypoint. | D-01, D-02, D-07, D-08 |
| `src/store/interface.ts` | `BrainStore` | Lines 29, 88: public runtime surface on `StoreProvider`. | public facade coverage | Do not widen for internal needs. | D-01, D-03, D-07, D-08 |
| `src/store/interface.ts` | `StoreProvider` | Lines 72, 86: public transaction callback and provider interface. | public facade coverage | Preserve behavior; do not add internal-only methods. | D-01, D-03, D-07, D-08 |
| `src/store/interface.ts` | `getChunksWithEmbeddings` | Line 68: public ingestion/facade method. | public facade coverage | Keep facade behavior while moving branch ownership internally. | D-01, D-12, D-17 |
| `src/store/libsql.ts` | `LibSQLStore` | Lines 34, 42, 51, 89, 101: facade class/options/layer construction. | public facade coverage | Do not migrate; keep as Promise facade. | D-01, D-03, D-07, D-08 |
| `src/store/libsql.ts` | `StoreProvider` | Lines 33, 51, 379: facade implements public provider and transaction callback. | public facade coverage | Preserve public compatibility. | D-01, D-03, D-07, D-08 |
| `src/store/libsql.ts` | `BrainStore` | Lines 29-31, 63, 66, 124, 127, 128, 131, 137, 138, 140, 381. | public facade coverage | Keep facade over compat runtime; avoid exposing internals further. | D-01, D-03, D-07, D-08 |
| `src/store/libsql.ts` | `vectorStore` | Lines 48, 56, 68, 69, 82, 94, 317: public compatibility vector store field/options. | public facade coverage | Keep facade lane; narrow branch raw vector usage separately. | D-01, D-13, D-14 |
| `src/store/libsql.ts` | `getChunksWithEmbeddings` | Lines 419, 420: public Promise facade method. | public facade coverage | Preserve behavior; implementation should delegate to branch-owned capability after Plan 10-04. | D-01, D-12, D-17 |
| `src/store/libsql-store.ts` | `BrainStore` | Lines 4, 7, 20, 21, 34, 69, 70, 96-101, 124, 194, 195, 197-199, 204, 206-208, 210, 217, 224, 225. | replaceable internal dependency | Keep assembly-only; move feature behavior to branch/provider factories. | D-07, D-08, D-20 |
| `src/store/libsql-store.ts` | `vectorStore` | Lines 34, 55, 60, 128, 129, 136, 165, 170, 173: raw vector option fan-out. | replaceable internal dependency | Introduce typed internal vector provider and reduce raw fan-out in Plan 10-03. | D-07, D-08, D-13, D-14 |
| `src/store/libsql-store.ts` | `getChunksWithEmbeddings` | Lines 87, 88: compat ingestion projection. | replaceable internal dependency | Move ownership to content chunks branch in Plan 10-04. | D-07, D-08, D-12 |
| `src/store/libsql-store.ts` | `makeLayer` | Lines 10-18, 124, 132, 225: layer assembly imports and root layer construction. | provider wiring | Keep assembly boundary; do not reimplement feature behavior here. | D-07, D-08, D-20 |
| `src/store/brainstore/compat/factory.ts` | `BrainStore` | Lines 3, 4, 6, 7, 10-13, 33, 42, 59, 60, 63, 64, 68. | replaceable internal dependency | Preserve compat projection while branch ownership improves underneath. | D-07, D-08, D-20 |
| `src/store/brainstore/compat/factory.ts` | `getChunksWithEmbeddings` | Lines 30, 47: compat projects transitional method. | replaceable internal dependency | Repoint after content chunks owns method. | D-07, D-08, D-12 |
| `src/store/brainstore/compat/factory.ts` | `makeLayer` | Line 58: compat layer helper. | provider wiring | Keep layer pattern. | D-07, D-08, D-20 |
| `src/store/brainstore/compat/interface.ts` | `BrainStore` | Lines 2, 4, 6-9: compat service extends root service. | replaceable internal dependency | Preserve compatibility during branch ownership migration. | D-07, D-08 |
| `src/store/brainstore/compat/interface.ts` | `Context.Service` | Line 6: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/compat/index.ts` | `BrainStore` | Lines 2, 7, 8: compat exports. | replaceable internal dependency | Keep as export wiring. | D-07, D-08 |
| `src/store/brainstore/compat/index.ts` | `makeLayer` | Line 3: compat layer export. | provider wiring | Keep as export wiring. | D-20 |
| `src/store/brainstore/content/chunks/factory.ts` | `BrainStore` | Line 5: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/content/chunks/factory.ts` | `makeLayer` | Line 148: branch layer factory. | provider wiring | Extend only if content chunks ownership changes require it. | D-12, D-18 |
| `src/store/brainstore/content/chunks/interface.ts` | `BrainStore` | Lines 4, 19: error import and Context service identifier. | replaceable internal dependency | Add branch-owned chunk lookup here in Plan 10-04. | D-12, D-18 |
| `src/store/brainstore/content/chunks/interface.ts` | `Context.Service` | Line 16: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/content/chunks/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/content/pages/factory.ts` | `BrainStore` | Line 4: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/content/pages/factory.ts` | `makeLayer` | Line 167: branch layer factory. | provider wiring | Keep branch factory pattern. | D-18, D-20 |
| `src/store/brainstore/content/pages/interface.ts` | `BrainStore` | Lines 10, 33: error import and Context service identifier. | replaceable internal dependency | Keep branch interface pattern. | D-18 |
| `src/store/brainstore/content/pages/interface.ts` | `Context.Service` | Line 30: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/content/pages/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/ext/factory.ts` | `BrainStore` | Lines 13, 17, 41, 341: ext factory and service references. | replaceable internal dependency | Keep as branch/ext implementation. | D-18, D-20 |
| `src/store/brainstore/ext/factory.ts` | `makeLayer` | Line 341: ext layer factory. | provider wiring | Keep layer pattern. | D-20 |
| `src/store/brainstore/ext/interface.ts` | `BrainStore` | Lines 16, 45, 46: error import and service identifier. | replaceable internal dependency | Keep ext service boundary. | D-18 |
| `src/store/brainstore/ext/interface.ts` | `Context.Service` | Line 45: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/ext/index.ts` | `BrainStore` | Line 3: ext export. | replaceable internal dependency | Keep export wiring. | D-20 |
| `src/store/brainstore/ext/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/graph/links/factory.ts` | `BrainStore` | Line 3: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/graph/links/factory.ts` | `makeLayer` | Lines 112, 120, 124: branch layer helpers. | provider wiring | Keep branch layer pattern. | D-18, D-20 |
| `src/store/brainstore/graph/links/interface.ts` | `BrainStore` | Lines 4, 38, 43: error import and Context service identifiers. | replaceable internal dependency | Keep branch interface pattern. | D-18 |
| `src/store/brainstore/graph/links/interface.ts` | `Context.Service` | Lines 35, 40: Effect v4 service declarations. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/graph/links/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/graph/timeline/factory.ts` | `BrainStore` | Line 3: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/graph/timeline/factory.ts` | `makeLayer` | Line 63: branch layer factory. | provider wiring | Keep branch layer pattern. | D-18, D-20 |
| `src/store/brainstore/graph/timeline/interface.ts` | `BrainStore` | Lines 8, 33: error import and Context service identifier. | replaceable internal dependency | Keep branch interface pattern. | D-18 |
| `src/store/brainstore/graph/timeline/interface.ts` | `Context.Service` | Line 30: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/graph/timeline/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/ops/internal/factory.ts` | `BrainStore` | Line 6: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/ops/internal/factory.ts` | `vectorStore` | Lines 14, 18, 26, 87: raw vector exposure on unsafe DB branch. | replaceable internal dependency | Replace or hide behind typed vector provider in Plan 10-03. | D-13, D-14 |
| `src/store/brainstore/ops/internal/factory.ts` | `makeLayer` | Line 67: internal branch layer factory. | provider wiring | Keep layer pattern while narrowing vector shape. | D-18, D-20 |
| `src/store/brainstore/ops/internal/interface.ts` | `BrainStore` | Lines 5, 25: error import and service identifier. | replaceable internal dependency | Keep unsafe DB branch internal. | D-18, D-20 |
| `src/store/brainstore/ops/internal/interface.ts` | `vectorStore` | Line 19: raw vector store exposed by internal branch. | replaceable internal dependency | Remove or narrow with typed vector provider in Plan 10-03. | D-13, D-14 |
| `src/store/brainstore/ops/internal/interface.ts` | `Context.Service` | Line 22: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/ops/internal/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/ops/lifecycle/factory.ts` | `BrainStore` | Line 4: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/ops/lifecycle/factory.ts` | `makeLayer` | Line 69: lifecycle layer factory. | provider wiring | Keep branch layer pattern. | D-18, D-20 |
| `src/store/brainstore/ops/lifecycle/interface.ts` | `BrainStore` | Lines 5, 26: error import and Context service identifier. | replaceable internal dependency | Keep lifecycle branch boundary. | D-18 |
| `src/store/brainstore/ops/lifecycle/interface.ts` | `Context.Service` | Line 23: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/ops/lifecycle/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/retrieval/embedding/factory.ts` | `BrainStore` | Line 12: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/retrieval/embedding/factory.ts` | `vectorStore` | Lines 23, 28, 59, 147, 149, 212: retrieval branch depends on raw vector store. | replaceable internal dependency | Replace with typed internal vector provider in Plan 10-03. | D-13, D-14 |
| `src/store/brainstore/retrieval/embedding/factory.ts` | `makeLayer` | Lines 167, 193, 200, 203: branch layer helpers. | provider wiring | Keep layer pattern while changing dependency shape. | D-18, D-20 |
| `src/store/brainstore/retrieval/embedding/interface.ts` | `BrainStore` | Lines 9, 34, 39: error import and service identifiers. | replaceable internal dependency | Keep retrieval embedding branch contract. | D-18 |
| `src/store/brainstore/retrieval/embedding/interface.ts` | `Context.Service` | Lines 31, 36: Effect v4 service declarations. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/retrieval/embedding/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/retrieval/search/factory.ts` | `BrainStore` | Line 4: StoreError import path matches guard. | replaceable internal dependency | No migration for error import alone. | D-07, D-08 |
| `src/store/brainstore/retrieval/search/factory.ts` | `makeLayer` | Line 59: branch layer factory. | provider wiring | Keep as narrow branch model. | D-10, D-18 |
| `src/store/brainstore/retrieval/search/interface.ts` | `BrainStore` | Lines 4, 26: error import and service identifier. | replaceable internal dependency | Keep branch search contract. | D-10, D-18 |
| `src/store/brainstore/retrieval/search/interface.ts` | `Context.Service` | Line 23: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/retrieval/search/index.ts` | `makeLayer` | Line 1: layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/store/brainstore/tree/factory.ts` | `BrainStore` | Lines 11, 13-15, 18, 23, 25: tree assembly service/factory references. | replaceable internal dependency | Keep tree assembly; do not leak tree to workflow callers. | D-06, D-20 |
| `src/store/brainstore/tree/factory.ts` | `makeLayer` | Line 17: tree layer factory. | provider wiring | Keep tree layer pattern. | D-18, D-20 |
| `src/store/brainstore/tree/interface.ts` | `BrainStore` | Lines 11, 30-33: tree service contract and Context service. | replaceable internal dependency | Keep tree internal to store composition. | D-06, D-20 |
| `src/store/brainstore/tree/interface.ts` | `Context.Service` | Line 30: Effect v4 service declaration. | replaceable internal dependency | Keep Effect v4 pattern. | D-18 |
| `src/store/brainstore/tree/index.ts` | `BrainStore` | Lines 2, 8, 9: tree exports. | replaceable internal dependency | Keep export wiring for store internals. | D-20 |
| `src/store/brainstore/tree/index.ts` | `makeLayer` | Line 4: tree layer export. | provider wiring | Keep export wiring. | D-20 |
| `src/tools/config.ts` | `StoreProvider` | Lines 3, 5: config tool store dependency. | workflow/tool consumer | Narrow to config get/set contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/tools/import.ts` | `StoreProvider` | Lines 4, 7: bulk import tool store dependency. | workflow/tool consumer | Narrow to bulk import/workflow store contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/tools/import.ts` | `EmbeddingProvider` | Lines 4, 8: bulk import tool embedder dependency. | workflow/tool consumer | Preserve injection. | D-07, D-08, D-09 |
| `src/tools/import.ts` | `bulkImport` | Lines 3, 10, 23, 42: bulk import helper/tool references. | workflow/tool consumer | Keep helper call; narrow accepted store structurally. | D-07, D-08, D-09 |
| `src/tools/ingest.ts` | `StoreProvider` | Lines 4, 7: ingest tool store dependency. | workflow/tool consumer | Narrow to workflow store contract in Plan 10-05. | D-04, D-07, D-08, D-09 |
| `src/tools/ingest.ts` | `EmbeddingProvider` | Lines 4, 8: ingest tool embedder dependency. | workflow/tool consumer | Preserve injection. | D-07, D-08, D-09 |
| `src/tools/ingest.ts` | `createIngestionWorkflow` | Lines 3, 22: ingest tool builds workflow. | workflow/tool consumer | Keep factory call shape. | D-04, D-06, D-07, D-08 |
| `src/tools/links.ts` | `StoreProvider` | Lines 3, 5: links tool store dependency. | workflow/tool consumer | Narrow to link read/write contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/tools/list.ts` | `StoreProvider` | Lines 4, 7: list tool store dependency. | workflow/tool consumer | Narrow to list pages contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/tools/page.ts` | `StoreProvider` | Lines 3, 5: page tool store dependency. | workflow/tool consumer | Narrow to page/tag contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/tools/raw.ts` | `StoreProvider` | Lines 3, 5: raw data tool store dependency. | workflow/tool consumer | Narrow to raw data contract in Plan 10-05; keep SQL hidden. | D-07, D-08, D-09 |
| `src/tools/search.ts` | `StoreProvider` | Lines 4, 7: search tool store dependency. | workflow/tool consumer | Narrow to search Promise backend in Plan 10-05. | D-07, D-08, D-10 |
| `src/tools/search.ts` | `EmbeddingProvider` | Lines 4, 8: search tool embedder dependency. | workflow/tool consumer | Preserve injection. | D-07, D-08, D-10 |
| `src/tools/timeline.ts` | `StoreProvider` | Lines 3, 5: timeline tool store dependency. | workflow/tool consumer | Narrow to timeline read contract in Plan 10-05. | D-07, D-08, D-09 |
| `src/workflow/index.ts` | `BrainStoreProvider` | Lines 3, 5: provider-to-workflow integration. | provider wiring | Preserve provider surface and `{ store, embedder }` call shape. | D-02, D-04, D-06, D-07 |
| `src/workflow/index.ts` | `createIngestionWorkflow` | Lines 2, 7: workflow factory call from provider. | provider wiring | Should keep compiling after workflow store type narrows. | D-04, D-06, D-07 |
| `test/ext.test.ts` | `LibSQLStore` | Lines 3, 5, 18, 153: mixed facade and helper coverage. | replaceable internal dependency | Split intent later: keep facade checks, move vector helper seams to branch/provider tests. | D-14, D-16, D-17 |
| `test/ext.test.ts` | `getChunksWithEmbeddings` | Lines 132, 133: facade helper assertion. | replaceable internal dependency | Reclassify after content chunks owns method; keep public behavior evidence if still needed. | D-12, D-16, D-17 |
| `test/ext.test.ts` | `vectorStore` | Lines 155, 157, 158, 190, 462, 468, 495: direct raw vector mock seam. | replaceable internal dependency | Replace with typed vector provider/branch seam after Plan 10-03. | D-13, D-14, D-16 |
| `test/ingest/workflow.test.ts` | `StoreProvider` | Lines 7, 12: mock store typed as full provider. | replaceable internal dependency | Convert mock to workflow contract in Plan 10-02. | D-05, D-16 |
| `test/ingest/workflow.test.ts` | `EmbeddingProvider` | Lines 6, 34: embedder mock. | workflow/tool consumer | Preserve as explicit workflow dependency. | D-04, D-07 |
| `test/ingest/workflow.test.ts` | `createIngestionWorkflow` | Lines 3, 45, 98, 117, 145, 168: workflow unit tests. | replaceable internal dependency | Keep as focused proof for narrowed workflow contract. | D-05, D-16 |
| `test/integration.test.ts` | `LibSQLStore` | Lines 5, 12, 17, 23: public integration through real facade. | public facade coverage | Do not migrate away; keep integration compatibility evidence. | D-01, D-03, D-17 |
| `test/libsql.test.ts` | `LibSQLStore` | Lines 2, 5, 8, 19, 61, 90, 105, 115, 136, 157: direct facade tests. | public facade coverage | Do not migrate; intentional public facade lane. | D-01, D-15, D-17 |
| `test/llama_embedder.test.ts` | `LibSQLStore` | Lines 6, 28, 43: local embedder integration uses real store. | workflow/tool consumer | Keep as workflow/local embedding integration unless later narrowed without losing coverage. | D-04, D-16 |
| `test/scripts/doctor.test.ts` | `LibSQLStore` | Lines 3, 10, 38, 67, 74, 86: script integration uses real facade. | script utility | Keep integration path; add narrow tests only if signature changes. | D-09, D-16 |
| `test/scripts/doctor.test.ts` | `runDoctor` | Lines 2, 66, 68, 73, 78, 84, 90: script helper assertions. | script utility | Preserve behavior while narrowing store type. | D-09, D-16 |
| `test/scripts/embed.test.ts` | `LibSQLStore` | Lines 5, 11, 47, 51: script integration and cleanup use real facade. | script utility | Keep as script/facade integration unless replaced by narrower helper plus facade lane. | D-09, D-16 |
| `test/scripts/embed.test.ts` | `embedStale` | Lines 4, 50, 54, 55, 71: script helper assertions. | script utility | Preserve behavior while narrowing store type. | D-09, D-16 |
| `test/search/hybrid.test.ts` | `BrainStoreSearch` | Lines 4, 58, 79, 80: branch-only search proof. | replaceable internal dependency | Keep narrow Effect path proof. | D-10, D-16 |
| `test/search/hybrid.test.ts` | `StoreProvider` | Lines 5, 24, 45: Promise fallback mocks cast to full provider. | replaceable internal dependency | Replace with narrow promise backend type in Plan 10-05. | D-10, D-16 |
| `test/store/brainstore-layers.test.ts` | `BrainStoreSearch` | Lines 3, 26, 29: branch injection smoke test. | replaceable internal dependency | Keep as narrow branch proof; avoid new broad casts in future edits. | D-10, D-16 |
| `test/store/brainstore-tree.test.ts` | `BrainStore` | Lines 4-7, 17, 30, 31, 40, 42, 43: tree/compat proof. | replaceable internal dependency | Keep as branch/tree coverage; no workflow/tool migration. | D-06, D-16 |
| `test/store_extensions.test.ts` | `LibSQLStore` | Lines 2, 4, 7, 12: extension facade tests. | public facade coverage | Do not migrate away; intentional public facade lane. | D-01, D-17 |
| `test/tools.test.ts` | `LibSQLStore` | Lines 3, 7, 12, 18: tool integration uses real facade. | workflow/tool consumer | Keep one facade-backed tool integration while adding/narrowing tool unit seams. | D-09, D-16, D-17 |

## Do Not Migrate

These lanes are intentional public facade coverage and must not be converted away from the public `LibSQLStore` / `StoreProvider` surface merely to reduce grep matches:

- `src/store/libsql.ts`
- `src/store/index.ts`
- `test/libsql.test.ts`
- `test/integration.test.ts`
- `test/store_extensions.test.ts`

The later plans may change internals underneath these files, but public construction, provider defaults, facade methods, and compatibility assertions must remain intact.

## Migration Order

1. Workflow/provider: narrow `createIngestionWorkflow({ store, embedder })` to a workflow-specific store contract while keeping the caller shape stable.
2. Vector provider: introduce or apply a typed internal vector provider layer so raw `vectorStore` stops fanning out through store branches.
3. Chunks ownership: move `getChunksWithEmbeddings` ownership into the content chunks branch and keep facade compatibility projection.
4. Tools/search: narrow tool factories and hybrid search Promise wrappers to capability-specific contracts.
5. Scripts/helper tests: narrow `doctor`, `embed`, `import`, workflow helper tests, and search helper mocks where they do not need the full facade.
6. Facade closure: rerun public facade regressions and final boundary guards without widening `StoreProvider`.

## Notes for Later Plans

- The guard grep intentionally overmatches names such as `BrainStoreError`; those matches are still listed so later executors can distinguish store-boundary work from harmless import-path matches.
- Public facade coverage is evidence, not debt. Dependency narrowing must not remove all real `LibSQLStore` construction tests.
- `replaceable internal dependency` rows are candidates for narrower seams, but replacement must respect the specific plan order above.
