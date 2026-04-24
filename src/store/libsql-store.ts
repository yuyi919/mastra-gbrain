import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer, pipe } from "@yuyi919/tslibs-effect/effect-next";
import { SqlClient } from "effect/unstable/sql";
import { extractWordsForSearch } from "../segmenter.js";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  Chunk,
  ChunkInput,
  ChunkSource,
  DatabaseHealth,
  FileRecord,
  IngestLogEntry,
  IngestLogInput,
  Link,
  PageInput,
  RawData,
  SearchOpts,
  SearchResult,
  StaleChunk,
  TimelineEntry,
  TimelineInput,
  TimelineOpts,
  VectorMetadata,
} from "../types.js";
import type { TimelineBatchInput } from "./BrainStore.js";
import { BrainStore } from "./BrainStore.js";
import { StoreError } from "./BrainStoreError.js";
import { GraphNode, Page, PageVersion } from "./effect-schema.js";
import init from "./init.sql" with { type: "text" };
import { Mappers } from "./Mappers.js";
import { LATEST_VERSION } from "./schema.js";

const catchStoreError = StoreError.catch;
const DEFAULT_INDEX_NAME = "gbrain_chunks";

/**
 * 将 JSON 字段安全转为对象。
 */
function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return (value ?? {}) as Record<string, unknown>;
}

/**
 * 将 JSON 字段安全转为字符串数组。
 */
function parseJsonStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return JSON.parse(value) as string[];
  }
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * 获取可安全关闭的 Turso 客户端。
 */
function getClosableTursoClient(
  value: BrainStore.Options["vectorStore"]
): { close: () => Promise<void> | void } | undefined {
  if (!value || typeof value !== "object" || !("turso" in value)) {
    return undefined;
  }

  // @ts-expect-error 未公开
  const turso = value.turso;
  if (
    turso &&
    typeof turso === "object" &&
    "close" in turso &&
    typeof turso.close === "function"
  ) {
    return turso;
  }

  return undefined;
}

