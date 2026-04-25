---
phase: 9
phase_name: "brainstore-layered-contexts-and-boundaries"
project: "mastra-gbrain"
generated: "2026-04-25T22:41:31.8455453+08:00"
counts:
  decisions: 8
  lessons: 6
  patterns: 7
  surprises: 4
missing_artifacts:
  - "09-UAT.md"
---

# Phase 9 Learnings: brainstore-layered-contexts-and-boundaries

## Decisions

### Make BrainStoreTree The Production Assembly Root
Branch services are assembled into `BrainStoreTree` before deriving compatibility surfaces. The old flat root remains available only through transitional compatibility paths.

**Rationale:** The original flat-root-first direction preserved the dependency problem; verification required the production runtime to expose `BrainStoreTree` before feature or compat projection.
**Source:** 09-08-SUMMARY.md, 09-VERIFICATION.md

### Keep Public Promise APIs Stable Through Compat-Over-Tree
The public `LibSQLStore` Promise-facing adapter resolves `BrainStoreCompat` rather than assuming the legacy `BrainStore` root is the runtime center.

**Rationale:** Phase 09 needed internal architecture movement without widening `StoreProvider`, `BrainStoreProvider`, or public Promise method signatures.
**Source:** 09-09-PLAN.md, 09-09-SUMMARY.md, 09-VERIFICATION.md

### Treat Branch Contracts As The Source Of Truth
Service contracts and branch-specific input types belong in their branch modules, while `BrainStore.ts` aliases or composes those types and keeps only the root `BrainStore` Context.

**Rationale:** Duplicating contracts in `BrainStore.ts` made branch modules secondary and allowed type drift across flat and layered surfaces.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md, 09-VERIFICATION.md

### Use Branch makeLayer Boundaries For Dependency Acquisition
Branch `makeLayer` exports own dependency acquisition for SQL, mappers, vector handles, backlinks, embeddings, lifecycle refs, and unsafe DB internals. `libsql-store.ts` only passes external options and composes returned layers.

**Rationale:** Direct `Layer.effect(... makeX(...))` wiring in `libsql-store.ts` still duplicated branch construction and undermined the layered architecture.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md, 09-VERIFICATION.md

### Fence Unsafe Runtime Capabilities In ops.internal
Unsafe SQL, mapper access, vector resources, and raw runtime handles live behind `ops.internal`.

**Rationale:** Low-level capabilities must not leak through content, graph, retrieval, or public compat surfaces.
**Source:** 09-04-PLAN.md, 09-04-SUMMARY.md, 09-VERIFICATION.md

### Keep Lifecycle Semantics In ops.lifecycle
`init`, `dispose`, transactions, and resource-scoped acquisition are owned by `ops.lifecycle`.

**Rationale:** Centralizing lifecycle behavior avoids ad hoc transaction or disposal logic inside unrelated branches.
**Source:** 09-04-PLAN.md, 09-04-SUMMARY.md

### Keep Retrieval On Explicit Collaborator Contracts
Retrieval search consumes backlink counts and embedding lookup through explicit graph and embedding contracts.

**Rationale:** `src/search/hybrid.ts` and retrieval factories can run with branch-only injection when they do not need the full `BrainStore.Service` root.
**Source:** 09-03-PLAN.md, 09-07-SUMMARY.md, 09-10-SUMMARY.md

### Preserve Delayed Decode Semantics For Write APIs
`createVersion` and `putPage` keep the delayed `PutReturning` decode effect expected by legacy ingestion and `runFlatten`.

**Rationale:** Flattening the return too early would break the compatibility semantics relied on by `BrainStore.Ingestion` and the Promise bridge.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md

---

## Lessons

### Feature Tags Alone Do Not Prove A Layered Architecture
Adding branch tags and folders is not enough if runtime assembly still builds a full flat service and projects `store.features.*` outward.

**Context:** The research explicitly identified flat-root projection as the main failure mode, and final verification grepped for the forbidden projection path.
**Source:** 09-RESEARCH.md, 09-08-SUMMARY.md, 09-VERIFICATION.md

### User Review Caught A Real Layer Boundary Gap
The implementation initially still duplicated branch layer construction in `libsql-store.ts` instead of consuming branch `makeLayer` exports.

**Context:** Review notes record that user feedback exposed the issue, after which SQL, mapper, vector, backlink, embedding, lifecycle, and internal dependency acquisition moved into branch `makeLayer` implementations.
**Source:** 09-REVIEW.md, 09-09-SUMMARY.md

### No-Cast Cleanup Works Better By Tightening Contracts
Removing `as unknown` / `as any` from touched store runtime modules was achieved by making compat/tree adapters and error-code access explicit.

