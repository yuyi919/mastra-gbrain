# Tasks
- [x] Task 1: Update `SearchResult` interface
  - [x] SubTask 1.1: Add `stale?: boolean` to `SearchResult` in `src/types.ts`.
  - [x] SubTask 1.2: Update `searchKeyword` SQL in `src/store/libsql.ts` to compute `stale` as `(c.embedded_at IS NULL OR p.updated_at > c.embedded_at)`.
  - [x] SubTask 1.3: Update `searchVector` in `src/store/libsql.ts` to return `stale: false` (since vectors are fresh if retrieved).

- [x] Task 2: Extend `StoreProvider` interface
  - [x] SubTask 2.1: Add `DatabaseHealth` and `StaleChunk` types to `src/types.ts`.
  - [x] SubTask 2.2: Add `getHealthReport()`, `getStaleChunks()`, `upsertVectors()`, and `markChunksEmbedded()` methods to `StoreProvider` in `src/store/interface.ts`.

- [x] Task 3: Implement Encapsulated Methods in `LibSQLStore`
  - [x] SubTask 3.1: Implement `getHealthReport` by migrating the SQL connection, tables, FTS, and vector coverage checks from `doctor.ts`.
  - [x] SubTask 3.2: Implement `getStaleChunks` by migrating the `select` logic from `embed.ts`.
  - [x] SubTask 3.3: Implement `upsertVectors` to abstract `vectorStore.upsert`.
  - [x] SubTask 3.4: Implement `markChunksEmbedded` to update `embedded_at` in `content_chunks`.

- [x] Task 4: Refactor Scripts
  - [x] SubTask 4.1: Refactor `src/scripts/doctor.ts` to simply call `await store.getHealthReport()` and print the results without importing `drizzle-orm` or `LibSQLStore`.
  - [x] SubTask 4.2: Refactor `src/scripts/embed.ts` to use `await store.getStaleChunks()`, `await store.upsertVectors()`, and `await store.markChunksEmbedded()` without raw SQL.
  - [x] SubTask 4.3: Ensure `test/scripts/doctor.test.ts` and `test/scripts/embed.test.ts` are updated to expect the new structure if necessary.

- [x] Task 5: Verify Changes
  - [x] SubTask 5.1: Run `bun test` to ensure all tests pass.
  - [x] SubTask 5.2: Run `bun tsc --noEmit` to ensure zero type errors.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4
