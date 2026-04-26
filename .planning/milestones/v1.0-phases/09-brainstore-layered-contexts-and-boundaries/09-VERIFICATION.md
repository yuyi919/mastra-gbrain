---
phase: 09-brainstore-layered-contexts-and-boundaries
verified: "2026-04-25T14:24:00.000Z"
status: passed
score: 4/4 must-haves verified
---

# Phase 9: brainstore-layered-contexts-and-boundaries — Verification

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BrainStoreTree is the production root assembly for feature branches. | passed | `src/store/libsql-store.ts` provides `BrainStoreTree` before feature layers. |
| 2 | The public LibSQL Promise boundary remains stable through compat-over-tree. | passed | `src/store/libsql.ts` resolves `BrainStoreCompat` in `run` and `runFlatten`. |
| 3 | Internal search consumers use the narrow retrieval branch contract. | passed | `src/search/hybrid.ts` consumes `BrainStoreSearch`; `test/search/hybrid.test.ts` proves branch-only injection. |
| 4 | Store assembly no longer depends on flat `store.features.*` projection. | passed | Forbidden projection grep across `src/store` returned no matches. |
| 5 | `libsql-store.ts` delegates branch behavior to branch factory `makeLayer` boundaries and uses `Layer` for dependency flow. | passed | Content, graph, retrieval, and ops `makeLayer` exports now acquire branch dependencies internally; `libsql-store.ts` only composes returned Layers and passes external options/ports. |
| 6 | Extension feature behavior is branch-owned rather than embedded in runtime assembly. | passed | `src/store/brainstore/ext/{interface,factory,index}.ts` owns `ExtService`, `BrainStoreExt`, and `makeLayer`; `libsql-store.ts` composes `makeExtLayer()`. |
| 7 | `BrainStore.ts` only owns the root Context and no longer redeclares branch service contracts. | passed | Non-root feature Contexts were removed; branch contracts are imported from their modules and exposed as aliases/compositions. |

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/brainstore/tree/factory.ts` | Root tree assembly | passed | Tree factory assembles domain branches before compat projection. |
| `src/store/brainstore/compat/factory.ts` | Flat compatibility adapter over `BrainStoreTree` | passed | Adapter derives branch surfaces from `tree` and preserves legacy-only helpers. |
| `src/store/brainstore/ext/factory.ts` | Extension branch implementation and Layer | passed | Ext implementation moved out of `libsql-store.ts` and acquires `Mappers` plus `RetrievalEmbedding` internally. |
| `src/store/brainstore/ops/internal/interface.ts` | Unsafe DB branch contract | passed | `UnsafeDBService` now lives with `OpsInternalService`, not in `BrainStore.ts`. |
| `src/store/brainstore/graph/timeline/interface.ts` | Timeline branch contract | passed | `TimelineBatchInput` now lives with the timeline branch contract. |
| `src/store/libsql-store.ts` | Runtime layer wiring for tree + compat + feature tags | passed | Adds `CompatLayer`, derives feature layers from tree/compat, and delegates branch construction to branch `makeLayer` exports. |
| `src/store/libsql.ts` | Public Promise bridge over compatibility runtime | passed | Runtime helper methods use `BrainStoreCompat`. |
| `test/search/hybrid.test.ts` | Branch-only search injection regression | passed | Existing regression passed. |
| `test/ext.test.ts` | Compat-backed stale/vector helper regression | passed | Test now clears local SQLite residue before initialization. |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/store/libsql-store.ts` | `src/store/brainstore/tree/factory.ts` | `BrainStoreTree` layer | passed | Runtime assembly exposes the tree before feature/compat projection. |
| `src/store/libsql-store.ts` | `src/store/brainstore/compat/factory.ts` | `makeCompatBrainStore(tree, store)` | passed | Compat is layered over tree plus legacy surface. |
| `src/store/libsql.ts` | `src/store/brainstore/compat/interface.ts` | `BrainStoreCompat.use` | passed | Public helper runtime no longer assumes the legacy root. |
| `src/search/hybrid.ts` | `src/store/brainstore/retrieval/search/interface.ts` | `BrainStoreSearch` | passed | Hybrid search remains branch-only. |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| P09-01 | passed | |
| P09-02 | passed | |
| P09-03 | passed | |
| P09-04 | passed | |

## Result

Passed.

Automated verification completed with:

- `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts test/ingest/workflow.test.ts`
- forbidden flat-root projection grep across `src/store`
- `tsc --noEmit`
- `pwsh ./scripts/check-effect-v4.ps1`
- `rg -n "as unknown|as any" src/store/BrainStore.ts src/store/brainstore/compat/factory.ts src/store/libsql-store.ts src/store/libsql.ts src/store/brainstore/ops/internal/interface.ts`
- `bun test test/libsql.test.ts test/ext.test.ts`
- `bun test test/libsql.test.ts test/ext.test.ts test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts`
- `pwsh ./scripts/check-effect-v4.ps1`
- `rg -n "makeContentPages\\(|makeContentChunks\\(|makeGraphLinks\\(|makeGraphTimeline\\(|makeRetrievalEmbedding\\(|makeRetrievalSearch\\(|makeOpsLifecycle\\(|makeOpsInternal\\(" src/store/libsql-store.ts`
- `rg -n "as unknown|as any|: any|<any" src/store/libsql-store.ts src/store/brainstore/content src/store/brainstore/graph src/store/brainstore/retrieval src/store/brainstore/ops`
- `rg -n "use\\(\\([^)]*:" src/store src/search src/tools test`
- `rg -n "Context\\.Service|export class BrainStore" src/store/BrainStore.ts`
- `rg -n "\\.use\\(\\([^)]*=>\\s*(Eff|Effect)\\.succeed|\\.use\\((Eff|Effect)\\.succeed\\)" src test`

Notes:

- `test/libsql.test.ts` still reports one skipped rollback test; this is pre-existing and was not introduced by Phase 09 closeout.
