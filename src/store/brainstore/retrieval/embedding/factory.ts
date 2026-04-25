import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import type {
  ChunkSource,
  PageType,
  SearchOpts,
  SearchResult,
  StaleChunk,
  VectorMetadata,
} from "../../../../types.js";
import { StoreError } from "../../../BrainStoreError.js";
import { Mappers } from "../../../Mappers.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import {
  type VectorFilter,
  VectorProvider,
  type VectorProviderService,
} from "../../ops/vector/index.js";
import {
  RetrievalEmbedding,
  RetrievalEmbeddingLookupService,
  type RetrievalEmbeddingService,
} from "./interface.js";

export type RetrievalEmbeddingVectorProvider = Pick<
  VectorProviderService,
  "query" | "upsert"
>;

export interface RetrievalEmbeddingDependencies {
  mappers: SqlBuilder;
  vectors: RetrievalEmbeddingVectorProvider;
  indexName: string;
}

export interface RetrievalEmbeddingLayerOptions {
  indexName: string;
}

type VectorFilterValue = { $eq: string } | { $nin: string[] };

interface VectorQueryMatch {
  id?: string;
  score?: number;
  metadata?: Partial<VectorMetadata>;
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
    const filter: Record<string, VectorFilterValue> = {};
    if (opts?.type) filter.type = { $eq: opts.type };
    if (opts?.detail === "low") filter.chunk_source = { $eq: "compiled_truth" };
    if (opts?.slug) {
      filter.slug = { $eq: opts.slug };
    } else if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
      filter.slug = { $nin: opts.exclude_slugs };
    }
    return yield* deps.vectors.query({
      indexName: deps.indexName,
      queryVector: Array.from(queryVector),
      topK: limit * 2,
      filter:
        Object.keys(filter).length > 0
          ? (filter satisfies VectorFilter)
          : undefined,
    });
  }, catchStoreError);

  return {
    searchVector: Eff.fn("retrieval.embedding.searchVector")(function* (
      queryVector: number[],
      opts?: SearchOpts & { slug?: string }
    ) {
      const limit = opts?.limit ?? 10;
      const vectorResults: ReadonlyArray<VectorQueryMatch> =
        yield* queryVectors(queryVector, opts);
      const hits = vectorResults
        .map((match) => ({
          score: match.score ?? 0,
          slug:
            match.metadata?.slug ??
            (typeof match.id === "string"
              ? match.id.split("::")[0]
              : undefined),
          chunk_index: Number(
            match.metadata?.chunk_index ??
              (typeof match.id === "string"
                ? match.id.split("::")[1]
                : undefined)
          ),
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
          type: row.type as PageType,
          slug: row.slug,
          chunk_id: row.chunk_id,
          chunk_index: row.chunk_index,
          chunk_text: row.chunk_text,
          chunk_source: row.chunk_source as ChunkSource,
          score: hit.score,
          stale: !!row.stale,
        });
        if (out.length >= limit) break;
      }
      return out;
    }, catchStoreError),
    getEmbeddingsByChunkIds: Eff.fn(
      "retrieval.embedding.getEmbeddingsByChunkIds"
    )(function* (_ids: number[]) {
      return new Map<number, Float32Array>();
    }, catchStoreError),
    getStaleChunks: Eff.fn("retrieval.embedding.getStaleChunks")(function* () {
      const rows = yield* deps.mappers.getStaleChunks();
      return rows.map(
        (row) =>
          ({
            ...row,
            chunk_source: row.chunk_source as ChunkSource,
          }) satisfies StaleChunk
      );
    }, catchStoreError),
    upsertVectors: Eff.fn("retrieval.embedding.upsertVectors")(function* (
      vectors: { id: string; vector: number[]; metadata: VectorMetadata }[]
    ) {
      if (vectors.length === 0) return;
      yield* deps.vectors.upsert({
        indexName: deps.indexName,
        vectors: vectors.map((vector) => vector.vector),
        ids: vectors.map((vector) => vector.id),
        metadata: vectors.map((vector) => vector.metadata),
      });
    }, catchStoreError),
    markChunksEmbedded: Eff.fn("retrieval.embedding.markChunksEmbedded")(
      function* (chunkIds: number[]) {
        if (chunkIds.length === 0) return;
        yield* deps.mappers.markChunksEmbeddedByIds(chunkIds);
      },
      catchStoreError
    ),
  };
};

const makeLayerFromService = (service: RetrievalEmbeddingService) =>
  Layer.merge(
    Layer.succeed(RetrievalEmbedding, service),
    Layer.succeed(RetrievalEmbeddingLookupService, {
      getEmbeddingsByChunkIds: service.getEmbeddingsByChunkIds,
    })
  );

function isDependencies(
  service:
    | RetrievalEmbeddingService
    | RetrievalEmbeddingDependencies
    | RetrievalEmbeddingLayerOptions
): service is RetrievalEmbeddingDependencies {
  return "mappers" in service;
}

function isService(
  service:
    | RetrievalEmbeddingService
    | RetrievalEmbeddingDependencies
    | RetrievalEmbeddingLayerOptions
): service is RetrievalEmbeddingService {
  return "searchVector" in service;
}

export const makeLayer = (
  service:
    | RetrievalEmbeddingService
    | RetrievalEmbeddingDependencies
    | RetrievalEmbeddingLayerOptions
) => {
  if (isService(service)) {
    return makeLayerFromService(service);
  }
  if (isDependencies(service)) {
    return makeLayerFromService(makeRetrievalEmbedding(service));
  }

  const EmbeddingLayer = Layer.effect(
    RetrievalEmbedding,
    Eff.gen(function* () {
      const mappers = yield* Mappers;
      const vectors = yield* VectorProvider;
      return makeRetrievalEmbedding({
        mappers,
        vectors,
        indexName: service.indexName,
      });
    })
  );

  const LookupLayer = Layer.effect(
    RetrievalEmbeddingLookupService,
    Eff.gen(function* () {
      const embedding = yield* RetrievalEmbedding;
      return { getEmbeddingsByChunkIds: embedding.getEmbeddingsByChunkIds };
    })
  ).pipe(Layer.provide(EmbeddingLayer));

  return Layer.merge(EmbeddingLayer, LookupLayer);
};
