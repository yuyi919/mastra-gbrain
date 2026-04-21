import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
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
import {
  access_tokens,
  chunks_fts,
  config,
  content_chunks,
  files,
  ingest_log,
  links,
  mcp_request_log,
  page_versions,
  pages,
  raw_data,
  tags,
  timeline_entries,
} from "./schema.js";

function castArray<A>(a: A | A[]) {
  return Array.isArray(a) ? a : [a];
}

type DrizzleDb = BaseSQLiteDatabase<any, unknown, any, any>;

/**
 * @internal
 * @returns
 */
export function listPages(
  drizzleDb: DrizzleDb,
  filters: PageFilters
) {
  const queryFields = pick(pages, [
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
  let query = drizzleDb.select(queryFields).from(pages).$dynamic();

  const conditions = [
    filters.type ? eq(pages.type, filters.type as any) : undefined,
    filters.updated_after
      ? gte(pages.updated_at, filters.updated_after)
      : undefined,
  ];

  if (filters.tag || filters.tags) {
    query = drizzleDb
      .select(queryFields)
      .from(pages)
      .innerJoin(tags, eq(pages.id, tags.page_id))
      .$dynamic();

    conditions.push(
      inArray(tags.tag, castArray(filters.tags ? filters.tags : filters.tag!))
    );
  }

  query = query
    .where(and(...conditions))
    .orderBy(desc(pages.updated_at))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
  return query;
}

/**
 * 构建按 slug 精确匹配的页面查询。
 */
export function resolveSlugExact(
  drizzleDb: DrizzleDb,
  partial: string
) {
  return drizzleDb
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.slug, partial))
    .limit(1);
}

/**
 * 构建按 title/slug 模糊匹配的页面查询。
 */
export function resolveSlugFuzzy(
  drizzleDb: DrizzleDb,
  partial: string
) {
  return drizzleDb
    .select({ slug: pages.slug })
    .from(pages)
    .where(
      or(like(pages.title, `%${partial}%`), like(pages.slug, `%${partial}%`))
    )
    .limit(5);
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
      id: timeline_entries.id,
      page_id: timeline_entries.page_id,
      slug: pages.slug,
      date: timeline_entries.date,
      source: timeline_entries.source,
      summary: timeline_entries.summary,
      detail: timeline_entries.detail,
      created_at: timeline_entries.created_at,
    })
    .from(timeline_entries)
    .innerJoin(pages, eq(timeline_entries.page_id, pages.id))
    .$dynamic();

  const conditions = [eq(pages.slug, slug)];
  if (opts?.after) {
    conditions.push(gte(timeline_entries.date, opts.after));
  }
  if (opts?.before) {
    conditions.push(lte(timeline_entries.date, opts.before));
  }

  query = query
    .where(and(...conditions))
    .orderBy(
      opts?.asc ? asc(timeline_entries.date) : desc(timeline_entries.date)
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
      id: raw_data.id,
      page_id: raw_data.page_id,
      slug: pages.slug,
      source: raw_data.source,
      data: raw_data.data,
      fetched_at: raw_data.fetched_at,
    })
    .from(raw_data)
    .innerJoin(pages, eq(raw_data.page_id, pages.id))
    .$dynamic();

  const conditions = [eq(pages.slug, slug)];
  if (source) {
    conditions.push(eq(raw_data.source, source));
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
      page_id: chunks_fts.page_id,
      chunk_index: chunks_fts.chunk_index,
      score: sql<number>`bm25(${chunks_fts})`.as("score"),
    })
    .from(chunks_fts)
    .where(sql`${chunks_fts} MATCH ${segmentedQuery}`)
    .orderBy(sql`score ASC`)
    .limit(10000)
    .as("r");

  const conditions = [];
  if (opts?.type) {
    conditions.push(eq(pages.type, opts.type));
  }
  if (opts?.detail === "low") {
    conditions.push(eq(content_chunks.chunk_source, "compiled_truth"));
  }
  if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
    conditions.push(notInArray(pages.slug, opts.exclude_slugs));
  }
  
  const mainQuery = drizzleDb
    .select({
      page_id: pages.id,
      title: pages.title,
      type: pages.type,
      slug: pages.slug,
      chunk_id: content_chunks.id,
      chunk_index: content_chunks.chunk_index,
      chunk_text: content_chunks.chunk_text,
      chunk_source: content_chunks.chunk_source,
      token_count: content_chunks.token_count,
      score: ftsQuery.score,
      stale:
        sql<boolean>`(${content_chunks.embedded_at} IS NULL OR ${pages.updated_at} > ${content_chunks.embedded_at})`.as(
          "stale"
        ),
    })
    .from(ftsQuery)
    .innerJoin(
      content_chunks,
      and(
        eq(content_chunks.page_id, ftsQuery.page_id),
        eq(content_chunks.chunk_index, ftsQuery.chunk_index)
      )
    )
    .innerJoin(pages, eq(pages.id, content_chunks.page_id))
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
    inArray(pages.slug, slugs),
    inArray(content_chunks.chunk_index, chunkIndexes),
  ];

  if (opts?.type) {
    conditions.push(eq(pages.type, opts.type));
  }
  if (opts?.detail === "low") {
    conditions.push(eq(content_chunks.chunk_source, "compiled_truth"));
  }
  if (opts?.exclude_slugs && opts.exclude_slugs.length > 0) {
    conditions.push(notInArray(pages.slug, opts.exclude_slugs));
  }

  return drizzleDb
    .select({
      page_id: pages.id,
      title: pages.title,
      type: pages.type,
      slug: pages.slug,
      chunk_id: content_chunks.id,
      chunk_index: content_chunks.chunk_index,
      chunk_text: content_chunks.chunk_text,
      chunk_source: content_chunks.chunk_source,
      token_count: content_chunks.token_count,
      stale:
        sql<boolean>`(${content_chunks.embedded_at} IS NULL OR ${pages.updated_at} > ${content_chunks.embedded_at})`.as(
          "stale"
        ),
    })
    .from(content_chunks)
    .innerJoin(pages, eq(pages.id, content_chunks.page_id))
    .where(and(...conditions));
}