**Context:** The phase verified no cast matches across the touched store assembly surface after contract and adapter adjustments.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md, 09-VERIFICATION.md

### Compatibility Requires Legacy-Only Helpers To Be Named Explicitly
`getChunksWithEmbeddings` remained on the legacy compat surface because it was not yet branch-owned.

**Context:** Review fixed a wiring risk where ingestion needed this helper from `BrainStoreCompat` rather than from content chunks.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md

### Test Residue Can Masquerade As A Runtime Regression
`test/ext.test.ts` failure was traced to stale SQLite files rather than a production behavior change.

**Context:** The final plan fixed test isolation by clearing primary and vector DB files, including WAL and SHM companions, before initializing the store.
**Source:** 09-10-SUMMARY.md

### GSD Tooling Availability Affects Artifact Maintenance
`gsd-sdk` was not available on PATH during execution, so summaries and state artifacts were updated manually.

**Context:** The issue was recorded during plan 08 recovery and explains why older plan summaries were reconstructed.
**Source:** 09-08-SUMMARY.md

---

## Patterns

### interface + factory + index Branch Folders
Each BrainStore branch uses `interface.ts` for the contract and Context, `factory.ts` for implementation and layer construction, and `index.ts` for exports.

**When to use:** Use this for every new BrainStore branch so contract ownership, implementation, and public exports stay predictable.
**Source:** 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-05-SUMMARY.md

### Branch-Local Factories With Narrow Dependency Objects
Branch factories accept explicit dependency objects or service tags instead of reaching through a broad root.

**When to use:** Use this when moving behavior out of a monolithic runtime object while keeping collaborators visible and testable.
**Source:** 09-06-SUMMARY.md, 09-07-SUMMARY.md

### Compat-Over-Tree Adapter
Build a flat compatibility service from `BrainStoreTree` branches, preserving public behavior while shifting architecture internally.

**When to use:** Use this when consumers still need old method names or Promise boundaries during a staged migration.
**Source:** 09-05-SUMMARY.md, 09-09-SUMMARY.md

### Branch-Only Injection Regression
Use `Layer.succeed` and `ManagedRuntime` tests to prove a consumer can run with only the minimum branch service it needs.

**When to use:** Use this for any internal Effect consumer that claims to depend on a narrow branch contract.
**Source:** 09-05-SUMMARY.md, 09-07-SUMMARY.md, 09-10-SUMMARY.md

### Forbidden Projection Grep As Architecture Guard
Guard the migration with explicit greps for `store.features.*` and `BrainStore.use((store) => Eff.succeed(store.features...))`.

**When to use:** Use this when an architectural direction can regress through a small convenience projection.
**Source:** 09-08-SUMMARY.md, 09-10-SUMMARY.md, 09-VERIFICATION.md

### Service Accessors Should Match The Read Shape
Use synchronous accessors for synchronous reads and avoid wrapping pure reads in `use(...succeed...)` callbacks or explicit callback type annotations.

**When to use:** Use this in Effect v4 service accessors to keep dependency reads concise and type-inferred.
**Source:** 09-09-SUMMARY.md, 09-REVIEW.md

### Focused Compatibility Regression Bundle
Close risky store migrations with tests that cover branch-only consumers and public compat helpers together.

**When to use:** Use this for migrations where internal wiring changes but public store behavior must remain unchanged.
**Source:** 09-10-SUMMARY.md, 09-VERIFICATION.md

---

## Surprises

### The Reopened Phase Had To Supersede Earlier Flat-First Work
Phase 09 was reopened because the prior implementation had feature-specific Context layers but still did not satisfy the intended `BrainStoreTree` architecture.

**Impact:** The repaired plan expanded into 10 smaller execution plans and restored a dedicated validation contract.
**Source:** .planning/STATE.md

### A Clean Compile Was Not Enough To Prove Layer Boundaries
The code could typecheck while still duplicating branch construction in `libsql-store.ts`.

**Impact:** Verification had to include architecture-specific greps and review checks for branch factory usage, not just TypeScript and Effect v4 checks.
**Source:** 09-REVIEW.md, 09-VERIFICATION.md

### Some Planned Files Did Not Need Edits
`src/store/index.ts`, workflow tests, and `src/search/hybrid.ts` did not require production changes in later plans.

**Impact:** The phase preserved scope by verifying existing behavior instead of forcing unnecessary rewrites.
**Source:** 09-09-SUMMARY.md, 09-10-SUMMARY.md

### Test Isolation Needed Vector Database Cleanup Too
The ext regression needed cleanup for both primary and vector SQLite files, including WAL and SHM companions.

**Impact:** Compatibility tests became deterministic and stopped reporting failures from stale local residue.
**Source:** 09-10-SUMMARY.md
