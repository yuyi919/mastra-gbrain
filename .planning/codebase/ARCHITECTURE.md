# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Layered local-first knowledge-base library with Mastra agent/tool adapters

**Key Characteristics:**
- Single package, no separate services or frontend
- Store-centric design around `StoreProvider` and `LibSQLStore`
- Workflow-driven ingestion and tool-driven retrieval
- Local filesystem and SQLite-first execution model

## Layers

**Entry / Composition Layer:**
- Purpose: Create the default runtime and export the Mastra surface
- Contains: `src/index.ts`, `src/agent/index.ts`, `src/workflow/index.ts`
- Depends on: store factories and tool/workflow factories
- Used by: consumers importing the package or running scripts/tests

**Tool / Workflow Layer:**
- Purpose: Adapt knowledge-base operations to Mastra tools and multi-step workflows
- Contains: `src/tools/*.ts`, `src/ingest/workflow.ts`
- Depends on: `StoreProvider`, `EmbeddingProvider`, parsing/chunking/search helpers
- Used by: `createGBrainAgent()` and bulk import flows

**Domain Logic Layer:**
- Purpose: Parse markdown, segment text, chunk content, and fuse search results
- Contains: `src/markdown.ts`, `src/segmenter.ts`, `src/chunkers/recursive.ts`, `src/search/hybrid.ts`, `src/search/rrf.ts`
- Depends on: pure utilities plus store/vector entry points
- Used by: ingestion workflow, search tool, tests

**Persistence Layer:**
- Purpose: Own SQLite schema, CRUD, FTS5 search, vector search, and maintenance APIs
- Contains: `src/store/interface.ts`, `src/store/libsql.ts`, `src/store/schema.ts`, `src/store/index.ts`
- Depends on: `bun:sqlite`, `drizzle-orm`, `@mastra/libsql`
- Used by: every higher-level layer

**Operational Script Layer:**
- Purpose: Run maintenance workflows outside the agent runtime
- Contains: `src/scripts/import.ts`, `src/scripts/doctor.ts`, `src/scripts/embed.ts`, `src/scripts/backlinks.ts`
- Depends on: store/workflow helpers and node built-ins
- Used by: CLI execution and integration tests

## Data Flow

**Markdown Ingestion Flow:**

1. Caller invokes `createIngestionWorkflow()` directly or through `createIngestTool()` / `bulkImport()`
2. `parseStep` in `src/ingest/workflow.ts` parses markdown and validates slug/path consistency
3. `chunkStep` converts compiled truth and timeline text into `ChunkInput[]`
4. `embedStep` optionally asks an `EmbeddingProvider` for vectors
5. `persistStep` writes pages, tags, chunks, timeline entries, and version records via `StoreProvider`
6. `LibSQLStore` updates SQLite tables, FTS rows, and vector index entries

**Search Flow:**

1. `createSearchTool()` in `src/tools/search.ts` receives a natural-language query
2. The embedder produces a query vector
3. `hybridSearch()` in `src/search/hybrid.ts` runs keyword search and optional vector search
4. `rrfFusion()` and `dedupResults()` merge and normalize results
5. The tool returns fully hydrated `SearchResult` objects from `LibSQLStore.searchKeyword()` / `searchVector()`

**Operational Script Flow:**

1. A CLI script in `src/scripts/*.ts` creates or receives a store instance
2. The script calls store maintenance APIs such as `getHealthReport()`, `getStaleChunks()`, or bulk import helpers
3. Results are reported to stdout or persisted back into content files / vector indexes

**State Management:**
- Durable state lives in SQLite tables plus the LibSQL vector index
- Default package bootstrap in `src/index.ts` uses in-memory defaults, while tests/scripts commonly point at `./tmp/*.db`
- No long-lived app server state or request cache is present

## Key Abstractions

**StoreProvider:**
- Purpose: Stable boundary for all persistence and search capabilities
- Examples: `src/store/interface.ts`, `src/store/libsql.ts`
- Pattern: interface-driven repository/service hybrid

**EmbeddingProvider:**
- Purpose: Abstract query/document embedding generation
- Examples: `src/store/dummy-embedder.ts`, `src/store/llama-embedder.ts`
- Pattern: pluggable provider abstraction

**Mastra Tool Factory:**
- Purpose: Bind a store/embedder pair into callable tools
- Examples: `createSearchTool()`, `createIngestTool()`, `createPageTools()`
- Pattern: factory functions returning configured tool instances

## Entry Points

**Package Entry:**
- Location: `src/index.ts`
- Triggers: package import
- Responsibilities: initialize default store, call `init()`, export `gbrainAgent` and `mastra`

**Script Entrypoints:**
- Location: `src/scripts/import.ts`, `src/scripts/doctor.ts`, `src/scripts/embed.ts`, `src/scripts/backlinks.ts`
- Triggers: `bun run` / direct module execution via `import.meta.main`
- Responsibilities: maintenance and bulk content operations

## Error Handling

**Strategy:** Throw or bubble operational errors, then catch at workflow/script boundaries

**Patterns:**
- Workflow steps return `"skipped"` or `"error"` states for expected ingestion failures
- Store methods generally return null/false for missing data and throw for infrastructure failures
- CLI scripts print progress/errors and translate fatal failures into process exit codes

## Cross-Cutting Concerns

**Validation:**
- Zod schemas are used at the tool/workflow boundary
- Markdown path/slug integrity checks live in `src/ingest/workflow.ts`

**Logging:**
- Human-readable console logging in scripts only
- Core library code is mostly silent outside thrown errors

**Internationalization:**
- `Intl.Segmenter` in `src/segmenter.ts` underpins chunking and FTS tokenization for CJK and other non-space-delimited languages

---

*Architecture analysis: 2026-04-15*
*Update when major patterns change*
