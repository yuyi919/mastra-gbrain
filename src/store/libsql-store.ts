import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as Eff from "@tslibs/effect/effect-next";
import { Layer, pipe } from "@tslibs/effect/effect-next";
import {
  type ChunkInput,
  type FileRecord,
  type IngestLogInput,
  type McpRequestLog,
  Page,
  type PageInput,
  type SearchOpts,
  type TimelineInput,
  type TimelineOpts,
} from "../types.js";
import type { BrainStore, TimelineBatchInput } from "./BrainStore.js";
import { StoreError } from "./BrainStoreError.js";
import { Mappers } from "./Mappers.js";
import { PageService } from "./page.js";

const catchStoreError = StoreError.catch;
const makeIngestion = Eff.fn(function* () {
  const mappers = yield* Mappers;
  const pageService = yield* PageService;
  const ingestion: BrainStore.Ingestion = {
    listPages: Eff.fn("listPages")(function* (filters = {}) {
      return yield* pipe(
        mappers.listPages(filters).asEffect(),
        Eff.flatMap((rows) => Eff.all(rows.map(Page.decode)))
      );
    }, catchStoreError),

    getPage: Eff.fn("getPage")(function* (slug: string) {
      return yield* pipe(
        pageService.getBySlug(slug),
        Eff.catchTag("NoSuchElementError", (e) => Eff.succeed(null))
      );
    }, catchStoreError),

    updateSlug: Eff.fn(function* (oldSlug: string, newSlug: string) {
      return yield* pipe(mappers.updateSlug(oldSlug, newSlug).asEffect());
    }, catchStoreError),

    resolveSlugs: Eff.fn(function* (partial: string) {
      // Try exact match first
      const exact = yield* mappers.resolveSlugExact(partial);
      if (exact) return [exact.slug];
      // Fuzzy match using LIKE
      const fuzzy = yield* mappers.resolveSlugFuzzy(partial);
      return fuzzy.map((r) => r.slug);
    }, catchStoreError),

    getTags: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    createVersion: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    getVersions: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    revertToVersion: Eff.fn(function* (slug: string, versionId: number) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    putPage: Eff.fn(function* (slug: string, page: PageInput) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    deletePage: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    addTag: Eff.fn(function* (slug: string, tag: string) {
      const pageResult = yield* mappers.getPageIdBySlug(slug);
      if (pageResult.length === 0) return;
      yield* mappers.insertTag(pageResult[0].id, tag);
    }, catchStoreError),

    removeTag: Eff.fn(function* (slug: string, tag: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    upsertChunks: Eff.fn(function* (slug: string, chunks: ChunkInput[]) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    deleteChunks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    getChunks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    getChunksWithEmbeddings: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),

    getEmbeddingsByChunkIds: Eff.fn(function* (ids: number[]) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
  };
  return ingestion;
});

const makeStore = Eff.fn(function* (options: BrainStore.Options) {
  const db = yield* Mappers;
  const ingestion = yield* makeIngestion();
  const link: BrainStore.Link = {
    addLink: Eff.fn(function* (
      fromSlug: string,
      toSlug: string,
      linkType?: string,
      context?: string
    ) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    removeLink: Eff.fn(function* (fromSlug: string, toSlug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getLinks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getBacklinks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    rewriteLinks: Eff.fn(function* (oldSlug: string, newSlug: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    traverseGraph: Eff.fn(function* (slug: string, depth?: number) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    traversePaths: Eff.fn(function* (slug: string, opts?) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
  };
  const hybridSearch: BrainStore.HybridSearch = {
    searchKeyword: Eff.fn(function* (query: string, opts?: SearchOpts) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    searchVector: Eff.fn(function* (embedding: number[], opts?: SearchOpts) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
  };
  const timeline: BrainStore.Timeline = {
    addTimelineEntry: Eff.fn(function* (
      slug: string,
      entry: TimelineInput,
      opts?: { skipExistenceCheck?: boolean }
    ) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    addTimelineEntriesBatch: Eff.fn(function* (entries: TimelineBatchInput[]) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getTimeline: Eff.fn(function* (slug: string, opts?: TimelineOpts) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
  };
  const ext: BrainStore.Ext = {
    putRawData: Eff.fn(function* (slug: string, source: string, data: any) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getRawData: Eff.fn(function* (slug: string, source?: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    upsertFile: Eff.fn(function* (
      file: Omit<FileRecord, "id" | "page_id" | "created_at">
    ) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getFile: Eff.fn(function* (storagePath: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getConfig: Eff.fn(function* (key: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    setConfig: Eff.fn(function* (key: string, value: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    logIngest: Eff.fn(function* (log: IngestLogInput) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    verifyAccessToken: Eff.fn(function* (tokenHash: string) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    logMcpRequest: Eff.fn(function* (
      log: Omit<McpRequestLog, "id" | "created_at">
    ) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getHealthReport: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getStats: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getHealth: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getStaleChunks: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    upsertVectors: Eff.fn(function* (
      vectors: { id: string; vector: number[]; metadata: any }[]
    ) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    markChunksEmbedded: Eff.fn(function* (chunkIds: number[]) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
    getIngestLog: Eff.fn(function* (opts?: { limit?: number }) {
      throw new Error("Function not implemented.");
    }, catchStoreError),
  };

  return {
    ...hybridSearch,
    ...link,
    ...ingestion,
    ...timeline,
    ...ext,
  };
});

export function make(options: { url: string } & BrainStore.Options) {
  return Eff.gen(function* () {
    const SqlLive = SqliteClient.layer({
      filename: "tmp/test.db",
    });
    const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
    const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);
    return makeStore(options).pipe(Eff.provide(DatabaseLive));
  });
}
