# Tasks
- [x] Task 1: Make scripts testable with Dependency Injection
  - [x] SubTask 1.1: Modify `src/scripts/doctor.ts` to accept `runDoctor(storeInstance?: StoreProvider)`.
  - [x] SubTask 1.2: Modify `src/scripts/embed.ts` to accept `embedStale(batchSize?: number, storeInstance?: StoreProvider)`.
  - [x] SubTask 1.3: Modify `src/scripts/backlinks.ts` to return an array of missing backlinks or a boolean indicating success, instead of just logging. Also allow testing `fix` mode.

- [x] Task 2: Create fixtures for script tests
  - [x] SubTask 2.1: Create `test/fixtures/scripts/backlinks/` with realistic markdown files (e.g., A linking to B, but B missing link to A).

- [x] Task 3: Write tests for `check-backlinks` script
  - [x] SubTask 3.1: Write `test/scripts/backlinks.test.ts` to test the `check` mode and verify it identifies missing backlinks.
  - [x] SubTask 3.2: Test the `fix` mode to verify it appends missing backlinks to the target file's Timeline.

- [x] Task 4: Write tests for `doctor` and `embed` scripts
  - [x] SubTask 4.1: Write `test/scripts/doctor.test.ts` to verify `runDoctor` correctly identifies healthy and unhealthy databases using a mock or isolated in-memory `LibSQLStore`.
  - [x] SubTask 4.2: Write `test/scripts/embed.test.ts` to verify `embedStale` properly finds chunks without embeddings and calls `embedBatch`.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 1
