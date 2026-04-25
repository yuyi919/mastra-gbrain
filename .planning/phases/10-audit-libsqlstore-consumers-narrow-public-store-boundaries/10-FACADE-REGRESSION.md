---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
artifact: facade-regression
plan: "07"
created: 2026-04-25T20:49:00Z
status: passed
---

# Phase 10 Facade Regression Evidence

Phase 10 closes with the public `LibSQLStore` / `StoreProvider` facade preserved and internal lanes guarded against broad store or raw vector regressions.

## Requirement Coverage

| Requirement | Evidence | Status |
| --- | --- | --- |
| P10-01 | Frozen consumer inventory remains the baseline in `10-INVENTORY.md`; final greps classify remaining facade matches. | Passed |
| P10-02 | `test/ext.test.ts` no longer mutates `store.vectorStore`; vector helper assertions run through `makeRetrievalEmbedding` and provider-shaped fakes. | Passed |
| P10-03 | Workflow callers keep `{ store, embedder }`, while runtime-capable ingestion uses `brainStore.runPromise` with `ContentPages`, `ContentChunks`, `GraphTimeline`, and `OpsLifecycle`. | Passed |
| P10-04 | Tool factories use capability-specific dependency shapes instead of typing internal tool parameters as the broad public store. | Passed |
| P10-05 | Full tests, typecheck, Effect v4 check, and boundary guards pass. Public facade behavior remains covered by real `LibSQLStore` tests. | Passed |

## Public API Review

| File | Review Notes |
| --- | --- |
| `src/store/interface.ts` | `StoreProvider` remains the public Promise facade. It was not widened for internal vector/chunk helper needs. Existing public maintenance and ingestion methods remain compatible. |
| `src/store/libsql.ts` | `LibSQLStore` remains the public Promise-facing compatibility class over `BrainStoreCompat` runtime services. Facade methods still delegate through `run` / `runFlatten`. |
| `src/store/index.ts` | `createDefaultStore` still returns `LibSQLStore`, and `BrainStoreProvider` remains the public provider entrypoint. No branch-only internals were promoted into the public default factory. |

## Facade Regression Lanes

Intentional public facade coverage still constructs or references `LibSQLStore`:

- `test/libsql.test.ts`
- `test/integration.test.ts`
- `test/store_extensions.test.ts`
- `src/store/libsql.ts`

These matches are evidence, not debt. They prove the Promise facade remains stable while internal lanes move to runtime and branch services.

## Correction From Planning

The corrected direction is enforced: `IngestionWorkflowStore` and remaining Promise wrappers are compatibility boundaries, not the model for new internal lanes. Internal workflow/search/script-capable code prefers `ManagedRuntime`, `brainStore.runPromise`, `hybridSearchEffect`, `BrainStoreSearch`, `ContentChunks`, `RetrievalEmbedding`, and branch/provider services. No new internal Promise compatibility layer was added for tools/search/scripts/ingest.

Tool dependency types were narrowed to small structural `*Deps` interfaces instead of old `*ToolsStore` Promise-contract names, avoiding the earlier narrow-Promise-contract plan artifact while keeping public callers structurally compatible.

## Guard Results

| Command | Result | Interpretation |
| --- | --- | --- |
| `bun test test/libsql.test.ts test/ext.test.ts test/integration.test.ts test/store_extensions.test.ts` | Passed: 26 pass, 1 skip | Public facade and extension regression lane is green. |
| `bun test` | Passed: 113 pass, 2 skip | Full project regression is green. |
| `pnpm exec tsc --noEmit` | Passed | Type surface is closed. |
| `pwsh ./scripts/check-effect-v4.ps1 src` | Passed | No banned Effect v3 syntax in `src`. |
| `rg -n "LibSQLStore|new\s+LibSQLStore" src/store/libsql.ts test/libsql.test.ts test/integration.test.ts test/store_extensions.test.ts` | Matches only intentional facade files | Public facade coverage remains. |
| `rg -n "getChunksWithEmbeddings" src/store/brainstore/content/chunks src/store/brainstore/compat src/store/libsql.ts test/ext.test.ts` | Matches branch owner, compat projection, and facade test | Chunk lookup ownership is branch-first with public facade projection. |
| old Promise-contract name guard | Passed | No `PageToolsStore`, `HybridSearchPromiseStore`, or related old plan artifacts remain. |
| runtime/branch-service evidence grep | Passed with expected matches | Internal lanes show runtime/branch service usage in ingest/search/scripts/tests. |
| broad `StoreProvider` internal-lane guard | Passed | No unclassified broad public store dependency remains in `src/ingest`, `src/tools`, `src/scripts`, `src/search`, `test/ingest`, or `test/search`. |
| raw vector mutation guard | Passed | No helper-only `store.vectorStore` method mutation remains. |
| forbidden StoreProvider cast guard | Passed | No `as unknown as StoreProvider` or `as any` remains in guarded store/ingest/workflow/search test lanes. |

## Final Classification

- Public facade: `LibSQLStore`, `StoreProvider`, `createDefaultStore`, and public facade tests remain Promise-compatible.
- Compatibility boundary: `IngestionWorkflowStore`, `HybridSearchCompatBackend`, CLI/default script helpers, and public tool factory callers remain structurally compatible but do not define new internal Promise lanes.
- Internal direction: branch services and typed providers remain the preferred execution seam for workflow/search/script helper logic.

## Sign-Off

Phase 10 requirements P10-01 through P10-05 are closed. Public behavior is preserved, `StoreProvider` was not widened, raw vector helper mutation is gone, and internal consumers are guarded toward direct Effect runtime / branch-service usage.
