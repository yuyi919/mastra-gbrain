# Test Cleanup and Translation Spec

## Why
1. The translation task for the documents in the `references` directory was incomplete, and an `AGENTS.md` is needed to indicate the directory's origin.
2. Test databases were created in the project root, creating clutter. They need to be moved to `file:./tmp/` and the root directory needs cleanup.
3. Tests contain hacky operations (like `Object.defineProperty` on the global store) that need to be refactored to use existing dependency injection factory functions.

## What Changes
- Complete translation of all markdown files under `references/docs`, `references/recipes`, and `references/TODOS.md` to Chinese.
- Add `references/AGENTS.md` to explain the origin of the directory.
- Update all test files (`test/integration.test.ts`, `test/tools.test.ts`, `test/libsql.test.ts`, `test/store_extensions.test.ts`) to use database URLs like `file:./tmp/test-xxx.db`.
- Remove all `*.db*` files from the project root.
- Refactor `src/store/index.ts` to export factory functions `createDefaultStore()` and `createDefaultEmbedder()` instead of static instances.
- Remove the `Object.defineProperty` hack in `test/integration.test.ts` and correctly pass the dependency injected `store` and `embedder` to `bulkImport`.

## Impact
- Affected specs: `gbrain-maintenance-tools` (Translation task completion).
- Affected code: All test files, `src/store/index.ts`, `src/scripts/import.ts`.

## ADDED Requirements
### Requirement: Test Database Path
All SQLite databases used in testing SHALL be created inside the `./tmp/` directory.

### Requirement: AGENTS.md Origin Note
The `references` directory SHALL contain an `AGENTS.md` file noting its origin from pulling gbrain and periodic translation.

## MODIFIED Requirements
### Requirement: Global Store Initialization
The system SHALL NOT export a static `store` instance from `src/store/index.ts`. Instead, it SHALL provide factory functions for dependency injection.
