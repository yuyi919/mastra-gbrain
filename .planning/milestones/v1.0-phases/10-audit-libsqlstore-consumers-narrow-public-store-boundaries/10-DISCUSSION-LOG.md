# Phase 10: Audit LibSQLStore Consumers & Narrow Public Store Boundaries - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md - this log preserves the analysis.

**Date:** 2026-04-25
**Phase:** 10-audit-libsqlstore-consumers-narrow-public-store-boundaries
**Mode:** assumptions
**Areas analyzed:** Public Facade Boundary, Workflow And Provider Surface, Capability Contracts For Consumers, Vector And Embedding Ownership, Test Classification

## Assumptions Presented

### Public Facade Boundary

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| `LibSQLStore` should remain the public Promise-facing facade and provider default, while Phase 10 narrows internal consumers away from depending on it by default. | Confident | `.planning/ROADMAP.md`, `src/store/libsql.ts`, `src/store/index.ts`, `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-VERIFICATION.md` |

### Workflow And Provider Surface

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| `createIngestionWorkflow` should keep accepting `{ store, embedder }`, but the `store` type should narrow to ingestion/write/timeline capabilities actually used by the workflow. | Confident | `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-UAT.md`, `src/workflow/index.ts`, `src/ingest/workflow.ts`, `test/ingest/workflow.test.ts` |

### Capability Contracts For Consumers

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Tool and script modules should use capability-specific store contracts where practical, while preserving their current ability to receive a `LibSQLStore` / `StoreProvider` instance from public wiring. | Likely | `src/tools/**`, `src/scripts/**`, `src/search/hybrid.ts`, `test/search/hybrid.test.ts` |

### Vector And Embedding Ownership

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| Raw vector access should stay internal/facade-only, and `getChunksWithEmbeddings` should move out of the legacy compat-only surface into a branch-owned capability before tests stop reaching through `store.vectorStore`. | Likely | `.planning/todos/pending/2026-04-25-refine-phase-9-content-chunks-and-vector-provider-layers.md`, `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-09-SUMMARY.md`, `src/store/BrainStore.ts`, `src/store/libsql-store.ts`, `src/store/brainstore/content/chunks/interface.ts`, `test/ext.test.ts` |

### Test Classification

| Assumption | Confidence | Evidence |
|------------|------------|----------|
| `test/libsql.test.ts` should remain public facade coverage, but tests that only need workflow, branch, provider, or vector-helper behavior should be converted to narrower injection where that proves the boundary more directly. | Confident | `.planning/ROADMAP.md`, `test/libsql.test.ts`, `test/ingest/workflow.test.ts`, `test/search/hybrid.test.ts`, `test/ext.test.ts` |

## Corrections Made

### Execution-time correction from user

- **Original assumption:** Internal consumers should move from broad `LibSQLStore` / `StoreProvider` use to narrower Promise-shaped capability contracts while preserving the public facade.
- **User correction:** The actual goal is for modules currently using `LibSQLStore` to directly use the Effect runtime / branch services where they are internal modules, rather than creating unnecessary Promise compatibility layers.
- **Reason:** Promise compatibility should be limited to public/legacy boundaries. Internal workflow/tool/script paths should move toward Effect services, Layers, and runtime-provided branch contracts.
- **Applied to CONTEXT.md:** Added D-23 and D-24, and revised the workflow/consumer/test decisions to prefer direct Effect runtime / branch-service usage over narrower Promise contracts.

Earlier no-correction note: interactive question tooling was unavailable in this Codex default execution mode, so the initial workflow fallback accepted recommended assumptions. The execution-time correction above supersedes the affected assumptions.

## Folded Todos

- `2026-04-25-refine-phase-9-content-chunks-and-vector-provider-layers.md` was folded into Phase 10 because `todo match-phase 10` scored it at 0.9 and it directly matches the Phase 10 vector/chunks boundary cleanup.

## External Research

No external research was needed. The phase concerns local architecture, existing code boundaries, and project-specific Effect v4 constraints captured in repository documentation.
