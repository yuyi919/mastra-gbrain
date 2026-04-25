# Project Roadmap

## Milestones

- [x] **v1.0 milestone** - Phases 1-8 (shipped 2026-04-24)
- [x] **Post-v1.0 store refactor** - Phase 9 (reopened 2026-04-25, completed 2026-04-25)

## Active Development

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

- Deferred todo: narrow module dependencies to feature-specific layers for reuse and testability.
- Imported review input: `./code-review.md`
- Phase 9 repair is now guided directly by completed todo `2026-04-24-split-brainstore-into-layered-contexts.md`.

## Reference

- Historical roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Historical requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Milestone audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
