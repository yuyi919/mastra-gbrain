---
phase: 05-libstore-ts-promise-effect
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/store/libsql.ts
  - .planning/phases/05-libstore-ts-promise-effect/05-01-SUMMARY.md
  - .planning/phases/05-libstore-ts-promise-effect/05-VERIFICATION.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
autonomous: true
requirements:
  - PH5-R1-effect-routing
  - PH5-R2-regression-verification
must_haves:
  truths:
    - "Remaining adapter methods in src/store/libsql.ts route through BrainStore where equivalent Effect services already exist."
    - "LibSQLStore behavior stays compatible for extension-heavy operations after the routing change."
  artifacts:
    - "src/store/libsql.ts keeps Promise-based StoreProvider signatures while delegating through run()/runFlatten()."
    - ".planning/phases/05-libstore-ts-promise-effect/05-01-SUMMARY.md exists and records the migrated method groups plus verification results."
  key_links:
    - "Each migrated method in libsql.ts corresponds to an existing implementation in libsql-store.ts."
    - "Regression test results cover the migrated adapter behavior."
---

<objective>
Finish the adapter migration for `LibSQLStore` by replacing remaining
direct-mapper Promise methods in `src/store/libsql.ts` with calls into the
Effect-backed `BrainStore` service, then verify that extension and storage
behaviors remain stable.
</objective>

<execution_context>
@D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/.codex/get-shit-done/workflows/execute-plan.md
@D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/05-libstore-ts-promise-effect/05-CONTEXT.md
@src/store/libsql.ts
@src/store/libsql-store.ts
@src/store/interface.ts
@test/libsql.test.ts
@test/store_extensions.test.ts
@test/ext.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Route remaining adapter methods through BrainStore</name>
  <files>src/store/libsql.ts</files>
  <read_first>src/store/libsql.ts, src/store/libsql-store.ts, src/store/interface.ts</read_first>
  <action>Replace direct mapper-backed methods in `LibSQLStore` with `this.run(...)` calls wherever `libsql-store.ts` already exposes an equivalent Effect implementation. Keep method signatures and edge-case behavior intact.</action>
  <verify>rg -n "async (addTimelineEntry|addTimelineEntriesBatch|getTimeline|putRawData|getRawData|upsertFile|getFile|getConfig|setConfig|logIngest|getIngestLog|updateSlug|rewriteLinks|verifyAccessToken|logMcpRequest|getEmbeddingsByChunkIds)" src/store/libsql.ts</verify>
  <acceptance_criteria>
    - The adapter no longer performs direct mapper reads/writes for the migrated method groups.
    - Behavior remains compatible with the existing `StoreProvider` API.
  </acceptance_criteria>
  <done>libsql.ts is reduced to a thin Promise facade over BrainStore for the targeted methods</done>
</task>

<task type="auto">
  <name>Task 2: Verify migrated adapter behavior</name>
  <files>test/libsql.test.ts, test/store_extensions.test.ts, test/ext.test.ts</files>
  <read_first>test/libsql.test.ts, test/store_extensions.test.ts, test/ext.test.ts</read_first>
  <action>Run focused regression tests that exercise the migrated methods. Add or adjust a regression assertion only if an uncovered adapter edge case is discovered during refactoring.</action>
  <verify>bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts</verify>
  <acceptance_criteria>
    - Targeted adapter regression tests pass without introducing new failures.
    - Any new or updated assertion directly protects migrated behavior.
  </acceptance_criteria>
  <done>verification evidence exists for the migrated method groups</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts` passes
- [ ] `src/store/libsql.ts` routes targeted adapter methods through `BrainStore`
- [ ] Summary records migrated method groups and regression evidence
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No StoreProvider signature changes
- Phase 5 is ready for milestone closure review without reopening adapter migration work
</success_criteria>

<output>
After completion, create `.planning/phases/05-libstore-ts-promise-effect/05-01-SUMMARY.md` and `.planning/phases/05-libstore-ts-promise-effect/05-VERIFICATION.md`
</output>
