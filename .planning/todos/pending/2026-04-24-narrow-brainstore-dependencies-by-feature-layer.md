---
created: 2026-04-24T07:32:20.817Z
title: Narrow BrainStore dependencies by feature layer
area: general
files:
  - src/search/hybrid.ts
  - src/workflow/index.ts
  - src/store/libsql.ts
  - src/store/BrainStore.ts
  - src/store/index.ts
---

## Problem

Other modules currently depend on `BrainStore` as a broad capability bag rather
than on the specific feature layer they actually use. This causes three issues:

- reuse is poor because consumers pull in unrelated store capabilities
- testing is invasive because mocks need to satisfy a large service contract
- future service extraction is risky because usage sites are not aligned with
  capability boundaries

The remaining work is not just splitting `BrainStore`, but auditing all current
consumers and narrowing each dependency to the minimum feature layer.

## Solution

Do a feature-usage audit across the codebase and rewrite consumers to depend on
capability-specific services:

- detect which modules use ingestion, link, hybrid search, lifecycle, or ext
  features from `BrainStore`
- replace broad `BrainStore` dependencies with targeted feature-layer
  dependencies where possible
- update adapters and provider types so tests can inject only the needed layer
- add or adjust tests around the most dependency-heavy modules to prove the new
  seams are easier to mock and reuse

Priority targets from the current codebase include `src/search/hybrid.ts`,
`src/workflow/index.ts`, and any adapter/provider code still exposing the full
store where a narrower contract would work.
