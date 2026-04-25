import type { LibSQLVector } from "@mastra/libsql";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type {
  SearchOpts,
  SearchResult,
  VectorMetadata,
} from "../../../../types.js";
import { StoreError } from "../../../BrainStoreError.js";
import {
  RetrievalEmbedding,
  RetrievalEmbeddingLookupService,
  type RetrievalEmbeddingService,
} from "./interface.js";

export interface RetrievalEmbeddingDependencies {
  mappers: any;
  vectorStore?: LibSQLVector;
  indexName: string;
}

export const makeRetrievalEmbedding = (
  deps: RetrievalEmbeddingDependencies
): RetrievalEmbeddingService => {
  const catchStoreError = StoreError.catch;
  const queryVectors = Eff.fn("retrieval.embedding.queryVectors")(function* (
    queryVector: number[],
    opts?: SearchOpts & { slug?: string }
  ) {
    const limit = opts?.limit ?? 10;
    const filter: Record<string, any> = {};
    if (opts?.type) filter.type = { $eq: opts.type };
    if (opts?.detail === "low") filter.chunk_source = { $eq: "compiled_truth" };
    if (opts?.slug) {
      filter.slug = { $eq: opts.slug };
    } else if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
      filter.slug = { $nin: opts.exclude_slugs };
    }
    return yield* Eff.from(
      () =>
        deps.vectorStore?.query({
          indexName: deps.indexName,
          queryVector: Array.from(queryVector) as any,
          topK: limit * 2,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        }) ?? []
    );
  }, catchStoreError);

  return {
    searchVector: Eff.fn("retrieval.embedding.searchVector")(function* (
      queryVector: number[],
      opts?: SearchOpts & { slug?: string }
    ) {
      const limit = opts?.limit ?? 10;
      const vectorResults = yield* queryVectors(queryVector, opts);
      const hits = vectorResults
        .map((match: any) => ({
          score: match.score as number,
          slug: (match.metadata?.slug ??
            (typeof match.id === "string"
              ? match.id.split("::")[0]
              : undefined)) as string | undefined,
          chunk_index: (match.metadata?.chunk_index ??
            (typeof match.id === "string"
              ? Number(match.id.split("::")[1])
              : undefined)) as number | undefined,
        }))
        .filter(
          (hit): hit is { score: number; slug: string; chunk_index: number } =>
            !!hit.slug && Number.isFinite(hit.chunk_index)
        );
      const slugs = Array.from(new Set(hits.map((hit) => hit.slug)));
      const chunkIndexes = Array.from(
        new Set(hits.map((hit) => hit.chunk_index))
      );
      if (slugs.length === 0 || chunkIndexes.length === 0) return [];
      const rows = yield* deps.mappers.searchVectorRows(
        slugs,
        chunkIndexes,
        opts
      );
      const byKey = new Map<string, (typeof hits)[number]>();
      const out: SearchResult[] = [];
      for (const hit of hits) {
        byKey.set(`${hit.slug}::${hit.chunk_index}`, hit);
      }
      for (const row of rows) {
        const hit = byKey.get(`${row.slug}::${row.chunk_index}`);
        if (!hit) continue;
        out.push({
          page_id: row.page_id,
          title: row.title,
          type: row.type as any,
          slug: row.slug,
          chunk_id: row.chunk_id,
          chunk_index: row.chunk_index,
          chunk_text: row.chunk_text,
          chunk_source: row.chunk_source as any,
          score: hit.score,
          stale: !!row.stale,
        });
        if (out.length >= limit) break;
      }
      return out;
    }, catchStoreError) as RetrievalEmbeddingService["searchVector"],
    getEmbeddingsByChunkIds: Eff.fn(
      "retrieval.embedding.getEmbeddingsByChunkIds"
    )(function* (_ids: number[]) {
      return new Map<number, Float32Array>();
    }, catchStoreError) as RetrievalEmbeddingService["getEmbeddingsByChunkIds"],
    getStaleChunks: Eff.fn("retrieval.embedding.getStaleChunks")(function* () {
      const rows = yield* deps.mappers.getStaleChunks();
      return rows as any;
    }, catchStoreError) as RetrievalEmbeddingService["getStaleChunks"],
    upsertVectors: Eff.fn("retrieval.embedding.upsertVectors")(function* (
      vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
    ) {
      if (!deps.vectorStore || vectors.length === 0) return;
      yield* Eff.promise(() =>
        deps.vectorStore!.upsert({
          indexName: deps.indexName,
          vectors: vectors.map((vector) => vector.vector),
          ids: vectors.map((vector) => vector.id),
          metadata: vectors.map((vector) => vector.metadata),
        })
      );
    }, catchStoreError) as RetrievalEmbeddingService["upsertVectors"],
    markChunksEmbedded: Eff.fn("retrieval.embedding.markChunksEmbedded")(
      function* (chunkIds: number[]) {
        if (chunkIds.length === 0) return;
        yield* deps.mappers.markChunksEmbeddedByIds(chunkIds);
      },
      catchStoreError
    ) as RetrievalEmbeddingService["markChunksEmbedded"],
  } as RetrievalEmbeddingService;
};

export const makeLayer = (
  service: RetrievalEmbeddingService | RetrievalEmbeddingDependencies
) => {
  const resolved =
    "mappers" in service ? makeRetrievalEmbedding(service) : service;
  return Layer.merge(
    Layer.succeed(RetrievalEmbedding, resolved),
    Layer.succeed(RetrievalEmbeddingLookupService, {
      getEmbeddingsByChunkIds: resolved.getEmbeddingsByChunkIds,
    })
  );
};
