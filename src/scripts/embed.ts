import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import type { ManagedRuntime } from "effect";
import { RetrievalEmbedding } from "../store/brainstore/retrieval/embedding/index.js";
import { createDefaultStore } from "../store/index.js";
import type { StaleChunk, VectorMetadata } from "../types.js";

// Dummy embedding batch simulation (Replace with actual LLM provider later)
async function embedBatch(
  texts: string[],
  dimension: number
): Promise<number[][]> {
  // Simulate delay
  await new Promise((r) => setTimeout(r, 50));
  return texts.map(() => new Array(dimension).fill(Math.random()));
}

type EmbeddingMaintenanceRuntime = RetrievalEmbedding;

interface RuntimeBackedEmbeddingFacade {
  readonly brainStore?: Pick<
    ManagedRuntime.ManagedRuntime<EmbeddingMaintenanceRuntime, never>,
    "runPromise"
  >;
  init(): Promise<void>;
  dispose(): Promise<void>;
  getStaleChunks(): Promise<StaleChunk[]>;
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
  ): Promise<void>;
  markChunksEmbedded(chunkIds: number[]): Promise<void>;
}

function vectorMetadataForStaleChunk(chunk: StaleChunk): VectorMetadata {
  return {
    slug: chunk.slug,
    title: chunk.slug,
    type: "concept",
    chunk_index: chunk.chunk_index,
    chunk_text: chunk.chunk_text,
    chunk_source: chunk.chunk_source,
    token_count: Math.ceil(chunk.chunk_text.length / 4),
  };
}

export const embedStaleEffect = Eff.fn("scripts.embed.embedStale")(function* (
  batchSize: number = 20
) {
  const embedding = yield* RetrievalEmbedding;
  const staleChunks = yield* embedding.getStaleChunks();

  if (staleChunks.length === 0) {
    console.log("✅ No stale chunks found. Everything is up to date.");
    return 0;
  }

  console.log(`Found ${staleChunks.length} chunks needing embedding.`);

  for (let i = 0; i < staleChunks.length; i += batchSize) {
    const batch = staleChunks.slice(i, i + batchSize);
    console.log(
      `Processing batch ${i / batchSize + 1} of ${Math.ceil(staleChunks.length / batchSize)}...`
    );

    const textsToEmbed = batch.map((c) => `[${c.slug}] ${c.chunk_text}`);
    const embeddings = yield* Eff.promise(() => embedBatch(textsToEmbed, 1536));
    const records = batch.map((chunk, index) => ({
      id: `${chunk.id}`,
      vector: embeddings[index],
      metadata: vectorMetadataForStaleChunk(chunk),
    }));

    yield* embedding.upsertVectors(records);
    yield* embedding.markChunksEmbedded(batch.map((c) => c.id));
  }

  console.log("\n✅ Stale embedding process completed successfully.");
  return staleChunks.length;
});

export async function embedStale(
  batchSize: number = 20,
  storeInstance?: RuntimeBackedEmbeddingFacade
): Promise<number> {
  console.log("🔄 Checking for stale or missing embeddings...\n");

  const store = storeInstance ?? createDefaultStore();
  await store.init();

  try {
    if (store.brainStore) {
      return await store.brainStore.runPromise(embedStaleEffect(batchSize));
    }

    const staleChunks = await store.getStaleChunks();

    if (staleChunks.length === 0) {
      console.log("✅ No stale chunks found. Everything is up to date.");
      return 0;
    }

    console.log(`Found ${staleChunks.length} chunks needing embedding.`);

    for (let i = 0; i < staleChunks.length; i += batchSize) {
      const batch = staleChunks.slice(i, i + batchSize);
      console.log(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(staleChunks.length / batchSize)}...`
      );

      const textsToEmbed = batch.map((c) => `[${c.slug}] ${c.chunk_text}`);

      const embeddings = await embedBatch(textsToEmbed, 1536);

      const records = batch.map((chunk, index) => ({
        id: `${chunk.id}`,
        vector: embeddings[index],
        metadata: vectorMetadataForStaleChunk(chunk),
      }));

      await store.upsertVectors(records);

      const chunkIds = batch.map((c) => c.id);
      await store.markChunksEmbedded(chunkIds);
    }

    console.log("\n✅ Stale embedding process completed successfully.");
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
  if (args.includes("--stale")) {
    embedStale()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log("Usage: bun run src/scripts/embed.ts --stale");
  }
}
