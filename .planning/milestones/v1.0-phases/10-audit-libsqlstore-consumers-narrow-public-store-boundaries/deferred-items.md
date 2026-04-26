# Phase 10 Deferred Items

## Plan 10-02

- `test/tools.test.ts` and `test/integration.test.ts` can fail when stale `tmp/test-tools*` or `tmp/test-integration*` database files exist because `LibSQLStore.cleanDBFile(true)` currently disposes/drops vector state but does not unlink the SQLite database file. Plan 10-02 verification removed only those generated test artifacts before running the required commands. This is pre-existing test isolation debt and was not changed in this workflow-boundary plan.
