---
phase: 05
slug: libstore-ts-promise-effect
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-24
---

# Phase 05 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Promise adapter -> BrainStore runtime | Remaining extension-heavy `LibSQLStore` methods now cross from the Promise facade into the shared Effect runtime instead of using a separate mapper path. | timeline entries, raw data, file metadata, config values, token hashes, vector metadata |
| BrainStore runtime -> SQLite / vector backends | The shared service path persists config, logs, files, and vector state through SQL builders and vector store APIs. | access token records, ingest logs, file records, embeddings, search index state |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Tampering | Promise adapter routing for extension methods | mitigate | Timeline, raw data, files, config/logs, token verification, embeddings, and vector upserts now all delegate through `this.run(...)` into the same BrainStore service path, removing a second direct-mapper behavior surface. | closed |
| T-05-02 | Spoofing | Access token verification | mitigate | `verifyAccessToken` resolves through the BrainStore ext layer, which checks `token_hash`, rejects revoked tokens, and updates `last_used_at` only for valid records. | closed |
| T-05-03 | Tampering | Outgoing link projection | mitigate | `getOutgoingLinks()` now derives from the canonical `getLinks()` result and dedupes on `(from,to,type,context)`, preventing duplicate edge projection from leaking inconsistent graph state to callers. | closed |

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
