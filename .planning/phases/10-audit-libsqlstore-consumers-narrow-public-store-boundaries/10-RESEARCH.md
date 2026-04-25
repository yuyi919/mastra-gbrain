# Phase 10: Audit LibSQLStore Consumers & Narrow Public Store Boundaries - Research

**Researched:** 2026-04-26 [VERIFIED: Get-Date]
**Domain:** TypeScript store-boundary refactor, Effect v4 Context/Layer composition, Mastra ingestion/workflow dependency injection [VERIFIED: .planning/ROADMAP.md; VERIFIED: docs/effect/v4-systematic-guide.md; VERIFIED: src/ingest/workflow.ts]
**Confidence:** HIGH for local consumer inventory and planning order, MEDIUM for external library state because this phase should follow local pinned dependencies rather than npm latest [VERIFIED: rg src test; VERIFIED: pnpm list; VERIFIED: npm registry]

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this entire section: [VERIFIED: .planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-CONTEXT.md]

### Locked Decisions

## Implementation Decisions

### Public Facade Boundary
- **D-01:** Keep `LibSQLStore` as the deliberate public Promise facade and provider default.
- **D-02:** Do not replace the public `BrainStoreProvider` default with branch services. Internal narrowing must happen behind or beside the existing public facade, not by breaking ergonomic public construction.
- **D-03:** Preserve all existing `StoreProvider` and `LibSQLStore` behavior; public compatibility tests remain required evidence.

### Workflow And Provider Surface
- **D-04:** Keep `createIngestionWorkflow` accepting `{ store, embedder }`.
- **D-05:** Narrow the workflow's `store` type to the capabilities it actually uses: page lookup, version/page/tag/chunk writes, optional transaction, and timeline batch writes.
- **D-06:** Do not make workflow callers import or understand internal `BrainStoreTree` branches. The workflow boundary remains dependency-injected and provider-friendly.

### Consumer Capability Contracts
- **D-07:** Inventory every current `LibSQLStore` import and constructor usage across `src/**` and `test/**` before implementation changes.
- **D-08:** Classify each consumer as public facade coverage, provider wiring, workflow/tool consumer, script utility, or replaceable internal dependency.
- **D-09:** Tool and script modules should accept narrower capability contracts where practical, while still allowing existing public wiring to pass a `LibSQLStore` / `StoreProvider` instance.
- **D-10:** Use `src/search/hybrid.ts` as the model pattern: an Effect path can depend on a narrow branch contract while a Promise wrapper remains compatible with `StoreProvider`.

### Vector And Embedding Ownership
- **D-11:** Fold the pending vector-boundary todo into this phase.
- **D-12:** Move `getChunksWithEmbeddings(slug)` ownership out of the legacy compat-only surface and into a branch-owned capability before tests stop reaching through raw facade internals.
- **D-13:** Introduce a typed vector provider layer or equivalent low-level internal service so raw `LibSQLVector` access is not passed through `libsql-store.ts` into multiple branches as an ambient implementation detail.
- **D-14:** Keep raw vector access internal or facade-only. Tests should prefer branch/provider-level seams instead of mutating `store.vectorStore` directly when they are not intentionally verifying facade internals.

### Test Classification
- **D-15:** Keep `test/libsql.test.ts` as public facade compatibility coverage.
- **D-16:** Convert tests that only need workflow, branch, provider, or vector-helper behavior to narrower injection where that better proves the new boundary.
- **D-17:** Do not convert true public compatibility tests away from `LibSQLStore`; the phase needs both public facade evidence and narrow-contract evidence.

### Effect v4 And Store Discipline
- **D-18:** New or modified Effect store code must follow local Effect v4 rules: `Context.Service`, `Layer` composition, inferred accessor callbacks, and no v3 syntax.
- **D-19:** Store implementation files must not use `as unknown` / `as any` to bypass type problems. If a contract is missing shape, fix the contract at the branch boundary.
- **D-20:** `libsql-store.ts` should remain an assembly boundary. It may compose external ports/options, root, compat, and ext, but should not reimplement feature branch behavior.

### Folded Todos
- **D-21:** Fold `2026-04-25-refine-phase-9-content-chunks-and-vector-provider-layers.md` into Phase 10. It directly matches the Phase 10 boundary cleanup: branch ownership for `getChunksWithEmbeddings` and a typed vector provider layer for raw vector operations.

### Claude's Discretion
- Exact names of new narrow TypeScript interfaces, as long as they are capability-specific and live near the consuming domain or branch contract.
- Exact ordering of consumer migration after the required inventory, as long as public facade and workflow/provider stability are protected early.
- Whether vector provider is introduced as a new branch under `ops/internal`, a low-level provider service beside `Mappers`, or another small internal layer, provided downstream branches consume it through a typed contract rather than raw option passing.

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

