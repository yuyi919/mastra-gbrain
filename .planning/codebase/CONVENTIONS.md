# Coding Conventions

**Analysis Date:** 2026-04-15

## Naming Patterns

**Files:**
- kebab-case for most source files, e.g. `llama-embedder.ts`, `dummy-embedder.ts`
- `index.ts` for package or feature entry modules such as `src/index.ts`, `src/agent/index.ts`
- `*.test.ts` for tests under `test/`

**Functions:**
- camelCase for functions and factory helpers, e.g. `createGBrainAgent`, `createIngestionWorkflow`, `extractWordsForSearch`
- Async functions do not use an `async` prefix; naming focuses on behavior, e.g. `searchKeyword`, `getHealthReport`
- Factory functions usually start with `create` and return configured objects

**Variables:**
- camelCase for locals and parameters
- UPPER_SNAKE_CASE for tuning constants such as `COSINE_DEDUP_THRESHOLD`, `MAX_TYPE_RATIO`, `LATEST_VERSION`
- No underscore private-prefix pattern is used

**Types:**
- PascalCase for interfaces, classes, and aliases, e.g. `StoreProvider`, `LibSQLStore`, `ChunkInput`
- No `I` prefix for interfaces

## Code Style

**Formatting:**
- Biome is the enforced formatter in `biome.json`
- 2-space indentation and 80-column line width
- Double quotes and semicolons are the repository default
- Trailing commas use Biome's `es5` setting

**Linting:**
- Biome linting is enabled for `**/*.ts`
- The repo is intentionally permissive in a few areas: explicit `any`, non-null assertions, and some unused variables are allowed
- Primary commands are `bun run check`, `bun run check:fix`, and `bun run format`

## Import Organization

**Order:**
1. External packages
2. Node built-ins
3. Internal relative modules
4. `import type` declarations, often grouped near the related module imports

**Grouping:**
- Imports are usually grouped with a blank line between external and local concerns
- Type-only imports are used consistently when the symbol is not needed at runtime
- Relative `.js` extensions are used in TS source to match emitted output

**Path Aliases:**
- No TS path aliases are in active use; imports are relative

## Error Handling

**Patterns:**
- Core store/library methods often return `null` or `false` for not-found cases
- Infrastructure and invariant failures use thrown `Error`
- Workflow logic favors explicit status objects such as `"imported"`, `"skipped"`, and `"error"`

**Error Types:**
- Generic `Error` is common; custom error classes are not a dominant pattern
- CLI scripts catch near `import.meta.main` and convert failures into console output plus exit codes

## Logging

**Framework:**
- Plain `console.log`, `console.warn`, and `console.error`
- Logging is concentrated in `src/scripts/*.ts`, not shared utility modules

**Patterns:**
- Progress-style logs for imports and embedding batches
- Health/status summaries for doctor and backlinks scripts
- Core reusable modules avoid noisy logging

## Comments

**When to Comment:**
- Comments explain workflow intent, safety notes, or non-obvious mechanics
- Many helper functions rely on readable naming and omit comments when logic is straightforward

**JSDoc/TSDoc:**
- Public/internal function-level docs appear in some utilities such as `src/segmenter.ts` and `src/scripts/import.ts`
- Coverage is not uniform across the whole repo; new public helpers should follow the more documented style

**TODO Comments:**
- No active `TODO`/`FIXME` pattern is prominent in `src/`

## Function Design

**Size:**
- Top-level orchestration functions can be long when they encode complete workflows, especially in `src/ingest/workflow.ts` and `src/store/libsql.ts`
- Complex logic is still split into named helper functions for parsing/chunking/search steps

**Parameters:**
- Small positional parameter lists are common for store/tool factories
- Options objects are used when configuration grows, e.g. `LibSQLStoreOptions`, `ChunkOptions`, `IngestionOptions`

**Return Values:**
- Guard clauses and early returns are common
- Tool/workflow outputs prefer explicit object payloads over tuples

## Module Design

**Exports:**
- Named exports are the norm across runtime modules
- Each tool/script/store concern usually lives in its own file
- Directory `index.ts` files are used selectively for entry composition rather than broad barrel exports

**Barrel Files:**
- Limited use; `src/index.ts`, `src/agent/index.ts`, and `src/workflow/index.ts` are focused entry points
- Internal modules are usually imported directly from their defining file

---

*Convention analysis: 2026-04-15*
*Update when patterns change*
