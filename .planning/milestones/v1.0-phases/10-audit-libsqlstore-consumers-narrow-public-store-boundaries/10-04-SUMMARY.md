---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "04"
subsystem: content-chunks-branch-ownership
tags: [brainstore, content-chunks, effect-v4, libsqlstore-facade]

requires:
  - phase: 10-03
    provides: Typed internal VectorProvider layer and branch vector wiring
provides:
  - Branch-owned `ContentChunksService.getChunksWithEmbeddings`
  - Compat projection from `BrainStoreTree.content.chunks`
  - Public `LibSQLStore.getChunksWithEmbeddings` behavior preserved
affects: [phase-10, content-chunks, compat-facade, public-store-regression]

tech-stack:
  added: []
  patterns:
    - Branch-owned helper projected through compat facade
    - Effect runtime branch-service injection test

key-files:
  created:
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-04-SUMMARY.md
  modified:
    - src/store/brainstore/content/chunks/interface.ts
    - src/store/brainstore/content/chunks/factory.ts
    - src/store/brainstore/compat/factory.ts
    - src/store/BrainStore.ts
    - src/store/libsql-store.ts
    - test/store/brainstore-layers.test.ts

key-decisions:
  - "`getChunksWithEmbeddings` is now owned by `ContentChunksService` and projected through compat instead of implemented in `libsql-store.ts`."
  - "Current public behavior remains chunk-only, matching the previous facade behavior while leaving vector payload retrieval out of scope."
  - "`BrainStore.Ingestion` now inherits the helper from `ContentChunksService` instead of redeclaring a duplicate method."

patterns-established:
  - "Move feature helper ownership into the owning branch, then project through compat for public Promise facade stability."
  - "Use `ManagedRuntime` plus `Layer.succeed` to prove branch-service access without constructing `LibSQLStore`."

requirements-completed: [P10-02, P10-04, P10-05]

duration: 16min
completed: 2026-04-26
---

# Phase 10 Plan 04: Content Chunks Helper Ownership Summary

**`getChunksWithEmbeddings` now belongs to the content chunks branch and still works through the public `LibSQLStore` facade**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-26T03:19:00+08:00
- **Completed:** 2026-04-26T03:35:05+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `getChunksWithEmbeddings(slug)` to `ContentChunksService` and `makeContentChunks`.
- Repointed `BrainStoreCompat` and legacy ingestion projection to `tree.content.chunks.getChunksWithEmbeddings`.
- Removed the local `brainstore.compat.getChunksWithEmbeddings` implementation from `libsql-store.ts`.
- Added branch-only runtime coverage using `ManagedRuntime` and `Layer.succeed(ContentChunks, ...)`.
- Verified existing public facade coverage in `test/ext.test.ts` and `test/libsql.test.ts`.

## Task Commits

1. **Task 1 RED: Add branch chunks helper coverage** - `40e4413` (test)
2. **Task 1/2 GREEN: Own chunks embedding helper in branch service** - `be271bc` (feat)

_Note: Task 1 followed TDD with a failing runtime test before implementation._

## Files Created/Modified

- `src/store/brainstore/content/chunks/interface.ts` - Adds the branch-owned helper to `ContentChunksService`.
- `src/store/brainstore/content/chunks/factory.ts` - Implements the helper with the same chunk-only return shape as the previous public facade path.
- `src/store/brainstore/compat/factory.ts` - Projects the helper from `tree.content.chunks`.
- `src/store/BrainStore.ts` - Removes duplicate helper declaration from `IngestionStore`.
- `src/store/libsql-store.ts` - Stops implementing the helper locally in assembly code.
- `test/store/brainstore-layers.test.ts` - Proves branch-service access without `LibSQLStore`.

## Decisions Made

- Preserved existing public behavior by returning the same chunk shape as `getChunks`, with `embedding: null`.
- Kept vector payload retrieval out of scope because no current public regression requires it.
- Treated the public `LibSQLStore` method as facade compatibility only; branch ownership is now the source of truth.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The RED test failed as expected because `service.getChunksWithEmbeddings` was undefined before the branch method existed.
- Pre-commit formatting ran through `lint-staged` and completed successfully on both task commits.

## Verification

- `bun test test/store/brainstore-layers.test.ts`
- `bun test test/ext.test.ts test/libsql.test.ts test/store/brainstore-layers.test.ts`
- `bunx tsc --noEmit`
- `pwsh ./scripts/check-effect-v4.ps1 src`
- `pwsh -NoProfile -Command "if (rg -n 'brainstore\\.compat\\.getChunksWithEmbeddings|makeCompat.*getChunksWithEmbeddings' src/store/libsql-store.ts) { throw 'compat helper still implemented in libsql-store.ts' }; rg -n 'getChunksWithEmbeddings' src/store/brainstore/content/chunks src/store/brainstore/compat src/store/libsql.ts test/ext.test.ts test/store/brainstore-layers.test.ts"`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 10-05 can continue with the corrected direct Effect runtime direction. The chunks helper is branch-owned, `libsql-store.ts` remains assembly-only for this behavior, and public facade tests still pass.

## Self-Check: PASSED

- FOUND: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-04-SUMMARY.md`
- FOUND: `ContentChunksService.getChunksWithEmbeddings`
- FOUND: `tree.content.chunks.getChunksWithEmbeddings` compat projection
- VERIFIED: `libsql-store.ts` no longer implements `brainstore.compat.getChunksWithEmbeddings`
- VERIFIED: task commits `40e4413` and `be271bc`

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-26*