None. Assumption analysis stayed within Phase 10 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P10-01 | Inventory every current `LibSQLStore` import/constructor usage across `src/**` and `test/**`, classify each as public facade coverage, provider wiring, workflow/tool consumer, script utility, or replaceable internal dependency. | Use the Consumer Inventory table and guard grep commands below as Wave 0 evidence. [VERIFIED: rg "LibSQLStore\|StoreProvider\|BrainStore\|vectorStore\|getChunksWithEmbeddings" src test] |
| P10-02 | Replace broad `LibSQLStore`/`BrainStore` dependencies with capability-specific contracts wherever the caller does not need the full public Promise facade. | Use the Proposed Narrow Contracts table and migrate consumers in the safe order listed under Architecture Patterns. [VERIFIED: src/store/interface.ts; VERIFIED: src/ingest/workflow.ts; VERIFIED: src/tools/*.ts; VERIFIED: src/scripts/*.ts] |
| P10-03 | Stabilize provider and ingestion workflow surface from Phase 09 UAT so workflow callers keep the intended `{ store, embedder }` boundary without learning internal branch services. | Keep `createIngestionWorkflow({ store, embedder })`, but narrow `store` to `IngestionWorkflowStore`. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/ingest/workflow.ts; VERIFIED: src/workflow/index.ts] |
| P10-04 | Keep public compatibility tests for `LibSQLStore` where they intentionally verify facade, but convert internal/helper tests to branch/provider-level injection when better. | Use the Test Classification table and keep `test/libsql.test.ts` facade-focused. [VERIFIED: 10-CONTEXT.md; VERIFIED: test/libsql.test.ts; VERIFIED: test/ext.test.ts; VERIFIED: test/search/hybrid.test.ts] |
| P10-05 | Preserve existing public `StoreProvider` and `LibSQLStore` behavior; do not widen public API. | Treat `src/store/interface.ts` and `src/store/libsql.ts` as compatibility surfaces and avoid adding methods to `StoreProvider` for internal needs. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/store/interface.ts; VERIFIED: src/store/libsql.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md and CLAUDE.md)

- This package is `mastra-gbrain`, a Bun plus TypeScript plus Mastra local-first knowledge store backed by SQLite/LibSQL, FTS5, and vector search. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/ARCHITECTURE.md]
- SQL, Drizzle, raw SQLite, and raw vector internals must not leak outside the store boundary; external scripts and tools should use store/provider methods or narrower exported contracts. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md]
- Default construction should remain factory-based and dependency-injected; static singleton hard binding is forbidden. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md]
- Tests that use databases must write under `./tmp/` and release resources with `dispose()` or cleanup helpers. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/TESTING.md]
- Effect code must use local Effect v4 beta rules: `Context.Service`, explicit `Layer` composition, `Effect.gen`/`Effect.fn`, no v3 `Context.Tag`, no `Effect.catchAll`, no `Effect.fork`, and no `Effect.runtime<...>()`. [VERIFIED: docs/effect/v4-systematic-guide.md; VERIFIED: docs/effect/v4-playbook.md; VERIFIED: docs/effect/v4-banned-patterns.md]
- `BrainStore.ts` should remain the root Context/barrel/compat projection location; feature branch service contracts should live under `src/store/brainstore/**/interface.ts`. [VERIFIED: AGENTS.md; VERIFIED: src/store/BrainStore.ts; VERIFIED: src/store/brainstore/**/interface.ts]
- `libsql-store.ts` should remain an assembly boundary and should delegate feature behavior to branch factories/layers. [VERIFIED: AGENTS.md; VERIFIED: src/store/libsql-store.ts]
- Store implementation files must not add `as unknown` or `as any` to bypass type issues during this phase. [VERIFIED: AGENTS.md; VERIFIED: 10-CONTEXT.md]

## Summary

Phase 10 should be planned as an audit-first, compatibility-preserving boundary refactor. The current production `LibSQLStore` constructor usage is intentionally limited to public/provider wiring: `src/store/index.ts` creates default stores and `src/store/libsql.ts` implements the Promise facade. Current broad internal consumption is mostly through `StoreProvider` types in workflow, agent/tool factories, scripts, and test doubles rather than many production `new LibSQLStore(...)` calls. [VERIFIED: rg src test; VERIFIED: src/store/index.ts; VERIFIED: src/store/libsql.ts; VERIFIED: src/ingest/workflow.ts; VERIFIED: src/tools/*.ts; VERIFIED: src/scripts/*.ts]

The highest-value first change is to narrow `createIngestionWorkflow` from `StoreProvider` to a local workflow contract while keeping the existing `{ store, embedder }` shape. The workflow actually calls `getPage`, `createVersion`, `putPage`, `getTags`, `addTag`, `removeTag`, `upsertChunks`, `deleteChunks`, `addTimelineEntriesBatch`, and optional `transaction`, so it does not need the full public facade, search, raw data, config, lifecycle, or unsafe DB surface. [VERIFIED: src/ingest/workflow.ts]

The second structural change is vector/chunk ownership. `getChunksWithEmbeddings` currently remains on the transitional flat `BrainStore.Ingestion` interface and is implemented in `libsql-store.ts` by delegating to `tree.content.chunks.getChunks`, while raw `vectorStore` is passed through `libsql-store.ts` into retrieval, ops internal, lifecycle, and facade tests. Planning should move `getChunksWithEmbeddings` to the content chunks branch and introduce a typed internal vector provider/service before converting vector-coupled tests. [VERIFIED: src/store/BrainStore.ts; VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/content/chunks/interface.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts; VERIFIED: src/store/brainstore/ops/internal/interface.ts; VERIFIED: test/ext.test.ts]

**Primary recommendation:** Plan four waves in this order: inventory freeze, workflow/provider contract narrowing, branch-owned chunk/vector provider cleanup, then tool/script/test contract migration with facade regression gates. [VERIFIED: 10-CONTEXT.md; VERIFIED: local consumer audit]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Public `LibSQLStore` Promise facade | Store facade | Provider wiring | `LibSQLStore` implements `StoreProvider` and wraps `BrainStoreCompat` effects in promises. [VERIFIED: src/store/libsql.ts; VERIFIED: src/store/interface.ts] |
| `BrainStoreProvider` default construction | Provider wiring | Store facade | `BrainStoreProvider.Default` constructs `{ store, embedder }` and initializes a `LibSQLStore`; public caller shape must remain stable. [VERIFIED: src/store/index.ts; VERIFIED: src/workflow/index.ts] |
| Ingestion workflow dependency | Workflow layer | Store contracts | Workflow steps parse, chunk, embed, and persist through injected `{ store, embedder }`; the store contract can be narrower than `StoreProvider`. [VERIFIED: src/ingest/workflow.ts] |
| Tool factories | Tool layer | Store contracts | Tool factories call small sets of Promise methods such as page, link, timeline, config, raw data, or search operations. [VERIFIED: src/tools/*.ts] |
| Script utilities | Script layer | Store contracts | `doctor`, `embed`, and `import` accept optional stores but only need maintenance or workflow-specific method subsets. [VERIFIED: src/scripts/doctor.ts; VERIFIED: src/scripts/embed.ts; VERIFIED: src/scripts/import.ts] |
| Branch-owned chunk APIs | Store branch | Retrieval/vector provider | `ContentChunks` owns chunk/FTS rows today, while embedding/vector writes are delegated through an embedding port. [VERIFIED: src/store/brainstore/content/chunks/factory.ts] |
| Vector operations | Internal provider/service | Retrieval, lifecycle, chunks | Query/upsert/delete/create/dispose operations currently fan out from raw `vectorStore`; this should become a typed internal service. [VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts; VERIFIED: src/store/brainstore/ops/lifecycle/factory.ts] |

## Current Consumer Inventory

Graph note: `.planning/graphs/graph.json` exists but is stale by about 60 hours and returned no nodes for the Phase 10 query terms, so code grep and direct file reads are the authoritative inventory. [VERIFIED: graphify status; VERIFIED: graphify query]

| Consumer | Current Surface | Classification | Phase 10 Action |
|----------|-----------------|----------------|-----------------|
| `src/store/libsql.ts` | Defines `LibSQLStore`, public `vectorStore`, `brainStore`, Promise methods, raw `exec/get/query`. | Public facade coverage | Keep facade behavior; do not remove public methods in this phase. [VERIFIED: src/store/libsql.ts; VERIFIED: 10-CONTEXT.md] |
| `src/store/index.ts` | `createDefaultStore`, `BrainStoreProvider.Default`, `BrainStoreProvider.liveWith`. | Provider wiring | Keep default using `LibSQLStore`; narrow only internal types if possible. [VERIFIED: src/store/index.ts] |
| `src/index.ts` | Calls `createDefaultStore` and `createDefaultEmbedder`. | Public/bootstrap wiring | Leave as public ergonomic bootstrap. [VERIFIED: src/index.ts] |
| `src/workflow/index.ts` | Uses `BrainStoreProvider.use(({ store, embedder }) => createIngestionWorkflow({ store, embedder }))`. | Provider/workflow boundary | Keep caller shape; workflow store type should be narrow. [VERIFIED: src/workflow/index.ts] |
| `src/ingest/workflow.ts` | Accepts `StoreProvider`; transaction callback also typed `StoreProvider`. | Replaceable internal dependency | Replace with `IngestionWorkflowStore` and transaction callback of the same narrow type. [VERIFIED: src/ingest/workflow.ts] |
| `src/agent/index.ts` | Accepts full `StoreProvider` to assemble all tools. | Tool aggregator | Either keep broad as public aggregate or introduce `GBrainAgentStore` as intersection of tool contracts. [VERIFIED: src/agent/index.ts] |
| `src/tools/ingest.ts` | Accepts `StoreProvider` and passes to workflow. | Workflow/tool consumer | Narrow to workflow store contract plus `EmbeddingProvider`. [VERIFIED: src/tools/ingest.ts] |
| `src/tools/search.ts` | Accepts `StoreProvider` for `hybridSearch`. | Tool/search consumer | Prefer `HybridSearchPromiseStore` with `searchKeyword`, `searchVector`, optional `brainStore`. [VERIFIED: src/tools/search.ts; VERIFIED: src/search/hybrid.ts] |
| `src/tools/page.ts` | Calls page/tag/delete methods. | Tool consumer | Narrow to page read/write/tag contract. [VERIFIED: src/tools/page.ts] |
| `src/tools/links.ts` | Calls link methods only. | Tool consumer | Narrow to link contract. [VERIFIED: src/tools/links.ts] |
| `src/tools/timeline.ts` | Calls `getTimeline` only. | Tool consumer | Narrow to timeline read contract. [VERIFIED: src/tools/timeline.ts] |
| `src/tools/config.ts` | Calls `getConfig` and `setConfig`. | Tool consumer | Narrow to config contract. [VERIFIED: src/tools/config.ts] |
| `src/tools/raw.ts` | Calls `getRawData` and `putRawData`. | Tool consumer | Narrow to raw data contract. [VERIFIED: src/tools/raw.ts] |
| `src/tools/list.ts` | Calls `listPages`. | Tool consumer | Narrow to list pages contract. [VERIFIED: src/tools/list.ts] |
| `src/tools/import.ts` | Calls `bulkImport(store, embedder)`. | Tool/script bridge | Narrow to bulk import workflow contract. [VERIFIED: src/tools/import.ts; VERIFIED: src/scripts/import.ts] |
| `src/scripts/doctor.ts` | Calls `init`, `getHealthReport`, optional default store, and `dispose` when self-created. | Script utility | Narrow to `DoctorStore`; keep default factory compatibility. [VERIFIED: src/scripts/doctor.ts] |
| `src/scripts/embed.ts` | Calls `init`, `getStaleChunks`, `upsertVectors`, `markChunksEmbedded`, `dispose`. | Script utility/vector maintenance | Narrow to `EmbeddingMaintenanceStore`; later route vector writes through typed vector provider behind facade. [VERIFIED: src/scripts/embed.ts] |
| `src/scripts/import.ts` | Calls `createIngestionWorkflow` and initializes default store only in CLI mode. | Script workflow consumer | Narrow `storeInstance` to workflow store; remove local `as any` init cast by including `init` only in the CLI-created path or using a typed local variable. [VERIFIED: src/scripts/import.ts] |
| `test/libsql.test.ts` | Constructs `LibSQLStore` and exercises facade methods. | Public facade coverage | Keep as facade compatibility evidence. [VERIFIED: test/libsql.test.ts; VERIFIED: 10-CONTEXT.md] |
| `test/ext.test.ts` | Constructs `LibSQLStore`, calls `getChunksWithEmbeddings`, mutates `store.vectorStore.query/upsert`. | Mixed facade and replaceable internal seam | Split or convert vector-specific mocking to branch/vector-provider injection; keep only intentional facade behavior. [VERIFIED: test/ext.test.ts] |
| `test/integration.test.ts` | Constructs `LibSQLStore` and tests tools plus import integration. | Public integration coverage | Keep at least one public integration path through `LibSQLStore`. [VERIFIED: test/integration.test.ts] |
| `test/tools.test.ts` | Constructs `LibSQLStore` for ingest/search tools. | Tool integration coverage | Keep one facade compatibility test or add mock/narrow-contract tool unit tests. [VERIFIED: test/tools.test.ts] |
| `test/store_extensions.test.ts` | Constructs `LibSQLStore` for links/timeline/raw/files/config/logs. | Public facade coverage | Keep as extension facade evidence unless duplicate with ext tests. [VERIFIED: test/store_extensions.test.ts] |
| `test/ingest/workflow.test.ts` | Mock store typed as `StoreProvider & { _calls }`. | Replaceable internal dependency | Convert mock to `IngestionWorkflowStore & { _calls }`. [VERIFIED: test/ingest/workflow.test.ts] |
| `test/search/hybrid.test.ts` | Promise fallback mocks cast `as unknown as StoreProvider`; Effect test injects `BrainStoreSearch`. | Existing narrow model plus test cleanup | Keep branch-only test; replace `as unknown as StoreProvider` with a narrow promise backend type. [VERIFIED: test/search/hybrid.test.ts] |
| `test/scripts/doctor.test.ts` | Constructs `LibSQLStore` for script integration. | Script utility integration | Keep integration test; add/adjust narrow mock test if changing script signature. [VERIFIED: test/scripts/doctor.test.ts] |
| `test/scripts/embed.test.ts` | Uses `LibSQLStore`, raw SQL facade helpers, and `embedStale`. | Script utility plus public unsafe facade | Keep if intentionally testing legacy `exec/get/query`; otherwise move stale setup to branch/facade helper. [VERIFIED: test/scripts/embed.test.ts] |
| `test/llama_embedder.test.ts` | Uses real `LibSQLStore` with workflow and hybrid search. | Public embedding integration | Keep optional/heavy integration path; avoid narrowing it away if it proves facade behavior. [VERIFIED: test/llama_embedder.test.ts] |

## Standard Stack

### Core

| Library | Local Version | Registry Latest Checked | Purpose | Why Standard |
|---------|---------------|-------------------------|---------|--------------|
| Bun | 1.3.12 | Not npm package | Runtime and test runner. [VERIFIED: bun --version] | Current tests and scripts use `bun test` and Bun-native runtime APIs. [VERIFIED: package.json; VERIFIED: test/*.ts; VERIFIED: src/store/libsql.ts] |
| TypeScript | 5.9.3 installed | 6.0.3 latest, modified 2026-04-16 | Static typing and declaration build. [VERIFIED: pnpm list; VERIFIED: npm registry] | Keep local installed version for this phase to avoid unrelated compiler churn. [VERIFIED: package.json; VERIFIED: pnpm list] |
| Effect / `@effect/*` | `effect` 4.0.0-beta.55 installed with matching `@effect/platform-bun` and `@effect/sql-sqlite-bun` 4.0.0-beta.55 | npm default latest `effect` is 3.21.2, modified 2026-04-23 | Effect Context/Layer and SQL runtime services. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: docs/effect/v4-playbook.md] | Project rules require Effect v4 beta syntax, so do not use npm latest as the planning target. [VERIFIED: AGENTS.md; VERIFIED: docs/effect/v4-banned-patterns.md] |
| `@yuyi919/tslibs-effect` | 0.4.2 installed | 0.4.3 latest, modified 2026-04-22 | Project Effect wrapper and BunTester utilities. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: docs/effect/v4-systematic-guide.md] | Existing store code imports `@yuyi919/tslibs-effect/effect-next`. [VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/**/factory.ts] |
| Mastra `@mastra/core` | 1.26.0 installed | 1.28.0 latest, modified 2026-04-24 | Workflows, tools, and agent framework. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: Context7 /mastra-ai/mastra] | Existing workflow/tool code uses Mastra `createWorkflow`, `createStep`, `createTool`, and `createRun/start`. [VERIFIED: src/ingest/workflow.ts; VERIFIED: src/tools/*.ts; CITED: https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/workflows/workflow-methods/create-run.mdx] |
| `@mastra/libsql` | 1.9.0 installed | 1.9.0 latest, modified 2026-04-24 | `LibSQLVector` vector index adapter. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: src/store/libsql.ts] | Public facade currently exposes and constructs `LibSQLVector`, but Phase 10 should hide raw usage behind typed internal provider contracts. [VERIFIED: src/store/libsql.ts; VERIFIED: 10-CONTEXT.md] |
| Drizzle ORM | 0.45.2 installed | 0.45.2 latest, modified 2026-04-24 | Type-safe SQL/query builder layer. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: .planning/codebase/CONVENTIONS.md] | Store boundary rules require SQL/ORM details to stay inside store implementation. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md] |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| Biome | 2.4.11 installed | Formatting/linting/check fix. [VERIFIED: pnpm list; VERIFIED: package.json] | Use `pnpm check:fix -- <files>` for changed TS/JSON/MJS files if hooks or formatting need cleanup. [VERIFIED: package.json; VERIFIED: .planning/STATE.md] |
| PowerShell | 7.6.1 available | Windows-compatible Effect v4 check runner. [VERIFIED: pwsh version; VERIFIED: scripts/check-effect-v4.ps1] | Use `pwsh ./scripts/check-effect-v4.ps1 src` because `sh` is missing in this environment. [VERIFIED: command -v sh equivalent; VERIFIED: scripts/check-effect-v4.ps1] |
| Context7 CLI | Resolved `/effect-ts/effect` and `/mastra-ai/mastra` | Documentation lookup. [VERIFIED: npx ctx7 library effect; VERIFIED: npx ctx7 library mastra] | Use Mastra docs for workflow API shape; use local Effect v4 docs over Context7 Effect snippets because Context7 returned v3 `Context.Tag` examples. [VERIFIED: npx ctx7 docs /effect-ts/effect; VERIFIED: docs/effect/v4-playbook.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Adding methods to `StoreProvider` | Local capability interfaces near consumers | Adding to `StoreProvider` widens public API, violating P10-05. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/store/interface.ts] |
| Passing branch services into workflow callers | Keep `{ store, embedder }` and narrow `store` type | Branch-service workflow callers would violate D-04 and D-06. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/workflow/index.ts] |
| Mutating `store.vectorStore` in tests | Inject typed vector provider or branch-level service | Direct mutation couples tests to facade internals and weakens vector boundary cleanup. [VERIFIED: 10-CONTEXT.md; VERIFIED: test/ext.test.ts] |

**Installation:** no new package installation is required for Phase 10. [VERIFIED: package.json; VERIFIED: phase scope]

**Version verification commands used:**

```bash
pnpm list effect @mastra/core @mastra/libsql @yuyi919/tslibs-effect drizzle-orm --depth 0
npm view effect version time.modified --json
npm view @mastra/core version time.modified --json
npm view @mastra/libsql version time.modified --json
npm view drizzle-orm version time.modified --json
```

## Architecture Patterns

### System Architecture Diagram

```text
Public caller / CLI / Agent
  -> factory or tool constructor
  -> Promise-facing narrow contract
  -> LibSQLStore facade when public compatibility is intended
  -> ManagedRuntime / BrainStoreCompat
  -> BrainStoreTree
  -> feature branch services
  -> typed internal DB/vector providers
  -> SQLite / FTS5 / LibSQLVector

Workflow caller
  -> createIngestionWorkflow({ store, embedder })
  -> parse -> chunk -> embed
  -> persist through IngestionWorkflowStore
  -> optional transaction callback with same narrow store type
  -> pages/tags/chunks/timeline writes
```

This diagram follows the current data flow while making the intended Phase 10 boundaries explicit. [VERIFIED: .planning/codebase/ARCHITECTURE.md; VERIFIED: src/ingest/workflow.ts; VERIFIED: src/store/libsql.ts; VERIFIED: src/store/libsql-store.ts]

### Recommended Project Structure

```text
src/
  ingest/
    workflow.ts              # IngestionWorkflowStore lives here or is exported from a small ingest contract file.
  tools/
    contracts.ts             # Optional shared Promise capability aliases for tool factories.
  scripts/
    contracts.ts             # Optional script-specific maintenance contracts if duplication grows.
  store/
    interface.ts             # Public StoreProvider remains stable.
    libsql.ts                # Public Promise facade remains stable.
    libsql-store.ts          # Assembly only.
    brainstore/
      content/chunks/        # Own getChunksWithEmbeddings.
      ops/vector/            # Recommended typed internal vector provider layer.
      retrieval/embedding/   # Consume vector provider, not raw LibSQLVector.
```

The new vector provider can also live beside `Mappers` if implementation pressure favors a low-level port instead of a branch folder; D-21 allows either as long as downstream branches consume a typed contract. [VERIFIED: 10-CONTEXT.md; VERIFIED: pending todo]

### Pattern 1: Narrow Promise Contract at Consumer Boundary

**What:** Define a local interface for the exact Promise methods a consumer needs, and let `LibSQLStore` satisfy it structurally without changing the public facade. [VERIFIED: src/ingest/workflow.ts; VERIFIED: src/store/interface.ts]

**When to use:** Workflow, tools, scripts, and tests that do not need the full `StoreProvider`. [VERIFIED: consumer inventory]

**Example:**

```typescript
// Source: src/ingest/workflow.ts method audit.
export interface IngestionWorkflowStore {
  getPage(slug: string): Promise<Page | null>;
  createVersion(slug: string): Promise<PageVersion>;
  putPage(slug: string, page: PageInput): Promise<Page>;
  getTags(slug: string): Promise<string[]>;
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;
  upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>;
  deleteChunks(slug: string): Promise<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): Promise<number>;
  transaction?<T>(
    fn: (tx: IngestionWorkflowStore) => Promise<T>
  ): Promise<T>;
}
```

This exact shape reflects the workflow's current calls. [VERIFIED: src/ingest/workflow.ts]

### Pattern 2: Effect-First Branch Contract with Promise Wrapper

**What:** Keep internal Effect functions depending on feature branch services, while public Promise wrappers accept facade-compatible stores. [VERIFIED: src/search/hybrid.ts]

**When to use:** Search and future branch-level tests where an Effect service proves narrower dependency ownership. [VERIFIED: test/search/hybrid.test.ts]

**Example:**

```typescript
// Source: src/search/hybrid.ts
export function hybridSearchEffect(
  query: string,
  opts: HybridSearchOpts = {},
  queryVector?: number[]
): Eff.Effect<SearchResult[], StoreError, BrainStoreSearch> {
  return Eff.gen(function* () {
    const engine = yield* BrainStoreSearch;
    return yield* engine.searchKeyword(query, { limit: opts.limit ?? 20 });
  });
}
```

The actual implementation is richer, but this pattern is the relevant boundary model. [VERIFIED: src/search/hybrid.ts]

### Pattern 3: Typed Vector Provider Layer

**What:** Introduce an internal Effect service that owns `LibSQLVector` operations and expose semantic methods such as `queryVectors`, `upsertVectors`, `deleteVectorsBySlug`, `createIndex`, and `dispose`. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts]

**When to use:** Retrieval embedding, content chunk cleanup, lifecycle init/dispose, and any tests that need vector behavior without mutating `store.vectorStore`. [VERIFIED: src/store/brainstore/content/chunks/factory.ts; VERIFIED: src/store/brainstore/ops/lifecycle/factory.ts; VERIFIED: test/ext.test.ts]

**Example:**

```typescript
export interface VectorProviderService {
  queryVectors(input: VectorQueryInput): Eff.Effect<VectorQueryMatch[], StoreError>;
  upsertVectors(input: VectorUpsertInput): Eff.Effect<void, StoreError>;
  deleteVectorsBySlug(slug: string): Eff.Effect<void, StoreError>;
  createIndex(): Eff.Effect<void, StoreError>;
  dispose(): Eff.Effect<void>;
}
```

Names are discretionary, but the provider must be typed and branch-consumed rather than raw option fan-out. [VERIFIED: 10-CONTEXT.md]

### Proposed Narrow Contracts

| Contract | Suggested Home | Methods |
|----------|----------------|---------|
| `IngestionWorkflowStore` | `src/ingest/workflow.ts` or `src/ingest/contracts.ts` | `getPage`, `createVersion`, `putPage`, `getTags`, `addTag`, `removeTag`, `upsertChunks`, `deleteChunks`, `addTimelineEntriesBatch`, optional `transaction`. [VERIFIED: src/ingest/workflow.ts] |
| `HybridSearchPromiseStore` | `src/search/hybrid.ts` | `searchKeyword`, `searchVector`, optional `brainStore`. [VERIFIED: src/search/hybrid.ts] |
| `PageToolsStore` | `src/tools/contracts.ts` | `getPage`, `getTags`, `deletePage`, `addTag`, `removeTag`. [VERIFIED: src/tools/page.ts] |
| `LinksToolsStore` | `src/tools/contracts.ts` | `getLinks`, `getBacklinks`, `addLink`, `removeLink`. [VERIFIED: src/tools/links.ts] |
| `TimelineToolsStore` | `src/tools/contracts.ts` | `getTimeline`. [VERIFIED: src/tools/timeline.ts] |
| `ConfigToolsStore` | `src/tools/contracts.ts` | `getConfig`, `setConfig`. [VERIFIED: src/tools/config.ts] |
| `RawDataToolsStore` | `src/tools/contracts.ts` | `getRawData`, `putRawData`. [VERIFIED: src/tools/raw.ts] |
| `ListPagesStore` | `src/tools/contracts.ts` | `listPages`. [VERIFIED: src/tools/list.ts] |
| `DoctorStore` | `src/scripts/doctor.ts` or `src/scripts/contracts.ts` | `init`, `getHealthReport`, `dispose`. [VERIFIED: src/scripts/doctor.ts] |
| `EmbeddingMaintenanceStore` | `src/scripts/embed.ts` or `src/scripts/contracts.ts` | `init`, `getStaleChunks`, `upsertVectors`, `markChunksEmbedded`, `dispose`. [VERIFIED: src/scripts/embed.ts] |

### Safe Planning Order

1. Freeze the inventory in a small generated/tested document or test fixture before edits. [VERIFIED: P10-01; VERIFIED: rg inventory]
2. Narrow `createIngestionWorkflow` and its tests first because it is the Phase 09 UAT follow-up and has behavior-focused mocks already. [VERIFIED: 10-CONTEXT.md; VERIFIED: test/ingest/workflow.test.ts]
3. Introduce branch-owned `getChunksWithEmbeddings` on `ContentChunksService`, project it through compat/facade, and keep public behavior identical. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/content/chunks/interface.ts]
4. Introduce the typed vector provider layer and rewire retrieval/chunks/lifecycle/internal consumers to it. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts; VERIFIED: src/store/brainstore/ops/lifecycle/factory.ts]
5. Narrow tool/script contracts after workflow and vector seams are stable, so public facade tests remain a safety net. [VERIFIED: src/tools/*.ts; VERIFIED: src/scripts/*.ts; VERIFIED: test/libsql.test.ts]
6. Convert only internal/helper tests away from `LibSQLStore`; leave facade/integration tests that intentionally prove public behavior. [VERIFIED: 10-CONTEXT.md; VERIFIED: test/libsql.test.ts; VERIFIED: test/integration.test.ts]

### Anti-Patterns to Avoid

- **Widening `StoreProvider` for internal needs:** This violates P10-05 and makes public API carry internal implementation pressure. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/store/interface.ts]
- **Making workflow callers import `BrainStoreTree` branches:** This violates D-04 and D-06. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/workflow/index.ts]
- **Keeping `getChunksWithEmbeddings` implemented only in `libsql-store.ts`:** This preserves the compat-only ownership that the folded todo explicitly asks to clean up. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts]
- **Passing raw `vectorStore` through multiple branch factories:** This keeps low-level vector details ambient and makes tests mutate facade internals. [VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts; VERIFIED: test/ext.test.ts]
- **Using Context7's current Effect snippets as v4 examples:** The fetched Effect snippets included `Context.Tag`, which local v4 rules ban. [VERIFIED: npx ctx7 docs /effect-ts/effect; VERIFIED: docs/effect/v4-banned-patterns.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency injection for store branches | Ad hoc singleton registry or global store | Effect `Context.Service` plus `Layer` composition | Existing branch architecture already uses Context/Layer and local rules require it. [VERIFIED: src/store/brainstore/**/interface.ts; VERIFIED: docs/effect/v4-systematic-guide.md] |
| Public compatibility adapter | New parallel store class | Existing `LibSQLStore` facade over `BrainStoreCompat` | Public behavior must remain stable and tests already cover the facade. [VERIFIED: src/store/libsql.ts; VERIFIED: test/libsql.test.ts; VERIFIED: 10-CONTEXT.md] |
| Workflow persistence API | Broad `StoreProvider` dependency | `IngestionWorkflowStore` capability contract | Workflow uses a small method subset. [VERIFIED: src/ingest/workflow.ts] |
| Vector operation fan-out | Raw `LibSQLVector` option passing to every branch | Typed internal vector provider/service | Folded todo requires raw vector access to stop being ambient branch assembly detail. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts] |
| SQL/ORM access in tools/scripts | Direct Drizzle, SQLite, or unsafe SQL from outside store | Store/provider capability methods | Project constraints prohibit SQL/ORM leakage outside store boundary. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md] |