const makeStore = Eff.fn(function* (options: BrainStore.Options) {
  const mappers = yield* Mappers;
  const sql = yield* SqlClient.SqlClient;
  const vectorStore = options.vectorStore;
  const indexName = DEFAULT_INDEX_NAME;
  const dimension = options.dimension ?? 1536;

  const deleteVectorsBySlug = Eff.fn(function* (slug: string) {
    yield* Eff.from(() =>
      vectorStore?.deleteVectors({
        indexName,
        filter: { slug: { $eq: slug } },
      })
    );
  });

  const deleteChunksByPageId = Eff.fn("deleteChunksByPageId")(function* (
    page_id: number
  ) {
    yield* mappers.deleteFtsByPageId(page_id);
    yield* mappers.deleteContentChunksByPageId(page_id);
  }, catchStoreError);
  const queryVectors = Eff.fn(function* (
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
        vectorStore?.query({
          indexName,
          queryVector: Array.from(queryVector) as any,
          topK: limit * 2,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        }) ?? []
    );
  });

  const ingestion: BrainStore.Ingestion = {
    listPages: Eff.fn("listPages")(function* (filters = {}) {
      return yield* pipe(
        mappers.listPages(filters).asEffect(),
        Eff.flatMap((rows) => Eff.all(rows.map(Page.decode)))
      );
    }, catchStoreError),
    getPage: Eff.fn("getPage")(function* (slug: string) {
      const result = yield* mappers.getPageBySlug(slug);
      if (!result) return null;
      return yield* Page.decode(result);
    }, catchStoreError),
    updateSlug: Eff.fn("updateSlug")(function* (
      oldSlug: string,
      newSlug: string
    ) {
      yield* mappers.updateSlug(oldSlug, newSlug);
    }, catchStoreError),
    resolveSlugs: Eff.fn("resolveSlugs")(function* (partial: string) {
      const exact = yield* mappers.resolveSlugExact(partial);
      if (exact) return [exact.slug];
      const fuzzy = yield* mappers.resolveSlugFuzzy(partial);
      return fuzzy.map((r) => r.slug);
    }, catchStoreError),
    getTags: Eff.fn("getTags")(function* (slug: string) {
      const result = yield* mappers.getTagsBySlug(slug);
      return result.map((r) => r.tag);
    }, catchStoreError),
    createVersion: Eff.fn("createVersion")(function* (slug: string) {
      const pageResult = yield* mappers.getPageForVersionBySlug(slug);
      if (!pageResult) {
        throw new Error(`Page ${slug} not found`);
      }
      const res = yield* mappers.insertPageVersion({
        page_id: pageResult.id,
        compiled_truth: pageResult.compiled_truth || "",
        frontmatter: pageResult.frontmatter || "{}",
      });
      return PageVersion.decode(res[0]);
    }, catchStoreError),
    getVersions: Eff.fn("getVersions")(function* (slug: string) {
      const rows = yield* mappers.getVersionsBySlug(slug);
      return yield* Eff.all(rows.map(PageVersion.decode));
    }, catchStoreError),
    revertToVersion: Eff.fn("revertToVersion")(function* (
      slug: string,
      versionId: number
    ) {
      return yield* sql.withTransaction(
        Eff.gen(function* () {
          const versions = yield* mappers.getVersionsBySlug(slug);
          const targetVersion = versions.find((v: any) => v.id === versionId);
          if (!targetVersion) return;

          const existingPage = yield* mappers.getPageBySlug(slug);
          if (!existingPage) return;

          yield* mappers.upsertPage(slug, {
            title: existingPage.title,
            type: existingPage.type,
            timeline: existingPage.timeline || "",
            content_hash: existingPage.content_hash || "",
            compiled_truth: targetVersion.compiled_truth,
            frontmatter: targetVersion.frontmatter
              ? JSON.parse(targetVersion.frontmatter)
              : {},
          });
        })
      );
    }, catchStoreError),
    putPage: Eff.fn("putPage")(function* (slug: string, page: PageInput) {
      return yield* sql.withTransaction(
        Eff.gen(function* () {
          const record = yield* mappers.upsertPage(slug, page);
          yield* ingestion.createVersion(slug).pipe(Eff.asVoid);
          return Page.decode(record[0]);
        })
      );
    }, catchStoreError),
    deletePage: Eff.fn("deletePage")(function* (slug: string) {
      yield* Eff.all([
        mappers.deletePageBySlug(slug).asEffect(),
        deleteVectorsBySlug(slug),
      ]);
    }, catchStoreError),
    addTag: Eff.fn("addTag")(function* (slug: string, tag: string) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.insertTag(pageResult.id, tag);
    }, catchStoreError),
    removeTag: Eff.fn("removeTag")(function* (slug: string, tag: string) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.deleteTag(pageResult.id, tag);
    }, catchStoreError),
    upsertChunks: Eff.fn("upsertChunks")(function* (
      slug: string,
      chunks: ChunkInput[]
    ) {
      const pageResult = yield* mappers.getPageBasicBySlug(slug);
      if (pageResult.length === 0) return;
      const page_id = pageResult[0].id;
      const page_title = pageResult[0].title;
      const page_type = pageResult[0].type;
      const newIndices = chunks.map((c) => c.chunk_index);

      if (newIndices.length > 0) {
        yield* mappers.deleteContentChunksNotIn(page_id, newIndices);
        yield* mappers.deleteFtsChunksNotIn(page_id, newIndices);
      } else {
        yield* ingestion.deleteChunks(slug);
        return;
      }

      if (chunks.length > 0) {
        for (const chunk of chunks) {
          yield* mappers.upsertContentChunk(page_id, chunk);
        }
        yield* mappers.deleteFtsByPageId(page_id);
        yield* mappers.insertFtsChunks(
          chunks.map((chunk) => ({
            page_id,
            page_title,
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
        .filter((c) => c.embedding)
        .map((c) => ({
          id: `${slug}::${c.chunk_index}`,
          vector: Array.from(c.embedding!),
          metadata: {
            page_id,
            slug,
            title: page_title,
            type: page_type,
            chunk_index: c.chunk_index,
            chunk_source: c.chunk_source,
            chunk_text: c.chunk_text,
            token_count: c.token_count ?? 0,
          } satisfies VectorMetadata,
        }));
      if (vectorStore && vectorData.length > 0) {
        yield* Eff.promise(() =>
          vectorStore.upsert({
            indexName,
            vectors: vectorData.map((v) => v.vector),
            ids: vectorData.map((v) => v.id),
            metadata: vectorData.map((v) => v.metadata),
            deleteFilter: { slug: { $eq: slug } },
          })
        );
      }
    }, catchStoreError),
    deleteChunks: Eff.fn("deleteChunks")(
      function* (slug: string) {
        const result = yield* mappers.getPageIdBySlug(slug);
        const pageResult = Array.isArray(result) ? result[0] : result;
        if (!pageResult) return;
        const page_id = pageResult.id;
        yield* Eff.all([
          deleteChunksByPageId(page_id).asEffect(),
          deleteVectorsBySlug(slug).asEffect(),
        ]);
      },
      catchStoreError,
      Eff.withConcurrency(2)
    ),
    getChunks: Eff.fn("getChunks")(function* (slug: string) {
      const rows = yield* mappers.getChunksBySlug(slug);
      return rows.map(
        (r) =>
          ({
            ...r,
            embedding: null,
            model: r.model,
            embedded_at: r.embedded_at ? new Date(r.embedded_at) : null,
          }) satisfies Chunk
      );
    }, catchStoreError),
    getChunksWithEmbeddings: Eff.fn("getChunksWithEmbeddings")(function* (
      slug: string
    ) {
      return yield* ingestion.getChunks(slug);
    }, catchStoreError),
    getEmbeddingsByChunkIds: Eff.fn("getEmbeddingsByChunkIds")(function* (
      _ids: number[]
    ) {
      // NOTE: 依赖原始 vector_store 的 Unsafe 查询，按需求暂不迁移。
      return new Map<number, Float32Array>();
    }, catchStoreError),
  };

  const link: BrainStore.Link = {
    addLink: Eff.fn("addLink")(function* (
      fromSlug: string,
      toSlug: string,
      linkType = "references",
      context = ""
    ) {
      const fromResult = yield* mappers.getPageIdBySlug(fromSlug);
      const toResult = yield* mappers.getPageIdBySlug(toSlug);
      const fromPage = Array.isArray(fromResult) ? fromResult[0] : fromResult;
      const toPage = Array.isArray(toResult) ? toResult[0] : toResult;
      if (!fromPage || !toPage) return;
      yield* mappers.insertLink({
        from_page_id: fromPage.id,
        to_page_id: toPage.id,
        link_type: linkType,
        context,
      });
    }, catchStoreError),
    removeLink: Eff.fn("removeLink")(function* (
      fromSlug: string,
      toSlug: string
    ) {
      const fromResult = yield* mappers.getPageIdBySlug(fromSlug);
      const toResult = yield* mappers.getPageIdBySlug(toSlug);
      const fromPage = Array.isArray(fromResult) ? fromResult[0] : fromResult;
      const toPage = Array.isArray(toResult) ? toResult[0] : toResult;
      if (!fromPage || !toPage) return;
      yield* mappers.deleteLink(fromPage.id, toPage.id);
    }, catchStoreError),
    getLinks: Eff.fn("getLinks")(function* (slug: string) {
      const outgoing = yield* mappers.getLinksOutgoingBySlug(slug);
      const incomingRows = yield* mappers.getBacklinksBySlug(slug);
      const incoming = incomingRows.map(
        (r) =>
          ({
            from_slug: r.from_slug,
            to_slug: r.to_slug,
            link_type: r.link_type || "",
            context: r.context || "",
          }) satisfies Link
      );
      return [
        ...outgoing.map((r) => ({
          from_slug: r.from_slug,
          to_slug: r.to_slug,
          link_type: r.link_type || "",
          context: r.context || "",
        })),
        ...incoming,
      ] satisfies Link[];
    }, catchStoreError),
    getBacklinks: Eff.fn("getBacklinks")(function* (slug: string) {
      const rows = yield* mappers.getBacklinksBySlug(slug);
      return rows.map(
        (r) =>
          ({
            from_slug: r.from_slug,
            to_slug: r.to_slug,
            link_type: r.link_type || "",
            context: r.context || "",
          }) satisfies Link
      );
    }, catchStoreError),
    rewriteLinks: Eff.fn("rewriteLinks")(function* (
      _oldSlug: string,
      _newSlug: string
    ) {
      // 保持与 libsql.ts 一致：暂不处理文本重写
    }, catchStoreError),
    traverseGraph: Eff.fn("traverseGraph")(function* (slug, depth = 5) {
      const rows = yield* mappers.unsafe.traverseGraph(slug, depth).asEffect();
      return yield* Eff.all(rows.map(GraphNode.decode));
    }, catchStoreError),
    traversePaths: Eff.fn("traversePaths")(function* (_slug: string, _opts?) {
      return [];
    }, catchStoreError),
    getBacklinkCounts: Eff.fn("getBacklinkCounts")(function* (slugs) {
      const result = new Map<string, number>();
      if (slugs.length === 0) return result;
      // Initialize all slugs to 0 so callers get a consistent map.
      for (const s of slugs) result.set(s, 0);
      // PGLite needs explicit cast for array binding (does not auto-serialize JS arrays).
      const rows = yield* mappers.getBacklinkCounts(slugs);
      for (const r of rows) {
        result.set(r.slug, r.cnt);
      }
      return result;
    }, catchStoreError),
  };

  const hybridSearch: BrainStore.HybridSearch = {
    searchKeyword: Eff.fn("searchKeyword")(function* (
      query: string,
      opts?: SearchOpts
    ) {
      const segmentedQuery = extractWordsForSearch(query);
      const rows = yield* mappers.searchKeyword(segmentedQuery, opts);
      return rows.map((row) => {
        const score = Math.abs(row.score) / (1 + Math.abs(row.score));
        return { ...row, score };
      });
    }, catchStoreError),
    searchVector: Eff.fn("searchVector")(function* (
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
          (h): h is { score: number; slug: string; chunk_index: number } =>
            !!h.slug && Number.isFinite(h.chunk_index)
        );
      const slugs = Array.from(new Set(hits.map((h) => h.slug)));
      const chunkIndexes = Array.from(new Set(hits.map((h) => h.chunk_index)));
      if (slugs.length === 0 || chunkIndexes.length === 0) return [];
      const rows = yield* mappers.searchVectorRows(slugs, chunkIndexes, opts);
      const byKey = new Map<string, (typeof hits)[number]>();
      const out: SearchResult[] = [];
      for (const r of hits) {
        byKey.set(`${r.slug}::${r.chunk_index}`, r);
      }
      for (const r of rows) {
        const h = byKey.get(`${r.slug}::${r.chunk_index}`);
        // const row = byKey.get(`${h.slug}::${h.chunk_index}`);
        const row = r;
        if (!h) continue;
        out.push({
          page_id: row.page_id,
          title: row.title,
          type: row.type as any,
          slug: row.slug,
          chunk_id: row.chunk_id,
          chunk_index: row.chunk_index,
          chunk_text: row.chunk_text,
          chunk_source: row.chunk_source as ChunkSource,
          score: h!.score,
          stale: !!row.stale,
        });
        if (out.length >= limit) break;
      }
      return out;
    }, catchStoreError),
  };

  const timeline: BrainStore.Timeline = {
    addTimelineEntry: Eff.fn("addTimelineEntry")(function* (
      slug: string,
      entry: TimelineInput,
      opts?: { skipExistenceCheck?: boolean }
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) {
        if (opts?.skipExistenceCheck) return;
        throw new Error(`addTimelineEntry failed: page "${slug}" not found`);
      }
      const page_id = pageResult.id;
      yield* mappers.insertTimelineEntry(page_id, entry);
    }, catchStoreError),
    addTimelineEntriesBatch: Eff.fn("addTimelineEntriesBatch")(function* (
      entries: TimelineBatchInput[]
    ) {
      if (entries.length === 0) return 0;
      let count = 0;
      for (const entry of entries) {
        const result = yield* mappers.getPageIdBySlug(entry.slug);
        const pageResult = Array.isArray(result) ? result[0] : result;
        if (!pageResult) continue;
        const res = yield* mappers.insertTimelineEntryReturningId(
          pageResult.id,
          entry
        );
        if (res.length > 0) count++;
      }
      return count;
    }, catchStoreError),
    getTimeline: Eff.fn("getTimeline")(function* (
      slug: string,
      opts?: TimelineOpts
    ) {
      const result = yield* mappers.getTimeline(slug, opts);
      return result.map(
        (r) =>
          ({
            ...r,
            created_at: new Date(r.created_at),
          }) satisfies TimelineEntry
      );
    }, catchStoreError),
  };

  const ext: BrainStore.Ext = {
    putRawData: Eff.fn("putRawData")(function* (
      slug: string,
      source: string,
      data: any
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.upsertRawData(pageResult.id, source, JSON.stringify(data));
    }, catchStoreError),
    getRawData: Eff.fn("getRawData")(function* (slug: string, source?: string) {
      const rows = yield* mappers.getRawData(slug, source);
      return rows.map(
        (r) =>
          ({
            source: r.source,
            data: parseJsonObject(r.data),
            fetched_at: new Date(r.fetched_at),
          }) satisfies RawData
      );
    }, catchStoreError),
    upsertFile: Eff.fn("upsertFile")(function* (
      file: Omit<FileRecord, "id" | "page_id" | "created_at">
    ) {
      let page_id: number | null = null;
      if (file.page_slug) {
        const result = yield* mappers.getPageIdBySlug(file.page_slug);
        const pageResult = Array.isArray(result) ? result[0] : result;
        if (!pageResult) return;
        page_id = pageResult.id;
      }
      yield* mappers.upsertFile({
        page_id,
        filename: file.filename,
        storage_path: file.storage_path,
        mime_type: file.mime_type ?? null,
        size_bytes: file.size_bytes ?? null,
        content_hash: file.content_hash,
        metadata: JSON.stringify(file.metadata),
      });
    }, catchStoreError),
    getFile: Eff.fn("getFile")(function* (storagePath: string) {
      const result = yield* mappers.getFileByStoragePath(storagePath);
      if (result.length === 0) return null;
      const row = result[0];
      return {
        ...row,
        page_slug: row.page_slug ?? undefined,
        mime_type: row.mime_type ?? undefined,
        size_bytes: row.size_bytes ?? undefined,
        metadata: parseJsonObject(row.metadata),
        page_id: row.page_id ?? undefined,
      };
    }, catchStoreError),
    getConfig: Eff.fn("getConfig")(function* (key: string) {
      const result = yield* mappers.getConfigByKey(key).asEffect();
      return result?.value ?? null;
    }, catchStoreError),
    setConfig: Eff.fn("setConfig")(function* (key: string, value: string) {
      yield* mappers.upsertConfig(key, value).asEffect();
    }, catchStoreError),
    logIngest: Eff.fn("logIngest")(function* (log: IngestLogInput) {
      yield* mappers.insertIngestLog(log).asEffect();
    }, catchStoreError),
    verifyAccessToken: Eff.fn("verifyAccessToken")(function* (
      tokenHash: string
    ) {
      const result = yield* mappers
        .getValidAccessTokenByHash(tokenHash)
        .asEffect();
      if (result.length === 0) return null;
      yield* mappers.updateAccessTokenLastUsedAt(result[0].id).asEffect();
      return {
        ...(result[0] as AccessToken),
        created_at: result[0].created_at ?? undefined,
        last_used_at: result[0].last_used_at ?? undefined,
        revoked_at: result[0].revoked_at ?? undefined,
        scopes: parseJsonStringArray(result[0].scopes),
      };
    }, catchStoreError),
    logMcpRequest: Eff.fn("logMcpRequest")(function* (log) {
      yield* mappers.insertMcpRequestLog(log);
    }, catchStoreError),
    getHealthReport: Eff.fn("getHealthReport")(
      function* () {
        const report: DatabaseHealth = {
          connectionOk: false,
          tablesOk: true,
          ftsOk: false,
          tableDetails: {},
          vectorCoverage: { total: 0, embedded: 0 },
          schemaVersion: { current: 0, latest: LATEST_VERSION, ok: false },
        };
        report.connectionOk = yield* pipe(
          mappers.countPages().asEffect(),
          Eff.exit,
          Eff.map(Eff.Exit.isSuccess)
        );

        const tables = [
          "pages",
          "content_chunks",
          "links",
          "timeline_entries",
          "tags",
          "chunks_fts",
        ] as const;
        const tableCounts = {
          pages: mappers.countPages().asEffect(),
          content_chunks: mappers.countContentChunks().asEffect(),
          links: mappers.countLinks().asEffect(),
          timeline_entries: mappers.countTimelineEntries().asEffect(),
          tags: mappers.countTags().asEffect(),
          chunks_fts: mappers.countChunksFts().asEffect(),
        };

        yield* Eff.all(
          tables.map(
            Eff.fnUntraced(function* (table) {
              const rowsResult = yield* Eff.exit(tableCounts[table]);
              if (Eff.Exit.isSuccess(rowsResult)) {
                report.tableDetails[table] = {
                  ok: true,
                  rows: rowsResult.value,
                };
              } else {
                report.tableDetails[table] = {
                  ok: false,
                  error: Eff.Cause.pretty(rowsResult.cause),
                };
                report.tablesOk = false;
              }
            })
          ),
          { concurrency: "unbounded" }
        );

        // NOTE: integrity-check 依赖 Unsafe SQL，当前仅做基础可用性检查。
        report.ftsOk = yield* pipe(
          Eff.all([
            mappers.countChunksFts().asEffect(),
            mappers.unsafe.checkFtsIntegrity().asEffect(),
          ]),
          Eff.exit,
          Eff.map(Eff.Exit.isSuccess)
        );
        yield* pipe(
          Eff.all([
            mappers.countContentChunks(true).asEffect(),
            mappers.countContentChunks().asEffect(),
          ]),
          Eff.map(([embedded, total]) => ({ embedded, total })),
          Eff.tap((data) =>
            Eff.sync(() => {
              report.vectorCoverage = data;
            })
          ),
          Eff.exit
        );

        const versionResult = yield* pipe(
          mappers.getConfigByKey("version").asEffect(),
          Eff.orElse(() => Eff.undefined)
        );
        if (versionResult) {
          const versionStr = versionResult.value ?? "0";
          const version = Number.parseInt(versionStr, 10);
          report.schemaVersion.current = version;
          report.schemaVersion.ok = version >= LATEST_VERSION;
        } else {
          report.schemaVersion.ok = false;
        }
        return report;
      },
      catchStoreError,
      Eff.withConcurrency("unbounded")
    ),
    getStats: Eff.fn("getStats")(function* () {
      const [
        page_count,
        chunk_count,
        embedded_count,
        link_count,
        timeline_entry_count,
        tagCountRow,
        types,
      ] = yield* Eff.all([
        Eff.fromYieldable(mappers.countPages()),
        Eff.fromYieldable(mappers.countContentChunks()),
        Eff.fromYieldable(mappers.countContentChunks(true)),
        Eff.fromYieldable(mappers.countLinks()),
        Eff.fromYieldable(mappers.countTimelineEntries()),
        mappers.countDistinctTags().asEffect(),
        mappers.getPageTypeCounts().asEffect(),
      ]);
      const pages_by_type: Record<string, number> = {};
      for (const t of types) {
        pages_by_type[t.type] = t.count;
      }
      return {
        page_count,
        chunk_count,
        embedded_count,
        link_count,
        tag_count: tagCountRow[0]?.count ?? 0,
        timeline_entry_count,
        pages_by_type,
      } satisfies BrainStats;
    }, catchStoreError),
    getHealth: Eff.fn("getHealth")(function* () {
      const [
        pageCount,
        chunkCount,
        embeddedCount,
        stalePagesRow,
        orphanPagesRow,
        deadLinksRow,
        linkCount,
        pagesWithTimelineRow,
        entityCount,
        entityWithLinksRow,
        entityWithTimelineRow,
        mostConnectedRows,
      ] = yield* Eff.all([
        mappers.countPages().asEffect(),
        mappers.countContentChunks().asEffect(),
        mappers.countContentChunks(true).asEffect(),
        mappers.countStalePages().asEffect(),
        mappers.countOrphanPages().asEffect(),
        mappers.countDeadLinks().asEffect(),
        mappers.countLinks().asEffect(),
        mappers.countPagesWithTimeline().asEffect(),
        mappers.countEntities().asEffect(),
        mappers.countEntitiesWithLinks().asEffect(),
        mappers.countEntitiesWithTimeline().asEffect(),
        mappers.getMostConnectedPages().asEffect(),
      ]);
      const stalePages = stalePagesRow[0]?.count ?? 0;
      const orphanPages = orphanPagesRow[0]?.count ?? 0;
      const deadLinks = deadLinksRow[0]?.count ?? 0;
      const pagesWithTimeline = pagesWithTimelineRow[0]?.count ?? 0;
      const entityWithLinks = entityWithLinksRow[0]?.count ?? 0;
      const entityWithTimeline = entityWithTimelineRow[0]?.count ?? 0;
      const missingEmbeddings = chunkCount - embeddedCount;
      const embedCoverage = chunkCount > 0 ? embeddedCount / chunkCount : 1;
      const linkDensity =
        pageCount > 0 ? Math.min(linkCount / pageCount, 1) : 0;
      const timelineCoverage =
        pageCount > 0 ? Math.min(pagesWithTimeline / pageCount, 1) : 0;
      const noOrphans = pageCount > 0 ? 1 - orphanPages / pageCount : 1;
      const noDeadLinks =
        pageCount > 0 ? 1 - Math.min(deadLinks / pageCount, 1) : 1;
      const brainScore =
        pageCount === 0
          ? 0
          : Math.round(
              (embedCoverage * 0.35 +
                linkDensity * 0.25 +
                timelineCoverage * 0.15 +
                noOrphans * 0.15 +
                noDeadLinks * 0.1) *
                100
            );
      return {
        page_count: pageCount,
        embed_coverage: embedCoverage,
        stale_pages: stalePages,
        orphan_pages: orphanPages,
        missing_embeddings: missingEmbeddings,
        brain_score: brainScore,
        link_coverage: entityCount > 0 ? entityWithLinks / entityCount : 1,
        timeline_coverage:
          entityCount > 0 ? entityWithTimeline / entityCount : 1,
        most_connected: mostConnectedRows,
      } satisfies BrainHealth;
    }, catchStoreError),
    getStaleChunks: Eff.fn("getStaleChunks")(function* () {
      const rows = yield* mappers.getStaleChunks();
      return rows as StaleChunk[];
    }, catchStoreError),
    upsertVectors: Eff.fn("upsertVectors")(function* (
      vectors: { id: string; vector: number[]; metadata: any }[]
    ) {
      if (!vectorStore || vectors.length === 0) return;
      yield* Eff.promise(() =>
        vectorStore.upsert({
          indexName,
          vectors: vectors.map((v) => v.vector),
          ids: vectors.map((v) => v.id),
          metadata: vectors.map((v) => v.metadata),
        })
      );
    }, catchStoreError),
    markChunksEmbedded: Eff.fn("markChunksEmbedded")(function* (
      chunkIds: number[]
    ) {
      if (chunkIds.length === 0) return;
      yield* mappers.markChunksEmbeddedByIds(chunkIds);
    }, catchStoreError),
    getIngestLog: Eff.fn("getIngestLog")(function* (opts?: { limit?: number }) {
      const limit = opts?.limit ?? 50;
      const result = yield* mappers.getIngestLog(limit);
      return result.map(
        (r) =>
          ({
            ...r,
            pages_updated: parseJsonStringArray(r.pages_updated),
            created_at: new Date(r.created_at),
          }) satisfies IngestLogEntry
      );
    }, catchStoreError),
  };
  const inited = yield* Eff.Ref.make(false);
  const lifecycle: BrainStore.Lifecycle = {
    init: Eff.fn("init")(
      function* () {
        if (yield* Eff.Ref.get(inited)) return;
        yield* Eff.log("Initializing database...");
        yield* Eff.forEach(init.split(";\n").filter(Boolean), (rawSQL) =>
          sql.unsafe(rawSQL).raw.pipe(Eff.tapError(Eff.logError))
        ).pipe(
          Eff.zipRight(
            Eff.from(() =>
              vectorStore?.createIndex({
                indexName,
                dimension,
                metric: "cosine",
              })
            ),
            { concurrent: true }
          )
        );
        yield* Eff.Ref.set(inited, true);
      },
      catchStoreError,
      Eff.withLogElapsed("Initialized database")
    ),
    dispose: Eff.fn("dispose")(function* () {
      yield* Eff.logDebug("dispose");
      yield* Eff.from(() => getClosableTursoClient(vectorStore)?.close());
      // 由 Layer/Runtime 管理生命周期，当前无需显式释放。
    }, Eff.tapDefect(Eff.logError)),
    transaction: (operators) => {
      return sql.withTransaction(operators).pipe(catchStoreError);
    },
  };
  const unsafe: BrainStore.UnsafeDB = {
    query: (text, params) =>
      sql
        .unsafe(text, params)
        .unprepared.pipe(
          Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
          catchStoreError,
          Eff.unsafeCoerce<any, any>
        ),
    get: (text, params) =>
      sql.unsafe(text, params).unprepared.pipe(
        Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
        catchStoreError,
        Eff.map((_) => _[0]),
        Eff.unsafeCoerce<any, any>
      ),
    run: (text, params) =>
      sql
        .unsafe(text, params)
        .raw.pipe(
          Eff.tap(Eff.logWarning(`(unsafe) Running query: ${text}`)),
          catchStoreError,
          Eff.unsafeCoerce<any, any>
        ),
  };
  const store: BrainStore.Service = {
    ...hybridSearch,
    ...link,
    ...ingestion,
    ...timeline,
    ...ext,
    ...lifecycle,
    ...unsafe,
  };

  return yield* Eff.acquireRelease(Eff.succeed(store), (store) =>
    store.dispose()
  );
}, Eff.withLogElapsed("make BrainStore"));

export function makeLayer(options: { url: string } & BrainStore.Options) {
  const filename = options.url.replace(/^file:/, "");
  const SqlLive = SqliteClient.layer({ filename });
  const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
  const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);
  const BrainStoreLayer = Layer.effect(BrainStore, makeStore(options)).pipe(
    Layer.provide(DatabaseLive)
  );
  return Layer.mergeAll(BrainStoreLayer, DatabaseLive).pipe(
    Layer.provideMerge([Eff.Logger.minimumLogLevel("Debug"), Eff.Logger.pretty])
  );
}

export function make(options: { url: string } & BrainStore.Options) {
  return Eff.gen(function* () {
    const filename = options.url.replace(/^file:/, "");
    const SqlLive = SqliteClient.layer({ filename });
    const DrizzleLive = Mappers.makeLayer().pipe(Layer.provide(SqlLive));
    const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);
    return makeStore(options).pipe(Eff.provide(DatabaseLive));
  });
}