/**
 * 构建按 slug 查询页面详情。
 */
export function getPageBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb.select().from(pages).where(eq(pages.slug, slug)).limit(1);
}

/**
 * 构建按 slug 删除页面。
 */
export function deletePageBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb.delete(pages).where(eq(pages.slug, slug));
}

/**
 * 构建按 slug 查询页面 id。
 */
export function getPageIdBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1);
}

/**
 * 构建按 slug 查询标签。
 */
export function getTagsBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({ tag: tags.tag })
    .from(tags)
    .innerJoin(pages, eq(tags.page_id, pages.id))
    .where(eq(pages.slug, slug));
}

/**
 * 构建版本快照所需页面字段查询。
 */
export function getPageForVersionBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: pages.id,
      compiled_truth: pages.compiled_truth,
      frontmatter: pages.frontmatter,
    })
    .from(pages)
    .where(eq(pages.slug, slug))
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
  return drizzleDb.insert(page_versions).values(values).returning();
}

/**
 * 构建按 slug 查询所有版本。
 */
export function getVersionsBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      ...pick(page_versions, [
        "id",
        "page_id",
        "compiled_truth",
        "frontmatter",
        "snapshot_at",
      ]),
      slug: pages.slug,
    })
    .from(page_versions)
    .innerJoin(pages, eq(page_versions.page_id, pages.id))
    .where(eq(pages.slug, slug))
    .orderBy(sql`${page_versions.snapshot_at} DESC`);
}

/**
 * 构建按版本回滚页面内容。
 */
