---
phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
plan: "03"
subsystem: vector-provider-boundary
tags: [libsqlstore, vector-provider, brainstore, effect-v4, layer-composition]

requires:
  - phase: 10-02
    provides: Narrow ingestion workflow/provider contract and Phase 10 consumer inventory baseline
provides:
  - Typed internal `VectorProvider` Context.Service for query, upsert, delete, createIndex, and dispose operations
  - Retrieval embedding, lifecycle, and ops internal branches wired through the provider instead of raw vector clients
  - Focused provider tests proving Layer.succeed injection, live delegation, and noop behavior
affects: [phase-10, vector-provider-boundary, retrieval-embedding, ops-lifecycle, ops-internal]

tech-stack:
  added: []
  patterns:
    - Internal typed vector provider layer
    - Noop provider for stores without vector clients
    - Branch consumers acquire vector operations through Layer-provided Context.Service

key-files:
  created:
    - src/store/brainstore/ops/vector/interface.ts
    - src/store/brainstore/ops/vector/factory.ts
    - src/store/brainstore/ops/vector/index.ts
    - test/store/vector-provider.test.ts
  modified:
    - src/store/brainstore/retrieval/embedding/factory.ts
    - src/store/brainstore/ops/internal/interface.ts
    - src/store/brainstore/ops/internal/factory.ts
    - src/store/brainstore/ops/lifecycle/interface.ts
    - src/store/brainstore/ops/lifecycle/factory.ts
    - src/store/libsql-store.ts

key-decisions:
  - "Introduced `VectorProvider` under `ops/vector` as the only branch-level wrapper around raw vector client operations."
  - "Kept `LibSQLStore.vectorStore` facade compatibility intact while removing raw vector client fan-out from retrieval, lifecycle, and ops internal branch dependency surfaces."
  - "Allowed lifecycle `dispose()` to return the store error channel because provider disposal is now typed through `VectorProviderService.dispose()`."

patterns-established:
  - "Vector branch dependencies should use `VectorProviderService` or a narrow `Pick<>` of that service, never raw `LibSQLVector`."
  - "`libsql-store.ts` composes the vector provider layer once and provides it to branch layers that need vector operations."

requirements-completed: [P10-02, P10-05]

duration: 7min
completed: 2026-04-26
---

# Phase 10 Plan 03: Typed Vector Provider Summary

**Raw LibSQL vector access is now wrapped by an internal Effect v4 provider layer consumed by retrieval, lifecycle, and ops branches**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-25T19:15:33Z
- **Completed:** 2026-04-25T19:21:51Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `VectorProvider` as a typed internal `Context.Service` with live and noop construction paths.
- Added TDD coverage for `Layer.succeed` injection, live vector delegation, noop behavior, and layer construction.
- Rewired retrieval embedding `query/upsert`, lifecycle `createIndex/dispose`, and ops internal diagnostics to typed provider contracts.
- Updated `libsql-store.ts` so it composes the provider layer from the public facade's `options.vectorStore` and provides that layer to branch consumers.

## Task Commits

1. **Task 1 RED: Add typed vector provider coverage** - `346b336` (test)
2. **Task 1 GREEN: Implement typed vector provider service** - `2c7c52a` (feat)
3. **Task 2: Rewire vector consumers to the provider service** - `bfd6243` (feat)

_Note: Task 1 followed the required TDD flow with a failing test commit before implementation._

## Files Created/Modified

- `src/store/brainstore/ops/vector/interface.ts` - Defines `VectorProvider`, provider input/result types, and the client/service contracts.
- `src/store/brainstore/ops/vector/factory.ts` - Builds live and noop provider services and exposes `makeLayer`.
- `src/store/brainstore/ops/vector/index.ts` - Exports the provider branch surface.
- `test/store/vector-provider.test.ts` - Covers service injection, live delegation, noop writes, and layer construction.
- `src/store/brainstore/retrieval/embedding/factory.ts` - Uses `Pick<VectorProviderService, "query" | "upsert">` for vector search and writes.
- `src/store/brainstore/ops/lifecycle/factory.ts` - Uses `Pick<VectorProviderService, "createIndex" | "dispose">` for vector index lifecycle.
- `src/store/brainstore/ops/lifecycle/interface.ts` - Aligns lifecycle dispose with the provider's typed store error channel.
- `src/store/brainstore/ops/internal/interface.ts` - Replaces raw `vectorStore` exposure with typed `vectors`.
- `src/store/brainstore/ops/internal/factory.ts` - Acquires `VectorProvider` from Layer composition.
- `src/store/libsql-store.ts` - Assembles and provides the vector provider layer while preserving public facade vector compatibility.

