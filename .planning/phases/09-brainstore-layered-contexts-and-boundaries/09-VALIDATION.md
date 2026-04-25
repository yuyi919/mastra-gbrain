---
phase: 09
slug: brainstore-layered-contexts-and-boundaries
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-25
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for the BrainStore tree migration.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `bun test` + `tsc --noEmit` + `./scripts/check-effect-v4.sh` |
| **Config file** | [bunfig.toml](/D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/bunfig.toml) |
| **Quick run command** | `bun test test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts` |
| **Full suite command** | `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts test/ingest/workflow.test.ts test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh`
- **After every plan wave:** Run `bun test test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts`
- **Before `$gsd-verify-work`:** Run `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts test/ingest/workflow.test.ts test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh`
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | P09-01, P09-02 | T-09-01 | Content branches exist as standalone typed contracts in the locked folder layout. | static | `rg -n "Context\.Service|makeLayer|content/pages" src/store/brainstore/content/pages; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-01-02 | 01 | 1 | P09-02 | T-09-01 | Chunk branch stays separate from embedding/vector ownership. | static | `rg -n "Context\.Service|makeLayer|content/chunks" src/store/brainstore/content/chunks; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-02-01 | 02 | 1 | P09-02, P09-04 | T-09-01 | Graph links exposes an explicit backlink-count collaborator instead of broad-root access. | static | `rg -n "getBacklinkCounts|Context\.Service|graph/links" src/store/brainstore/graph/links; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-02-02 | 02 | 1 | P09-02 | T-09-01 | Timeline branch exists as its own folder-local contract. | static | `rg -n "Context\.Service|makeLayer|graph/timeline" src/store/brainstore/graph/timeline; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-03-01 | 03 | 2 | P09-02, P09-04 | T-09-01 | Retrieval search contract names only explicit collaborator methods. | static | `rg -n "searchKeyword|searchVector|getBacklinkCounts|getEmbeddingsByChunkIds" src/store/brainstore/retrieval/search; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-03-02 | 03 | 2 | P09-01, P09-03 | T-09-01, T-09-04 | Embedding ownership and the transitional barrel are frozen around `BrainStoreTree`. | static | `rg -n "BrainStoreTree|getStaleChunks|upsertVectors|markChunksEmbedded" src/store/BrainStore.ts src/store/brainstore/retrieval/embedding; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-04-01 | 04 | 3 | P09-03 | T-09-04 | Unsafe SQL and runtime handles stay fenced inside `ops.internal`. | static | `rg -n "UnsafeDB|SqlClient|Mappers|vector" src/store/brainstore/ops/internal; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-04-02 | 04 | 3 | P09-03 | T-09-06 | Lifecycle remains centralized under `ops.lifecycle`. | static | `rg -n "init|dispose|transaction|acquireRelease" src/store/brainstore/ops/lifecycle; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-05-01 | 05 | 4 | P09-01, P09-03 | T-09-07 | Tree and compat are separate layers, with compat explicitly transitional over the tree. | static | `rg -n "BrainStoreTree|transitional|compat" src/store/brainstore/tree src/store/brainstore/compat; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-05-02 | 05 | 4 | P09-04 | T-09-03 | Wave-0 regressions define tree-first assembly and branch-only injection. | static | `rg -n "BrainStoreTree|compat|Layer\.succeed|ManagedRuntime" test/store/brainstore-tree.test.ts test/store/brainstore-layers.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-06-01 | 06 | 5 | P09-02, P09-03 | T-09-04 | Content behavior moves into branch-local factories without violating Effect v4 rules. | typecheck | `tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-06-02 | 06 | 5 | P09-02, P09-03 | T-09-05 | Graph behavior moves into branch-local factories without broad-root projection. | typecheck | `tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-07-01 | 07 | 6 | P09-03 | T-09-04, T-09-06 | Ops branches own internal and lifecycle behavior only once. | typecheck | `tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-07-02 | 07 | 6 | P09-02, P09-04 | T-09-04, T-09-05 | Retrieval runs through explicit collaborator contracts and passes the branch-only layer regression. | unit | `bun test test/store/brainstore-layers.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-08-01 | 08 | 7 | P09-01, P09-02 | T-09-05 | Tree factory becomes the only root assembler. | typecheck | `tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-08-02 | 08 | 7 | P09-01, P09-03 | T-09-05, T-09-06 | LibSQL runtime is tree-first, and no `store.features.*` projection remains. | integration | `bun test test/store/brainstore-tree.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; if (rg -n "store\.features\.|BrainStore\.use\(\(store\) => Eff\.succeed\(store\.features" src/store/libsql-store.ts src/store/brainstore) { exit 1 }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-09-01 | 09 | 8 | P09-03 | T-09-07, T-09-09 | Compat-over-tree preserves the Promise-facing LibSQL adapter. | integration | `bun test test/libsql.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-09-02 | 09 | 8 | P09-03, P09-04 | T-09-08 | Provider and workflow wiring stay stable without exposing tree internals. | integration | `bun test test/ingest/workflow.test.ts test/libsql.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-10-01 | 10 | 9 | P09-04 | T-09-10 | `hybrid.ts` depends only on the narrow retrieval branch contract. | unit | `bun test test/search/hybrid.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |
| 09-10-02 | 10 | 9 | P09-04 | T-09-11, T-09-12 | Compat-backed embedding helpers and stale/vector behavior remain stable after migration. | integration | `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; if (rg -n "store\.features\.|BrainStore\.use\(\(store\) => Eff\.succeed\(store\.features" src/store) { exit 1 }; tsc --noEmit; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; ./scripts/check-effect-v4.sh` | yes | pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements once the two new regression files are added in Plan 05:

- [x] `test/store/brainstore-tree.test.ts` - tree-first assembly regression target
- [x] `test/store/brainstore-layers.test.ts` - branch-only injection regression target

---

## Manual-Only Verifications

All phase behaviors have automated verification planned.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-25



