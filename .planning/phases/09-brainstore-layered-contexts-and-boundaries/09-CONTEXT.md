# Phase 9: Layer BrainStore Contexts & Tighten Store Boundaries - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** Updated via interactive discuss

<domain>
## Phase Boundary

This phase refactors the store runtime structure so BrainStore is built as a dependency-driven tree, not merely as a flat service surface with narrower projections.

Each feature layer should be constructible independently, may depend explicitly on other feature layers, and only at the end should those layers be assembled into a final `BrainStoreTree`. Downstream consumers should depend on the minimum branch they actually need, while the public `StoreProvider` boundary and current runtime behavior remain stable.

This is not a general preference. It is the explicit execution guidance from the 2026-04-24 todo `split-brainstore-into-layered-contexts`.

</domain>

<decisions>
## Implementation Decisions

### Tree shape
- **D-01:** The target architecture is a mixed tree, not a flat capability list and not a pure single-axis split.
- **D-02:** The top level should be grouped by domain, with capability nodes hanging inside each domain branch.
- **D-03:** The intended branch shape is:
  - `content.pages`
  - `content.chunks`
  - `graph.links`
  - `graph.timeline`
  - `retrieval.search`
  - `retrieval.embedding`
  - `ops.lifecycle`
  - `ops.internal`
- **D-04:** `BrainStoreTree` is the architectural center. Any flat root surface is transitional only.

### Layer dependency policy
- **D-05:** Feature layers may depend on other feature layers, but only through explicit narrow contracts or tags.
- **D-06:** Sibling access through a broad root service is forbidden.
- **D-07:** The dependency rule is "explicit small-contract dependency", not "strict no-sibling access" and not "parent-only orchestration".

### Boundary Safety
- **D-08:** Do not widen `StoreProvider` or reintroduce direct Bun SQLite/runtime exposure in higher-level callers.
- **D-09:** Keep low-level SQL and lifecycle concerns fenced behind internal store layers.

### Compatibility and migration
- **D-10:** Keep a flat `BrainStore` adapter temporarily for migration compatibility.
- **D-11:** Internal architecture should move to `BrainStoreTree` first; compatibility root behavior is secondary.
- **D-12:** Existing callers may continue to use the compatibility adapter during migration, but new or refactored internal Effect code should target tree branches or narrow feature contracts directly.

### File and folder organization
- **D-13:** The layered store refactor should also split implementation into multiple folders automatically rather than keeping the architecture concentrated in a few large files.
- **D-14:** Each branch or feature layer should be organized inside its own folder using an `interface + factory + index` structure.
- **D-15:** The exact folder tree should follow the chosen `BrainStoreTree` branches so the on-disk structure mirrors the architectural tree as closely as practical.

### Verification
- **D-16:** Favor targeted regression coverage around the most dependency-heavy modules.
- **D-17:** Preserve current behavior first; architectural cleanup is only valid if adapters and consumers still work.
- **D-18:** Individual capabilities must be injectable and testable independently without requiring the full `BrainStore.Service`.

### the agent's Discretion
- Exact naming of intermediate contract tags under each branch.
- The exact folder names under each branch, as long as they respect the required `interface + factory + index` organization.
- The order in which consumers migrate off the compatibility adapter, as long as priority targets are narrowed early.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/BrainStore.ts` already defines sub-interfaces like `IngestionStore`, `LinkService`, `HybridSearchBackend`, `TimelineService`, `ExtService`, `BrainStoreLifecycle`, and `UnsafeDBService`.
- `src/store/libsql-store.ts` already assembles these capabilities from separate objects before flattening them into one `BrainStore.Service`. That assembly code is the starting point, not the desired end state.

### Established Patterns
- Store behavior is currently exposed through Effect service interfaces plus a Promise adapter in `src/store/libsql.ts`.
- Tests already exercise extension-heavy behavior through the adapter and can be used to verify narrower seams.

### Integration Points
- `src/search/hybrid.ts`, `src/workflow/index.ts`, `src/store/index.ts`, and `src/store/libsql.ts` are the main consumer/wiring points that may still depend on the broad store surface.
- The current plan should be considered incomplete until those integration points consume real feature branches rather than a flat compatibility center.

</code_context>

<specifics>
## Specific Ideas

- Use the imported `code-review.md` as a design input for boundary and lifecycle concerns, not as a requirement to replay historical runtime work.
- Treat the completed todo `2026-04-24-split-brainstore-into-layered-contexts` as the authoritative correction over the earlier flat-first implementation.
- The preferred migration path is:
  - build independently constructible feature layers
  - express explicit feature-to-feature dependencies through narrow contracts
  - assemble the final `BrainStoreTree`
  - keep a flat compatibility adapter only where migration requires it
- The preferred code organization is that each major layer branch lands in its own folder and exposes a small `index` surface over its `interface` and `factory` files.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and guidance
- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-01-PLAN.md` - Current repaired Phase 9 plan and execution target
- `.planning/todos/completed/2026-04-24-split-brainstore-into-layered-contexts.md` - Primary architectural guidance for this phase
- `.planning/todos/pending/2026-04-24-narrow-brainstore-dependencies-by-feature-layer.md` - Remaining dependency-narrowing work to absorb into planning
- `code-review.md` - Supplemental boundary and lifecycle review input

### Current implementation hotspots
- `src/store/BrainStore.ts` - Current store contracts, feature tags, and compatibility root
- `src/store/libsql-store.ts` - Current store wiring and the flat-root-first projection pattern that must be replaced
- `src/store/libsql.ts` - Promise adapter and runtime entrypoint that must stay compatible during migration
- `src/store/index.ts` - Provider wiring that must continue exposing a stable factory surface
- `src/search/hybrid.ts` - Narrow feature-consumer example and regression-sensitive integration point
- `src/workflow/index.ts` - Workflow/provider integration point to revisit during tree migration

</canonical_refs>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>