export function revertToVersionBySlug(
  drizzleDb: DrizzleDb,
  slug: string,
  versionId: number
) {
  const pv = alias(page_versions, "pv");
  return drizzleDb
    .update(pages)
    .set({
      ...pick(pv, ["compiled_truth", "frontmatter"]),
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .from(pv)
    .where(and(eq(pages.slug, slug), eq(pv.id, versionId), eq(pv.page_id, pages.id)))
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
    .insert(pages)
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
      target: pages.slug,
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
    .insert(tags)
    .values({ page_id: pageId, tag })
    .onConflictDoNothing();
}

/**
 * 构建删除标签。
 */
export function deleteTag(drizzleDb: DrizzleDb, pageId: number, tag: string) {
  return drizzleDb
    .delete(tags)
    .where(and(eq(tags.page_id, pageId), eq(tags.tag, tag)));
}

/**
 * 构建查询页面基础信息（id/title/type）。
 */
export function getPageBasicBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select(pick(pages, ["id", "title", "type"]))
    .from(pages)
    .where(eq(pages.slug, slug))
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
    .delete(content_chunks)
    .where(
      and(
        eq(content_chunks.page_id, pageId),
        notInArray(content_chunks.chunk_index, indices)
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
    .delete(chunks_fts)
    .where(
      and(eq(chunks_fts.page_id, pageId), notInArray(chunks_fts.chunk_index, indices))
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
    .insert(content_chunks)
    .values({
      page_id: pageId,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_source: chunk.chunk_source,
      token_count: chunk.token_count ?? 0,
      embedded_at: chunk.embedding ? sql`CURRENT_TIMESTAMP` : null,
    })
    .onConflictDoUpdate({
      target: [content_chunks.page_id, content_chunks.chunk_index],
      set: {
        chunk_text: chunk.chunk_text,
        chunk_source: chunk.chunk_source,
        token_count: chunk.token_count ?? 0,
        embedded_at: sql`CASE
          WHEN EXCLUDED.chunk_text != ${content_chunks.chunk_text} THEN EXCLUDED.embedded_at
          ELSE COALESCE(EXCLUDED.embedded_at, ${content_chunks.embedded_at})
        END`,
      },
    });
}

/**
 * 构建按 page_id 删除 FTS 数据。
 */
export function deleteFtsByPageId(drizzleDb: DrizzleDb, pageId: number) {
  return drizzleDb.delete(chunks_fts).where(eq(chunks_fts.page_id, pageId));
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
  return drizzleDb.insert(chunks_fts).values(values);
}

/**
 * 构建按 page_id 删除所有真实 chunk。
 */
export function deleteContentChunksByPageId(drizzleDb: DrizzleDb, pageId: number) {
  return drizzleDb
    .delete(content_chunks)
    .where(eq(content_chunks.page_id, pageId));
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
  return drizzleDb.insert(links).values(values).onConflictDoNothing();
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
    .delete(links)
    .where(and(eq(links.from_page_id, fromPageId), eq(links.to_page_id, toPageId)));
}

/**
 * 构建查询出链。
 */
export function getOutgoingLinksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: links.id,
      from_page_id: links.from_page_id,
      to_page_id: links.to_page_id,
      to_slug: pages.slug,
      link_type: links.link_type,
      context: links.context,
      created_at: links.created_at,
    })
    .from(links)
    .innerJoin(pages, eq(links.to_page_id, pages.id))
    .where(
      eq(
        links.from_page_id,
        drizzleDb.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1)
      )
    );
}

/**
 * 构建查询反向链接。
 */
