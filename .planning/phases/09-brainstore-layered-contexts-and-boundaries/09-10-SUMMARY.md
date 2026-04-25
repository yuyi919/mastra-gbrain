---
phase: 09-brainstore-layered-contexts-and-boundaries
plan: "10"
subsystem: store
tags: [brainstore, retrieval, compat, regression, effect-v4]
requires:
  - phase: 09-brainstore-layered-contexts-and-boundaries
    provides: compat-over-tree runtime
provides:
  - narrow retrieval consumer proof for hybrid search
  - compat-backed embedding and stale-helper regression coverage
  - final no-flat-root projection verification for src/store
affects: [hybrid-search, libsql-compat, regression-tests]
tech-stack:
  added: []
  patterns: [branch-only retrieval injection, compat-backed public regression]
key-files:
  created: []
  modified:
    - test/ext.test.ts
key-decisions:
  - "hybridSearchEffect already depended on BrainStoreSearch and did not need another production rewrite."
  - "The ext regression now clears both primary and vector SQLite files before startup to keep test isolation deterministic."
patterns-established:
  - "Phase closeout verifies both branch-only consumers and compat-backed public helpers together."
requirements-completed: [P09-04]
duration: 20min
completed: 2026-04-25
---

# Phase 09 Plan 10: Narrow Consumers and Regression Closure Summary

**Phase 09 is locked with branch-only search injection and compat-backed public helper regressions**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-25T21:14:00+08:00
- **Completed:** 2026-04-25T21:34:00+08:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Confirmed `src/search/hybrid.ts` already consumes the narrow `BrainStoreSearch` retrieval contract.
- Preserved the existing branch-only `ManagedRuntime` injection proof in `test/search/hybrid.test.ts`.
- Fixed `test/ext.test.ts` isolation by deleting primary and vector SQLite files, including WAL/SHM companions, before each suite startup.
- Verified compat-backed vector, embedding, stale-helper, typecheck, and Effect v4 guard coverage as one final closeout command.

## Task Commits

Planned for the Phase 09 closeout commit.

## Files Created/Modified

- `test/ext.test.ts` - removes stale primary/vector SQLite files before initializing the compatibility regression store.

## Decisions Made

- Did not modify `src/search/hybrid.ts`; it already satisfied the narrow retrieval dependency requirement.
- Treated the ext test failure as database residue rather than a production regression, matching the repository's `./tmp/` test isolation discipline.

## Deviations from Plan

- No production search changes were necessary for Task 1 because the narrowed dependency was already present.

## Issues Encountered

- `test/ext.test.ts` could fail against stale local SQLite residue; the setup now removes primary and vector DB files before initialization.

## Verification

- `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts` - passed.
- `if (rg -n "store\.features\.|BrainStore\.use\(\(store\) => Eff\.succeed\(store\.features" src/store) { Write-Error "forbidden flat-root projection still present"; exit 1 }` - passed.
- `tsc --noEmit` - passed.
- `pwsh ./scripts/check-effect-v4.ps1` - passed.

## Next Phase Readiness

Phase 09 is ready for verification and milestone lifecycle routing.

