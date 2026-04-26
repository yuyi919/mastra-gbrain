---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "06"
subsystem: store-boundaries
tags: [effect-v4, brainstore, scripts, ingestion, runtime]

requires:
  - phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
    provides: Plans 10-02 through 10-05 branch/runtime store boundary groundwork
provides:
  - Runtime-first ingestion workflow persistence over ContentPages, ContentChunks, GraphTimeline, and OpsLifecycle
  - Runtime-first doctor and stale embedding script internals over BrainStoreExt and RetrievalEmbedding
  - Tests proving direct ManagedRuntime/Layer.succeed injection while preserving public Promise facades
affects: [phase-10, ingestion-workflow, script-utilities, store-public-boundaries]

tech-stack:
  added: []
  patterns:
    - Effect-first helper with public Promise compatibility wrapper
    - ManagedRuntime-backed branch service injection in tests
    - Public facade fallback only at CLI/tool compatibility boundaries

key-files:
  created:
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-06-SUMMARY.md
  modified:
    - src/ingest/workflow.ts
    - src/scripts/doctor.ts
    - src/scripts/embed.ts
    - test/ingest/workflow.test.ts
    - test/scripts/doctor.test.ts
    - test/scripts/embed.test.ts

key-decisions:
  - "Plan 10-06 classifies IngestionWorkflowStore as public compatibility glue and routes runtime-capable workflow execution through branch services."
  - "Doctor and embed scripts keep exported Promise facades but prefer brainStore.runPromise over branch services when a runtime is available."

patterns-established:
  - "Compatibility wrapper pattern: exported Promise helpers may own CLI/default-store init/dispose, while internal work runs through Effect services when brainStore is present."
  - "Script tests should prove branch-service injection with ManagedRuntime and Layer.succeed, while existing LibSQLStore tests remain facade coverage."

requirements-completed: [P10-02, P10-03, P10-04, P10-05]

duration: 8 min
completed: 2026-04-25
---

# Phase 10 Plan 06: Script And Workflow Runtime Boundary Summary

**Ingestion, doctor, and stale-embedding internals now prefer Effect branch runtimes while preserving public Promise compatibility facades.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-25T20:30:38Z
- **Completed:** 2026-04-25T20:38:38Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Added `getIngestionPageEffect` and `persistIngestionEffect` so `createIngestionWorkflow` uses `brainStore.runPromise(...)` over `ContentPages`, `ContentChunks`, `GraphTimeline`, and `OpsLifecycle` when a runtime is available.
- Documented `IngestionWorkflowStore` as compatibility glue rather than the internal target model, with Promise fallback kept for existing public callers.
- Added runtime-backed `runDoctor` and `embedStale` internals over `BrainStoreExt` and `RetrievalEmbedding`, without introducing `DoctorStore`, `EmbeddingMaintenanceStore`, or broad `StoreProvider` script contracts.
- Added tests proving direct `ManagedRuntime` / `Layer.succeed` injection for ingestion, doctor, and stale embedding while retaining real `LibSQLStore` integration coverage.

## Task Commits

1. **Task 1 RED:** `7c075d6` test(10-06): add failing runtime ingestion workflow proof
2. **Task 1 GREEN:** `7753bab` feat(10-06): route ingestion workflow through branch runtime
3. **Task 2:** `4da4889` feat(10-06): route script internals through store runtime

## Files Created/Modified

- `src/ingest/workflow.ts` - Added runtime-capable Effect helpers and routed workflow parse/persist through branch services when `brainStore` exists.
- `src/scripts/doctor.ts` - Added `BrainStoreExt` runtime health report helper while preserving CLI/default Promise facade behavior.
- `src/scripts/embed.ts` - Added `RetrievalEmbedding` runtime stale embedding helper while preserving CLI/default Promise facade behavior.
- `test/ingest/workflow.test.ts` - Added branch runtime injection proof for ingestion without Promise compatibility method calls.
- `test/scripts/doctor.test.ts` - Added `BrainStoreExt` runtime injection proof.
- `test/scripts/embed.test.ts` - Added `RetrievalEmbedding` runtime injection proof.

## Verification

- `bun test test/ingest/workflow.test.ts test/llama_embedder.test.ts test/scripts/doctor.test.ts test/scripts/embed.test.ts` - PASS, 15 tests.
- `pwsh -NoProfile -Command "...old Promise-mirror or broad-cast pattern..."` - PASS.
- `pwsh -NoProfile -Command "...script lane still uses old Promise mirror or broad StoreProvider pattern..."` - PASS.
- `rg -n "IngestionWorkflowStore|brainStore\\.runPromise|ContentPages|ContentChunks|GraphTimeline" ...` - PASS, shows compatibility boundary plus runtime branch-service path.
- `rg -n "ManagedRuntime|Layer\\.succeed|brainStore\\.runPromise|new LibSQLStore" test/scripts src/scripts` plus raw vector mutation guard - PASS.
- `pnpm build:dts` - PASS.
- `pwsh ./scripts/check-effect-v4.ps1 src` - PASS.

## Decisions Made

- Kept `createIngestionWorkflow({ store, embedder })`, `bulkImport(...)`, `createBulkImportTool(...)`, `runDoctor(...)`, and `embedStale(...)` public behavior stable.
- Treated runtime-capable stores as the preferred internal execution lane; Promise-shaped methods remain only as compatibility fallbacks for existing facade callers and CLI ownership.
- Kept script default factory behavior: when no store is injected, scripts create, initialize, and dispose the default public store as before.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first implementation used a type name containing `DoctorStore`; the guard correctly rejected the mirror-like naming. It was renamed to a runtime facade type before committing final task work.
- Initial Effect helper typing mixed bare `effect` imports with the repository `effect-next` service pattern; this was corrected before the Task 1 GREEN commit and verified with `pnpm build:dts`.

## Known Stubs

None. Stub-pattern scan only found test mocks and empty arrays used as assertions/injection fixtures.

## Authentication Gates

None.

## Next Phase Readiness

Ready for Plan 10-07 facade closure. Remaining public Promise surfaces are classified compatibility boundaries, and internal workflow/script paths now have direct runtime-service evidence.

## Self-Check: PASSED

- Summary file exists: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-06-SUMMARY.md`
- Task commits exist: `7c075d6`, `7753bab`, `4da4889`
- No tracked file deletions were introduced by task commits.

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-25*
