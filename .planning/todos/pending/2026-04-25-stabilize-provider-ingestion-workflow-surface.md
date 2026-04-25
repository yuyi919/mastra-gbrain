---
created: 2026-04-25T22:54:26.9816634+08:00
title: Stabilize provider and ingestion workflow surface after BrainStore layering
area: store
files:
  - src/store/index.ts
  - src/store/libsql.ts
  - src/workflow/index.ts
  - src/ingest/workflow.ts
  - test/ingest/workflow.test.ts
---

## Problem

Phase 09 UAT identified that provider and ingestion workflow surface stability
still needs follow-up work. The desired public shape is that existing workflow
and provider consumers continue to use the stable `{ store, embedder }` boundary
without learning about internal BrainStore branch services.

The UAT gap was recorded in:

- `.planning/phases/09-brainstore-layered-contexts-and-boundaries/09-UAT.md`

## Solution

Audit the provider and ingestion workflow path after the BrainStore layering
migration:

- verify whether `BrainStoreProvider` should stay as the current thin LibSQLStore
  boundary or expose a narrower compatibility adapter
- keep internal branch services out of public workflow/provider APIs
- update `test/ingest/workflow.test.ts` or add focused regression coverage that
  proves workflow callers still consume the intended `{ store, embedder }`
  surface
- preserve the public Promise-facing `LibSQLStore` behavior while tightening
  any remaining broad dependency exposure