**Key insight:** The goal is not to remove `LibSQLStore`; it is to make every non-public consumer prove which capability it needs. [VERIFIED: 10-CONTEXT.md; VERIFIED: local consumer inventory]

## Runtime State Inventory

This is a refactor phase with no rename, rebrand, data migration, or runtime identifier change in scope. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 10-CONTEXT.md]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None for boundary narrowing; no stored key/string is being renamed. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 10-CONTEXT.md] | No data migration required. [VERIFIED: phase scope] |
| Live service config | None identified; phase changes TypeScript contracts and internal layers only. [VERIFIED: .planning/ROADMAP.md; VERIFIED: src/**/*.ts audit] | No live service config update required. [VERIFIED: phase scope] |
| OS-registered state | None identified. [VERIFIED: phase scope] | No OS re-registration required. [VERIFIED: phase scope] |
| Secrets/env vars | Existing embedding env vars are not renamed by this phase. [VERIFIED: AGENTS.md; VERIFIED: src/store/index.ts] | No secret/env var rename required. [VERIFIED: phase scope] |
| Build artifacts | TypeScript output may be regenerated by `tsup` if build is run; no installed package rename is in scope. [VERIFIED: package.json; VERIFIED: phase scope] | Run normal build/test commands only. [VERIFIED: package.json] |

