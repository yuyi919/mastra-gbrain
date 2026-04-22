import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { alias } from "drizzle-orm/sqlite-core";
import { pick } from "effect/Struct";
import type {
  ChunkInput,
  IngestLogInput,
  McpRequestLog,
  PageFilters,
  PageInput,
  SearchOpts,
  TimelineInput,
  TimelineOpts,
} from "../types.js";
import * as table from "./schema.js";

function castArray<A>(a: A | A[]) {
  return Array.isArray(a) ? a : [a];
}

export type DrizzleDb<TResultKind extends "sync" | "async" = any> =
  BaseSQLiteDatabase<TResultKind, void, table.Schemas>;

/**
 * @internal
 * @returns
 */
export function listPages(drizzleDb: DrizzleDb, filters: PageFilters) {
  const queryFields = pick(table.pages, [
    "id",
    "slug",
    "type",
    "title",
    "compiled_truth",
    "timeline",
    "frontmatter",
    "content_hash",
    "created_at",
    "updated_at",
  ]);
  let query = drizzleDb.select(queryFields).from(table.pages).$dynamic();

  const conditions = [
    filters.type ? eq(table.pages.type, filters.type as any) : undefined,
    filters.updated_after
      ? gte(table.pages.updated_at, filters.updated_after)
      : undefined,
  ];

  if (filters.tag || filters.tags) {
    query = drizzleDb
      .select(queryFields)
      .from(table.pages)
      .innerJoin(table.tags, eq(table.pages.id, table.tags.page_id))
      .$dynamic();

    conditions.push(
      inArray(
        table.tags.tag,
        castArray(filters.tags ? filters.tags : filters.tag!)
      )
    );
  }

  query = query
    .where(and(...conditions))
    .orderBy(desc(table.pages.updated_at))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
  return query;
}

/**
 * 构建按 slug 精确匹配的页面查询。
 */
export function resolveSlugExact(drizzleDb: DrizzleDb, partial: string) {
  return drizzleDb.query.pages.findFirst({
    where: eq(table.pages.slug, partial),
    columns: {
      slug: true,
    },
  });
}

/**
 * 构建按 title/slug 模糊匹配的页面查询。
 */
export function resolveSlugFuzzy(drizzleDb: DrizzleDb, partial: string) {
  partial = `%${partial}%`;
  return drizzleDb.query.pages.findMany({
    where: or(
      like(table.pages.title, partial),
      like(table.pages.slug, partial)
    ),
    columns: {
      slug: true,
    },
    limit: 5,
  });
}

/**
 * 构建时间线查询。
 */
export function getTimeline(
  drizzleDb: DrizzleDb,
  slug: string,
  opts?: TimelineOpts
) {
  const limit = opts?.limit ?? 100;
  let query = drizzleDb
    .select({
      id: table.timeline_entries.id,
      page_id: table.timeline_entries.page_id,
      slug: table.pages.slug,
      date: table.timeline_entries.date,
      source: table.timeline_entries.source,
      summary: table.timeline_entries.summary,
      detail: table.timeline_entries.detail,
      created_at: table.timeline_entries.created_at,
    })
    .from(table.timeline_entries)
    .innerJoin(table.pages, eq(table.timeline_entries.page_id, table.pages.id))
    .$dynamic();

  const conditions = [eq(table.pages.slug, slug)];
  if (opts?.after) {
    conditions.push(gte(table.timeline_entries.date, opts.after));
  }
  if (opts?.before) {
    conditions.push(lte(table.timeline_entries.date, opts.before));
  }

  query = query
    .where(and(...conditions))
    .orderBy(
      opts?.asc
        ? asc(table.timeline_entries.date)
        : desc(table.timeline_entries.date)
    )
    .limit(limit);

  return query;
}

/**
 * 构建 RawData 查询。
 */
export function getRawData(
  drizzleDb: DrizzleDb,
  slug: string,
  source?: string
) {
  let query = drizzleDb
    .select({
      id: table.raw_data.id,
      page_id: table.raw_data.page_id,
      slug: table.pages.slug,
      source: table.raw_data.source,
      data: table.raw_data.data,
      fetched_at: table.raw_data.fetched_at,
    })
    .from(table.raw_data)
    .innerJoin(table.pages, eq(table.raw_data.page_id, table.pages.id))
    .$dynamic();

  const conditions = [eq(table.pages.slug, slug)];
  if (source) {
    conditions.push(eq(table.raw_data.source, source));
  }

  query = query.where(and(...conditions));
  return query;
}

