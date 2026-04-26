# Phase 10: Audit LibSQLStore Consumers & Narrow Public Store Boundaries - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** assumptions

<domain>
## Phase Boundary

This phase audits and narrows the remaining `LibSQLStore` / broad store dependencies after the Phase 09 `BrainStoreTree` refactor.

The phase must keep `LibSQLStore` as the public Promise-facing facade and keep `StoreProvider` behavior stable for existing callers. The cleanup target is internal dependency shape: workflow, tool, script, helper, and test code should consume capability-specific contracts where they do not need the full facade.

This phase also absorbs the Phase 09 UAT follow-up around provider/workflow surface stability. Workflow callers should keep the intended `{ store, embedder }` boundary without learning internal branch services.

</domain>

<decisions>
## Implementation Decisions

### Public Facade Boundary
- **D-01:** Keep `LibSQLStore` as the deliberate public Promise facade and provider default.
- **D-02:** Do not replace the public `BrainStoreProvider` default with branch services. Internal narrowing must happen behind or beside the existing public facade, not by breaking ergonomic public construction.
- **D-03:** Preserve all existing `StoreProvider` and `LibSQLStore` behavior; public compatibility tests remain required evidence.

### Workflow And Provider Surface
- **D-04:** Keep public/legacy callers able to use `createIngestionWorkflow({ store, embedder })` through compatibility wiring, but this is not the primary internal target.
- **D-05:** Internal modules that currently use `LibSQLStore` should be migrated toward direct Effect runtime / branch-service usage instead of creating new Promise-shaped compatibility contracts.
- **D-06:** Do not create unnecessary Promise compatibility layers merely to make a narrower facade. Promise APIs are acceptable at external/public boundaries; internal workflow/tool/script paths should prefer Effect services, Layers, and runtime-provided branch contracts.
- **D-07:** Workflow callers should not need raw SQL, raw vector store, or `LibSQLStore`, but they may consume Effect-based store services directly when they are internal modules.

### Consumer Capability Contracts
- **D-08:** Inventory every current `LibSQLStore` import and constructor usage across `src/**` and `test/**` before implementation changes.
- **D-09:** Classify each consumer as public facade coverage, provider wiring, workflow/tool consumer, script utility, or replaceable internal dependency.
- **D-10:** Replaceable internal dependencies should move to Effect runtime / branch-service consumption, not simply to narrower Promise interfaces.
- **D-11:** Use `src/search/hybrid.ts` only as a partial model: the Effect path depending on `BrainStoreSearch` is the desired internal direction; the Promise wrapper is compatibility glue, not the target pattern for new internal modules.

### Vector And Embedding Ownership
- **D-12:** Fold the pending vector-boundary todo into this phase.
- **D-13:** Move `getChunksWithEmbeddings(slug)` ownership out of the legacy compat-only surface and into a branch-owned capability before tests stop reaching through raw facade internals.
- **D-14:** Introduce a typed vector provider layer or equivalent low-level internal service so raw `LibSQLVector` access is not passed through `libsql-store.ts` into multiple branches as an ambient implementation detail.
- **D-15:** Keep raw vector access internal or facade-only. Tests should prefer Effect branch/provider-level seams instead of mutating `store.vectorStore` directly when they are not intentionally verifying facade internals.

### Test Classification
- **D-16:** Keep `test/libsql.test.ts` as public facade compatibility coverage.
- **D-17:** Convert tests that only need workflow, branch, provider, or vector-helper behavior to Effect runtime / branch-service injection where that better proves the new boundary.
- **D-18:** Do not convert true public compatibility tests away from `LibSQLStore`; the phase needs both public facade evidence and direct Effect runtime evidence.

### Effect v4 And Store Discipline
- **D-19:** New or modified Effect store code must follow local Effect v4 rules: `Context.Service`, `Layer` composition, inferred accessor callbacks, and no v3 syntax.
- **D-20:** Store implementation files must not use `as unknown` / `as any` to bypass type problems. If a contract is missing shape, fix the contract at the branch boundary.
- **D-21:** `libsql-store.ts` should remain an assembly boundary. It may compose external ports/options, root, compat, and ext, but should not reimplement feature branch behavior.

