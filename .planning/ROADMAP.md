# Project Roadmap

## Milestones

- [x] **v1.0 milestone** - Phases 1-8 (shipped 2026-04-24)
- [ ] **Post-v1.0 store refactor** - Phase 9 (reopened 2026-04-25)

## Active Development

## Phase 9: Layer BrainStore Contexts & Tighten Store Boundaries

**Goal:** Repair the current BrainStore refactor so feature layers can be built independently, can explicitly depend on other feature layers, and are only assembled into a final `BrainStoreTree` at the root.
**Requirements**
- `P09-01` Replace the flat-first BrainStore shape with a tree-shaped, dependency-driven `BrainStoreTree` composition model.
- `P09-02` Build the locked domain branches independently under `src/store/brainstore/**` and declare inter-layer dependencies only through explicit narrow contracts.
- `P09-03` Keep low-level SQL, vector/runtime access, and lifecycle behavior behind internal branches only; do not widen `StoreProvider`, `LibSQLStore`, or provider boundaries.
- `P09-04` Narrow internal consumers to the minimum feature branch they actually need and verify both independent capability injection and compatibility behavior.
**Depends on:** Phase 8
**Plans:** 10 plans

Plans:
- [ ] 09-01-PLAN.md - Freeze `content.pages` and `content.chunks` folder skeletons
- [ ] 09-02-PLAN.md - Freeze `graph.links` and `graph.timeline` folder skeletons
- [ ] 09-03-PLAN.md - Freeze retrieval contracts and rewrite `BrainStore.ts` as a transitional barrel
- [ ] 09-04-PLAN.md - Freeze `ops.internal` and `ops.lifecycle` branch boundaries
- [ ] 09-05-PLAN.md - Define tree/compat roots and add Wave-0 regression scaffolds
- [ ] 09-06-PLAN.md - Implement content and graph branch factories
- [ ] 09-07-PLAN.md - Implement ops and retrieval branches with branch-only regression coverage
- [ ] 09-08-PLAN.md - Assemble `BrainStoreTree` and remove flat-root projection from `libsql-store.ts`
- [ ] 09-09-PLAN.md - Rebuild compat/runtime/provider wiring over `BrainStoreTree`
- [ ] 09-10-PLAN.md - Narrow remaining consumers and close the phase with focused regressions

## Completed Phases

No completed post-v1.0 phases at the moment. Phase 9 was reopened on 2026-04-25.

## Carry-Forward Inputs

- Deferred todo: narrow module dependencies to feature-specific layers for reuse and testability.
- Imported review input: `./code-review.md`
- Phase 9 repair is now guided directly by completed todo `2026-04-24-split-brainstore-into-layered-contexts.md`.

## Reference

- Historical roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Historical requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Milestone audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