/**
 * 构建 FTS 关键词检索查询。
 */
export function searchKeyword(
  drizzleDb: DrizzleDb,
  segmentedQuery: string,
  opts?: SearchOpts
) {
  const limit = opts?.limit ?? 10;
  const offset = opts?.offset ?? 0;
  const dedupe = opts?.dedupe ?? false;

  const ftsQuery = drizzleDb
    .select({
      page_id: table.chunks_fts.page_id,
      chunk_index: table.chunks_fts.chunk_index,
      score: sql<number>`bm25(${table.chunks_fts})`.as("score"),
    })
    .from(table.chunks_fts)
    .where(sql`${table.chunks_fts} MATCH ${segmentedQuery}`)
    .orderBy(sql`score ASC`)
    .limit(10000)
    .as("r");

  const conditions = [];
  if (opts?.type) {
    conditions.push(eq(table.pages.type, opts.type));
  }
  if (opts?.detail === "low") {
    conditions.push(eq(table.content_chunks.chunk_source, "compiled_truth"));
  }
  if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
    conditions.push(notInArray(table.pages.slug, opts.exclude_slugs));
  }

  const mainQuery = drizzleDb
    .select({
      page_id: table.pages.id,
      title: table.pages.title,
      type: table.pages.type,
      slug: table.pages.slug,
      chunk_id: table.content_chunks.id,
      chunk_index: table.content_chunks.chunk_index,
      chunk_text: table.content_chunks.chunk_text,
      chunk_source: table.content_chunks.chunk_source,
      token_count: table.content_chunks.token_count,
      score: ftsQuery.score,
      stale:
        sql<boolean>`(${table.content_chunks.embedded_at} IS NULL OR ${table.pages.updated_at} > ${table.content_chunks.embedded_at})`.as(
          "stale"
        ),
    })
    .from(ftsQuery)
    .innerJoin(
      table.content_chunks,
      and(
        eq(table.content_chunks.page_id, ftsQuery.page_id),
        eq(table.content_chunks.chunk_index, ftsQuery.chunk_index)
      )
    )
    .innerJoin(table.pages, eq(table.pages.id, table.content_chunks.page_id))
    .orderBy(sql`${ftsQuery.score} ASC`);

  if (conditions.length > 0) {
    mainQuery.where(and(...conditions));
  }

  if (dedupe) {
    mainQuery.limit((offset + limit) * 5);
  } else {
    mainQuery.limit(limit).offset(offset);
  }

  return mainQuery;
}

/**
 * 构建向量命中后的 chunk 回表查询。
 */
export function searchVectorRows(
  drizzleDb: DrizzleDb,
  slugs: string[],
  chunkIndexes: number[],
  opts?: SearchOpts
) {
  const conditions = [
    inArray(table.pages.slug, slugs),
    inArray(table.content_chunks.chunk_index, chunkIndexes),
  ];

  if (opts?.type) {
    conditions.push(eq(table.pages.type, opts.type));
  }
  if (opts?.detail === "low") {
    conditions.push(eq(table.content_chunks.chunk_source, "compiled_truth"));
  }
  if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
    conditions.push(notInArray(table.pages.slug, opts.exclude_slugs));
  }

  return drizzleDb
    .select({
      page_id: table.pages.id,
      title: table.pages.title,
      type: table.pages.type,
      slug: table.pages.slug,
      chunk_id: table.content_chunks.id,
      chunk_index: table.content_chunks.chunk_index,
      chunk_text: table.content_chunks.chunk_text,
      chunk_source: table.content_chunks.chunk_source,
      token_count: table.content_chunks.token_count,
      stale:
        sql<boolean>`(${table.content_chunks.embedded_at} IS NULL OR ${table.pages.updated_at} > ${table.content_chunks.embedded_at})`.as(
          "stale"
        ),
    })
    .from(table.content_chunks)
    .innerJoin(table.pages, eq(table.pages.id, table.content_chunks.page_id))
    .where(and(...conditions));
}

/**
 * 构建按 slug 查询页面详情。
 */
export function getPageBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select()
    .from(table.pages)
    .where(eq(table.pages.slug, slug))
    .limit(1);
}

/**
 * 构建按 slug 删除页面。
 */
export function deletePageBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb.delete(table.pages).where(eq(table.pages.slug, slug));
}

/**
 * 构建按 slug 查询页面 id。
 */
export function getPageIdBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({ id: table.pages.id })
    .from(table.pages)
    .where(eq(table.pages.slug, slug))
    .limit(1);
}

