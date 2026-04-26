---
phase: 10
phase_name: "audit-libsqlstore-consumers-narrow-public-store-boundaries"
project: "mastra-gbrain"
generated: "2026-04-26T13:15:59.7126043+08:00"
counts:
  decisions: 6
  lessons: 5
  patterns: 5
  surprises: 4
missing_artifacts:
  - "*-UAT.md"
---

# Phase 10 Learnings: audit-libsqlstore-consumers-narrow-public-store-boundaries

## Decisions

### Freeze Inventory Before Any Boundary Refactor
Phase 10 chose to freeze a full consumer inventory before implementation so later dependency narrowing could be audited against a stable baseline.

**Rationale:** This protected D-07/D-08 preconditions and prevented accidental loss of intentional public facade coverage while refactoring internals.
**Source:** 10-01-PLAN.md, 10-01-SUMMARY.md

---

### Keep Workflow Caller Shape As `{ store, embedder }`
The ingestion workflow boundary stayed as `{ store, embedder }` while narrowing the workflow's internal store contract.

**Rationale:** Public provider wiring remained stable, while internal implementation reduced dependence on broad store surfaces.
**Source:** 10-02-PLAN.md, 10-02-SUMMARY.md

---

### Introduce VectorProvider As Internal Vector Boundary
Raw vector operations were moved behind a typed `VectorProvider` service under `ops/vector`.

**Rationale:** Retrieval/lifecycle/internal branches needed narrow, typed vector capabilities without spreading raw vector client semantics across branch contracts.
**Source:** 10-03-SUMMARY.md

---

### Move `getChunksWithEmbeddings` Ownership Into Content Chunks Branch
`getChunksWithEmbeddings` became branch-owned and projected through compat, instead of being implemented in `libsql-store.ts`.

**Rationale:** Ownership aligned with the feature branch and kept `libsql-store.ts` assembly-oriented while preserving facade behavior.
**Source:** 10-04-SUMMARY.md

---

### Make Runtime-Backed Effects the Internal Source of Truth
Search/workflow/scripts moved to runtime-first Effect execution, with Promise behavior kept as compatibility wrappers at public/CLI boundaries.

**Rationale:** Internal lanes needed branch-service-first execution to satisfy the corrected phase direction while avoiding new Promise contract families.
**Source:** 10-05-SUMMARY.md, 10-06-SUMMARY.md

---

### Treat Public Facade Matches As Intentional Evidence, Not Noise
Final closure kept explicit `LibSQLStore` facade regression lanes and interpreted grep results via inventory classification.

**Rationale:** Driving facade matches to zero would erase compatibility evidence; the goal was boundary correctness, not zero textual matches.
**Source:** 10-07-PLAN.md, 10-07-SUMMARY.md, 10-VERIFICATION.md

---

## Lessons

### Structural Return Types Can Break Narrowing Even When Behavior Is Unchanged
Narrowing `addTimelineEntriesBatch` to `Promise<void>` broke structural compatibility with the public facade and had to be revised.

**Context:** Workflow code did not use the returned count, but the public facade returned `Promise<number>`, so `Promise<unknown>` was the compatible narrow shape.
**Source:** 10-02-SUMMARY.md

---

### Inventory-First Sequencing Prevented Boundary Drift
Having a frozen inventory made later plan-by-plan narrowing verifiable and reduced ambiguity in final guard interpretation.

**Context:** Final closure relied on classifying remaining matches against the original inventory rather than ad hoc reasoning.
**Source:** 10-01-SUMMARY.md, 10-07-PLAN.md

---

### Guard-Driven Corrections Caught Real Contract Drift
Blocking guards found broad tool `StoreProvider` types and stale test/store typing drift near closure.

**Context:** Fixes landed in final phase work and were necessary for typecheck and boundary guard pass conditions.
**Source:** 10-07-SUMMARY.md

---

### Runtime Injection Tests Are Required To Prove Internal Direction
Facade tests alone were insufficient; runtime/service injection tests were needed to prove internal branch-service execution.

**Context:** Verification explicitly confirmed additional workflow/search/script runtime tests as disconfirmation evidence.
**Source:** 10-VERIFICATION.md

---

### Local Environment Tooling Gaps Need Explicit Workflow Fallbacks
`gsd-sdk` was unavailable in this environment, and the repo fallback CLI had to be used.

**Context:** This affected metadata operations and was repeatedly documented as an execution constraint.
**Source:** 10-01-SUMMARY.md, 10-03-SUMMARY.md

---

## Patterns

### Pattern: Freeze-Then-Migrate Boundary Refactors
Create a complete, classified inventory first, then execute narrowing in explicit waves.

**When to use:** Multi-plan boundary refactors where public compatibility and internal narrowing must both be proven.
**Source:** 10-01-SUMMARY.md, 10-01-PLAN.md

---

### Pattern: Public Promise Wrapper Over Runtime-First Effect Path
Keep public Promise signatures stable while routing internal behavior through `brainStore.runPromise` on branch services.

**When to use:** Public/CLI compatibility boundaries that cannot change immediately, while internal architecture moves to Effect runtime services.
**Source:** 10-05-SUMMARY.md, 10-06-SUMMARY.md, 10-VERIFICATION.md

---

### Pattern: Branch Ownership With Compat Projection
Move helper ownership to the owning branch service and project through compat for facade continuity.

**When to use:** Legacy facade method must remain, but implementation ownership belongs in a specific branch layer.
**Source:** 10-04-SUMMARY.md

---

### Pattern: Typed Internal Provider Around Low-Level Client
Wrap low-level vector clients in a typed internal provider with live/noop implementations and inject via layer composition.

**When to use:** Internal subsystems need reusable vector operations without exposing raw client interfaces across branches.
**Source:** 10-03-SUMMARY.md

---

### Pattern: Phase-Gate Static Guards With Classification-Aware Interpretation
Use broad guard suites (tests, typecheck, Effect checks, grep guards), then interpret matches using planned classification boundaries.

**When to use:** Final closure of refactors where textual matches can be either intentional facade evidence or true regressions.
**Source:** 10-07-PLAN.md, 10-07-SUMMARY.md, 10-VERIFICATION.md

---

## Surprises

### Timeline Batch Return Type Mismatch Surfaced Late
The planned `Promise<void>` timeline batch shape unexpectedly broke compatibility with existing public store implementations.

**Impact:** Required an in-flight contract correction to `Promise<unknown>` to keep narrowing without breaking caller compatibility.
**Source:** 10-02-SUMMARY.md

---

### Test Isolation Was Affected By Commented DB File Unlink
`cleanDBFile(true)` was leaving SQLite files behind, causing import tests to reuse stale data and show skipped outcomes.

**Impact:** Verification became flaky until cleanup behavior was restored in `dropDBFile()`.
**Source:** 10-05-SUMMARY.md

---

### Final Guard Still Found Broad Tool Dependency Types
Near closure, tool factory inputs still had broad `StoreProvider` annotations despite prior narrowing work.

**Impact:** Blocking final-guard failure required a targeted pass to capability-specific `*Deps` types before phase completion.
**Source:** 10-07-SUMMARY.md

---

### Naming Alone Can Trigger Contract-Drift Guards
A runtime helper type named with `DoctorStore` semantics was rejected by guard policy even before finalizing behavior.

**Impact:** Required renaming and clarified classification to avoid accidentally reintroducing Promise-mirror direction.
**Source:** 10-06-SUMMARY.md
