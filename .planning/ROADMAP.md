# Project Roadmap

## Milestone Progress
- [x] Phase 1: Analysis & Preparation (archived in `.planning/milestones/v1.0-ROADMAP.md`)
- [x] Phase 2: Replace Runtime (archived in `.planning/milestones/v1.0-ROADMAP.md`)
- [x] Phase 3: Test & Fix (archived in `.planning/milestones/v1.0-ROADMAP.md`)
- [x] Phase 4: Optimize & Advance (archived in `.planning/milestones/v1.0-ROADMAP.md`)
- [ ] Phase 5: Route All Promise Methods in libstore.ts to Effect Core

## Phase 5: Route All Promise Methods in libstore.ts to Effect Core

**Goal:** Migrate remaining Promise-based methods in `src/store/libstore.ts` to Effect v4 architecture while preserving public behavior.
**Requirements**
- Keep `StoreProvider` abstraction boundaries unchanged.
- Follow Effect v4 systematic guide and banned-pattern constraints.
- Ensure related tests pass.
**Depends on:** Phase 4
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 5 to break down)
