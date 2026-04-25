---
phase: 09-brainstore-layered-contexts-and-boundaries
reviewed: "2026-04-25T13:44:00.000Z"
status: clean
depth: standard
files_reviewed: 9
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
---

# Phase 09 Code Review

## Scope

- `src/store/BrainStore.ts`
- `src/store/brainstore/content/pages/factory.ts`
- `src/store/brainstore/compat/factory.ts`
- `src/store/brainstore/ops/internal/factory.ts`
- `src/store/brainstore/ops/internal/interface.ts`
- `src/store/brainstore/ops/lifecycle/factory.ts`
- `src/store/libsql-store.ts`
- `src/store/libsql.ts`
- `test/ext.test.ts`

## Result

No remaining blocking issues found.

## Review Notes

- Confirmed `LibSQLStore.run` and `runFlatten` resolve `BrainStoreCompat`, preserving the public Promise boundary while routing through the compat-over-tree runtime.
- Confirmed `makeCompatBrainStore` derives the compatibility surface from `BrainStoreTree` branches and only preserves legacy-only helpers from the old compat root.
- Confirmed `test/ext.test.ts` cleanup stays inside `./tmp/` and removes primary/vector SQLite WAL and SHM residue before test startup.
- During review, fixed one wiring risk before finalizing this report: `BrainStoreIngestion` now sources `getChunksWithEmbeddings` from `BrainStoreCompat` instead of the content chunk branch, which does not own that method.
- Follow-up cleanup removed `as unknown` / `as any` from the touched store runtime modules by replacing casts with explicit compat/tree adapters and typed error-code access.
- User review found the important architectural gap: `libsql-store.ts` was still duplicating branch implementations instead of using the branch factories. This has been corrected by building branch services through factories and using `Layer` to pass SQL, mapper, vector, backlink, embedding, lifecycle, and internal dependencies.

## Verification

- `rg -n "as unknown|as any" src/store/BrainStore.ts src/store/brainstore/compat/factory.ts src/store/libsql-store.ts src/store/libsql.ts src/store/brainstore/ops/internal/interface.ts` - no matches.
- `tsc --noEmit`
- `bun test test/libsql.test.ts test/ext.test.ts`
- `bun test test/libsql.test.ts test/ext.test.ts test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts`
- `pwsh ./scripts/check-effect-v4.ps1`