export function getBacklinksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      from_slug: pages.slug,
      to_slug: sql<string>`${slug}`,
      link_type: links.link_type,
      context: links.context,
    })
    .from(links)
    .innerJoin(pages, eq(pages.id, links.from_page_id))
    .where(eq(links.to_page_id, sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`));
}

/**
 * 构建查询出链（简化字段）。
 */
export function getLinksOutgoingBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      from_slug: sql<string>`${slug}`,
      to_slug: pages.slug,
      link_type: links.link_type,
      context: links.context,
    })
    .from(links)
    .innerJoin(pages, eq(pages.id, links.to_page_id))
    .where(
      eq(links.from_page_id, sql`(SELECT id FROM pages WHERE slug = ${slug} LIMIT 1)`)
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
    .insert(timeline_entries)
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
    .insert(timeline_entries)
    .values({
      page_id: pageId,
      date: entry.date,
      source: entry.source ?? "",
      summary: entry.summary,
      detail: entry.detail ?? "",
    })
    .onConflictDoNothing()
    .returning({ id: timeline_entries.id });
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
    .insert(raw_data)
    .values({
      page_id: pageId,
      source,
      data: dataJson,
    })
    .onConflictDoUpdate({
      target: [raw_data.page_id, raw_data.source],
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
    .insert(files)
    .values(values)
    .onConflictDoUpdate({
      target: files.storage_path,
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
export function getFileByStoragePath(drizzleDb: DrizzleDb, storagePath: string) {
  return drizzleDb
    .select({
      id: files.id,
      page_id: files.page_id,
      page_slug: pages.slug,
      filename: files.filename,
      storage_path: files.storage_path,
      mime_type: files.mime_type,
      size_bytes: files.size_bytes,
      content_hash: files.content_hash,
      metadata: files.metadata,
      created_at: files.created_at,
    })
    .from(files)
    .leftJoin(pages, eq(files.page_id, pages.id))
    .where(eq(files.storage_path, storagePath))
    .limit(1);
}

/**
 * 构建读取配置。
 */
export function getConfigByKey(drizzleDb: DrizzleDb, key: string) {
  return drizzleDb
    .select({ value: config.value })
    .from(config)
    .where(eq(config.key, key))
    .limit(1);
}

/**
 * 构建写入配置。
 */
export function upsertConfig(drizzleDb: DrizzleDb, key: string, value: string) {
  return drizzleDb
    .insert(config)
    .values({ key, value })
    .onConflictDoUpdate({
      target: config.key,
      set: { value },
    });
}

/**
 * 构建写入导入日志。
 */
export function insertIngestLog(drizzleDb: DrizzleDb, log: IngestLogInput) {
  return drizzleDb.insert(ingest_log).values({
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
    .from(ingest_log)
    .orderBy(sql`${ingest_log.created_at} DESC`)
    .limit(limit);
}

/**
 * 构建更新页面 slug。
 */
export function updateSlug(drizzleDb: DrizzleDb, oldSlug: string, newSlug: string) {
  return drizzleDb
    .update(pages)
    .set({ slug: newSlug, updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(pages.slug, oldSlug));
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
    .from(access_tokens)
    .where(
      and(eq(access_tokens.token_hash, tokenHash), sql`${access_tokens.revoked_at} IS NULL`)
    )
    .limit(1);
}

/**
 * 构建更新令牌最近使用时间。
 */
export function updateAccessTokenLastUsedAt(drizzleDb: DrizzleDb, id: string) {
  return drizzleDb
    .update(access_tokens)
    .set({ last_used_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(access_tokens.id, id));
}

/**
 * 构建写入 MCP 请求日志。
 */
export function insertMcpRequestLog(
  drizzleDb: DrizzleDb,
  log: Omit<McpRequestLog, "id" | "created_at">
) {
  return drizzleDb.insert(mcp_request_log).values({
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
    .update(content_chunks)
    .set({ embedded_at: sql`CURRENT_TIMESTAMP` })
    .where(sql`${content_chunks.id} IN (${sql.join(chunkIds, sql`, `)})`);
}

/**
 * 构建查询 stale chunks。
 */
export function getStaleChunks(drizzleDb: DrizzleDb) {
  return drizzleDb
    .select({
      id: content_chunks.id,
      slug: pages.slug,
      chunk_index: content_chunks.chunk_index,
      chunk_text: content_chunks.chunk_text,
      chunk_source: content_chunks.chunk_source,
    })
    .from(content_chunks)
    .innerJoin(pages, eq(content_chunks.page_id, pages.id))
    .where(sql`${content_chunks.embedded_at} IS NULL`);
}

/**
 * 构建按 slug 查询 chunks。
 */
export function getChunksBySlug(drizzleDb: DrizzleDb, slug: string) {
  return drizzleDb
    .select({
      id: content_chunks.id,
      page_id: content_chunks.page_id,
      chunk_index: content_chunks.chunk_index,
      chunk_text: content_chunks.chunk_text,
      chunk_source: content_chunks.chunk_source,
      model: content_chunks.model,
      token_count: content_chunks.token_count,
      embedded_at: content_chunks.embedded_at,
      created_at: content_chunks.created_at,
    })
    .from(content_chunks)
    .innerJoin(pages, eq(pages.id, content_chunks.page_id))
    .where(eq(pages.slug, slug))
    .orderBy(content_chunks.chunk_index);
}
