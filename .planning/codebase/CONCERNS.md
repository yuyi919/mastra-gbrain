# Codebase Concerns

**Analysis Date:** 2026-04-15

## Tech Debt

**Version snapshot duplication in page writes:**
- Issue: `persistStep` in `src/ingest/workflow.ts` calls `tx.createVersion(slug)` before `tx.putPage(...)`, while `LibSQLStore.putPage()` in `src/store/libsql.ts` also calls `createVersion(slug)`
- Why: Versioning responsibility is split between workflow and store layers
- Impact: Existing-page imports can create duplicate history snapshots and make audit history noisy
- Fix approach: Centralize version creation in one boundary, preferably inside the store implementation only

**Mixed default store/embedder story:**
- Issue: `createDefaultStore()` and `createDefaultEmbedder()` in `src/store/index.ts` hard-code in-memory SQLite plus a dummy embedder
- Why: Makes package bootstrap and tests easy
- Impact: Scripts or consumers may believe they are using persistent/real embeddings when they are still on mock defaults
- Fix approach: Add explicit env/config-based default selection and surface the active mode in logs

## Known Bugs

**Backlink matching can collide across directories:**
- Symptoms: `src/scripts/backlinks.ts` resolves targets by markdown basename and validates backlinks with `content.includes(sourceBasename)`
- Trigger: Two pages with the same basename in different folders, or incidental text that mentions a basename without linking back
- Workaround: Keep basenames unique and manually review backlinks output
- Root cause: Link resolution and backlink verification operate on basenames/text inclusion rather than canonical slugs/paths

**`embed --stale` writes synthetic vectors:**
- Symptoms: `src/scripts/embed.ts` uses a local `embedBatch()` helper that fills vectors with random values instead of using `EmbeddingProvider`
- Trigger: Running the stale embedding script in its current default form
- Workaround: Avoid treating `src/scripts/embed.ts` as production-quality semantic re-embedding
- Root cause: placeholder implementation never got replaced with the real embedder abstraction

## Security Considerations

**Tool-level directory import boundary:**
- Risk: `createBulkImportTool()` in `src/tools/import.ts` accepts arbitrary `directoryPath` input
- Current mitigation: recursive import skips symlinks, hidden directories, unreadable paths, and `node_modules`
- Recommendations: enforce allowed roots or caller-side path policy before exposing this tool to less-trusted agents

**Database/auth hooks exist without full boundary implementation:**
- Risk: `access_tokens` and `mcp_request_log` exist in `src/store/schema.ts`, but there is no HTTP or RPC enforcement layer in this package
- Current mitigation: none inside this repo beyond persistence primitives
- Recommendations: document the intended trust boundary and add integration tests once an external API surface exists

## Performance Bottlenecks

**Hybrid deduplication is text-heavy in memory:**
- Problem: `dedupResults()` in `src/search/hybrid.ts` repeatedly builds word sets and compares chunks pairwise
- Measurement: no benchmark committed
- Cause: similarity and diversity checks happen after fetching enlarged result windows
- Improvement path: add perf tests and consider pre-tokenization, segmenter-aware similarity, or bounded comparisons

**Bulk import concurrency shares one workflow/store instance:**
- Problem: `src/scripts/import.ts` parallelizes many `workflow.createRun()` executions against a shared store/embedder
- Measurement: no throughput baseline committed
- Cause: concurrency is optimized for convenience rather than explicit backpressure or isolated worker state
- Improvement path: add stress tests and cap concurrency based on DB/vector-store characteristics

## Fragile Areas

**`LibSQLStore` initialization and schema bootstrapping:**
- Why fragile: `src/store/libsql.ts` mixes raw DDL bootstrapping, Drizzle queries, FTS5 maintenance, and vector index setup in one class
- Common failures: partial init differences, schema/version drift, confusion over which layer owns migrations
- Safe modification: change one concern at a time and run store/script integration tests after edits
- Test coverage: decent happy-path coverage in `test/libsql.test.ts` and `test/scripts/doctor.test.ts`, but migration evolution is not deeply tested

**Search result normalization across FTS/vector paths:**
- Why fragile: `src/store/libsql.ts` and `src/search/hybrid.ts` jointly guarantee strict `SearchResult` shape and cross-modal dedupe
- Common failures: stale/title/type/page_id mismatches, duplicate chunks, multilingual similarity regressions
- Safe modification: update keyword, vector, and hybrid tests together
- Test coverage: focused unit coverage exists, but multilingual/large-result edge cases remain limited

## Scaling Limits

**Single-process local SQLite design:**
- Current capacity: suitable for local/embedded usage; no multi-node strategy is present
- Limit: write-heavy concurrent workloads and large-vector corpora will eventually stress local file-backed stores
- Symptoms at limit: slower imports/searches, lock contention, larger sidecar vector files
- Scaling path: introduce explicit remote LibSQL configuration or separate operational service boundaries

## Dependencies at Risk

**`node-llama-cpp` integration surface:**
- Risk: optional local-model APIs and GPU behavior are environment-sensitive
- Impact: model-backed tests/features can fail depending on OS, GPU, or model-path setup
- Migration plan: keep the embedder behind `EmbeddingProvider` and treat llama paths as optional integrations

**Tooling mismatch around package managers:**
- Risk: `package.json` uses Bun-first scripts but still references `pnpm clean`
- Impact: `npm`/`bun` users without pnpm may hit cleanup/test friction
- Migration plan: replace the pnpm-specific script chain or document pnpm as a required secondary tool

## Missing Critical Features

**No committed environment template:**
- Problem: optional model/runtime configuration is only discoverable from code and docs
- Current workaround: read `AGENTS.md`, tests, and store source
- Blocks: smooth onboarding for real embedder/vector configurations
- Implementation complexity: low

**No deployment/runtime profile split:**
- Problem: default bootstrap in `src/index.ts` always spins up in-memory store + dummy embedder semantics via default factories
- Current workaround: consumers must bypass defaults and inject their own store/embedder
- Blocks: a clear production-ready package entry point
- Implementation complexity: medium

## Test Coverage Gaps

**Backlink basename collision cases:**
- What's not tested: duplicate filename scenarios across folders in `src/scripts/backlinks.ts`
- Risk: silent false positives/negatives in backlink repair
- Priority: High
- Difficulty to test: low; add duplicate-basename fixtures

**Search dedupe for multilingual similarity:**
- What's not tested: CJK-heavy similarity filtering in `src/search/hybrid.ts`
- Risk: duplicate or over-pruned results for non-space-delimited languages
- Priority: Medium
- Difficulty to test: medium; needs representative multilingual chunks

**Real stale-embedding path with non-dummy provider:**
- What's not tested: production-style re-embedding through `EmbeddingProvider`
- Risk: stale vector repair remains misleading or broken outside tests
- Priority: High
- Difficulty to test: medium; requires provider injection refactor

---

*Concerns audit: 2026-04-15*
*Update as issues are fixed or new ones discovered*
