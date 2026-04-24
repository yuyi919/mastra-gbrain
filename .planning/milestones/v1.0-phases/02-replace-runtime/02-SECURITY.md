---
phase: 02
slug: replace-runtime
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-24
---

# Phase 02 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Store facade -> BrainStore runtime | Promise-based `LibSQLStore` delegates page, tag, link, chunk, and search operations into the Effect runtime. | page content, slugs, tags, link metadata, chunk text, embeddings |
| BrainStore runtime -> SQLite / FTS / vector store | Effect services persist and query data through Drizzle/SQLite builders plus vector index operations. | structured content, search queries, graph traversal inputs, embedding vectors |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | Page/version write path | mitigate | `putPage` and `revertToVersion` run inside `sql.withTransaction`, keeping page + version updates atomic during runtime replacement. | closed |
| T-02-02 | Injection | Search and graph query builders | mitigate | Phase 2 moved the core query surface onto Drizzle/SQL builder helpers such as `searchKeyword`, `searchVectorRows`, `getLinksOutgoingBySlug`, and `getBacklinksBySlug`, preserving parameter-bound query construction instead of ad hoc SQL strings. | closed |
| T-02-03 | Tampering | Chunk / FTS / vector synchronization | mitigate | `upsertChunks` deletes stale chunk rows, rebuilds FTS rows, and rewrites vector entries through one BrainStore service path so content, search index, and vector index stay aligned per slug. | closed |

*Status: open or closed*  
*Disposition: mitigate (implementation required) or accept (documented risk) or transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-24 | 3 | 3 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-24
