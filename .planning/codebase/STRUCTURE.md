# Codebase Structure

**Analysis Date:** 2026-04-15

## Directory Layout

```text
brain-mastra/
├── src/                   # Library and runtime source
│   ├── agent/             # Mastra agent factory
│   ├── chunkers/          # Text chunking logic
│   ├── ingest/            # Ingestion workflow
│   ├── scripts/           # CLI-style maintenance scripts
│   ├── search/            # Hybrid search and ranking
│   ├── store/             # Store interfaces and LibSQL implementation
│   ├── tools/             # Mastra tool factories
│   └── workflow/          # Effect-based workflow integration
├── test/                  # Unit/integration tests and fixtures
│   ├── fixtures/          # Markdown/content fixtures
│   ├── ingest/            # Workflow tests
│   ├── scripts/           # Script tests
│   └── search/            # Search tests
├── references/            # Synced upstream docs and translations
├── .trae/                 # GSD workflow, skills, and local meta tooling
├── .planning/codebase/    # Generated codebase map documents
├── package.json           # Scripts, exports, dependency manifest
├── tsconfig.json          # Strict TS config
├── biome.json             # Formatting/lint rules
└── bunfig.toml            # Bun test root config
```

## Directory Purposes

**`src/agent/`:**
- Purpose: Build the top-level Mastra agent
- Contains: `index.ts`
- Key files: `src/agent/index.ts`
- Subdirectories: none

**`src/store/`:**
- Purpose: Persistence abstractions and SQLite/vector implementation
- Contains: interfaces, schema definitions, default factories, embedder implementations
- Key files: `src/store/interface.ts`, `src/store/libsql.ts`, `src/store/schema.ts`
- Subdirectories: none

**`src/tools/`:**
- Purpose: Wrap store operations as Mastra tools
- Contains: focused factories such as `search.ts`, `ingest.ts`, `page.ts`, `links.ts`
- Key files: `src/tools/search.ts`, `src/tools/ingest.ts`
- Subdirectories: none

**`src/scripts/`:**
- Purpose: Local maintenance and batch-processing entry points
- Contains: doctor, embed, import, backlinks scripts
- Key files: `src/scripts/doctor.ts`, `src/scripts/import.ts`
- Subdirectories: none

**`test/`:**
- Purpose: Verification with isolated DBs and fixtures
- Contains: top-level integration tests plus subfolders for domains
- Key files: `test/libsql.test.ts`, `test/integration.test.ts`, `test/tools.test.ts`
- Subdirectories: `fixtures/`, `search/`, `scripts/`, `ingest/`, `chunkers/`

**`references/`:**
- Purpose: Human reference material synced from upstream `gbrain`
- Contains: translated docs/recipes and repo-specific notes
- Key files: varies; not part of runtime
- Subdirectories: content-focused markdown trees

## Key File Locations

**Entry Points:**
- `src/index.ts` - package bootstrap and default Mastra export
- `src/scripts/import.ts` - bulk markdown import CLI
- `src/scripts/doctor.ts` - DB/FTS/vector health checks
- `src/scripts/embed.ts` - stale embedding repair path

**Configuration:**
- `package.json` - runtime scripts and dependency inventory
- `tsconfig.json` - main compiler rules
- `tsconfig.type.json` - declaration build config
- `biome.json` - formatter/linter behavior
- `bunfig.toml` - Bun test root

**Core Logic:**
- `src/ingest/workflow.ts` - parse/chunk/embed/persist pipeline
- `src/search/hybrid.ts` - keyword/vector fusion and dedupe
- `src/store/libsql.ts` - main persistence/search implementation
- `src/markdown.ts`, `src/segmenter.ts`, `src/chunkers/recursive.ts` - parsing/chunking primitives

**Testing:**
- `test/**/*.ts` - all automated tests
- `test/fixtures/docs/` - sample markdown knowledge-base content
- `test/fixtures/scripts/backlinks/` - backlinks repair fixtures

**Documentation:**
- `AGENTS.md` - repository handoff and architectural constraints
- `CLAUDE.md` - phase history, norms, and maintenance guidance
- `.planning/codebase/*.md` - generated codebase mapping docs

## Naming Conventions

**Files:**
- kebab-case `.ts` modules for most source files, such as `llama-embedder.ts`
- `index.ts` for directory entry modules such as `src/agent/index.ts`
- `*.test.ts` for tests, usually mirroring the subject area

**Directories:**
- lowercase plural or domain nouns, such as `tools/`, `scripts/`, `search/`, `store/`
- shallow feature grouping rather than deeply nested packages

**Special Patterns:**
- one file per tool factory in `src/tools/`
- one file per maintenance command in `src/scripts/`
- generated planning artifacts live under `.planning/`, not `src/`

## Where to Add New Code

**New retrieval/storage capability:**
- Primary code: `src/store/` and optionally `src/search/`
- Tests: `test/libsql.test.ts` or a new domain test under `test/search/`

**New Mastra tool:**
- Implementation: `src/tools/{feature}.ts`
- Agent wiring: `src/agent/index.ts`
- Tests: extend `test/tools.test.ts` or add targeted integration coverage

**New operational command:**
- Implementation: `src/scripts/{name}.ts`
- Shared logic: prefer `src/store/` / `src/ingest/` helpers instead of script-local SQL
- Tests: `test/scripts/{name}.test.ts`

**New parsing/chunking utility:**
- Implementation: `src/markdown.ts`, `src/segmenter.ts`, or a new module in `src/chunkers/`
- Tests: matching unit file under `test/`

## Special Directories

**`.planning/`:**
- Purpose: planning and generated repo intelligence
- Source: GSD workflows and manual updates
- Committed: intended to be committed when generated docs are part of workflow output

**`tmp/`:**
- Purpose: disposable databases and model assets used by tests/scripts
- Source: local execution artifacts
- Committed: no; ignored by `.gitignore`

**`.trae/`:**
- Purpose: local agent skills, commands, and workflow assets
- Source: Trae/GSD setup
- Committed: partially; `.trae/get-shit-done` is ignored while skill/workflow assets exist in repo metadata

---

*Structure analysis: 2026-04-15*
*Update when directory structure changes*
