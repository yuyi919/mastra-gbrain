completed: 2026-04-25
---
created: 2026-04-24T07:32:20.817Z
title: Split BrainStore into layered contexts
area: general
files:
  - src/store/BrainStore.ts
  - src/store/libsql-store.ts
  - src/store/index.ts
  - src/store/interface.ts
---

## Problem

Current `BrainStore` is modeled as one flat service surface that merges ingestion,
link, hybrid search, timeline, ext, and lifecycle capabilities into a single
`BrainStore.Service`. This makes dependency boundaries too broad:

- downstream modules can depend on the entire store even when they only need one capability
- `makeLayer` composition in `libsql-store.ts` is effectively forced into a single root service
- tests and partial reuse are harder because replacing one feature requires providing the whole store shape

The next refactor should convert the Effect store structure from a flat service
into a tree of focused `Context.Service` nodes plus composable `makeLayer`
functions.

## Solution

Refactor `BrainStore` into multiple feature services and a composed root:

- extract focused services such as ingestion, links, hybrid search, timeline,
  ext, and lifecycle into their own Context/Layer definitions
- make `BrainStore` a tree-shaped composition or aggregator instead of a flat
  namespace with every method at the top level
- split `libsql-store.ts` into feature-oriented `makeLayer` building blocks
- update provider/wiring code in `src/store/index.ts` and affected references to
  consume the new tree structure

Key acceptance point: individual capabilities can be injected and tested
independently without requiring the full `BrainStore.Service`.
