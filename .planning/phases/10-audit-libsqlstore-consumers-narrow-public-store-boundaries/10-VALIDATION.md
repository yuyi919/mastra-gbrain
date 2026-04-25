---
phase: 10
slug: audit-libsqlstore-consumers-narrow-public-store-boundaries
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `bun test` via Bun |
| **Config file** | `bunfig.toml`, `tsconfig.json`, `tsconfig.type.json` |
| **Quick run command** | `bun test test/ingest/workflow.test.ts test/search/hybrid.test.ts` |
| **Full suite command** | `bun test` |
| **Effect v4 syntax command** | `pwsh ./scripts/check-effect-v4.ps1 src` |
| **Estimated runtime** | Quick: under 30 seconds; full suite: project-dependent |

---

## Sampling Rate

- **After every task commit:** Run the focused test for touched surface plus `pwsh ./scripts/check-effect-v4.ps1 src`.
- **After every plan wave:** Run `bun test test/ingest/workflow.test.ts test/search/hybrid.test.ts test/libsql.test.ts` plus any touched tool/script tests.
- **Before `$gsd-verify-work`:** Run `bun test`, `tsc --noEmit`, `pwsh ./scripts/check-effect-v4.ps1 src`, and the Phase 10 guard greps.
- **Max feedback latency:** one focused test cycle per task.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | P10-01 | T-10-01 | Inventory classifies every current `LibSQLStore` / broad store consumer before edits. | static | `rg -n "LibSQLStore|new\s+LibSQLStore|StoreProvider|BrainStore|vectorStore|getChunksWithEmbeddings" src test` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | P10-03 | T-10-02 | Workflow keeps `{ store, embedder }` while narrowing store capability. | unit | `bun test test/ingest/workflow.test.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 2 | P10-02, P10-05 | T-10-03 | Chunk/vector ownership moves behind typed branch/provider contracts without widening `StoreProvider`. | unit/integration | `bun test test/ext.test.ts test/search/hybrid.test.ts test/libsql.test.ts` | ✅ | ⬜ pending |
| 10-04-01 | 04 | 3 | P10-02, P10-04 | T-10-04 | Tool/script consumers use narrow contracts where practical while public integrations keep working. | integration | `bun test test/tools.test.ts test/integration.test.ts test/scripts/doctor.test.ts test/scripts/embed.test.ts` | ✅ | ⬜ pending |
| 10-05-01 | 05 | 4 | P10-05 | T-10-05 | Public facade behavior remains stable and no banned Effect/type escape patterns are introduced. | full regression/static | `bun test && tsc --noEmit && pwsh ./scripts/check-effect-v4.ps1 src` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] Add a consumer inventory artifact or plan task before migration begins.
- [ ] Establish exact narrow workflow contract for `createIngestionWorkflow`.
- [ ] Establish branch/vector provider verification before removing direct `store.vectorStore` test seams.
- [ ] Preserve public facade tests as a named regression lane.

---

## Guard Greps

```bash
rg -n "LibSQLStore|new\s+LibSQLStore" src test
rg -n "StoreProvider" src/ingest src/tools src/scripts src/search test/ingest test/search
rg -n "vectorStore" src/store/brainstore src/store/libsql-store.ts test
rg -n "getChunksWithEmbeddings" src/store src test
rg -n "as unknown as StoreProvider|as any" src/store src/ingest src/workflow test/ingest test/search
rg -n "Context\.Tag\(|Context\.GenericTag\(|Effect\.Tag\(|Effect\.Service\(|Runtime\.runFork|Effect\.runtime<|Effect\.catchAll|Effect\.catchSome|Effect\.fork\(|Effect\.forkDaemon\(" src
```

Interpret these by classification, not as blanket zero-match rules. Public facade files and intentional compatibility tests may still match the first two greps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Consumer classification quality | P10-01 | Static grep can find references but cannot decide whether a use is intentionally public facade coverage. | Review the inventory table and confirm each item has one of the required classifications. |
| Public API non-widening | P10-05 | Type checks prove compile safety, but humans should confirm no internal helper was promoted into public API by convenience. | Review diffs for `src/store/interface.ts`, `src/store/libsql.ts`, and exported tool/script contract files. |

---

## Validation Sign-Off

- [ ] All tasks have automated verification.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing inventory references.
- [ ] No watch-mode flags.
- [ ] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
