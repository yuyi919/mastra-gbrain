---
phase: 05
slug: libstore-ts-promise-effect
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test |
| **Config file** | [bunfig.toml](/D:/workspace/@yuyi919/external/whole-ends-kneel/packages/yui-agent/packages/brain-mastra/bunfig.toml) |
| **Quick run command** | `bun test test/ext.test.ts` |
| **Full suite command** | `bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test test/ext.test.ts`
- **After every plan wave:** Run `bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | PH5-R1-effect-routing | T-05-01, T-05-03 | Promise adapter delegates remaining extension-heavy methods through BrainStore and preserves canonical outgoing-link projection. | integration | `bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts` | yes | green |
| 05-01-02 | 01 | 1 | PH5-R2-regression-verification | T-05-01, T-05-02 | Regression suite verifies timeline, raw data, files, config/logs, token verification, vector helpers, and adapter compatibility after routing changes. | integration | `bun test test/libsql.test.ts test/store_extensions.test.ts test/ext.test.ts` | yes | green |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-24