## Common Pitfalls

### Pitfall 1: Public Facade Erosion
**What goes wrong:** A plan replaces `LibSQLStore` usage everywhere and deletes public facade evidence. [VERIFIED: 10-CONTEXT.md]  
**Why it happens:** Dependency narrowing gets confused with facade removal. [VERIFIED: 10-CONTEXT.md]  
**How to avoid:** Keep `test/libsql.test.ts` and at least one real integration path on `LibSQLStore`. [VERIFIED: test/libsql.test.ts; VERIFIED: test/integration.test.ts]  
**Warning signs:** `new LibSQLStore` disappears from all tests or `StoreProvider` public shape changes. [VERIFIED: P10-04; VERIFIED: P10-05]

### Pitfall 2: Workflow Boundary Drift
**What goes wrong:** `createIngestionWorkflow` starts requiring branch services or a `BrainStoreTree`. [VERIFIED: D-04; VERIFIED: D-06]  
**Why it happens:** Internal branch architecture leaks upward during type cleanup. [VERIFIED: src/workflow/index.ts; VERIFIED: src/store/brainstore/tree/interface.ts]  
**How to avoid:** Keep the signature shape `{ store, embedder }` and narrow only the `store` type. [VERIFIED: 10-CONTEXT.md; VERIFIED: src/ingest/workflow.ts]  
**Warning signs:** Tool/script callers import `ContentPages`, `ContentChunks`, or `BrainStoreTree` just to ingest content. [VERIFIED: D-06]

