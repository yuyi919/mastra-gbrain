# Project Roadmap

## Milestones

- [x] **v1.0 milestone** - Phases 1-8 (shipped 2026-04-24)
- [x] **Post-v1.0 store refactor** - Phase 9 (reopened 2026-04-25, completed 2026-04-25)
- [ ] **Post-v1.0 consumer boundary cleanup** - Phase 10

## Active Development

## Phase 10: Audit LibSQLStore Consumers & Narrow Public Store Boundaries

**Goal:** Consolidate the remaining BrainStore dependency-narrowing and provider/workflow follow-up work into one consumer-boundary refactor that audits every current `LibSQLStore` reference, migrates internal modules toward direct Effect runtime / branch-service usage, and keeps `LibSQLStore` as a deliberate Promise facade for public and legacy boundaries only.

**Requirements**
- `P10-01` Inventory every current `LibSQLStore` import/constructor usage across `src/**` and `test/**`, classify each as public facade coverage, provider wiring, workflow/tool consumer, script utility, or replaceable internal dependency.
- `P10-02` Replace internal broad `LibSQLStore`/`StoreProvider` dependencies with direct Effect runtime / branch-service usage wherever the caller is not a public or legacy Promise boundary.
- `P10-03` Stabilize the provider and ingestion workflow surface from Phase 09 UAT so public workflow callers keep the intended `{ store, embedder }` boundary while internal workflow paths can run through branch services.
- `P10-04` Keep public compatibility tests for `LibSQLStore` where they intentionally verify the facade, but convert internal or helper tests to branch/provider-level injection when that better proves the new seams.
- `P10-05` Preserve all existing public `StoreProvider` and `LibSQLStore` behavior; do not widen the public API while narrowing consumers.

**Depends on:** Phase 9
**Plans:** 6/7 plans executed

Initial scope from current grep:
- Production: `src/store/index.ts`
- Core facade: `src/store/libsql.ts`
- Workflow/provider: `src/workflow/index.ts`, `src/ingest/workflow.ts`, `test/ingest/workflow.test.ts`
- Direct `LibSQLStore` regression/users: `test/libsql.test.ts`, `test/ext.test.ts`, `test/integration.test.ts`, `test/tools.test.ts`, `test/store_extensions.test.ts`, `test/llama_embedder.test.ts`, `test/scripts/doctor.test.ts`, `test/scripts/embed.test.ts`

Carry-forward inputs:
- Consolidated todo: `narrow-brainstore-dependencies-by-feature-layer`
- Consolidated todo: `stabilize-provider-ingestion-workflow-surface`
- Phase 09 UAT gap: provider/workflow surface stability should become follow-up work rather than an immediate Phase 09 fix.

Plans:
- [x] 10-01-PLAN.md - Freeze the LibSQLStore/store-boundary consumer inventory before implementation
- [x] 10-02-PLAN.md - Narrow ingestion workflow/provider contract while preserving `{ store, embedder }`
- [x] 10-03-PLAN.md - Introduce typed internal vector provider layer and rewire branch consumers
- [x] 10-04-PLAN.md - Move `getChunksWithEmbeddings` ownership into the content chunks branch
- [x] 10-05-PLAN.md - Move hybrid search and internal tool paths to Effect runtime services
- [x] 10-06-PLAN.md - Move script/import internals to Effect runtime services while preserving CLI facades
- [ ] 10-07-PLAN.md - Close public facade regressions and direct-Effect boundary guards

## Phase 9: Layer BrainStore Contexts & Tighten Store Boundaries

**Goal:** Repair the current BrainStore refactor so feature layers can be built independently, can explicitly depend on other feature layers, and are only assembled into a final `BrainStoreTree` at the root.
**Requirements**
- `P09-01` Replace the flat-first BrainStore shape with a tree-shaped, dependency-driven `BrainStoreTree` composition model.
- `P09-02` Build the locked domain branches independently under `src/store/brainstore/**` and declare inter-layer dependencies only through explicit narrow contracts.
- `P09-03` Keep low-level SQL, vector/runtime access, and lifecycle behavior behind internal branches only; do not widen `StoreProvider`, `LibSQLStore`, or provider boundaries.
- `P09-04` Narrow internal consumers to the minimum feature branch they actually need and verify both independent capability injection and compatibility behavior.
**Depends on:** Phase 8
**Plans:** 10/10 plans complete

Plans:
- [x] 09-01-PLAN.md - Freeze `content.pages` and `content.chunks` folder skeletons
- [x] 09-02-PLAN.md - Freeze `graph.links` and `graph.timeline` folder skeletons
- [x] 09-03-PLAN.md - Freeze retrieval contracts and rewrite `BrainStore.ts` as a transitional barrel
- [x] 09-04-PLAN.md - Freeze `ops.internal` and `ops.lifecycle` branch boundaries
- [x] 09-05-PLAN.md - Define tree/compat roots and add Wave-0 regression scaffolds
- [x] 09-06-PLAN.md - Implement content and graph branch factories
- [x] 09-07-PLAN.md - Implement ops and retrieval branches with branch-only regression coverage
- [x] 09-08-PLAN.md - Assemble `BrainStoreTree` and remove flat-root projection from `libsql-store.ts`
- [x] 09-09-PLAN.md - Rebuild compat/runtime/provider wiring over `BrainStoreTree`
- [x] 09-10-PLAN.md - Narrow remaining consumers and close the phase with focused regressions

## Completed Phases

- [x] Phase 9: Layer BrainStore Contexts & Tighten Store Boundaries - completed 2026-04-25 with 10/10 plans verified.

## Carry-Forward Inputs

- Phase 10 now owns the consolidated `LibSQLStore` consumer audit and provider/workflow surface follow-up.
- Imported review input: `./code-review.md`
- Phase 9 repair is now guided directly by completed todo `2026-04-24-split-brainstore-into-layered-contexts.md`.

## Reference

- Historical roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Historical requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Milestone audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