### Folded Todos
- **D-22:** Fold `2026-04-25-refine-phase-9-content-chunks-and-vector-provider-layers.md` into Phase 10. It directly matches the Phase 10 vector/chunks boundary cleanup: branch ownership for `getChunksWithEmbeddings` and a typed vector provider layer for raw vector operations.

### Correction Captured During Execution
- **D-23:** Supersede the earlier "narrow Promise contract" interpretation. The user's actual target is: modules currently using `LibSQLStore` should directly use the Effect runtime / branch services wherever they are internal modules.
- **D-24:** Existing work from Plans 10-02 and 10-03 must be reviewed against this corrected target before continuing. Keep pieces that move toward Effect services/Layers; revise or replace pieces that merely create new Promise compatibility layers.

### the agent's Discretion
- Exact names of new narrow TypeScript interfaces, as long as they are capability-specific and live near the consuming domain or branch contract.
- Exact ordering of consumer migration after the required inventory, as long as public facade stability and direct internal Effect-runtime usage are protected early.
- Whether vector provider is introduced as a new branch under `ops/internal`, a low-level provider service beside `Mappers`, or another small internal layer, provided downstream branches consume it through a typed contract rather than raw option passing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 Scope
- `.planning/ROADMAP.md` - Phase 10 goal, requirements P10-01 through P10-05, initial grep scope, and carry-forward inputs.
- `.planning/STATE.md` - Current state, Phase 10 stopped-at note, and pending todo count.
- `.planning/todos/pending/2026-04-25-refine-phase-9-content-chunks-and-vector-provider-layers.md` - Folded vector/chunks boundary follow-up.

### Phase 09 Baseline
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-CONTEXT.md` - Locked Phase 09 tree-first architecture decisions.
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-VERIFICATION.md` - Evidence that `BrainStoreTree`, compat-over-tree, branch-only search, and no flat projection are already verified.
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-UAT.md` - Provider/workflow surface stability issue carried into Phase 10.
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-09-SUMMARY.md` - Compat runtime/provider wiring summary and notes on legacy `getChunksWithEmbeddings`.
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-10-SUMMARY.md` - Branch-only search and final Phase 09 regression closure.

### Architecture And Local Rules
- `AGENTS.md` - Repository handoff constraints, store architecture rules, and Effect v4 requirements.
- `docs/effect/v4-systematic-guide.md` - Mandatory Effect v4 patterns.
- `docs/effect/v4-playbook.md` - Effect v4 migration/playbook details.
- `docs/effect/v4-banned-patterns.md` - Forbidden Effect v3 and non-idiomatic patterns.
- `docs/effect/effect-v4-agent-skill.md` - Agent-facing Effect v4 implementation rules.
- `.planning/codebase/ARCHITECTURE.md` - Current high-level system layers and data flow.
- `.planning/codebase/CONVENTIONS.md` - Interface-first, DI, store-boundary, type-safety, and i18n constraints.
- `.planning/codebase/TESTING.md` - Test isolation and regression expectations.

### Implementation Hotspots
- `src/store/interface.ts` - Public `StoreProvider`, ingestion, hybrid search, embedding, and lifecycle contracts.
- `src/store/index.ts` - Default store/embedder factory and `BrainStoreProvider` wiring.
- `src/store/libsql.ts` - Public Promise facade and `BrainStoreCompat` bridge.
- `src/store/libsql-store.ts` - Runtime layer assembly, compat/root construction, and current vector option passing.
- `src/store/BrainStore.ts` - Root BrainStore Context, compatibility aliases, and transitional ingestion surface.
- `src/store/brainstore/content/chunks/interface.ts` - Current chunk branch contract that does not yet own `getChunksWithEmbeddings`.
- `src/store/brainstore/content/chunks/factory.ts` - Current chunk write/delete behavior and embedding port use.
- `src/store/brainstore/retrieval/embedding/interface.ts` - Current retrieval embedding/vector helper contract.
- `src/store/brainstore/retrieval/embedding/factory.ts` - Current raw `LibSQLVector` usage for search/upsert.
- `src/store/brainstore/ops/internal/interface.ts` - Current internal unsafe DB contract that still exposes `vectorStore`.
- `src/store/brainstore/ops/internal/factory.ts` - Current internal branch construction with raw vector option.
- `src/ingest/workflow.ts` - Workflow contract to narrow while preserving `{ store, embedder }`.
- `src/workflow/index.ts` - Provider-to-workflow integration point.
- `src/search/hybrid.ts` - Narrow branch dependency model for search.

### Regression Targets
- `test/libsql.test.ts` - Public `LibSQLStore` facade coverage that should remain.
- `test/ingest/workflow.test.ts` - Workflow/provider surface regression and mock-driven narrow contract candidate.
- `test/search/hybrid.test.ts` - Existing branch-only retrieval injection proof.
- `test/ext.test.ts` - Compat/vector/stale-helper coverage; also current direct `store.vectorStore` test coupling.
- `test/integration.test.ts` - Public tool/workflow integration through real store/embedder wiring.
- `test/tools.test.ts` - Tool factory compatibility with public store/embedder.
- `test/store_extensions.test.ts` - Extension facade compatibility.
- `test/llama_embedder.test.ts` - Local embedding workflow integration.
- `test/scripts/doctor.test.ts` - Script utility store dependency coverage.
- `test/scripts/embed.test.ts` - Script utility/vector embedding coverage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/interface.ts` already separates `IngestionStore`, `HybridSearchBackend`, `EmbeddingProvider`, and the broader `StoreProvider`; these can seed narrower consumer contracts.
- `src/search/hybrid.ts` already has an Effect-first path requiring only `BrainStoreSearch`, while retaining a Promise compatibility wrapper for `StoreProvider`.
- `src/store/brainstore/**/{interface,factory,index}.ts` is the established Phase 09 branch pattern for new or refined store services.
- `test/ingest/workflow.test.ts` already uses behavior-focused mocks, which makes it a good target for proving the workflow no longer needs full `StoreProvider`.

