---
created: 2026-04-25T23:00:23.6811548+08:00
completed: 2026-04-25
title: Consolidate LibSQLStore consumer boundary audit into Phase 10
area: store
absorbed_todos:
  - 2026-04-24-narrow-brainstore-dependencies-by-feature-layer
  - 2026-04-25-stabilize-provider-ingestion-workflow-surface
phase: 10-libsqlstore-consumer-boundary-audit
files:
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - src/store/index.ts
  - src/store/libsql.ts
  - src/workflow/index.ts
  - src/ingest/workflow.ts
  - test/ingest/workflow.test.ts
---

## Problem

Two pending todos pointed at the same next architectural pressure:

- modules should stop depending on broad BrainStore/LibSQLStore capabilities when
  a narrower feature/provider contract would work
- Phase 09 UAT identified provider and ingestion workflow surface stability as a
  follow-up rather than a Phase 09 fix

The scope is now intentionally larger than the original provider/workflow todo:
the next phase must audit every current `LibSQLStore` reference and decide which
uses are intentional public facade coverage and which should move to narrower
branch/provider seams.

## Solution

Phase 10 in `.planning/ROADMAP.md` now owns this work:

- inventory all `LibSQLStore` import/constructor usage across `src/**` and
  `test/**`
- narrow consumers to feature-specific contracts where possible
- keep `LibSQLStore` as a deliberate Promise facade and compatibility boundary
- preserve public behavior and facade tests while converting internal tests or
  helper paths to narrower injection seams where appropriate

Initial grep scope at consolidation time:

- `src/store/index.ts`
- `src/store/libsql.ts`
- `test/libsql.test.ts`
- `test/ext.test.ts`
- `test/integration.test.ts`
- `test/tools.test.ts`
- `test/store_extensions.test.ts`
- `test/llama_embedder.test.ts`
- `test/scripts/doctor.test.ts`
- `test/scripts/embed.test.ts`
