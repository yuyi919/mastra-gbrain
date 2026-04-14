# Scripts Testing Spec

## Why
The scripts in `src/scripts` (`backlinks.ts`, `doctor.ts`, `embed.ts`) are currently lacking dedicated test coverage. To ensure they work reliably in realistic scenarios (e.g., maintaining the knowledge base, fixing missing backlinks, and performing incremental embeddings), we need to write integration tests with realistic fixtures and mock data.

## What Changes
- Refactor `src/scripts/doctor.ts` and `src/scripts/embed.ts` to accept an optional `StoreProvider` instance for dependency injection during testing.
- Refactor `src/scripts/backlinks.ts` to optionally return the missing backlinks data instead of just logging it, making it easier to assert in tests.
- Create realistic markdown fixtures for the `check-backlinks` script (files with valid links, missing links, and circular links).
- Write `test/scripts/backlinks.test.ts` to test both `check` and `fix` modes of the backlinks script.
- Write `test/scripts/doctor.test.ts` to test the `runDoctor` script's ability to diagnose a healthy and an unhealthy store.
- Write `test/scripts/embed.test.ts` to test the `embedStale` script's ability to find and process un-embedded chunks.

## Impact
- Affected code: `src/scripts/doctor.ts`, `src/scripts/embed.ts`, `src/scripts/backlinks.ts`, `test/scripts/*.test.ts`.
- The changes to the scripts are non-breaking; they simply expose parameters for testing and return structured data.

## ADDED Requirements
### Requirement: Script Testability
All maintenance scripts SHALL support dependency injection (e.g., accepting a `StoreProvider`) to allow testing without relying on the global default store.

#### Scenario: Testing backlinks
- **WHEN** the `checkBacklinks` function is called on a directory with missing links
- **THEN** it SHALL return a map or list of missing backlinks and correctly append them to the target files if `fix` is true.

## MODIFIED Requirements
### Requirement: Doctor and Embed Scripts
The `runDoctor` and `embedStale` functions SHALL accept an optional `storeInstance` parameter, falling back to `createDefaultStore()` if not provided.