/**
 * 构建按 slug 查询标签。
 */
export function getTagsBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({ tag: table.tags.tag })
    .from(table.tags)
    .innerJoin(table.pages, eq(table.tags.page_id, table.pages.id))
    .where(eq(table.pages.slug, slug));
}

/**
 * 构建版本快照所需页面字段查询。
 */
export function getPageForVersionBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: table.pages.id,
      compiled_truth: table.pages.compiled_truth,
      frontmatter: table.pages.frontmatter,
    })
    .from(table.pages)
    .where(eq(table.pages.slug, slug))
    .limit(1);
}

/**
 * 构建插入页面版本快照。
 */
export function insertPageVersion(
  drizzleDb: DrizzleDb,
  values: {
    page_id: number;
    compiled_truth: string;
    frontmatter: string;
  }
) {
  return drizzleDb.insert(table.page_versions).values(values).returning();
}

/**
 * 构建按 slug 查询所有版本。
 */
export function getVersionsBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      ...pick(table.page_versions, [
        "id",
        "page_id",
        "compiled_truth",
        "frontmatter",
        "snapshot_at",
      ]),
      slug: table.pages.slug,
    })
    .from(table.page_versions)
    .innerJoin(table.pages, eq(table.page_versions.page_id, table.pages.id))
    .where(eq(table.pages.slug, slug))
    .orderBy(sql`${table.page_versions.snapshot_at} DESC`);
}

/**
 * 构建按版本回滚页面内容。
 */