### Pitfall 3: Vector Seam Hidden in Facade Tests
**What goes wrong:** Tests keep mutating `store.vectorStore.query` or `store.vectorStore.upsert`, so the internal vector boundary is not actually proven. [VERIFIED: test/ext.test.ts]  
**Why it happens:** `LibSQLStore` exposes `vectorStore` publicly for compatibility, and current tests use it as a mock seam. [VERIFIED: src/store/libsql.ts; VERIFIED: test/ext.test.ts]  
**How to avoid:** Add a typed vector provider layer test and branch-level retrieval/chunk tests, then leave raw vector access only where facade internals are intentionally tested. [VERIFIED: 10-CONTEXT.md; VERIFIED: pending todo]  
**Warning signs:** New tests assign to `store.vectorStore.query` or `store.vectorStore.upsert`. [VERIFIED: test/ext.test.ts]

### Pitfall 4: Effect v3 Syntax Sneaks Back In
**What goes wrong:** New services use `Context.Tag`, `Effect.Tag`, `Effect.catchAll`, or generic `Runtime` assumptions. [VERIFIED: docs/effect/v4-banned-patterns.md]  
**Why it happens:** Current public Effect docs and Context7 snippets may show v3 examples. [VERIFIED: npx ctx7 docs /effect-ts/effect]  
**How to avoid:** Use local v4 docs and run the PowerShell check plus explicit grep guards. [VERIFIED: docs/effect/v4-systematic-guide.md; VERIFIED: scripts/check-effect-v4.ps1]  
**Warning signs:** `Context.Tag(` appears in new branch/provider code. [VERIFIED: docs/effect/v4-banned-patterns.md]

