---
created: 2026-04-25T15:33:26.028Z
title: Refine Phase 9 Content Chunks and Vector Provider Layers
area: store
files:
  - .planning/phases/09-brainstore-layered-contexts-and-boundaries/09-09-SUMMARY.md:98
  - .planning/phases/09-brainstore-layered-contexts-and-boundaries/09-LEARNINGS.md:90
  - src/store/BrainStore.ts:65
  - src/store/BrainStore.ts:147
  - src/store/libsql-store.ts:91
  - src/store/libsql-store.ts:132
  - src/store/brainstore/content/chunks/interface.ts:10
  - src/store/brainstore/ops/internal/interface.ts:19
  - src/store/brainstore/retrieval/embedding/factory.ts:23
---

## Problem

Phase 9 completed the first pass of layered BrainStore contexts, but two boundaries still look too flat:

- `getChunksWithEmbeddings` stayed on the legacy compat/ingestion surface because it was not branch-owned yet. It should be reconsidered as part of `ContentChunksService` so chunk retrieval APIs live with the content chunks branch instead of being reconstructed in `libsql-store.ts`.
- `vectorStore` is still passed directly through `libsql-store.ts` into retrieval embedding, ops internal, lifecycle cleanup, and helper functions. This keeps a low-level provider dependency visible across branch assembly.

This weakens the Phase 9 goal of tightening store boundaries and makes Phase 10's consumer-boundary audit less clean.

## Solution

Add a follow-up refactor to the Phase 9/Phase 10 store work:

- Move `getChunksWithEmbeddings(slug)` ownership into `ContentChunksService` and its factory/layer contract, preserving the existing delayed Effect return semantics and legacy compat projection.
- Introduce a dedicated `VectorProviderLayer` at the same low-level tier as `Mappers`, exposing the vector store, index name, index creation, vector deletion, and close/dispose helpers through a typed service instead of passing raw `vectorStore` references through `libsql-store.ts`.
- Rewire retrieval embedding, content pages/chunks vector deletion, lifecycle index setup, and ops/internal access to consume the vector provider layer.
- Keep Effect v4 rules: use `Context.Service`, layer composition, inferred accessor callback types, and avoid `as any` / `as unknown` in store implementation files.