export function revertToVersionBySlug(
  drizzleDb: DrizzleDb,
  slug: string,
  versionId: number
) {
  const pv = alias(table.page_versions, "pv");
  return drizzleDb
    .update(table.pages)
    .set({
      ...pick(pv, ["compiled_truth", "frontmatter"]),
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .from(pv)
    .where(
      and(
        eq(table.pages.slug, slug),
        eq(pv.id, versionId),
        eq(pv.page_id, table.pages.id)
      )
    )
    .limit(1);
}

/**
 * 构建页面 upsert。
 */
export function upsertPage(
  drizzleDb: DrizzleDb,
  slug: string,
  page: PageInput
) {
  return drizzleDb
    .insert(table.pages)
    .values({
      slug,
      type: page.type ?? "concept",
      title: page.title ?? slug,
      frontmatter: page.frontmatter ? JSON.stringify(page.frontmatter) : "{}",
      compiled_truth: page.compiled_truth ?? "",
      timeline: page.timeline ?? "",
      content_hash: page.content_hash,
    })
    .onConflictDoUpdate({
      target: table.pages.slug,
      set: {
        type: page.type ?? "concept",
        title: page.title ?? slug,
        frontmatter: page.frontmatter ? JSON.stringify(page.frontmatter) : "{}",
        compiled_truth: page.compiled_truth ?? "",
        timeline: page.timeline ?? "",
        content_hash: page.content_hash,
        updated_at: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning();
}

/**
 * 构建插入标签（幂等）。
 */
export function insertTag(drizzleDb: DrizzleDb, pageId: number, tag: string) {
  return drizzleDb
    .insert(table.tags)
    .values({ page_id: pageId, tag })
    .onConflictDoNothing();
}

/**
 * 构建删除标签。
 */
export function deleteTag(drizzleDb: DrizzleDb, pageId: number, tag: string) {
  return drizzleDb
    .delete(table.tags)
    .where(and(eq(table.tags.page_id, pageId), eq(table.tags.tag, tag)));
}

/**
 * 构建查询页面基础信息（id/title/type）。
 */
export function getPageBasicBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select(pick(table.pages, ["id", "title", "type"]))
    .from(table.pages)
    .where(eq(table.pages.slug, slug))
    .limit(1);
}

/**
 * 构建删除不在指定索引内的 chunk。
 */
export function deleteContentChunksNotIn(
  drizzleDb: DrizzleDb,
  pageId: number,
  indices: number[]
) {
  return drizzleDb
    .delete(table.content_chunks)
    .where(
      and(
        eq(table.content_chunks.page_id, pageId),
        notInArray(table.content_chunks.chunk_index, indices)
      )
    );
}

/**
 * 构建删除不在指定索引内的 FTS chunk。
 */
export function deleteFtsChunksNotIn(
  drizzleDb: DrizzleDb,
  pageId: number,
  indices: number[]
) {
  return drizzleDb
    .delete(table.chunks_fts)
    .where(
      and(
        eq(table.chunks_fts.page_id, pageId),
        notInArray(table.chunks_fts.chunk_index, indices)
      )
    );
}

/**
 * 构建单个 chunk upsert。
 */
export function upsertContentChunk(
  drizzleDb: DrizzleDb,
  pageId: number,
  chunk: ChunkInput
) {
  return drizzleDb
    .insert(table.content_chunks)
    .values({
      page_id: pageId,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_source: chunk.chunk_source,
      token_count: chunk.token_count ?? 0,
      embedded_at: chunk.embedding ? sql`CURRENT_TIMESTAMP` : null,
    })
    .onConflictDoUpdate({
      target: [table.content_chunks.page_id, table.content_chunks.chunk_index],
      set: {
        chunk_text: chunk.chunk_text,
        chunk_source: chunk.chunk_source,
        token_count: chunk.token_count ?? 0,
        embedded_at: sql`CASE
          WHEN EXCLUDED.chunk_text != ${table.content_chunks.chunk_text} THEN EXCLUDED.embedded_at
          ELSE COALESCE(EXCLUDED.embedded_at, ${table.content_chunks.embedded_at})
        END`,
      },
    });
}

/**
 * 构建按 page_id 删除 FTS 数据。
 */
export function deleteFtsByPageId(drizzleDb: DrizzleDb, pageId: number) {
  return drizzleDb
    .delete(table.chunks_fts)
    .where(eq(table.chunks_fts.page_id, pageId));
}

/**
 * 构建批量插入 FTS 数据。
 */
export function insertFtsChunks(
  drizzleDb: DrizzleDb,
  values: Array<{
    page_id: number;
    chunk_index: number;
    chunk_text: string;
    chunk_source: string;
    token_count: number;
    chunk_text_segmented: string;
  }>
) {
  return drizzleDb.insert(table.chunks_fts).values(values);
}

/**
 * 构建按 page_id 删除所有真实 chunk。
 */
export function deleteContentChunksByPageId(
  drizzleDb: DrizzleDb,
  pageId: number
) {
  return drizzleDb
    .delete(table.content_chunks)
    .where(eq(table.content_chunks.page_id, pageId));
}

/**
 * 构建新增链接。
 */
export function insertLink(
  drizzleDb: DrizzleDb,
  values: {
    from_page_id: number;
    to_page_id: number;
    link_type: string;
    context: string;
  }
) {
  return drizzleDb.insert(table.links).values(values).onConflictDoNothing();
}

/**
 * 构建删除链接。
 */
export function deleteLink(
  drizzleDb: DrizzleDb,
  fromPageId: number,
  toPageId: number
) {
  return drizzleDb
    .delete(table.links)
    .where(
      and(
        eq(table.links.from_page_id, fromPageId),
        eq(table.links.to_page_id, toPageId)
      )
    );
}

/**
 * 构建查询出链。
 */
export function getOutgoingLinksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: table.links.id,
      from_page_id: table.links.from_page_id,
      to_page_id: table.links.to_page_id,
      to_slug: table.pages.slug,
      link_type: table.links.link_type,
      context: table.links.context,
      created_at: table.links.created_at,
    })
    .from(table.links)
    .innerJoin(table.pages, eq(table.links.to_page_id, table.pages.id))
    .where(
      eq(
        table.links.from_page_id,
        drizzleDb
          .select({ id: table.pages.id })
          .from(table.pages)
          .where(eq(table.pages.slug, slug))
          .limit(1)
      )
    );
}

/**
 * 构建查询反向链接。
 */
export function getBacklinksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      from_slug: table.pages.slug,
      to_slug: sql<string>`${slug}`,
      link_type: table.links.link_type,
      context: table.links.context,
    })
    .from(table.links)
    .innerJoin(table.pages, eq(table.pages.id, table.links.from_page_id))
    .where(
      eq(
        table.links.to_page_id,
        sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`
      )
    );
}

/**
 * 构建查询出链（简化字段）。
 */
export function getLinksOutgoingBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      from_slug: sql<string>`${slug}`,
      to_slug: table.pages.slug,
      link_type: table.links.link_type,
      context: table.links.context,
    })
    .from(table.links)
    .innerJoin(table.pages, eq(table.pages.id, table.links.to_page_id))
    .where(
      eq(
        table.links.from_page_id,
        sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`
      )
    );
}

/**
 * 构建新增时间线。
 */
export function insertTimelineEntry(
  drizzleDb: DrizzleDb,
  pageId: number,
  entry: TimelineInput
) {
  return drizzleDb
    .insert(table.timeline_entries)
    .values({
      page_id: pageId,
      date: entry.date,
      source: entry.source ?? "",
      summary: entry.summary,
      detail: entry.detail ?? "",
    })
    .onConflictDoNothing();
}