### Pitfall 5: Tests Prove Types by Casting
**What goes wrong:** Tests keep using `as unknown as StoreProvider` or broad proxy mocks, so narrowing is type-only theater. [VERIFIED: test/search/hybrid.test.ts; VERIFIED: test/ingest/workflow.test.ts]  
**Why it happens:** Existing mocks predate the narrower contracts. [VERIFIED: test/search/hybrid.test.ts; VERIFIED: test/ingest/workflow.test.ts]  
**How to avoid:** Update mocks to implement new narrow interfaces directly. [VERIFIED: P10-04; VERIFIED: proposed contracts]  
**Warning signs:** `as unknown as StoreProvider` remains in workflow/search tests after migration. [VERIFIED: rg guard]

## Code Examples

### Narrow Workflow Contract

```typescript
// Source: src/ingest/workflow.ts audit.
export interface IngestionOptions {
  store: IngestionWorkflowStore;
  embedder: EmbeddingProvider;
  maxBytes?: number;
}
```

This keeps caller shape unchanged while removing the full `StoreProvider` dependency. [VERIFIED: src/ingest/workflow.ts; VERIFIED: 10-CONTEXT.md]

### Transaction Callback Uses Same Narrow Store

```typescript
// Source: current persist step in src/ingest/workflow.ts.
const write = async (tx: IngestionWorkflowStore) => {
  if (inputData.existing_hash) await tx.createVersion(slug);
  await tx.putPage(slug, pageInput);
  await tx.upsertChunks(slug, chunks);
  await tx.addTimelineEntriesBatch(entries);
};
```

This prevents optional transactions from reintroducing `StoreProvider`. [VERIFIED: src/ingest/workflow.ts]

### Branch-Owned Chunk Embedding Lookup

```typescript
// Source target: src/store/brainstore/content/chunks/interface.ts.
export interface ContentChunksService {
  upsertChunks(slug: string, chunks: ChunkInput[]): EngineEffect<void>;
  deleteChunks(slug: string): EngineEffect<void>;
  getChunks(slug: string): EngineEffect<Chunk[]>;
  getChunksWithEmbeddings(slug: string): EngineEffect<Chunk[]>;
}
```

This is the planned ownership move for the legacy compat method. [VERIFIED: pending todo; VERIFIED: src/store/BrainStore.ts; VERIFIED: src/store/libsql-store.ts]

### Tool Contract Example

```typescript
// Source: src/tools/page.ts audit.
export interface PageToolsStore {
  getPage(slug: string): Promise<Page | null>;
  getTags(slug: string): Promise<string[]>;
  deletePage(slug: string): Promise<void>;
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;
}
```

This lets `LibSQLStore` keep working structurally while tool tests can use precise mocks. [VERIFIED: src/tools/page.ts; VERIFIED: src/store/libsql.ts]

