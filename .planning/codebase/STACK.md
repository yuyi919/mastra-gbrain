# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- TypeScript 5.6 - All application code under `src/` and tests under `test/`

**Secondary:**
- Markdown - Test fixtures and project/reference docs in `test/fixtures/`, `AGENTS.md`, `CLAUDE.md`
- JSON/TOML - Tooling and runtime config in `package.json`, `tsconfig.json`, `biome.json`, `bunfig.toml`

## Runtime

**Environment:**
- Bun runtime - Executes tests via `bun test`, provides `bun:sqlite`, and is assumed by CLI scripts in `src/scripts/*.ts`
- Node-compatible built-ins - `node:fs`, `node:path`, `node:crypto`, `node:os` are used heavily in workflows and scripts

**Package Manager:**
- Bun - Primary install/runtime path, with `bun.lock` present
- Mixed tooling footprint - `package.json` test script calls `pnpm clean`, but no `pnpm-lock.yaml` is committed

## Frameworks

**Core:**
- `@mastra/core` - Agent, tool, and workflow composition in `src/agent/index.ts`, `src/tools/*.ts`, `src/ingest/workflow.ts`
- `drizzle-orm` - Type-safe query construction over SQLite in `src/store/libsql.ts`

**Testing:**
- `bun:test` - Unit and integration tests across `test/**/*.ts`
- Optional `node-llama-cpp` model-backed tests - Local-model evaluation paths in `test/llama_embedder.test.ts` and `test/search/llama-reranker.optional.test.ts`

**Build/Dev:**
- `tsup` - JS build/watch output via `package.json` scripts `build` and `dev`
- TypeScript compiler - Declaration/type build via `tsconfig.type.json`
- Biome - Formatting/linting configured in `biome.json`

## Key Dependencies

**Critical:**
- `@mastra/core` - Defines the agent/tool/workflow runtime surface
- `@mastra/libsql` - Supplies `LibSQLVector` vector index used by `src/store/libsql.ts`
- `drizzle-orm` - Replaces hand-written SQL assembly for many relational queries
- `zod` - Input/output schemas for tools and workflow steps
- `gray-matter` - Markdown frontmatter parsing in `src/markdown.ts`

**Infrastructure:**
- `remark`, `remark-parse`, `unist-util-visit`, `unist-util-visit-parents` - Markdown AST work, especially backlinks analysis in `src/scripts/backlinks.ts`
- `node-llama-cpp` - Optional local embedding/reranking support in `src/store/llama-embedder.ts` and `src/search/llama-reranker.ts`
- `effect` - Additional DI/service-layer integration in `src/store/index.ts` and `src/workflow/index.ts`

## Configuration

**Environment:**
- No committed `.env.example`; runtime defaults are largely code-driven
- `NODE_ENV` affects GPU usage in `src/store/llama-embedder.ts`
- `GBRAIN_LLAMA_RERANK_MODEL_PATH` gates optional reranker tests in `test/search/llama-reranker.optional.test.ts`

**Build:**
- `package.json` - Scripts, exports, dependency inventory
- `tsconfig.json` and `tsconfig.type.json` - Strict TS settings and declaration build config
- `biome.json` - Formatting/lint rules
- `bunfig.toml` - Bun test root configuration

## Platform Requirements

**Development:**
- Bun-capable environment on Windows/macOS/Linux
- Writable local filesystem for SQLite databases under `./tmp/` and vector sidecar files
- Optional local GGUF model files for llama-based embedding/reranking experiments

**Production:**
- Packaged library/agent module exported from `dist/`
- Assumes local or file-backed SQLite/LibSQL usage rather than managed hosted infrastructure
- External model/provider setup is runtime-dependent and not fully encoded in repo config

---

*Stack analysis: 2026-04-15*
*Update after major dependency changes*
