# Refactor Store and Search Result Spec

## Why
1. The `Store` layer currently leaks internal implementation details (e.g., `drizzleDb`, `db.query`, `vectorStore`) to external maintenance scripts like `doctor.ts` and `embed.ts`. We need to encapsulate database operations within `StoreProvider` to maintain clean architecture, avoid duplicated query logic, and ensure things stay simple.
2. The `SearchResult` interface is missing the `stale` field that exists in the original `gbrain` implementation. This field is crucial for determining if a chunk returned in search results has an outdated or missing embedding compared to its parent page's update time.

## What Changes
- Add a `stale?: boolean` field to `SearchResult` interface.
- Expand `StoreProvider` interface with encapsulated methods:
  - `getHealthReport(): Promise<DatabaseHealth>`
  - `getStaleChunks(): Promise<StaleChunk[]>`
  - `markChunksEmbedded(chunkIds: number[]): Promise<void>`
  - `upsertVectors(vectors: { id: string, vector: number[], metadata: any }[]): Promise<void>`
- Refactor `LibSQLStore` to implement these new methods, moving all internal SQL and vector store logic out of the scripts.
- Update `searchKeyword` in `LibSQLStore` to calculate the `stale` field directly in its SQL queries (`c.embedded_at IS NULL OR p.updated_at > c.embedded_at`).
- Update `searchVector` in `LibSQLStore` to safely default `stale: false` or calculate it if possible.
- Refactor `src/scripts/doctor.ts` to strictly use `store.getHealthReport()` without any casting or raw queries.
- Refactor `src/scripts/embed.ts` to strictly use `store.getStaleChunks()`, `store.upsertVectors()`, and `store.markChunksEmbedded()` without any casting.

## Impact
- Affected specs: `src/store/interface.ts`, `src/types.ts`
- Affected code: `src/store/libsql.ts`, `src/scripts/doctor.ts`, `src/scripts/embed.ts`, `test/scripts/doctor.test.ts`, `test/scripts/embed.test.ts`

## ADDED Requirements
### Requirement: Encapsulated Health and Stale Management
The `StoreProvider` SHALL expose methods for diagnosing health and managing stale chunks, preventing external code from executing raw SQL.

#### Scenario: Running Doctor
- **WHEN** the `runDoctor` script is executed
- **THEN** it SHALL call `store.getHealthReport()` and print the results without importing SQL drivers.

## MODIFIED Requirements
### Requirement: Search Result Schema
The `SearchResult` returned by the hybrid search backend MUST include a `stale` boolean to accurately reflect the sync state between the textual chunk and its embedding.

## Reflections on missed `stale` field
The `stale` field was missed previously because the initial porting focused purely on the semantic mapping and retrieval (RRF, bm25) rather than the data lifecycle of a chunk in a real-world, constantly updated environment. Adding `stale` is necessary to indicate to the agent when keyword matches might require re-embedding.