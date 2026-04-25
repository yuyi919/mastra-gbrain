import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer, pipe } from "@yuyi919/tslibs-effect/effect-next";
import type {
  AccessToken,
  BrainHealth,
  BrainStats,
  DatabaseHealth,
  FileRecord,
  IngestLogEntry,
  IngestLogInput,
  RawData,
} from "../../../types.js";
import { StoreError } from "../../BrainStoreError.js";
import { Mappers } from "../../Mappers.js";
import { LATEST_VERSION } from "../../schema.js";
import { RetrievalEmbedding } from "../retrieval/embedding/index.js";
import { BrainStoreExt, type ExtService } from "./interface.js";

const catchStoreError = StoreError.catch;

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

export const makeBrainStoreExt = Eff.fn("makeBrainStoreExt")(function* () {
  const mappers = yield* Mappers;
  const embedding = yield* RetrievalEmbedding;

  const ext: ExtService = {
    putRawData: Eff.fn("putRawData")(function* (
      slug: string,
      source: string,
      data: unknown
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.upsertRawData(pageResult.id, source, JSON.stringify(data));
    }, catchStoreError),
    getRawData: Eff.fn("getRawData")(function* (slug: string, source?: string) {
      const rows = yield* mappers.getRawData(slug, source);
      return rows.map(
        (row) =>
          ({
            source: row.source,
            data: parseJsonObject(row.data),
            fetched_at: new Date(row.fetched_at),
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
      for (const typeRow of types) {
        pages_by_type[typeRow.type] = typeRow.count;
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
    getStaleChunks: embedding.getStaleChunks,
    upsertVectors: embedding.upsertVectors,
    markChunksEmbedded: embedding.markChunksEmbedded,
    getIngestLog: Eff.fn("getIngestLog")(function* (opts?: { limit?: number }) {
      const limit = opts?.limit ?? 50;
      const result = yield* mappers.getIngestLog(limit);
      return result.map(
        (row) =>
          ({
            ...row,
            pages_updated: parseJsonStringArray(row.pages_updated),
            created_at: new Date(row.created_at),
          }) satisfies IngestLogEntry
      );
    }, catchStoreError),
  };

  return ext;
});

export const makeLayer = () => Layer.effect(BrainStoreExt, makeBrainStoreExt());