/**
 * 构建新增时间线并返回 id。
 */
export function insertTimelineEntryReturningId(
  drizzleDb: DrizzleDb,
  pageId: number,
  entry: TimelineInput
) {
  return drizzleDb
    .insert(table.timeline_entries)
    .values({
      page_id: pageId,
      date: entry.date,
      source: entry.source ?? "",
      summary: entry.summary,
      detail: entry.detail ?? "",
    })
    .onConflictDoNothing()
    .returning({ id: table.timeline_entries.id });
}

/**
 * 构建原始数据 upsert。
 */
export function upsertRawData(
  drizzleDb: DrizzleDb,
  pageId: number,
  source: string,
  dataJson: string
) {
  return drizzleDb
    .insert(table.raw_data)
    .values({
      page_id: pageId,
      source,
      data: dataJson,
    })
    .onConflictDoUpdate({
      target: [table.raw_data.page_id, table.raw_data.source],
      set: {
        data: dataJson,
        fetched_at: sql`CURRENT_TIMESTAMP`,
      },
    });
}

/**
 * 构建文件 upsert。
 */
export function upsertFile(
  drizzleDb: DrizzleDb,
  values: {
    page_id: number | null;
    filename: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    content_hash: string;
    metadata: string;
  }
) {
  return drizzleDb
    .insert(table.files)
    .values(values)
    .onConflictDoUpdate({
      target: table.files.storage_path,
      set: {
        page_id: values.page_id,
        filename: values.filename,
        mime_type: values.mime_type,
        size_bytes: values.size_bytes,
        content_hash: values.content_hash,
        metadata: values.metadata,
      },
    });
}

/**
 * 构建按存储路径查询文件。
 */
export function getFileByStoragePath(
  drizzleDb: DrizzleDb,
  storagePath: string
) {
  return drizzleDb
    .select({
      id: table.files.id,
      page_id: table.files.page_id,
      page_slug: table.pages.slug,
      filename: table.files.filename,
      storage_path: table.files.storage_path,
      mime_type: table.files.mime_type,
      size_bytes: table.files.size_bytes,
      content_hash: table.files.content_hash,
      metadata: table.files.metadata,
      created_at: table.files.created_at,
    })
    .from(table.files)
    .leftJoin(table.pages, eq(table.files.page_id, table.pages.id))
    .where(eq(table.files.storage_path, storagePath))
    .limit(1);
}

/**
 * 构建读取配置。
 */
export function getConfigByKey(drizzleDb: DrizzleDb, key: string) {
  return drizzleDb
    .select({ value: table.config.value })
    .from(table.config)
    .where(eq(table.config.key, key))
    .limit(1);
}

/**
 * 构建写入配置。
 */
export function upsertConfig(drizzleDb: DrizzleDb, key: string, value: string) {
  return drizzleDb
    .insert(table.config)
    .values({ key, value })
    .onConflictDoUpdate({
      target: table.config.key,
      set: { value },
    });
}

/**
 * 构建写入导入日志。
 */
export function insertIngestLog(drizzleDb: DrizzleDb, log: IngestLogInput) {
  return drizzleDb.insert(table.ingest_log).values({
    source_type: log.source_type,
    source_ref: log.source_ref,
    pages_updated: JSON.stringify(log.pages_updated),
    summary: log.summary,
  });
}

/**
 * 构建读取导入日志。
 */
export function getIngestLog(drizzleDb: DrizzleDb, limit: number) {
  return drizzleDb
    .select()
    .from(table.ingest_log)
    .orderBy(sql`${table.ingest_log.created_at} DESC`)
    .limit(limit);
}

/**
 * 构建更新页面 slug。
 */
