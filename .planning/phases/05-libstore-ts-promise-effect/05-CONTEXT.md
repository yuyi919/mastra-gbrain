# Phase 5: libstore-ts-promise-effect - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure-only smart discuss)

<domain>
## Phase Boundary

This phase completes the `LibSQLStore` adapter migration by routing the
remaining direct `Promise`/mapper-backed methods in `src/store/libsql.ts`
through the Effect-backed `BrainStore` service where equivalent capabilities
already exist.

The phase does not add user-facing features and does not change the
`StoreProvider` contract exposed to tools, ingestion, or tests.

</domain>

<decisions>
## Implementation Decisions

### Adapter Routing
- Prefer replacing direct `this.mappers.*` access in `src/store/libsql.ts` with
  `this.run(...)` calls into `BrainStore` when an equivalent service method
  already exists.
- Keep behavior-compatible edge cases intact, especially for missing pages,
  JSON decoding, and nullable fields.

### Scope Boundaries
- Limit code changes to the adapter layer unless a missing Effect capability
  blocks migration.
- Leave lifecycle helpers such as file cleanup alone unless they directly block
  the adapter migration goal.

### Verification
- Re-run the store extension and libsql regression tests after refactoring.
- Use existing tests first; only add new assertions if coverage for migrated
  methods is missing.

### the agent's Discretion
The exact grouping of migrated methods and whether an extra regression test is
needed is at the agent's discretion, as long as the adapter keeps the same
public behavior and the test suite stays green.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/libsql-store.ts` already provides Effect-backed implementations for
  timeline, raw data, files, config, logs, token verification, health, and
  maintenance methods.
- `src/store/libsql.ts` already exposes `run()` and `runFlatten()` helpers to
  bridge from the Promise adapter to `BrainStore`.

### Established Patterns
- Adapter methods that are already migrated use `return this.run((store) => ...)`
  or `return this.runFlatten((store) => ...)`.
- Data shape normalization happens in the Effect store, so the adapter can stay
  thin when routing through `BrainStore`.

### Integration Points
- `test/libsql.test.ts`, `test/store_extensions.test.ts`, and `test/ext.test.ts`
  exercise many of the methods still implemented directly in `libsql.ts`.
- `src/ingest/workflow.ts` relies on `transaction()` semantics remaining
  behavior-compatible.

</code_context>

<specifics>
## Specific Ideas

No specific product requirements. The main success signal is that the adapter
becomes a thin Promise facade over `BrainStore` for the remaining supported
methods.

</specifics>

<deferred>
## Deferred Ideas

None. This phase is intentionally narrow and infrastructure-only.

</deferred>
