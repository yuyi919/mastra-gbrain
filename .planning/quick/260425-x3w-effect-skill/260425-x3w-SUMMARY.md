---
quick_id: 260425-x3w
slug: effect-skill
status: complete
completed: 2026-04-25
---

# Quick Task 260425-x3w Summary

## Completed

- Strengthened `.agents/skills/effect-v4/SKILL.md` with a concrete execution workflow, Windows/Unix validation guidance, and the project-specific Store / BrainStore Effect overlay.
- Updated `effect-migrate`, `effect-new`, and `effect-test-bun` to reference the local sibling `effect-v4` skill, fall back cleanly when `CLAUDE_SKILL_DIR` is unavailable, and require validation results.
- Fixed BunTester templates/examples and the systematic guide so concurrency examples use `Effect.forkChild` instead of the banned v3-style `Effect.fork`.
- Corrected Vitest guidance to use `@effect/vitest` for test structure while keeping assertions on `node:assert`.

## Verification

- `pwsh ./scripts/check-effect-v4.ps1` passed.
- Targeted banned-pattern scans over `.agents/skills/effect-*` passed with no matches for stale v3 APIs in generated code examples.

## Files Changed

- `.agents/skills/effect-v4/SKILL.md`
- `.agents/skills/effect-migrate/SKILL.md`
- `.agents/skills/effect-new/SKILL.md`
- `.agents/skills/effect-test-bun/SKILL.md`
- `.agents/skills/effect-v4/templates/test-bun-buntester.md`
- `.agents/skills/effect-v4/examples/buntester-time-concurrency.md`
- `docs/effect/v4-systematic-guide.md`
- `docs/effect/effect-v4-agent-skill.md`
