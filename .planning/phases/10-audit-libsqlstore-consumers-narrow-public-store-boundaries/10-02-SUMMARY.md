---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "02"
subsystem: workflow-provider-contracts
tags: [ingestion-workflow, store-boundary, dependency-injection, effect-v4, mastra]

requires:
  - phase: 10-01
    provides: Frozen LibSQLStore and StoreProvider consumer inventory
provides:
  - Workflow-local `IngestionWorkflowStore` contract for ingestion persistence operations
  - Narrow ingest tool and bulk import signatures while preserving `{ store, embedder }` workflow calls
  - TDD coverage proving workflow tests use the narrow contract instead of `StoreProvider`
affects: [phase-10, workflow-provider-contracts, tool-contracts, script-utilities]

tech-stack:
  added: []
  patterns:
    - Workflow-local capability contract
    - Provider-friendly structural typing over public facade instances
    - Owned default store initialization without broad `any` casts

key-files:
  created:
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-02-SUMMARY.md
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/deferred-items.md
  modified:
    - src/ingest/workflow.ts
    - src/tools/ingest.ts
    - src/scripts/import.ts
    - test/ingest/workflow.test.ts

key-decisions:
  - "Kept `createIngestionWorkflow({ store, embedder })` unchanged while narrowing only the workflow store contract."
  - "Used `Promise<unknown>` for timeline batch return compatibility because the workflow ignores the value and public `StoreProvider` returns a count."
  - "Kept workflow callers free of BrainStoreTree and branch-service imports."

patterns-established:
  - "Workflow-specific store contracts should live with the consuming workflow when they are narrower than the public facade."
  - "Injected public `LibSQLStore` / `StoreProvider` instances should remain structurally compatible with narrower consumer contracts."

requirements-completed: [P10-02, P10-03, P10-04, P10-05]

duration: 9min
completed: 2026-04-25
---

# Phase 10 Plan 02: Workflow Store Contract Summary

**Ingestion workflow now consumes a workflow-local store contract while public callers still pass `{ store, embedder }`**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-25T19:03:57Z
- **Completed:** 2026-04-25T19:12:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added exported `IngestionWorkflowStore` in `src/ingest/workflow.ts` and removed workflow/test references to broad `StoreProvider`.
- Converted workflow tests to a narrow mock contract and added a regression assertion for the local workflow contract.
- Narrowed `createIngestTool` and `bulkImport` to the workflow store contract while preserving all `createIngestionWorkflow({ store, embedder })` call sites.
- Removed `(activeStore as any).init()` from `src/scripts/import.ts` by separating owned default store construction from injected stores.

## Task Commits

1. **Task 1 RED: Narrow workflow test coverage** - `22c36ea` (test)
2. **Task 1 GREEN: Define and consume `IngestionWorkflowStore`** - `04dcb70` (feat)
3. **Task 2: Preserve provider, tool, and import caller shape** - `47281cf` (feat)

_Note: Task 1 followed the required TDD flow with a failing test commit before implementation._

## Files Created/Modified

- `src/ingest/workflow.ts` - Defines `IngestionWorkflowStore`, types workflow options and transaction callback against it.
- `test/ingest/workflow.test.ts` - Uses a narrow workflow mock and verifies the workflow source no longer depends on broad store types.
- `src/tools/ingest.ts` - Accepts `IngestionWorkflowStore` while keeping `EmbeddingProvider` unchanged.
- `src/scripts/import.ts` - Accepts `IngestionWorkflowStore`, preserves default provider fallback, and initializes only owned default stores.
- `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/deferred-items.md` - Records out-of-scope test isolation debt discovered during verification.

## Decisions Made

- The workflow contract returns `Promise<unknown>` for `addTimelineEntriesBatch` because the workflow never reads the count and this keeps existing `StoreProvider` / `LibSQLStore` callers structurally compatible.
- No workflow caller imports `BrainStoreTree`, `ContentChunks`, `ContentPages`, or `LibSQLStore`; public wiring remains provider-friendly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved structural compatibility for timeline batch writes**
- **Found during:** Task 2 (Preserve provider, tool, and import caller shape)
- **Issue:** The planned `addTimelineEntriesBatch(...): Promise<void>` return type made existing `StoreProvider` and `LibSQLStore` callers fail TypeScript compatibility because the public facade returns `Promise<number>`.
- **Fix:** Changed the workflow contract return type to `Promise<unknown>`, which does not widen capabilities and matches the workflow's actual use of the method.
- **Files modified:** `src/ingest/workflow.ts`, `test/ingest/workflow.test.ts`
- **Verification:** `bunx tsc --noEmit`, required workflow/tool/integration tests, and guard greps all passed.
- **Committed in:** `47281cf`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was necessary to satisfy the plan's public caller-shape requirement without adding methods or exposing store internals.

## Known Stubs

None. Empty arrays/objects found by the stub scan are local accumulators or default option values, not UI/data-source stubs.

## Threat Flags

None - this plan narrowed an existing dependency boundary and introduced no new network endpoints, auth paths, file access patterns, schema changes, or unplanned trust-boundary surface.

## Issues Encountered

- `bun test test/ingest/workflow.test.ts test/tools.test.ts test/integration.test.ts` required removing stale generated `tmp/test-tools*` and `tmp/test-integration*` database files first. The pre-existing cleanup helper does not unlink the SQLite DB file, so this was logged to `deferred-items.md` and left out of scope.

## Verification

- `bun test test/ingest/workflow.test.ts`
- `bun test test/ingest/workflow.test.ts test/tools.test.ts test/integration.test.ts`
- `rg -n "IngestionWorkflowStore" src/ingest/workflow.ts test/ingest/workflow.test.ts`
- `pwsh -NoProfile -Command "if (rg -n 'StoreProvider|BrainStoreTree|LibSQLStore' src/ingest/workflow.ts test/ingest/workflow.test.ts) { throw 'broad workflow dependency remains' }"`
- `rg -n "createIngestionWorkflow" src/workflow/index.ts src/tools/ingest.ts src/scripts/import.ts`
- `rg -n "ownedStore|await ownedStore\.init\(" src/scripts/import.ts`
- `pwsh -NoProfile -Command "if (rg -n 'as any\)\.init|BrainStoreTree|ContentChunks|ContentPages' src/workflow/index.ts src/tools/ingest.ts src/scripts/import.ts) { throw 'forbidden workflow caller pattern remains' }"`
- `bunx tsc --noEmit`
- `pwsh ./scripts/check-effect-v4.ps1 src`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 10-03 can continue with vector/chunk boundary cleanup. The ingestion workflow surface is now stable: callers still pass `{ store, embedder }`, and callers do not need BrainStoreTree or branch-service knowledge.

## Self-Check: PASSED

- FOUND: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-02-SUMMARY.md`
- FOUND: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/deferred-items.md`
- FOUND: `src/ingest/workflow.ts`
- FOUND: `src/tools/ingest.ts`
- FOUND: `src/scripts/import.ts`
- FOUND: `test/ingest/workflow.test.ts`
- FOUND: task commit `22c36ea`
- FOUND: task commit `04dcb70`
- FOUND: task commit `47281cf`

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-25*
