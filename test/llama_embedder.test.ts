import { expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { LibSQLStore } from '../src/store/libsql.ts';
import { createIngestionWorkflow } from '../src/ingest/workflow.ts';
import { hybridSearch } from '../src/search/hybrid.ts';
import { LlamaEmbeddingProvider } from '../src/store/llama-embedder.ts';

const modelsDir = './tmp/models';
const enModelPath = join(modelsDir, 'bge-base-en-v1.5.Q4_K_M.gguf');
const zhModelPath = join(modelsDir, 'bge-base-zh-v1.5-q4_k_m.gguf');

const enModelUrl = 'https://huggingface.co/ChristianAzinn/bge-base-en-v1.5-gguf/resolve/main/bge-base-en-v1.5.Q4_K_M.gguf';
const zhModelUrl = 'https://huggingface.co/CompendiumLabs/bge-base-zh-v1.5-gguf/resolve/main/bge-base-zh-v1.5-q4_k_m.gguf';
const dbPath = './tmp/llama-embedder.db';

async function ensureModel(url: string, path: string) {
  if (existsSync(path)) return;
  await mkdir(modelsDir, { recursive: true });
  const proc = Bun.spawn(
    ['bunx', '-y', 'node-llama-cpp', 'pull', '--dir', modelsDir, url],
    { stdout: 'inherit', stderr: 'inherit' },
  );
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Failed to download model via node-llama-cpp pull: ${url}`);
  }
}

beforeAll(async () => {
  await ensureModel(enModelUrl, enModelPath);
  await ensureModel(zhModelUrl, zhModelPath);
}, 300000);

afterAll(() => {
  try { unlinkSync(dbPath); } catch {}
});

test('LlamaEmbeddingProvider selects model based on language', async () => {
  const used: ('en' | 'zh')[] = [];
  const embedder = new LlamaEmbeddingProvider({
    modelPathEn: enModelPath,
    modelPathZh: zhModelPath,
    onModelUsed: (lang) => used.push(lang),
  });

  const en = await embedder.embedQuery('hello world');
  const zh = await embedder.embedQuery('你好，世界');

  expect(en.length).toBe(768);
  expect(zh.length).toBe(768);
  expect(used.includes('en')).toBe(true);
  expect(used.includes('zh')).toBe(true);
}, 120000);

test('Ingestion + hybridSearch works with node-llama-cpp embeddings (en/zh models)', async () => {
  const store = new LibSQLStore({ url: `file:${dbPath}`, dimension: 768 });
  await store.init();

  const embedder = new LlamaEmbeddingProvider({
    modelPathEn: enModelPath,
    modelPathZh: zhModelPath,
  });

  const workflow = createIngestionWorkflow({ store, embedder });

  const runEn = await workflow.createRun();
  const resEn = await runEn.start({
    inputData: {
      relativePath: 'concepts/embedding-en.md',
      content: `---\ntitle: Embedding EN\n---\nMount Everest is the tallest mountain in the world.\n`,
      noEmbed: false,
    },
  });

  const runZh = await workflow.createRun();
  const resZh = await runZh.start({
    inputData: {
      relativePath: 'concepts/embedding-zh.md',
      content: `---\ntitle: 嵌入 ZH\n---\n珠穆朗玛峰是世界上海拔最高的山。\n`,
      noEmbed: false,
    },
  });

  expect(resEn.status).toBe('success');
  expect(resZh.status).toBe('success');

  const queryVector = await embedder.embedQuery('tallest mountain');
  const results = await hybridSearch(store, 'tallest mountain', { limit: 5 }, queryVector);
  expect(results.length).toBeGreaterThan(0);
  expect(results.some(r => r.slug.includes('embedding-en'))).toBe(true);

  await store.dispose();
}, 240000);
