import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { extractWordsForSearch } from "../../../../segmenter.js";
import type { Chunk, ChunkInput, VectorMetadata } from "../../../../types.js";
import { StoreError } from "../../../BrainStoreError.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import { ContentChunks, type ContentChunksService } from "./interface.js";

export interface ContentChunksEmbeddingPort {
  upsertVectors(
    vectors: { id: string; vector: number[]; metadata: VectorMetadata }[],
    opts?: { deleteSlug?: string }
  ): Eff.Effect<void, StoreError>;
  deleteVectorsBySlug(slug: string): Eff.Effect<void, StoreError>;
}

export interface ContentChunksDependencies {
  mappers: SqlBuilder;
  embeddings?: ContentChunksEmbeddingPort;
}

export const makeContentChunks = (
  deps: ContentChunksDependencies
): ContentChunksService => {
  const { mappers, embeddings } = deps;
  const catchStoreError = StoreError.catch;
  const deleteChunksByPageId = Eff.fn("content.chunks.deleteChunksByPageId")(
    function* (pageId: number) {
      yield* mappers.deleteFtsByPageId(pageId);
      yield* mappers.deleteContentChunksByPageId(pageId);
    },
    catchStoreError
  );

  return {
    upsertChunks: Eff.fn("content.chunks.upsertChunks")(function* (
      slug: string,
      chunks: ChunkInput[]
    ) {
      const pageResult = yield* mappers.getPageBasicBySlug(slug);
      if (pageResult.length === 0) return;
      const pageId = pageResult[0].id;
      const pageTitle = pageResult[0].title;
      const pageType = pageResult[0].type;
      const newIndices = chunks.map((chunk) => chunk.chunk_index);

      if (newIndices.length > 0) {
        yield* mappers.deleteContentChunksNotIn(pageId, newIndices);
        yield* mappers.deleteFtsChunksNotIn(pageId, newIndices);
      } else {
        yield* deleteChunksByPageId(pageId);
        if (embeddings) {
          yield* embeddings.deleteVectorsBySlug(slug);
        }
        return;
      }

      if (chunks.length > 0) {
        for (const chunk of chunks) {
          yield* mappers.upsertContentChunk(pageId, chunk);
        }
        yield* mappers.deleteFtsByPageId(pageId);
        yield* mappers.insertFtsChunks(
          chunks.map((chunk) => ({
            page_id: pageId,
            page_title: pageTitle,
            page_slug: slug,
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            chunk_source: chunk.chunk_source,
            token_count: chunk.token_count ?? 0,
            chunk_text_segmented: extractWordsForSearch(chunk.chunk_text),
          }))
        );
      }

      const vectorData = chunks
        .filter((chunk) => chunk.embedding)
        .map((chunk) => ({
          id: `${slug}::${chunk.chunk_index}`,
          vector: Array.from(chunk.embedding!),
          metadata: {
            page_id: pageId,
            slug,
            title: pageTitle,
            type: pageType,
            chunk_index: chunk.chunk_index,
            chunk_source: chunk.chunk_source,
            chunk_text: chunk.chunk_text,
            token_count: chunk.token_count ?? 0,
          } satisfies VectorMetadata,
        }));

      if (embeddings && vectorData.length > 0) {
        yield* embeddings.upsertVectors(vectorData, { deleteSlug: slug });
      }
    }, catchStoreError),
    deleteChunks: Eff.fn("content.chunks.deleteChunks")(function* (
      slug: string
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* deleteChunksByPageId(pageResult.id);
      if (embeddings) {
        yield* embeddings.deleteVectorsBySlug(slug);
      }
    }, catchStoreError),
    getChunks: Eff.fn("content.chunks.getChunks")(function* (slug: string) {
      const rows = yield* mappers.getChunksBySlug(slug);
      return rows.map(
        (row) =>
          ({
            ...row,
            embedding: null,
            model: row.model,
            embedded_at: row.embedded_at ? new Date(row.embedded_at) : null,
          }) satisfies Chunk
      );
    }, catchStoreError),
  };
};

export const makeLayer = (
  service: ContentChunksService | ContentChunksDependencies
) =>
  Layer.succeed(
    ContentChunks,
    "mappers" in service ? makeContentChunks(service) : service
  );