### Established Patterns
- Public callers use factory functions and dependency injection (`createSearchTool`, `createIngestTool`, `createIngestionWorkflow`, script run helpers).
- `LibSQLStore` is a Promise adapter over Effect runtime services, not the desired dependency for new internal Effect code.
- `libsql-store.ts` composes branch `makeLayer` exports and should continue delegating feature behavior to branch modules.
- Tests must keep databases under `./tmp/` and release resources through `dispose()` / cleanup helpers.

### Integration Points
- Provider wiring: `src/store/index.ts` and `src/workflow/index.ts`.
- Workflow ingestion: `src/ingest/workflow.ts`, `src/tools/ingest.ts`, `src/scripts/import.ts`.
- Public facade: `src/store/libsql.ts` and facade-focused tests.
- Vector/embedding boundary: `src/store/libsql-store.ts`, retrieval embedding branch, content chunks branch, ops internal branch, and `test/ext.test.ts`.
- Consumer audit surface: tool modules under `src/tools/**`, scripts under `src/scripts/**`, and tests named in the Phase 10 roadmap.

</code_context>

<specifics>
## Specific Ideas

- Treat Phase 10 as an audit-first refactor: produce a concrete inventory before changing consumer types.
- Prefer local type aliases or exported capability interfaces over widening `StoreProvider`.
- Preserve public ergonomics: `new LibSQLStore(...)`, `createDefaultStore(...)`, and `BrainStoreProvider.Default(...)` should remain valid.
- The workflow fix should be visible to downstream agents as "same caller shape, narrower store contract", not as a new branch-service workflow API.
- The vector provider cleanup should remove raw `vectorStore` fan-out from branch assembly where practical.

</specifics>

<deferred>
## Deferred Ideas

None. Assumption analysis stayed within Phase 10 scope.

</deferred>

---

*Phase: 10-audit-libsqlstore-consumers-narrow-public-store-boundaries*
*Context gathered: 2026-04-25*
