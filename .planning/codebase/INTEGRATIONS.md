# External Integrations

**Analysis Date:** 2026-04-15

## APIs & External Services

**LLM / Agent Model Runtime:**
- Mastra model provider via `model: "openai/gpt-4o-mini"` in `src/agent/index.ts`
  - Integration method: Mastra agent runtime, not direct SDK calls in this repo
  - Auth: Provider credentials are expected from the surrounding Mastra runtime/environment
  - Notes: This repo configures the model identifier but does not document secret names

**Local Embedding / Reranking:**
- `node-llama-cpp` - Optional local model execution in `src/store/llama-embedder.ts` and `src/search/llama-reranker.ts`
  - Integration method: Local GGUF model files loaded from disk
  - Auth: None; depends on readable local model paths
  - Test gating: `GBRAIN_LLAMA_RERANK_MODEL_PATH` controls optional reranker coverage

**Filesystem-Based Content Sources:**
- Local markdown directories - Imported recursively by `src/scripts/import.ts`
  - Integration method: direct file scanning with `node:fs/promises`
  - Safety controls: hidden directories, `node_modules`, unreadable paths, and symlinks are skipped

## Data Storage

**Databases:**
- SQLite via `bun:sqlite` - Primary relational store in `src/store/libsql.ts`
  - Connection: file URLs such as `file::memory:` and `file:./tmp/test.db`
  - Client: Drizzle ORM wraps the Bun SQLite database
  - Migrations: schema is bootstrapped imperatively in `LibSQLStore.init()`

**Vector Storage:**
- LibSQL vector index via `@mastra/libsql` - Semantic search backend in `src/store/libsql.ts`
  - Connection: sidecar URL defaults to the main DB path with `-vector.db`
  - Auth: optional `authToken` supported by `LibSQLStoreOptions`, but not configured by default

**File Storage:**
- Local filesystem only
  - Test artifacts: `./tmp/`
  - Import checkpoint: user home directory `~/.gbrain/import-checkpoint.json` from `src/scripts/import.ts`

## Authentication & Identity

**Application Auth Provider:**
- None for the main library/runtime surface
  - Internal capability: access token verification API exists on `StoreProvider` and `src/store/schema.ts`
  - Current state: no HTTP auth boundary or provider wiring is present in this package

## Monitoring & Observability

**Logs:**
- Standard console output only in `src/scripts/*.ts`
  - `src/scripts/doctor.ts` prints human-readable or JSON health status
  - `src/scripts/import.ts`, `src/scripts/embed.ts`, and `src/scripts/backlinks.ts` log progress and failures

**Operational Records:**
- Persistent ingest/config/request tables exist in `src/store/schema.ts`
  - `ingest_log`
  - `config`
  - `mcp_request_log`

## CI/CD & Deployment

**Hosting:**
- None encoded in the repository
  - No web server, deployment manifest, or container definition is present

**CI Pipeline:**
- No `.github/workflows/*` directory is committed
  - Verification appears to be local-first through `bun test`, `biome`, and build scripts

## Environment Configuration

**Development:**
- Required secrets are minimal for the default path because `createDefaultStore()` and `createDefaultEmbedder()` use in-memory/dummy implementations in `src/store/index.ts`
- Optional local-model setup requires readable GGUF paths for llama-based tests and experiments

**Production / Real Integration Mode:**
- Real agent-model credentials must come from the host Mastra runtime
- Real vector/DB auth would use `LibSQLStoreOptions.authToken`, but no shared env convention is documented here

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-04-15*
*Update when adding/removing external services*