export function updateSlug(
  drizzleDb: DrizzleDb,
  oldSlug: string,
  newSlug: string
) {
  return drizzleDb
    .update(table.pages)
    .set({ slug: newSlug, updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(table.pages.slug, oldSlug));
}

/**
 * 构建校验访问令牌。
 */
export function getValidAccessTokenByHash(
  drizzleDb: DrizzleDb,
  tokenHash: string
) {
  return drizzleDb
    .select()
    .from(table.access_tokens)
    .where(
      and(
        eq(table.access_tokens.token_hash, tokenHash),
        sql`${table.access_tokens.revoked_at} IS NULL`
      )
    )
    .limit(1);
}

/**
 * 构建更新令牌最近使用时间。
 */
export function updateAccessTokenLastUsedAt(drizzleDb: DrizzleDb, id: string) {
  return drizzleDb
    .update(table.access_tokens)
    .set({ last_used_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(table.access_tokens.id, id));
}

/**
 * 构建写入 MCP 请求日志。
 */
export function insertMcpRequestLog(
  drizzleDb: DrizzleDb,
  log: Omit<McpRequestLog, "id" | "created_at">
) {
  return drizzleDb.insert(table.mcp_request_log).values({
    token_name: log.token_name ?? null,
    operation: log.operation,
    latency_ms: log.latency_ms ?? null,
    status: log.status,
  });
}

/**
 * 构建批量标记 chunk 已嵌入。
 */
export function markChunksEmbeddedByIds(
  drizzleDb: DrizzleDb,
  chunkIds: number[]
) {
  return drizzleDb
    .update(table.content_chunks)
    .set({ embedded_at: sql`CURRENT_TIMESTAMP` })
    .where(sql`${table.content_chunks.id} IN (${sql.join(chunkIds, sql`, `)})`);
}

/**
 * 构建查询 stale chunks。
 */
export function getStaleChunks(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      id: table.content_chunks.id,
      slug: table.pages.slug,
      chunk_index: table.content_chunks.chunk_index,
      chunk_text: table.content_chunks.chunk_text,
      chunk_source: table.content_chunks.chunk_source,
    })
    .from(table.content_chunks)
    .innerJoin(table.pages, eq(table.content_chunks.page_id, table.pages.id))
    .where(sql`${table.content_chunks.embedded_at} IS NULL`);
}

/**
 * 构建按 slug 查询 chunks。
 */
export function getChunksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: table.content_chunks.id,
      page_id: table.content_chunks.page_id,
      chunk_index: table.content_chunks.chunk_index,
      chunk_text: table.content_chunks.chunk_text,
      chunk_source: table.content_chunks.chunk_source,
      model: table.content_chunks.model,
      token_count: table.content_chunks.token_count,
      embedded_at: table.content_chunks.embedded_at,
      created_at: table.content_chunks.created_at,
    })
    .from(table.content_chunks)
    .innerJoin(table.pages, eq(table.pages.id, table.content_chunks.page_id))
    .where(eq(table.pages.slug, slug))
    .orderBy(table.content_chunks.chunk_index);
}

export function countPages(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(table.pages);
}

export function countLinks(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(table.links);
}

export function countTimelineEntries(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(table.timeline_entries);
}

export function countTags(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(table.tags);
}

export function countChunksFts(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(table.chunks_fts);
}

export function countDistinctTags(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      count: sql<number>`count(DISTINCT ${table.tags.tag})`.as("count"),
    })
    .from(table.tags)
    .limit(1);
}

export function getPageTypeCounts(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      type: table.pages.type,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(table.pages)
    .groupBy(table.pages.type)
    .orderBy(sql`count DESC`);
}

export function countStalePages(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(table.pages)
    .where(
      and(
        or(ne(table.pages.compiled_truth, ""), ne(table.pages.timeline, "")),
        sql`NOT EXISTS (
          SELECT 1 FROM ${table.content_chunks}
          WHERE ${table.content_chunks.page_id} = ${table.pages.id}
        )`
      )
    )
    .limit(1);
}

export function countOrphanPages(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(table.pages)
    .where(
      and(
        sql`NOT EXISTS (
          SELECT 1 FROM ${table.links}
          WHERE ${table.links.to_page_id} = ${table.pages.id}
        )`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${table.links}
          WHERE ${table.links.from_page_id} = ${table.pages.id}
        )`
      )
    )
    .limit(1);
}

export function countDeadLinks(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(table.links)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM ${table.pages}
        WHERE ${table.pages.id} = ${table.links.to_page_id}
      )`
    )
    .limit(1);
}

export function countPagesWithTimeline(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      count: sql<number>`count(DISTINCT ${table.timeline_entries.page_id})`.as(
        "count"
      ),
    })
    .from(table.timeline_entries)
    .limit(1);
}

export function countEntities(drizzleDb: DrizzleDb) {
  return drizzleDb.$count(
    table.pages,
    inArray(table.pages.type, ["person", "company"] as any)
  );
}

export function countEntitiesWithLinks(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      count: sql<number>`count(DISTINCT ${table.links.to_page_id})`.as("count"),
    })
    .from(table.links)
    .innerJoin(table.pages, eq(table.pages.id, table.links.to_page_id))
    .where(inArray(table.pages.type, ["person", "company"] as any))
    .limit(1);
}

