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

const makeIngestion = Eff.fn(function* () {
  const db = yield* Mappers
  const pageService = yield* PageService;
  const ingestion: BrainStore.Ingestion = {
    listPages: Eff.fn("listPages")(function* (filters = {}) {
      return yield* pipe(
        db.listPages(filters).asEffect(),
        Eff.flatMap((rows) => Eff.all(rows.map(Page.decode))),
        StoreError.catch
      );
    }),
    getPage: Eff.fn("getPage")(function* (slug: string) {
      return yield* pipe(
        pageService.getBySlug(slug),
        Eff.catchTag("NoSuchElementError", (e) => Eff.succeed(null)),
        StoreError.catch
      );
    }),
    updateSlug: Eff.fn(function* (oldSlug: string, newSlug: string) {
      return yield* pipe(
        db.updateSlug(oldSlug, newSlug).asEffect(),
        StoreError.catch
      );
    }),
    resolveSlugs: Eff.fn(function* (partial: string) {
      throw new Error("Function not implemented.");
    }),
    getTags: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    createVersion: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    getVersions: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    revertToVersion: Eff.fn(function* (slug: string, versionId: number) {
      throw new Error("Function not implemented.");
    }),
    putPage: Eff.fn(function* (slug: string, page: PageInput) {
      throw new Error("Function not implemented.");
    }),
    deletePage: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    addTag: Eff.fn(function* (slug: string, tag: string) {
      throw new Error("Function not implemented.");
    }),
    removeTag: Eff.fn(function* (slug: string, tag: string) {
      throw new Error("Function not implemented.");
    }),
    upsertChunks: Eff.fn(function* (slug: string, chunks: ChunkInput[]) {
      throw new Error("Function not implemented.");
    }),
    deleteChunks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    getChunks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    getChunksWithEmbeddings: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    getEmbeddingsByChunkIds: Eff.fn(function* (ids: number[]) {
      throw new Error("Function not implemented.");
    }),
  };
  return ingestion;
});

const makeStore = Eff.fn(function* (options: BrainStore.Options) {
  const db = yield* Mappers
  const ingestion = yield* makeIngestion();
  const link: BrainStore.Link = {
    addLink: Eff.fn(function* (
      fromSlug: string,
      toSlug: string,
      linkType?: string,
      context?: string
    ) {
      throw new Error("Function not implemented.");
    }),
    removeLink: Eff.fn(function* (fromSlug: string, toSlug: string) {
      throw new Error("Function not implemented.");
    }),
    getLinks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    getBacklinks: Eff.fn(function* (slug: string) {
      throw new Error("Function not implemented.");
    }),
    rewriteLinks: Eff.fn(function* (oldSlug: string, newSlug: string) {
      throw new Error("Function not implemented.");
    }),
    traverseGraph: Eff.fn(function* (slug: string, depth?: number) {
      throw new Error("Function not implemented.");
    }),
    traversePaths: Eff.fn(function* (slug: string, opts?) {
      throw new Error("Function not implemented.");
    }),
  };
  const hybridSearch: BrainStore.HybridSearch = {
    searchKeyword: Eff.fn(function* (query: string, opts?: SearchOpts) {
      throw new Error("Function not implemented.");
    }),
    searchVector: Eff.fn(function* (embedding: number[], opts?: SearchOpts) {
      throw new Error("Function not implemented.");
    }),
  };
  const timeline: BrainStore.Timeline = {
    addTimelineEntry: Eff.fn(function* (
      slug: string,
      entry: TimelineInput,
      opts?: { skipExistenceCheck?: boolean }
    ) {
      throw new Error("Function not implemented.");
    }),
    addTimelineEntriesBatch: Eff.fn(function* (entries: TimelineBatchInput[]) {
      throw new Error("Function not implemented.");
    }),
    getTimeline: Eff.fn(function* (slug: string, opts?: TimelineOpts) {
      throw new Error("Function not implemented.");
    }),
  };
  const ext: BrainStore.Ext = {
    putRawData: Eff.fn(function* (slug: string, source: string, data: any) {
      throw new Error("Function not implemented.");
    }),
    getRawData: Eff.fn(function* (slug: string, source?: string) {
      throw new Error("Function not implemented.");
    }),
    upsertFile: Eff.fn(function* (
      file: Omit<FileRecord, "id" | "page_id" | "created_at">
    ) {
      throw new Error("Function not implemented.");
    }),
    getFile: Eff.fn(function* (storagePath: string) {
      throw new Error("Function not implemented.");
    }),
    getConfig: Eff.fn(function* (key: string) {
      throw new Error("Function not implemented.");
    }),
    setConfig: Eff.fn(function* (key: string, value: string) {
      throw new Error("Function not implemented.");
    }),
    logIngest: Eff.fn(function* (log: IngestLogInput) {
      throw new Error("Function not implemented.");
    }),
    verifyAccessToken: Eff.fn(function* (tokenHash: string) {
      throw new Error("Function not implemented.");
    }),
    logMcpRequest: Eff.fn(function* (
      log: Omit<McpRequestLog, "id" | "created_at">
    ) {
      throw new Error("Function not implemented.");
    }),
    init: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    dispose: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    getHealthReport: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    getStats: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    getHealth: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    getStaleChunks: Eff.fn(function* () {
      throw new Error("Function not implemented.");
    }),
    upsertVectors: Eff.fn(function* (
      vectors: { id: string; vector: number[]; metadata: any }[]
    ) {
      throw new Error("Function not implemented.");
    }),
    markChunksEmbedded: Eff.fn(function* (chunkIds: number[]) {
      throw new Error("Function not implemented.");
    }),
    getIngestLog: Eff.fn(function* (opts?: { limit?: number }) {
      throw new Error("Function not implemented.");
    }),
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
