---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "05"
subsystem: search
tags: [effect-v4, brainstore, hybrid-search, tools, libsql]
requires:
  - phase: 10-04
    provides: Content chunk ownership moved behind branch services and facade compatibility
provides:
  - Runtime-backed hybridSearch wrapper over hybridSearchEffect
  - Branch-only BrainStoreSearch runtime test coverage without StoreProvider casts
  - Search tool compatibility preserved at the public facade boundary
  - Reliable cleanDBFile(true) database cleanup for isolated tool integration tests
affects: [phase-10, tool-consumers, script-consumers, public-facade-tests]
tech-stack:
  added: []
  patterns:
    - Effect-first internal search with local runtime carrier compatibility wrapper
    - Legacy Promise fallback named as compatibility glue only
key-files:
  created:
    - .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-05-SUMMARY.md
  modified:
    - src/search/hybrid.ts
    - src/tools/search.ts
    - src/store/libsql.ts
    - test/search/hybrid.test.ts
key-decisions:
  - "Keep hybridSearchEffect as the canonical BrainStoreSearch implementation and make hybridSearch a runtime bridge when brainStore.runPromise is available."
  - "Preserve public tool factory StoreProvider compatibility while avoiding a new src/tools/contracts.ts or Promise-shaped tool contract family."
  - "Retain the legacy Promise search fallback only as local compatibility glue for lightweight callers."
requirements-completed: [P10-02, P10-03, P10-04, P10-05]
duration: 4min
completed: 2026-04-25
---

# Phase 10 Plan 05: Direct Effect Runtime Tool/Search Summary

**Runtime-backed hybrid search over BrainStoreSearch with public tool facade compatibility preserved**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T20:23:09Z
- **Completed:** 2026-04-25T20:27:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Re-typed `hybridSearch` around a local `BrainStoreSearchRuntimeCarrier` plus explicit legacy compatibility fallback, removing the broad `StoreProvider` dependency from `src/search/hybrid.ts`.
- Added branch-only runtime coverage proving `hybridSearch` can execute through `brainStore.runPromise(hybridSearchEffect(...))` without casting narrow mocks to the full public facade.
- Kept public tool factories compatible with `LibSQLStore` / `StoreProvider`; no `src/tools/contracts.ts` or old Promise-contract family was introduced.
- Restored `cleanDBFile(true)` database file deletion so tool and integration tests start from an isolated `./tmp/` database.

## Task Commits

1. **Task 1 RED: Hybrid runtime boundary test** - `e997681` (test)
2. **Task 1 GREEN: Runtime-first hybrid search** - `c0348c4` (feat)
3. **Task 2: Runtime-backed search tool alignment** - `9877fb1` (fix)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `src/search/hybrid.ts` - Adds a local runtime carrier and marks the Promise search fallback as compatibility glue.
- `test/search/hybrid.test.ts` - Replaces `as unknown as StoreProvider` mocks with typed branch runtime and local legacy fallback tests.
- `src/tools/search.ts` - Keeps public factory compatibility while documenting the runtime-backed internal path.
- `src/store/libsql.ts` - Fixes `dropDBFile()` so explicit test cleanup removes the SQLite database file as well as vector data.
- `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-05-SUMMARY.md` - Execution record.

## Decisions Made

- The search lane now treats `hybridSearchEffect` as the source of truth and `hybridSearch` as a compatibility bridge that prefers `brainStore.runPromise`.
- Public tool factory signatures remain facade-shaped because that is the public boundary; internal search behavior no longer models itself on a full Promise store.
- The old search Promise fallback remains local to `hybrid.ts` for lightweight callers and tests, with naming/comments that prevent it becoming the internal pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored database file cleanup for isolated verification**
- **Found during:** Task 2 (tool/search verification)
- **Issue:** `cleanDBFile(true)` left the SQLite database file on disk because the unlink call in `dropDBFile()` was commented out. Re-running `test/tools.test.ts` and `test/integration.test.ts` reused old content hashes and returned `skipped` imports.
- **Fix:** Re-enabled configured database file unlinking for non-memory URLs after disposing the runtime.
- **Files modified:** `src/store/libsql.ts`
- **Verification:** `bun test test/tools.test.ts test/integration.test.ts test/search/hybrid.test.ts`
- **Committed in:** `9877fb1`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was necessary to verify the tool/search plan reliably and stays within the existing explicit cleanup API.

## Issues Encountered

- Initial Task 2 verification failed because persisted `./tmp` test databases caused imports to be skipped. The cleanup fix above resolved the issue; the same verification command then passed.

## TDD Gate Compliance

- RED commit present: `e997681`
- GREEN commit present after RED: `c0348c4`
- Refactor commit: not needed

## Known Stubs

None. Stub scan hits were existing/default parameter patterns or null checks that do not feed placeholder UI/data.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: file-cleanup | `src/store/libsql.ts` | `dropDBFile()` now performs the configured database-file unlink that the method name and tests already expected. Scope is limited to explicit cleanup calls and skips `file::memory:`. |

## Verification

- `bun test test/search/hybrid.test.ts` - passed
- `pwsh -NoProfile -Command "if (rg -n 'as unknown as StoreProvider|import type \\{ StoreProvider \\}' test/search/hybrid.test.ts src/search/hybrid.ts) { throw 'broad StoreProvider cast/import remains in hybrid search tests or implementation' }"` - passed
- `rg -n "hybridSearchEffect|BrainStoreSearch|runPromise" src/search/hybrid.ts test/search/hybrid.test.ts` - passed
- `bun test test/tools.test.ts test/integration.test.ts test/search/hybrid.test.ts` - passed
- `pwsh -NoProfile -Command "if (Test-Path src/tools/contracts.ts) { throw 'tool Promise contract layer should not be created for this corrected phase goal' }"` - passed
- `pwsh -NoProfile -Command "if (rg -n 'PageToolsStore|LinksToolsStore|TimelineToolsStore|ConfigToolsStore|RawDataToolsStore|ListPagesStore|SearchToolStore|HybridSearchPromiseStore' src test) { throw 'old narrow Promise contract plan leaked into implementation' }"` - passed
- `pwsh ./scripts/check-effect-v4.ps1` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 10-06 script/helper consumer narrowing. The search/tool lane now has direct runtime evidence, public facade compatibility, and guards against the superseded Promise-contract plan.

## Self-Check: PASSED

- Summary file exists: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-05-SUMMARY.md`
- Task commits found: `e997681`, `c0348c4`, `9877fb1`

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-25*
