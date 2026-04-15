# Testing Patterns

**Analysis Date:** 2026-04-15

## Test Framework

**Runner:**
- `bun:test`
- Root test configuration is `bunfig.toml` with `root = "./test"`

**Assertion Library:**
- Bun's built-in `expect`
- Common matchers include `toBe`, `toEqual`, `toContain`, `toHaveLength`, `toBeGreaterThan`, `rejects.toThrow`

**Run Commands:**
```bash
bun test
bun test test/libsql.test.ts
bun test test/search/hybrid.test.ts
bun run check
```

## Test File Organization

**Location:**
- Tests live in a dedicated `test/` tree rather than colocated with source
- Domain folders mirror the runtime structure: `test/search/`, `test/scripts/`, `test/ingest/`, `test/chunkers/`

**Naming:**
- Standard file naming is `*.test.ts`
- Optional model-dependent coverage is called out explicitly, e.g. `test/search/llama-reranker.optional.test.ts`

**Structure:**
```text
test/
  integration.test.ts
  libsql.test.ts
  tools.test.ts
  search/
    hybrid.test.ts
    rrf.test.ts
    llama-reranker.optional.test.ts
  scripts/
    doctor.test.ts
    embed.test.ts
    backlinks.test.ts
  fixtures/
    docs/
    scripts/
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test, beforeAll, afterAll } from "bun:test";

describe("hybridSearch", () => {
  test("keyword-only when embed is missing", async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Simple unit tests use `describe` + `test`
- Integration tests often use top-level `beforeAll` / `afterAll` without nested suites
- Assertions are direct and explicit; snapshot testing is not used

## Mocking

**Framework:**
- No centralized mock library beyond plain objects/functions
- Interface-based fakes are common, especially for `StoreProvider` and `EmbeddingProvider`

**Patterns:**
```typescript
const backend = {
  searchKeyword: async () => [...],
  searchVector: async () => [...],
} as unknown as StoreProvider;
```

**What to Mock:**
- Store/search backends in unit tests
- Embedders for ingestion tests
- Filesystem side effects indirectly through temp fixtures/databases

**What NOT to Mock:**
- SQLite flows in store/script integration tests
- Parsing/chunking/search ranking logic when verifying end-to-end behavior

## Fixtures and Factories

**Test Data:**
- Markdown fixtures live in `test/fixtures/docs/` and `test/fixtures/scripts/backlinks/`
- In-memory fake providers are built inline, e.g. `mockStore()` and `mockEmbedder()` in `test/ingest/workflow.test.ts`
- Temporary SQLite databases are created under `./tmp/`

**Location:**
- Shared content fixtures: `test/fixtures/`
- Lightweight factory helpers: inline within the test file that uses them

## Coverage

**Requirements:**
- No explicit numeric coverage gate is configured
- Emphasis is on behaviorally important paths: store, workflow, scripts, and search logic

**Configuration:**
- Coverage reporting is not wired through a dedicated script in `package.json`
- Local verification relies mainly on running targeted Bun tests

## Test Types

**Unit Tests:**
- Pure helpers and ranking logic, e.g. `test/search/rrf.test.ts`, `test/segmenter.test.ts`, `test/slug.test.ts`
- Often use fake backends or direct function calls

**Integration Tests:**
- Store/tool/script flows against real SQLite DB files in `./tmp/`
- Examples: `test/libsql.test.ts`, `test/tools.test.ts`, `test/integration.test.ts`, `test/scripts/*.test.ts`

**Optional/Environment-Dependent Tests:**
- Local-model tests are conditionally skipped unless required model paths are provided
- Example: `test/search/llama-reranker.optional.test.ts`

## Common Patterns

**Async Testing:**
```typescript
test("Search Tool finds ingested content", async () => {
  const result = await searchTool.execute!({ query: "Tool truth", limit: 5 }, {} as any);
  expect(result).toHaveProperty("results");
});
```

**Cleanup:**
- Tests usually call `dispose()` on stores in `afterAll`
- Physical DB files under `./tmp/` are manually removed after runs

**Gaps Observed:**
- No CI-enforced test pipeline is committed
- Optional llama coverage is intentionally skipped in default environments
- Some script paths are validated through stdout behavior rather than structured assertions only

---

*Testing analysis: 2026-04-15*
*Update when test patterns change*
