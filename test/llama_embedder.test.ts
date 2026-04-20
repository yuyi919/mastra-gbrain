import { afterAll, beforeAll, expect, test } from "bun:test";
import { resolveModelFile } from "node-llama-cpp";
import { createIngestionWorkflow } from "../src/ingest/workflow.js";
import { hybridSearch } from "../src/search/hybrid.js";
import type { EmbeddingProvider } from "../src/store/interface.js";
import { LibSQLStore } from "../src/store/libsql.js";
import { LlamaEmbeddingProvider } from "../src/store/llama-embedder.js";

const modelsDir = "./tmp/models";
const enModelUrl = "hf:CompendiumLabs/bge-base-en-v1.5-gguf:Q4_K_M"; // "hf:nomic-ai/nomic-embed-text-v1.5-GGUF:Q8_0";
const zhModelUrl = "hf:CompendiumLabs/bge-base-zh-v1.5-gguf:Q4_K_M";
const dbPath = "./tmp/llama-embedder.db";

const used: ("en" | "zh")[] = [];
let embedder: EmbeddingProvider;

beforeAll(async () => {
  const enModelPath = await resolveModelFile(enModelUrl, modelsDir);
  const zhModelPath = await resolveModelFile(zhModelUrl, modelsDir);
  embedder = new LlamaEmbeddingProvider({
    modelPathEn: enModelPath,
    modelPathZh: zhModelPath,
    onModelUsed: (lang) => used.push(lang),
  });
}, 300000);

afterAll(async () => {
  await new LibSQLStore({
    url: `file:${dbPath}`,
    dimension: embedder.dimension,
  }).cleanDBFile();
});

test("LlamaEmbeddingProvider selects model based on language", async () => {
  const [en, zh] = await embedder.embedBatch(["hello world", "你好，世界"]);

  expect(en.length).toBe(embedder.dimension);
  expect(zh.length).toBe(embedder.dimension);
  expect(used).toEqual(["en", "zh"]);
}, 120000);

test("Ingestion + hybridSearch works with node-llama-cpp embeddings (en/zh models)", async () => {
  using store = new LibSQLStore({
    url: `file:${dbPath}`,
    dimension: embedder.dimension,
  });
  await store.init();

  const workflow = createIngestionWorkflow({ store, embedder });

  const runEn = await workflow.createRun();
  const resEn = await runEn.start({
    inputData: {
      relativePath: "concepts/embedding-en.md",
      content: `---\ntitle: Embedding EN\n---\nMount Everest is the tallest mountain in the world.\n`,
      noEmbed: false,
    },
  });

  const runZh = await workflow.createRun();
  const resZh = await runZh.start({
    inputData: {
      relativePath: "concepts/embedding-zh.md",
      content: `---\ntitle: 嵌入 ZH\n---\n珠穆朗玛峰是世界上海拔最高的山。\n`,
      noEmbed: false,
    },
  });

  expect(resEn.status).toBe("success");
  expect(resZh.status).toBe("success");

  const pages = await store.listPages();
  expect(pages.length).toBe(2);

  const queryVector = await embedder.embedQuery("tallest mountain");
  const results = await hybridSearch(
    store,
    "tallest mountain",
    { limit: 5 },
    queryVector
  );
  expect(results.length).toBeGreaterThan(0);
  expect(results.some((r) => r.slug.includes("embedding-en"))).toBe(true);
}, 240000);
