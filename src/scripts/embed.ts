import { createDefaultStore } from '../store/index.ts';
import type { StoreProvider } from '../store/interface.ts';

// Dummy embedding batch simulation (Replace with actual LLM provider later)
async function embedBatch(texts: string[], dimension: number): Promise<number[][]> {
  // Simulate delay
  await new Promise(r => setTimeout(r, 50));
  return texts.map(() => new Array(dimension).fill(Math.random()));
}

export async function embedStale(batchSize: number = 20, storeInstance?: StoreProvider): Promise<number> {
  console.log('🔄 Checking for stale or missing embeddings...\n');
  
  const store = storeInstance ?? createDefaultStore();
  await store.init();

  try {
    const staleChunks = await store.getStaleChunks();

    if (staleChunks.length === 0) {
      console.log('✅ No stale chunks found. Everything is up to date.');
      return 0;
    }

    console.log(`Found ${staleChunks.length} chunks needing embedding.`);

    for (let i = 0; i < staleChunks.length; i += batchSize) {
      const batch = staleChunks.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(staleChunks.length / batchSize)}...`);

      const textsToEmbed = batch.map(c => `[${c.slug}] ${c.chunk_text}`);
      
      const embeddings = await embedBatch(textsToEmbed, 1536);

      const records = batch.map((chunk, index) => ({
        id: `${chunk.id}`,
        vector: embeddings[index],
        metadata: {
          chunk_id: chunk.id,
          slug: chunk.slug,
          chunk_index: chunk.chunk_index,
          chunk_text: chunk.chunk_text,
          chunk_source: chunk.chunk_source
        }
      }));

      await store.upsertVectors(records);

      const chunkIds = batch.map(c => c.id);
      await store.markChunksEmbedded(chunkIds);
    }

    console.log('\n✅ Stale embedding process completed successfully.');
    return staleChunks.length;

  } catch (error: any) {
    console.error(`\n❌ Error during embedding: ${error.message}`);
    throw error;
  } finally {
    if (!storeInstance) {
      await store.dispose();
    }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes('--stale')) {
    embedStale().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    console.log('Usage: bun run src/scripts/embed.ts --stale');
  }
}