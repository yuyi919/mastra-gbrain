---
phase: 9
slug: brainstore-layered-contexts-and-boundaries
status: verified
threats_open: 0
asvs_level: 1
created: "2026-04-25T23:09:46.0313730+08:00"
updated: "2026-04-25T23:09:46.0313730+08:00"
---

# Phase 9 - Security

Per-phase security contract: threat register, accepted risks, and audit trail.

Notes:

- Phase 09 plans did not contain explicit `<threat_model>` blocks.
- Threats below were reconstructed from `09-RESEARCH.md` security guidance, `09-PLAN` trust-boundary requirements, implementation artifacts, `09-REVIEW.md`, `09-VERIFICATION.md`, and `09-UAT.md`.
- Security enforcement is enabled by default in `.codex/get-shit-done/templates/config.json`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Public Promise facade -> Effect runtime | `LibSQLStore` and `StoreProvider` callers cross from Promise APIs into `BrainStoreCompat`/Effect services. | Page content, chunks, metadata, tags, timeline entries, search queries, embeddings. |
| Compat root -> BrainStoreTree branches | Transitional flat compatibility surface derives behavior from the branch tree. | Branch service methods and legacy-only helper calls. |
| Public branches -> ops.internal | Public content/graph/retrieval/ext branches depend on typed collaborators while raw SQL, mappers, and vector handles stay behind `ops.internal`. | SQL execution handles, mapper access, vector store handles. |
| Content chunks -> retrieval embedding | Chunk writes coordinate with vector cleanup/upsert through explicit embedding ports. | Chunk IDs, vector metadata, embedding vectors, stale markers. |
| Runtime lifecycle -> external resources | Store initialization and disposal control SQLite/LibSQL and vector resources. | DB connections, vector index lifecycle, transaction scopes. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Tampering | SQL and mapper access | mitigate | Raw SQL and mapper handles are fenced inside `ops.internal`; public branches use branch contracts and mapper/Drizzle-backed operations rather than ad hoc SQL exposure. Evidence: `src/store/brainstore/ops/internal/interface.ts`, `src/store/brainstore/ops/internal/factory.ts`, `09-VERIFICATION.md`. | closed |
| T-09-02 | Elevation of Privilege | Public store/provider boundary | mitigate | `StoreProvider` and `LibSQLStore` were not widened during the branch split; public Promise calls resolve `BrainStoreCompat` and internal consumers use branch contracts where applicable. Evidence: `src/store/libsql.ts`, `src/store/index.ts`, `src/store/brainstore/compat/factory.ts`, `09-UAT.md`. | closed |
| T-09-03 | Denial of Service | Runtime and vector resource lifecycle | mitigate | Lifecycle ownership stays in `ops.lifecycle`; `LibSQLStore.dispose()` delegates runtime disposal, and vector clients are closed through lifecycle dependencies. Evidence: `src/store/brainstore/ops/lifecycle/factory.ts`, `src/store/libsql-store.ts`, `src/store/libsql.ts`. | closed |
| T-09-04 | Tampering | Chunk/vector stale state | mitigate | Vector query/write, stale chunk lookup, `markChunksEmbedded`, and embedding lookup live in `retrieval.embedding`; content branches interact through explicit embedding ports. Evidence: `src/store/brainstore/retrieval/embedding/factory.ts`, `src/store/brainstore/content/chunks/factory.ts`, `test/ext.test.ts`. | closed |
| T-09-05 | Information Disclosure | Unsafe/internal branch leakage | mitigate | `BrainStore.ts` retains only the root Context while branch Contexts and service contracts live in their modules; verification confirms only root `BrainStore` Context remains in `BrainStore.ts` and redundant feature Context projection was removed. Evidence: `src/store/BrainStore.ts`, `09-REVIEW.md`, `09-VERIFICATION.md`. | closed |
| T-09-06 | Repudiation | Test residue and auditability | mitigate | Phase 09 UAT and ext regressions explicitly cover cold-start/vector residue cleanup; test setup removes primary/vector SQLite WAL and SHM residue before compat helper tests. Evidence: `09-UAT.md`, `09-10-SUMMARY.md`, `test/ext.test.ts`. | closed |

Status: open / closed
Disposition: mitigate / accept / transfer

---

## Accepted Risks Log

No accepted risks.

---

## Verification Evidence

| Check | Result |
|-------|--------|
| `bun test test/search/hybrid.test.ts test/ext.test.ts test/libsql.test.ts test/ingest/workflow.test.ts` | passed: 28 pass, 1 pre-existing skip, 0 fail |
| `bunx tsc --noEmit` | passed |
| `pwsh ./scripts/check-effect-v4.ps1` | passed |
| `rg -n "store\.features\.|BrainStore\.use\(\(store\) => Eff\.succeed\(store\.features" src/store` | no matches |
| `rg -n "as unknown\|as any" src/store/BrainStore.ts src/store/brainstore/compat/factory.ts src/store/libsql-store.ts src/store/libsql.ts src/store/brainstore/ops/internal/interface.ts` | no matches |
| `node .codex/get-shit-done/bin/gsd-tools.cjs audit-open --json` | no UAT, verification, context, or todo gaps for Phase 09 |

Notes:

- `test/libsql.test.ts` still has the pre-existing skipped `LibSQLStore transaction rollback` test. This was already documented in `09-VERIFICATION.md` and is not introduced by Phase 09.
- Phase 09 UAT recorded one provider/workflow surface follow-up. It was moved into Phase 10 scope and does not represent an open Phase 09 security threat.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-25 | 6 | 6 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-25
