# Agent Guidelines & Skill Index

Welcome, AI Agent! When you are working on this repository, you must first read and follow the instructions in this index document. This repository uses specific skills and constraints that you must apply to ensure code quality and consistency.

## 📌 Effect v4 (Beta) Constraint & Systematic Skill

This project uses **Effect v4 (Beta)**. It is STRICTLY FORBIDDEN to use Effect v3 syntax. Furthermore, you must systematically adopt the Effect v4 architectural paradigms (such as Context.Service, Layer composition, and Scope management) rather than merely replacing syntax.

### 📚 Knowledge Base (Must Read)
Before writing or modifying any Effect code, please ensure you have read and understood:
- **[Systematic Guide](docs/effect/v4-systematic-guide.md)**: NEW! The core guide on how to architect and write Effect v4 code correctly. Includes best practices on using `Effect.fn`, handling errors with `Schema.TaggedErrorClass`, and Vitest guidelines.
- **[v4 Playbook](docs/effect/v4-playbook.md)**: Contains the core paradigms (Services, Yieldable, Runtime, Error Handling, Forking) and the official migration guide.
- **[Banned Patterns](docs/effect/v4-banned-patterns.md)**: A strict checklist of APIs that are no longer allowed (e.g., `Effect.Tag`, `Effect.catchAll`, native `async/await`).

### 🛠️ Agent Skill Prompt (Must Apply)
When executing tasks related to Effect, you MUST apply the rules and prompt templates defined in:
- **[Agent Skill Rules](docs/effect/effect-v4-agent-skill.md)**

### ✅ Self-Check
After generating your code, ensure it passes the local check script.
You can run the script locally to verify your output:
```bash
./scripts/check-effect-v4.sh
```
If the script fails, you MUST correct your code before submitting.

---

> **Note to Claude Code / Codex:** By reading this file, you acknowledge that you are constrained by the Effect v4 beta rules and its systematic design patterns. Do not rely on your general pre-training knowledge for Effect, as it is highly likely to contain outdated v3 patterns or non-idiomatic imperative code. Always defer to the local `docs/effect/v4-systematic-guide.md`.