export function countEntitiesWithTimeline(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      count: sql<number>`count(DISTINCT ${table.timeline_entries.page_id})`.as(
        "count"
      ),
    })
    .from(table.timeline_entries)
    .innerJoin(table.pages, eq(table.pages.id, table.timeline_entries.page_id))
    .where(inArray(table.pages.type, ["person", "company"] as any))
    .limit(1);
}

export function getMostConnectedPages(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      slug: table.pages.slug,
      link_count: sql<number>`(
          SELECT count(*) FROM ${table.links}
          WHERE ${table.links.from_page_id} = ${table.pages.id}
             OR ${table.links.to_page_id} = ${table.pages.id}
        )`.as("link_count"),
    })
    .from(table.pages)
    .orderBy(sql`link_count DESC`)
    .limit(5);
}

/**
 * 面向实例的安全 SQL 构建器。
 * 通过构造函数注入 DrizzleDb，避免每次方法调用重复传参。
 */
export class SqlBuilder<TResultKind extends "sync" | "async" = "async"> {
  constructor(private readonly drizzleDb: DrizzleDb<TResultKind>) {}

  listPages(filters: PageFilters) {
    return listPages(this.drizzleDb, filters);
  }
  resolveSlugExact(partial: string) {
    return resolveSlugExact(this.drizzleDb, partial);
  }
  resolveSlugFuzzy(partial: string) {
    return resolveSlugFuzzy(this.drizzleDb, partial);
  }
  getTimeline(slug: string, opts?: TimelineOpts) {
    return getTimeline(this.drizzleDb, slug, opts);
  }
  getRawData(slug: string, source?: string) {
    return getRawData(this.drizzleDb, slug, source);
  }
  searchKeyword(segmentedQuery: string, opts?: SearchOpts) {
    return searchKeyword(this.drizzleDb, segmentedQuery, opts);
  }
  searchVectorRows(slugs: string[], chunkIndexes: number[], opts?: SearchOpts) {
    return searchVectorRows(this.drizzleDb, slugs, chunkIndexes, opts);
  }
  getPageBySlug(slug: string) {
    return getPageBySlug(this.drizzleDb, slug);
  }
  deletePageBySlug(slug: string) {
    return deletePageBySlug(this.drizzleDb, slug);
  }
  getPageIdBySlug(slug: string) {
    return getPageIdBySlug(this.drizzleDb, slug);
  }
  getTagsBySlug(slug: string) {
    return getTagsBySlug(this.drizzleDb, slug);
  }
  getPageForVersionBySlug(slug: string) {
    return getPageForVersionBySlug(this.drizzleDb, slug);
  }
  insertPageVersion(values: {
    page_id: number;
    compiled_truth: string;
    frontmatter: string;
  }) {
    return insertPageVersion(this.drizzleDb, values);
  }
  getVersionsBySlug(slug: string) {
    return getVersionsBySlug(this.drizzleDb, slug);
  }
  revertToVersionBySlug(slug: string, versionId: number) {
    return revertToVersionBySlug(this.drizzleDb, slug, versionId);
  }
  upsertPage(slug: string, page: PageInput) {
    return upsertPage(this.drizzleDb, slug, page);
  }
  insertTag(pageId: number, tag: string) {
    return insertTag(this.drizzleDb, pageId, tag);
  }
  deleteTag(pageId: number, tag: string) {
    return deleteTag(this.drizzleDb, pageId, tag);
  }
  getPageBasicBySlug(slug: string) {
    return getPageBasicBySlug(this.drizzleDb, slug);
  }
  deleteContentChunksNotIn(pageId: number, indices: number[]) {
    return deleteContentChunksNotIn(this.drizzleDb, pageId, indices);
  }
  deleteFtsChunksNotIn(pageId: number, indices: number[]) {
    return deleteFtsChunksNotIn(this.drizzleDb, pageId, indices);
  }
  upsertContentChunk(pageId: number, chunk: ChunkInput) {
    return upsertContentChunk(this.drizzleDb, pageId, chunk);
  }
  deleteFtsByPageId(pageId: number) {
    return deleteFtsByPageId(this.drizzleDb, pageId);
  }
  insertFtsChunks(
    values: Array<{
      page_id: number;
      chunk_index: number;
      chunk_text: string;
      chunk_source: string;
      token_count: number;
      chunk_text_segmented: string;
    }>
  ) {
    return insertFtsChunks(this.drizzleDb, values);
  }
  deleteContentChunksByPageId(pageId: number) {
    return deleteContentChunksByPageId(this.drizzleDb, pageId);
  }
  insertLink(values: {
    from_page_id: number;
    to_page_id: number;
    link_type: string;
    context: string;
  }) {
    return insertLink(this.drizzleDb, values);
  }
  deleteLink(fromPageId: number, toPageId: number) {
    return deleteLink(this.drizzleDb, fromPageId, toPageId);
  }
  getOutgoingLinksBySlug(slug: string) {
    return getOutgoingLinksBySlug(this.drizzleDb, slug);
  }
  getBacklinksBySlug(slug: string) {
    return getBacklinksBySlug(this.drizzleDb, slug);
  }
  getLinksOutgoingBySlug(slug: string) {
    return getLinksOutgoingBySlug(this.drizzleDb, slug);
  }
  insertTimelineEntry(pageId: number, entry: TimelineInput) {
    return insertTimelineEntry(this.drizzleDb, pageId, entry);
  }
  insertTimelineEntryReturningId(pageId: number, entry: TimelineInput) {
    return insertTimelineEntryReturningId(this.drizzleDb, pageId, entry);
  }
  upsertRawData(pageId: number, source: string, dataJson: string) {
    return upsertRawData(this.drizzleDb, pageId, source, dataJson);
  }
  upsertFile(values: {
    page_id: number | null;
    filename: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    content_hash: string;
    metadata: string;
  }) {
    return upsertFile(this.drizzleDb, values);
  }
  getFileByStoragePath(storagePath: string) {
    return getFileByStoragePath(this.drizzleDb, storagePath);
  }
  getConfigByKey(key: string) {
    return getConfigByKey(this.drizzleDb, key);
  }
  upsertConfig(key: string, value: string) {
    return upsertConfig(this.drizzleDb, key, value);
  }
  insertIngestLog(log: IngestLogInput) {
    return insertIngestLog(this.drizzleDb, log);
  }
  getIngestLog(limit: number) {
    return getIngestLog(this.drizzleDb, limit);
  }
  updateSlug(oldSlug: string, newSlug: string) {
    return updateSlug(this.drizzleDb, oldSlug, newSlug);
  }
  getValidAccessTokenByHash(tokenHash: string) {
    return getValidAccessTokenByHash(this.drizzleDb, tokenHash);
  }
  updateAccessTokenLastUsedAt(id: string) {
    return updateAccessTokenLastUsedAt(this.drizzleDb, id);
  }
  insertMcpRequestLog(log: Omit<McpRequestLog, "id" | "created_at">) {
    return insertMcpRequestLog(this.drizzleDb, log);
  }
  markChunksEmbeddedByIds(chunkIds: number[]) {
    return markChunksEmbeddedByIds(this.drizzleDb, chunkIds);
  }
  getStaleChunks() {
    return getStaleChunks(this.drizzleDb);
  }
  getChunksBySlug(slug: string) {
    return getChunksBySlug(this.drizzleDb, slug);
  }

