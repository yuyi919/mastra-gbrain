# Tasks
- [x] Task 1: Translate `references` documents and add `AGENTS.md`
  - [x] SubTask 1.1: Ensure all `.md` files in `references/docs/`, `references/recipes/`, and `references/TODOS.md` are fully translated to Chinese.
  - [x] SubTask 1.2: Create `references/AGENTS.md` to explain that the directory contains pulled and translated content from the gbrain repository for periodic maintenance.

- [x] Task 2: Move test databases to `./tmp/` and clean up root
  - [x] SubTask 2.1: Update database URLs in all `test/*.test.ts` files from `file:test-*.db` to `file:./tmp/test-*.db`.
  - [x] SubTask 2.2: Delete all leftover `*.db*` files from the project root.

- [x] Task 3: Refactor test hacks to use Dependency Injection
  - [x] SubTask 3.1: Modify `src/store/index.ts` to export `createDefaultStore()` and `createDefaultEmbedder()` factories instead of static `store` and `defaultEmbedder`.
  - [x] SubTask 3.2: Update usages of `store` across the codebase (e.g. in `src/index.ts`, `src/scripts/import.ts`, `src/scripts/backlinks.ts`, etc.) to call the factories.
  - [x] SubTask 3.3: Remove the `Object.defineProperty` hack from `test/integration.test.ts` and pass `testStore` and `embedder` correctly to `bulkImport`.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
