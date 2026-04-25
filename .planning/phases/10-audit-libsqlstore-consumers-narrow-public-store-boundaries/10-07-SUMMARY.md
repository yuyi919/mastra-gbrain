---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "07"
subsystem: store-boundaries
tags: [effect-v4, libsqlstore, facade-regression, store-provider, vector-provider]
requires:
  - phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
    provides: Consumer inventory, vector provider, content chunk ownership, runtime-first workflow/search/script lanes
provides:
  - Final public facade regression evidence for Phase 10
  - Static guards proving no unclassified broad StoreProvider internal lane remains
  - Helper tests moved away from public vectorStore mutation
affects: [phase-10-verification, store-boundaries, tools, search, ingest]
tech-stack:
  added: []
  patterns:
    - Public Promise facade preserved at LibSQLStore boundaries
    - Internal lanes prefer Effect runtime and branch services
    - Tool dependencies use capability-specific structural deps
key-files:
  created:
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-FACADE-REGRESSION.md
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-07-SUMMARY.md
  modified:
    - test/ext.test.ts
    - test/ingest/workflow.test.ts
    - test/search/hybrid.test.ts
    - test/search/search.test.ts
    - src/tools/config.ts
    - src/tools/import.ts
    - src/tools/links.ts
    - src/tools/list.ts
    - src/tools/page.ts
    - src/tools/raw.ts
    - src/tools/search.ts
    - src/tools/timeline.ts
    - src/store/Mappers.ts
    - src/store/SqlBuilder.ts
    - src/store/page.ts
key-decisions:
  - "Phase 10 closure preserves LibSQLStore as the public Promise facade while enforcing zero unclassified broad StoreProvider matches in internal lanes."
  - "Tool dependencies are capability-specific structural deps, not the rejected old *ToolsStore Promise-contract layer."
  - "Vector helper assertions use retrieval/vector provider seams instead of mutating store.vectorStore methods."
patterns-established:
  - "Facade evidence stays on LibSQLStore tests; helper seams move to branch/provider injection."
  - "Final phase guards must classify public facade matches instead of forcing them to zero."
requirements-completed: [P10-01, P10-02, P10-03, P10-04, P10-05]
duration: 10 min
completed: 2026-04-25
---

# Phase 10 Plan 07: Facade Closure Summary

**LibSQLStore facade regression evidence with runtime-first internal boundary guards and provider-seam vector helper tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T20:40:56Z
- **Completed:** 2026-04-25T20:50:13Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Preserved public facade tests on real `LibSQLStore` construction in `test/libsql.test.ts`, `test/integration.test.ts`, and `test/store_extensions.test.ts`.
- Replaced helper-only `store.vectorStore` monkey patches in `test/ext.test.ts` with `makeRetrievalEmbedding` and provider-shaped fakes.
- Closed final guards by narrowing tool dependencies to capability-specific `*Deps` shapes and cleaning blocking type/cast drift.
- Created `10-FACADE-REGRESSION.md` with P10-01 through P10-05 coverage, public API review notes, guard results, and corrected Promise-boundary interpretation.

## Task Commits

1. **Task 1: Preserve and label public facade regression lanes** - `d588b42` (test)
2. **Task 2: Run final guards and record closure evidence** - `afe8e00` (fix)

## Files Created/Modified

- `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-FACADE-REGRESSION.md` - Final Phase 10 closure evidence.
- `test/ext.test.ts` - Vector helper assertions now use retrieval/provider seams instead of mutating public `vectorStore`.
- `src/tools/*.ts` - Tool factories accept capability-specific dependency shapes while remaining structurally compatible with public facade callers.
- `test/ingest/workflow.test.ts`, `test/search/hybrid.test.ts`, `test/search/search.test.ts` - Blocking type/cast drift cleaned for final guards.
- `src/store/Mappers.ts`, `src/store/SqlBuilder.ts`, `src/store/page.ts` - Minimal type hygiene needed for final `tsc` and cast guards.

## Decisions Made

- Keep `LibSQLStore` facade matches as intentional regression evidence.
- Treat `IngestionWorkflowStore` and `HybridSearchCompatBackend` as compatibility boundaries only; internal proof remains runtime/branch-service usage.
- Avoid old `PageToolsStore`, `SearchToolStore`, and related rejected Promise-contract names by using small `*Deps` structural types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Final guard exposed broad tool StoreProvider dependencies**
- **Found during:** Task 2
- **Issue:** `src/tools/**` still typed factory inputs as broad `StoreProvider`, causing the internal-lane guard to fail.
- **Fix:** Replaced those annotations with capability-specific dependency interfaces (`ConfigToolDeps`, `PageToolDeps`, etc.) and kept public facade callers structurally compatible.
- **Files modified:** `src/tools/config.ts`, `src/tools/import.ts`, `src/tools/links.ts`, `src/tools/list.ts`, `src/tools/page.ts`, `src/tools/raw.ts`, `src/tools/search.ts`, `src/tools/timeline.ts`
- **Verification:** broad `StoreProvider` guard passed; `bun test` and `pnpm exec tsc --noEmit` passed.
- **Committed in:** `afe8e00`

**2. [Rule 3 - Blocking] Typecheck and cast guards exposed test/store drift**
- **Found during:** Task 2
- **Issue:** Final `tsc` and cast guards found stale test fixture types, guarded `as any` usage, and mapper generic drift.
- **Fix:** Replaced test `as any` assertions with typed helpers, aligned `SearchResult` fixtures, and adjusted store type assertions without widening public APIs.
- **Files modified:** `test/ingest/workflow.test.ts`, `test/search/hybrid.test.ts`, `test/search/search.test.ts`, `src/store/Mappers.ts`, `src/store/SqlBuilder.ts`, `src/store/page.ts`
- **Verification:** `pnpm exec tsc --noEmit` and forbidden cast guard passed.
- **Committed in:** `afe8e00`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were required to satisfy the final Phase 10 guard contract. No production behavior change was introduced beyond narrower compile-time dependency shapes.

## Issues Encountered

None remaining. Existing untracked `docs/specs/` and `test.ts` were present before this plan execution and were left untouched.

## Verification

- `bun test test/libsql.test.ts test/ext.test.ts test/integration.test.ts test/store_extensions.test.ts` - passed, 26 pass / 1 skip.
- `bun test` - passed, 113 pass / 2 skip.
- `pnpm exec tsc --noEmit` - passed.
- `pwsh ./scripts/check-effect-v4.ps1 src` - passed.
- `rg -n "LibSQLStore|new\s+LibSQLStore" src/store/libsql.ts test/libsql.test.ts test/integration.test.ts test/store_extensions.test.ts` - passed with intentional facade matches.
- `rg -n "getChunksWithEmbeddings" src/store/brainstore/content/chunks src/store/brainstore/compat src/store/libsql.ts test/ext.test.ts` - passed with branch owner, compat projection, and facade evidence.
- Old Promise-contract name guard - passed.
- Runtime/branch-service evidence grep - passed with expected matches.
- broad `StoreProvider` internal-lane guard - passed.
- raw vector mutation guard - passed.
- forbidden StoreProvider cast guard - passed.

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 10 is complete and ready for `$gsd-verify-work`. The public facade is preserved, internal broad dependencies are guarded, and final evidence is available in `10-FACADE-REGRESSION.md`.

## Self-Check: PASSED

- Found `10-07-SUMMARY.md`.
- Found `10-FACADE-REGRESSION.md`.
- Found task commit `d588b42`.
- Found task commit `afe8e00`.

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-25*