  countContentChunks<Embedded extends boolean>(embedded?: Embedded) {
    return this.drizzleDb.$count(
      table.content_chunks,
      embedded ? isNotNull(table.content_chunks.embedded_at) : undefined
    );
  }

  countPages() {
    return countPages(this.drizzleDb);
  }
  countLinks() {
    return countLinks(this.drizzleDb);
  }
  countTimelineEntries() {
    return countTimelineEntries(this.drizzleDb);
  }
  countTags() {
    return countTags(this.drizzleDb);
  }
  countChunksFts() {
    return countChunksFts(this.drizzleDb);
  }
  countDistinctTags() {
    return countDistinctTags(this.drizzleDb);
  }
  getPageTypeCounts() {
    return getPageTypeCounts(this.drizzleDb);
  }
  countStalePages() {
    return countStalePages(this.drizzleDb);
  }
  countOrphanPages() {
    return countOrphanPages(this.drizzleDb);
  }
  countDeadLinks() {
    return countDeadLinks(this.drizzleDb);
  }
  countPagesWithTimeline() {
    return countPagesWithTimeline(this.drizzleDb);
  }
  countEntities() {
    return countEntities(this.drizzleDb);
  }
  countEntitiesWithLinks() {
    return countEntitiesWithLinks(this.drizzleDb);
  }
  countEntitiesWithTimeline() {
    return countEntitiesWithTimeline(this.drizzleDb);
  }
  getMostConnectedPages() {
    return getMostConnectedPages(this.drizzleDb);
  }
}
