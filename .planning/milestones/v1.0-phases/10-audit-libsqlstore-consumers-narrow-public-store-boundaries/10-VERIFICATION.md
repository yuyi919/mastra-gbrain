---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
verified: 2026-04-25T20:55:17.365Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 10: Audit LibSQLStore Consumers & Narrow Public Store Boundaries Verification Report

**Phase Goal:** Consolidate the remaining BrainStore dependency-narrowing and provider/workflow follow-up work into one consumer-boundary refactor that audits every current `LibSQLStore` reference, migrates internal modules toward direct Effect runtime / branch-service usage, and keeps `LibSQLStore` as a deliberate Promise facade for public and legacy boundaries only.
**Verified:** 2026-04-25T20:55:17.365Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

Phase 10 achieved its goal. The codebase preserves the public `LibSQLStore` / `StoreProvider` Promise facade while moving runtime-capable internal lanes toward Effect branch services. Remaining Promise-shaped contracts are local compatibility boundaries, not exported internal store mirrors.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | P10-01: Every current `LibSQLStore` import/constructor usage across `src/**` and `test/**` is inventoried and classified. | VERIFIED | `10-INVENTORY.md` exists, records exact grep commands, includes D-07/D-08, and contains all five required classifications: public facade coverage, provider wiring, workflow/tool consumer, script utility, replaceable internal dependency. |
| 2 | P10-02: Internal broad `LibSQLStore` / `StoreProvider` dependencies are replaced with direct Effect runtime / branch-service usage wherever not public or legacy Promise boundary. | VERIFIED | `rg -n "StoreProvider" src/ingest src/tools src/scripts src/search test/ingest test/search` returned no matches. Runtime evidence exists in `src/ingest/workflow.ts`, `src/search/hybrid.ts`, `src/scripts/doctor.ts`, and `src/scripts/embed.ts`. |
| 3 | P10-03: Provider and ingestion workflow surface remains `{ store, embedder }` while internal workflow paths can run through branch services. | VERIFIED | `src/workflow/index.ts` still calls `createIngestionWorkflow({ store, embedder })`; `src/ingest/workflow.ts` defines `IngestionWorkflowStore` as compatibility glue and uses `brainStore.runPromise` with `ContentPages`, `ContentChunks`, `GraphTimeline`, and `OpsLifecycle` when available. |
| 4 | P10-04: Public compatibility tests remain on `LibSQLStore`, while helper/internal tests use branch/provider injection where appropriate. | VERIFIED | Facade tests still construct `LibSQLStore` in `test/libsql.test.ts`, `test/integration.test.ts`, and `test/store_extensions.test.ts`; `test/ext.test.ts` uses `makeRetrievalEmbedding` provider-shaped fakes instead of mutating `store.vectorStore`; workflow/search/script tests use `ManagedRuntime` and `Layer.succeed`. |
| 5 | P10-05: Public `StoreProvider` / `LibSQLStore` behavior is preserved and public API is not widened for internal needs. | VERIFIED | `src/store/interface.ts` still exposes the public facade; `src/store/libsql.ts` remains the Promise facade over `BrainStoreCompat`; full `bun test`, `pnpm exec tsc --noEmit`, and `pwsh ./scripts/check-effect-v4.ps1 src` passed. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-INVENTORY.md` | Frozen consumer inventory and migration order | VERIFIED | Exists, substantive, includes exact commands, D-07/D-08, all five classifications, Do Not Migrate lanes, and migration order. |
| `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-FACADE-REGRESSION.md` | Final classification and regression evidence | VERIFIED | Exists, covers P10-01 through P10-05, documents public API review, guard results, and corrected Promise-boundary interpretation. |
| `src/ingest/workflow.ts` | Compatibility `{ store, embedder }` workflow plus Effect-first branch path | VERIFIED | Defines `IngestionWorkflowStore`, imports branch services, and uses `brainStore.runPromise` when present. |
| `src/search/hybrid.ts` | Runtime-first hybrid search with local compatibility fallback | VERIFIED | Exports `hybridSearchEffect` requiring `BrainStoreSearch`; Promise `hybridSearch` delegates to `brainStore.runPromise` first. |
| `src/tools/search.ts` | Public tool compatibility over narrowed search backend | VERIFIED | Accepts `HybridSearchCompatBackend`, not broad `StoreProvider`; calls `hybridSearch`, which prefers runtime path. |
| `src/scripts/doctor.ts` | CLI Promise facade with runtime-backed internals | VERIFIED | `runDoctor` keeps Promise signature and uses `BrainStoreExt` effect via `brainStore.runPromise` when available. |
| `src/scripts/embed.ts` | CLI Promise facade with runtime-backed internals | VERIFIED | `embedStale` keeps Promise signature and uses `RetrievalEmbedding` effect via `brainStore.runPromise` when available. |
| `src/store/interface.ts` | Public `StoreProvider` facade remains stable | VERIFIED | No internal vector/chunk-only widening observed; facade methods remain public compatibility surface. |
| `src/store/libsql.ts` | Public `LibSQLStore` facade remains stable | VERIFIED | Implements `StoreProvider`, delegates through compat runtime, and preserves public methods including `getChunksWithEmbeddings`. |
| `test/search/hybrid.test.ts`, `test/tools.test.ts`, `test/scripts/doctor.test.ts`, `test/scripts/embed.test.ts`, `test/ext.test.ts`, `test/libsql.test.ts`, `test/integration.test.ts`, `test/store_extensions.test.ts` | Regression and boundary coverage | VERIFIED | Focused test command passed: 39 pass / 1 skip / 0 fail. Full suite passed: 113 pass / 2 skip / 0 fail. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `10-INVENTORY.md` | `src/**` and `test/**` | Recorded `rg` inventory commands | VERIFIED | Inventory contains the mandated commands and line-level classified rows. |
| `src/workflow/index.ts` | `src/ingest/workflow.ts` | `createIngestionWorkflow({ store, embedder })` | VERIFIED | Grep confirms provider wiring keeps the caller shape. |
| `src/ingest/workflow.ts` | branch services | `brainStore.runPromise(getIngestionPageEffect/persistIngestionEffect)` | VERIFIED | Uses `ContentPages`, `ContentChunks`, `GraphTimeline`, and `OpsLifecycle` through the runtime when available. |
| `src/search/hybrid.ts` | `BrainStoreSearch` | `hybridSearchEffect` and `backend.brainStore.runPromise(...)` | VERIFIED | Runtime path is primary; legacy search methods are local compatibility glue. |
| `src/tools/search.ts` | `src/search/hybrid.ts` | `hybridSearch(store, inputData.query, ...)` | VERIFIED | Tool accepts `HybridSearchCompatBackend`, keeping facade callers structurally compatible. |
| `src/scripts/doctor.ts` | `BrainStoreExt` | `brainStore.runPromise(getDoctorHealthReportEffect())` | VERIFIED | Test proves Promise compatibility method is not called when runtime exists. |
| `src/scripts/embed.ts` | `RetrievalEmbedding` | `brainStore.runPromise(embedStaleEffect(batchSize))` | VERIFIED | Test proves runtime methods are called instead of Promise fallback when runtime exists. |
| `test/libsql.test.ts` | `src/store/libsql.ts` | `new LibSQLStore` public Promise facade | VERIFIED | Public facade test lane remains intentional and passing. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/ingest/workflow.ts` | parsed page/chunks/timeline writes | `ContentPages`, `ContentChunks`, `GraphTimeline`, `OpsLifecycle` or compatibility store fallback | Yes | VERIFIED |
| `src/search/hybrid.ts` | `keywordResults`, `vectorResults`, `fused`, `deduped` | `BrainStoreSearch.searchKeyword/searchVector/getBacklinkCounts/getEmbeddingsByChunkIds` | Yes | VERIFIED |
| `src/tools/search.ts` | `results` | `hybridSearch(...)` over runtime-capable facade | Yes | VERIFIED |
| `src/scripts/doctor.ts` | `report` and `checks` | `BrainStoreExt.getHealthReport()` or public facade fallback | Yes | VERIFIED |
| `src/scripts/embed.ts` | `staleChunks`, vector records, marked chunk ids | `RetrievalEmbedding.getStaleChunks/upsertVectors/markChunksEmbedded` or public facade fallback | Yes | VERIFIED |
| `src/store/libsql.ts` | public facade results | `BrainStoreCompat` runtime service through `run` / `runFlatten` | Yes | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Focused Phase 10 tests pass | `bun test test/search/hybrid.test.ts test/tools.test.ts test/scripts/doctor.test.ts test/scripts/embed.test.ts test/ext.test.ts test/libsql.test.ts test/integration.test.ts test/store_extensions.test.ts` | 39 pass / 1 skip / 0 fail | PASS |
| Full project regression passes | `bun test` | 113 pass / 2 skip / 0 fail | PASS |
| Type surface is valid | `pnpm exec tsc --noEmit` | exit 0 | PASS |
| Effect v4 guard passes | `pwsh ./scripts/check-effect-v4.ps1 src` | "Effect v4 syntax check passed" | PASS |
| No broad internal `StoreProvider` lane remains | `rg -n "StoreProvider" src/ingest src/tools src/scripts src/search test/ingest test/search` | no matches | PASS |
| No old Promise-contract names leaked | `rg -n "PageToolsStore|...|DoctorStore|EmbeddingMaintenanceStore" src test` | no matches | PASS |
| No helper-only raw vector mutation remains | raw vector mutation guard over `src/store/brainstore`, `src/store/libsql-store.ts`, and `test` | no matches | PASS |
| No forbidden guarded casts remain | `rg -n "as unknown as StoreProvider|as any" src/store src/ingest src/workflow test/ingest test/search` | no matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| P10-01 | 10-01, 10-07 | Inventory and classify current `LibSQLStore` usage. | SATISFIED | `10-INVENTORY.md` is substantive and complete for the required labels/commands. |
| P10-02 | 10-02 through 10-07 | Replace internal broad dependencies with Effect runtime / branch-service usage where not public/legacy. | SATISFIED | Broad internal `StoreProvider` grep returns no matches; runtime path evidence appears in ingest/search/scripts/tests. |
| P10-03 | 10-02, 10-06, 10-07 | Preserve `{ store, embedder }` workflow provider surface while enabling branch-service internals. | SATISFIED | `src/workflow/index.ts` preserves shape; `src/ingest/workflow.ts` uses runtime path when available. |
| P10-04 | 10-04, 10-07 | Keep public facade tests and move helper tests to branch/provider seams where better. | SATISFIED | Public tests remain on `LibSQLStore`; helper vector/search/workflow/script tests use provider/runtime injection. |
| P10-05 | 10-03 through 10-07 | Preserve public facade behavior; do not widen public API. | SATISFIED | Public API review in `10-FACADE-REGRESSION.md`, passing facade tests, and `src/store/interface.ts` review confirm no internal-only widening. |

No orphaned Phase 10 requirements were found in `.planning/REQUIREMENTS.md`; current milestone requirements are archived and ROADMAP.md carries P10-01 through P10-05.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/ingest/workflow.ts` | 79 | `return []` | Info | Valid empty timeline parse result, not a stub. |
| `src/search/hybrid.ts` | 111 | `return []` | Info | Valid no-vector branch when neither vector nor embedder is present, not a stub. |

No blocker anti-patterns were found. Static scans found no old Promise-contract names, no broad internal `StoreProvider` lane, no guarded `as any` / `as unknown as StoreProvider`, and no Effect v3 banned API in `src`.

### Human Verification Required

None. This phase is code-boundary, API compatibility, and test/guard evidence work; all required behaviors are programmatically checkable.

### Disconfirmation Pass

- Partial requirement check: remaining Promise-shaped local interfaces (`IngestionWorkflowStore`, `HybridSearchCompatBackend`, `RuntimeBackedHealthFacade`, `RuntimeBackedEmbeddingFacade`) were reviewed. They are local/public compatibility boundaries and runtime-capable paths prefer branch services.
- Misleading test check: facade tests alone would not prove the migration. Additional tests in `test/ingest/workflow.test.ts`, `test/search/hybrid.test.ts`, `test/scripts/doctor.test.ts`, and `test/scripts/embed.test.ts` prove runtime/service injection.
- Error path check: `runDoctor` still covers a fatal unhealthy store path; `hybridSearchEffect` treats backlink/cosine failures as non-fatal fallback behavior; `embedStale` propagates embedding errors through the public wrapper.

### Gaps Summary

No gaps found. Phase 10 goal is achieved: public facade behavior is preserved, internal lanes are narrowed or classified as compatibility boundaries, Effect v4 constraints pass, and regression evidence aligns with the implementation.

---

_Verified: 2026-04-25T20:55:17.365Z_
_Verifier: Claude (gsd-verifier)_
