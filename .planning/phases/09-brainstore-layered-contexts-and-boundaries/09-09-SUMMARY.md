---
phase: 09-brainstore-layered-contexts-and-boundaries
plan: "09"
subsystem: store
tags: [brainstore, tree, compat, runtime, effect-v4]
requires:
  - phase: 09-brainstore-layered-contexts-and-boundaries
    provides: tree-first runtime wiring
provides:
  - BrainStoreCompat adapter derived from BrainStoreTree
  - LibSQL Promise runtime bridge routed through compat-over-tree
  - stable provider/workflow behavior without public API widening
affects: [brainstore-compat, libsql-runtime, provider-boundary]
tech-stack:
  added: []
  patterns: [compat-over-tree adapter, stable public provider boundary]
key-files:
  created: []
  modified:
    - src/store/BrainStore.ts
    - src/store/brainstore/compat/factory.ts
    - src/store/brainstore/ops/internal/interface.ts
    - src/store/libsql-store.ts
    - src/store/libsql.ts
key-decisions:
  - "The public Promise-facing LibSQL adapter now resolves BrainStoreCompat, not the legacy BrainStore root."
  - "Compat remains transitional, but its flat surface is rebuilt from BrainStoreTree branches."
patterns-established:
  - "Provider compatibility is preserved by layering BrainStoreCompat over BrainStoreTree."
requirements-completed: [P09-03, P09-04]
duration: 25min
completed: 2026-04-25
---

# Phase 09 Plan 09: Compat Runtime Provider Wiring Summary

**Public LibSQL and provider boundaries now run through a compat adapter layered over BrainStoreTree**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-25T20:49:00+08:00
- **Completed:** 2026-04-25T21:14:00+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Rebuilt `makeCompatBrainStore` so the flat compatibility surface is derived from `BrainStoreTree`.
- Added `BrainStoreCompat` to the runtime union so compat-backed consumers can be represented explicitly.
- Added a `BrainStoreCompat` layer to LibSQL runtime assembly and used it for compatibility-sensitive extension wiring.
- Routed `LibSQLStore.run` and `runFlatten` through `BrainStoreCompat` while preserving their Promise-facing public shape.
- Removed `as unknown` / `as any` casts from the touched store runtime modules by making the compat and tree adapters explicit.

## Task Commits

Planned for the Phase 09 closeout commit.

## Files Created/Modified

- `src/store/BrainStore.ts` - includes `BrainStoreCompat` in the runtime union.
- `src/store/brainstore/compat/factory.ts` - derives the flat compat adapter from `BrainStoreTree` branches.
- `src/store/brainstore/ops/internal/interface.ts` - types the internal mapper handle as the actual `SqlBuilder` service.
- `src/store/libsql-store.ts` - assembles `BrainStoreCompat` over tree/runtime layers and routes extension wiring through it.
- `src/store/libsql.ts` - resolves runtime helper methods through `BrainStoreCompat`.

## Decisions Made

- Kept legacy flat methods available only as a compatibility adapter, not as the architectural root.
- Preserved `getChunksWithEmbeddings` on the legacy compat surface because it is not yet branch-owned.
- Preserved legacy nested `createVersion` / `putPage` behavior on the compat surface while keeping tree content pages flattened.
- Left `src/store/index.ts` unchanged because the existing provider factory already points at `LibSQLStore` and required no API movement.

## Deviations from Plan

- `src/store/index.ts` and workflow tests did not require code edits; compatibility was verified through the existing public provider surface.

## Issues Encountered

None.

## Verification

- `bun test test/libsql.test.ts test/ingest/workflow.test.ts` - passed.
- `bun test test/libsql.test.ts test/ext.test.ts` - passed after the no-cast store cleanup.
- `tsc --noEmit` - passed.
- `pwsh ./scripts/check-effect-v4.ps1` - passed.

## Next Phase Readiness

Ready for 09-10 narrow-consumer audit and final compatibility regression closure.