## State of the Art

| Old Approach | Current/Target Approach | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| Flat `BrainStore` projection as the main internal dependency | `BrainStoreTree` feature branches with compat-over-tree facade | Phase 09, completed 2026-04-25 | Phase 10 should consume branch/narrow contracts internally and keep compat public. [VERIFIED: .planning/STATE.md; VERIFIED: Phase 09 summaries referenced in 10-CONTEXT.md] |
| Workflow store typed as full `StoreProvider` | Workflow store typed as exact persistence capability set | Phase 10 target | Prevents workflow from depending on search, raw data, config, lifecycle, or unsafe DB methods. [VERIFIED: src/ingest/workflow.ts] |
| Raw `vectorStore` passed through `libsql-store.ts` to branches | Typed vector provider layer/service | Phase 10 target | Removes ambient raw vector dependency and enables branch/provider-level tests. [VERIFIED: pending todo; VERIFIED: src/store/libsql-store.ts] |
| `getChunksWithEmbeddings` as compat-only method | Branch-owned content chunks capability projected through compat/facade | Phase 10 target | Aligns chunk read ownership with `ContentChunksService`. [VERIFIED: pending todo; VERIFIED: src/store/brainstore/content/chunks/interface.ts] |

**Deprecated/outdated:** Context7's Effect result showed `Context.Tag` examples, which are invalid for this repository's Effect v4 beta rules. [VERIFIED: npx ctx7 docs /effect-ts/effect; VERIFIED: docs/effect/v4-banned-patterns.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getChunksWithEmbeddings` can initially preserve current behavior by delegating to `getChunks` while moving ownership to `ContentChunksService`. [ASSUMED] | Architecture Patterns / Code Examples | If true embedding retrieval is expected now, planner must add vector lookup implementation rather than a pure ownership move. |
| A2 | Tool capability contracts can live in `src/tools/contracts.ts` without creating an unwanted public API commitment. [ASSUMED] | Recommended Project Structure | If exports are treated as public package API, keep contracts local to each tool file instead. |

## Open Questions

1. **Should `getChunksWithEmbeddings` return actual vector payloads now or preserve current chunk-only behavior?**
   - What we know: current compat implementation delegates to `getChunks`, and `getEmbeddingsByChunkIds` currently returns an empty map. [VERIFIED: src/store/libsql-store.ts; VERIFIED: src/store/brainstore/retrieval/embedding/factory.ts]
   - What's unclear: whether Phase 10 should implement actual vector retrieval or only move ownership. [ASSUMED]
   - Recommendation: Plan ownership move first and add a test preserving current public behavior; add actual vector retrieval only if a requirement or failing test demands it. [VERIFIED: P10-05; ASSUMED]

2. **Should `src/agent/index.ts` stay broad?**
   - What we know: the agent constructs every tool, so its required store is effectively the intersection of all tool stores. [VERIFIED: src/agent/index.ts]
   - What's unclear: whether a named `GBrainAgentStore` improves clarity enough to justify another aggregate type. [ASSUMED]
   - Recommendation: Narrow individual tools first; keep agent broad or introduce an aggregate only after tool contracts settle. [VERIFIED: safe planning order; ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Bun | Tests and runtime scripts | Yes | 1.3.12 | None needed. [VERIFIED: bun --version] |
| Node.js | `npx`, GSD fallback, package tooling | Yes | v22.21.1 | None needed. [VERIFIED: node --version] |
| pnpm | Package scripts and installed-version audit | Yes | 10.12.1 | npm can query registry, but package scripts use pnpm. [VERIFIED: pnpm --version; VERIFIED: package.json] |
| PowerShell | Effect v4 check on Windows | Yes | 7.6.1 | Use `pwsh ./scripts/check-effect-v4.ps1 src`. [VERIFIED: pwsh version; VERIFIED: scripts/check-effect-v4.ps1] |
| POSIX `sh` | Alternate Effect v4 check | No | - | Use PowerShell script. [VERIFIED: sh availability check; VERIFIED: scripts/check-effect-v4.sh] |
| Context7 CLI | Documentation lookup | Yes through `npx` | latest at invocation | Use local docs where external docs conflict with repo rules. [VERIFIED: npx ctx7 library effect; VERIFIED: docs/effect/v4-playbook.md] |

**Missing dependencies with no fallback:** none for Phase 10 planning and implementation. [VERIFIED: environment audit]

**Missing dependencies with fallback:** POSIX `sh` is missing; use PowerShell for Effect v4 checks. [VERIFIED: environment audit]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `bun test` via Bun 1.3.12. [VERIFIED: bun --version; VERIFIED: package.json] |
| Config file | `bunfig.toml`; TypeScript config in `tsconfig.json` and `tsconfig.type.json`. [VERIFIED: rg --files] |
| Quick run command | `bun test test/ingest/workflow.test.ts test/search/hybrid.test.ts` passed 8 tests on 2026-04-26. [VERIFIED: command output] |
| Full suite command | `bun test` through package script `pnpm clean && bun test`. [VERIFIED: package.json] |
| Effect v4 syntax command | `pwsh ./scripts/check-effect-v4.ps1 src` passed on 2026-04-26. [VERIFIED: command output] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| P10-01 | Inventory and classify all `LibSQLStore`/store boundary consumers. | static/grep | `rg -n "LibSQLStore\|new\\s+LibSQLStore\|StoreProvider\|BrainStore\|vectorStore\|getChunksWithEmbeddings" src test` | Yes, grep target exists. [VERIFIED: rg output] |
| P10-02 | Internal consumers use capability-specific contracts instead of broad facade types. | type/static/unit | `rg -n "StoreProvider" src/ingest src/tools src/scripts src/search test/ingest test/search` plus targeted `bun test` | Existing tests need updates. [VERIFIED: rg output] |
| P10-03 | Workflow callers keep `{ store, embedder }` while workflow store type narrows. | unit/integration | `bun test test/ingest/workflow.test.ts test/tools.test.ts test/integration.test.ts` | Yes. [VERIFIED: test files] |
| P10-04 | Public facade tests remain while helper/internal tests use narrower seams. | unit/integration | `bun test test/libsql.test.ts test/ext.test.ts test/search/hybrid.test.ts test/ingest/workflow.test.ts` | Yes. [VERIFIED: test files] |
| P10-05 | Public `StoreProvider` and `LibSQLStore` behavior is preserved and not widened. | type/static/integration | `git diff -- src/store/interface.ts src/store/libsql.ts` plus `bun test test/libsql.test.ts test/integration.test.ts test/store_extensions.test.ts` | Yes. [VERIFIED: files] |

### Sampling Rate

- **Per task commit:** Run the relevant focused test file plus `pwsh ./scripts/check-effect-v4.ps1 src`. [VERIFIED: package scripts; VERIFIED: command output]
- **Per wave merge:** Run `bun test test/ingest/workflow.test.ts test/search/hybrid.test.ts test/libsql.test.ts` and any touched tool/script test. [VERIFIED: validation map]
- **Phase gate:** Run `bun test`, `pnpm check:fix -- <changed-files>` if formatting changed, and the guard greps below. [VERIFIED: package.json; VERIFIED: scripts/check-effect-v4.ps1]

### Guard Greps

```bash
rg -n "LibSQLStore|new\s+LibSQLStore" src test
rg -n "StoreProvider" src/ingest src/tools src/scripts src/search test/ingest test/search
rg -n "vectorStore" src/store/brainstore src/store/libsql-store.ts test
rg -n "getChunksWithEmbeddings" src/store src test
rg -n "as unknown as StoreProvider|as any" src/store src/ingest src/workflow test/ingest test/search
rg -n "Context\.Tag\(|Context\.GenericTag\(|Effect\.Tag\(|Effect\.Service\(|Runtime\.runFork|Effect\.runtime<|Effect\.catchAll|Effect\.catchSome|Effect\.fork\(|Effect\.forkDaemon\(" src
```

These greps should be interpreted by classification, not as zero-match requirements for public facade files. [VERIFIED: P10-01; VERIFIED: P10-04; VERIFIED: P10-05]

### Wave 0 Gaps

- [ ] Add or update a small inventory artifact/test assertion for P10-01 before migration begins. [VERIFIED: P10-01]
- [ ] Convert `test/ingest/workflow.test.ts` mock type from `StoreProvider` to `IngestionWorkflowStore`. [VERIFIED: test/ingest/workflow.test.ts]
- [ ] Convert `test/search/hybrid.test.ts` Promise fallback mocks away from `as unknown as StoreProvider` after adding a narrow search wrapper type. [VERIFIED: test/search/hybrid.test.ts]
- [ ] Add branch/vector-provider tests before removing direct `store.vectorStore` mutation from helper tests. [VERIFIED: test/ext.test.ts; VERIFIED: pending todo]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No direct auth change in this phase. [VERIFIED: phase scope] | Preserve existing token verification behavior if facade tests touch it. [VERIFIED: test/ext.test.ts; VERIFIED: src/store/interface.ts] |
| V3 Session Management | No. [VERIFIED: phase scope] | Not applicable. [VERIFIED: phase scope] |
| V4 Access Control | Indirectly, because broad store interfaces can expose unsafe capabilities to consumers. [VERIFIED: src/store/interface.ts; VERIFIED: src/store/brainstore/ops/internal/interface.ts] | Capability-specific contracts and no SQL/ORM leakage. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md] |
| V5 Input Validation | Yes for workflow/tool boundaries that retain Mastra/zod input schemas. [VERIFIED: src/ingest/workflow.ts; VERIFIED: src/tools/*.ts] | Keep existing zod schemas and do not bypass parser/slug validation. [VERIFIED: src/ingest/workflow.ts] |
| V6 Cryptography | No crypto change beyond existing content hash. [VERIFIED: src/ingest/workflow.ts] | Preserve existing `createHash("sha256")` behavior. [VERIFIED: src/ingest/workflow.ts] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL/ORM leakage to tools or scripts | Tampering / Information Disclosure | Keep raw SQL and Drizzle behind store/provider contracts. [VERIFIED: AGENTS.md; VERIFIED: .planning/codebase/CONVENTIONS.md] |
| Overbroad dependency injection exposing mutation methods | Elevation of Privilege | Narrow Promise contracts per tool/workflow/script. [VERIFIED: consumer inventory] |
| Symlink/path traversal in bulk import | Tampering | Existing import script skips symlinks, hidden directories, and `node_modules`; do not regress while changing types. [VERIFIED: src/scripts/import.ts] |
| Vector provider test mutation hides production behavior | Tampering / Reliability | Use typed vector provider injection for mocks. [VERIFIED: test/ext.test.ts; VERIFIED: pending todo] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/10-audit-libsqlstore-consumers-narrow-public-store-boundaries/10-CONTEXT.md` - locked Phase 10 decisions and deferred scope. [VERIFIED: file read]
- `.planning/ROADMAP.md` - Phase 10 goal and requirements. [VERIFIED: file read]
- `.planning/STATE.md` - Phase history and current status. [VERIFIED: file read]
- `AGENTS.md` and `CLAUDE.md` - repository constraints and Effect v4 rules. [VERIFIED: file read]
- `docs/effect/v4-systematic-guide.md`, `docs/effect/v4-playbook.md`, `docs/effect/v4-banned-patterns.md`, `docs/effect/effect-v4-agent-skill.md` - local Effect v4 rules. [VERIFIED: file read]
- `src/store/interface.ts`, `src/store/libsql.ts`, `src/store/libsql-store.ts`, `src/store/BrainStore.ts`, `src/store/brainstore/**` - store boundary implementation. [VERIFIED: file read]
- `src/ingest/workflow.ts`, `src/workflow/index.ts`, `src/search/hybrid.ts`, `src/tools/*.ts`, `src/scripts/*.ts` - current consumers and model patterns. [VERIFIED: file read]
- `test/libsql.test.ts`, `test/ext.test.ts`, `test/ingest/workflow.test.ts`, `test/search/hybrid.test.ts`, `test/integration.test.ts`, `test/tools.test.ts`, `test/store_extensions.test.ts`, `test/scripts/*.test.ts`, `test/llama_embedder.test.ts` - test classification evidence. [VERIFIED: file read]
- Local commands: `rg`, `pnpm list`, `bun --version`, `pwsh`, focused `bun test`, `pwsh ./scripts/check-effect-v4.ps1 src`. [VERIFIED: command output]

### Secondary (MEDIUM confidence)

- npm registry version checks for `effect`, `@mastra/core`, `@mastra/libsql`, `drizzle-orm`, `typescript`, `@effect/sql-sqlite-bun`, `@biomejs/biome`, `@yuyi919/tslibs-effect`. [VERIFIED: npm registry]
- Context7 `/mastra-ai/mastra` workflow docs for `createRun` and `start` usage. [CITED: https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/workflows/workflow-methods/create-run.mdx]

### Tertiary (LOW confidence)

- Context7 `/effect-ts/effect` current docs for Effect service examples are not used for v4 planning because fetched snippets included banned v3 `Context.Tag` syntax. [VERIFIED: npx ctx7 docs /effect-ts/effect; VERIFIED: docs/effect/v4-banned-patterns.md]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for local installed stack, MEDIUM for latest registry comparison because local Effect v4 beta intentionally diverges from npm default latest. [VERIFIED: pnpm list; VERIFIED: npm registry; VERIFIED: docs/effect/v4-playbook.md]
- Architecture: HIGH because findings come from direct code reads and Phase 10 locked decisions. [VERIFIED: src/**/*.ts audit; VERIFIED: 10-CONTEXT.md]
- Pitfalls: HIGH for local pitfalls shown by current tests/code, MEDIUM for external docs pitfalls because Context7 Effect docs conflict with local v4 rules. [VERIFIED: test/ext.test.ts; VERIFIED: test/search/hybrid.test.ts; VERIFIED: npx ctx7 docs]

**Research date:** 2026-04-26 [VERIFIED: Get-Date]
**Valid until:** 2026-05-03 for library version notes, 2026-05-26 for local code architecture if Phase 10 is not implemented sooner. [ASSUMED]