## Decisions Made

- The vector provider exposes a minimal `VectorProviderClient` port instead of exporting `LibSQLVector` through branch contracts.
- The provider has a noop implementation so stores without vector clients preserve existing no-op vector behavior.
- `libsql-store.ts` still reads the public `options.vectorStore`, but raw calls are delegated through `makeVectorProvider`; public `src/store/libsql.ts` compatibility remains untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed no-arg internal layer construction after removing raw vector options**
- **Found during:** Task 2 (Rewire vector consumers to the provider service)
- **Issue:** `makeOpsInternalLayer()` became the correct assembly call, but `makeLayer` did not default its options object and crashed on an `in` check.
- **Fix:** Added a default `{}` to the ops internal layer factory and acquired `VectorProvider` through Layer composition.
- **Files modified:** `src/store/brainstore/ops/internal/factory.ts`
- **Verification:** Targeted vector/ext/search/libsql tests passed.
- **Committed in:** `bfd6243`

**2. [Rule 1 - Bug] Aligned provider-facing types with TypeScript and package exports**
- **Found during:** Task 2 post-verification type check
- **Issue:** The first provider interface referenced a non-exported `@mastra/libsql` filter path, and lifecycle `dispose()` still advertised a never-error effect while delegating to a provider method with `StoreError`.
- **Fix:** Switched the provider filter type to the public `@mastra/core/vector` export, introduced the narrow `VectorProviderClient` port, and aligned lifecycle `dispose()` with `EngineEffect<void>`.
- **Files modified:** `src/store/brainstore/ops/vector/interface.ts`, `src/store/brainstore/ops/vector/factory.ts`, `src/store/brainstore/ops/lifecycle/interface.ts`, `test/store/vector-provider.test.ts`
- **Verification:** `bunx tsc --noEmit` passed.
- **Committed in:** `bfd6243`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary to keep the new provider layer type-correct and usable by runtime assembly. No public API widening was introduced.

## Known Stubs

None. Stub-pattern scan findings were local accumulators and default option objects, not UI/data-source stubs.

## Threat Flags

None - the new vector provider was the planned trust-boundary mitigation and introduced no unplanned network endpoints, auth paths, file access patterns, or schema changes.

## Issues Encountered

- `gsd-sdk` is not available on PATH in this environment. GSD metadata updates use the repository fallback `node .codex/get-shit-done/bin/gsd-tools.cjs`.
- The fallback `state record-metric` handler inserted the Plan 10-03 metric into the Quick Tasks table for this STATE template; the row was moved into the Performance Metrics table before the metadata commit.

## Verification

- `bun test test/store/vector-provider.test.ts`
- `pwsh ./scripts/check-effect-v4.ps1 src`
- `bun test test/store/vector-provider.test.ts test/ext.test.ts test/search/hybrid.test.ts test/libsql.test.ts`
- `pwsh -NoProfile -Command "if (rg -n 'vectorStore\\?: LibSQLVector|deps\\.vectorStore|service\\.vectorStore' src/store/brainstore) { throw 'raw vector branch dependency remains' }"`
- `bunx tsc --noEmit`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 10-04 can move `getChunksWithEmbeddings` ownership into `ContentChunksService` with the vector provider already available as the internal low-level vector boundary.

## Self-Check: PASSED

- FOUND: `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-03-SUMMARY.md`
- FOUND: `src/store/brainstore/ops/vector/interface.ts`
- FOUND: `src/store/brainstore/ops/vector/factory.ts`
- FOUND: `src/store/brainstore/ops/vector/index.ts`
- FOUND: `test/store/vector-provider.test.ts`
- FOUND: `src/store/brainstore/retrieval/embedding/factory.ts`
- FOUND: `src/store/brainstore/ops/internal/interface.ts`
- FOUND: `src/store/brainstore/ops/internal/factory.ts`
- FOUND: `src/store/brainstore/ops/lifecycle/interface.ts`
- FOUND: `src/store/brainstore/ops/lifecycle/factory.ts`
- FOUND: `src/store/libsql-store.ts`
- FOUND: task commit `346b336`
- FOUND: task commit `2c7c52a`
- FOUND: task commit `bfd6243`

---
*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Completed: 2026-04-26*
