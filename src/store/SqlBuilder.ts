import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { pick } from "effect/Struct";
import type { PageFilters, SearchOpts, TimelineOpts } from "../types.js";
import {
  chunks_fts,
  content_chunks,
  pages,
  raw_data,
  tags,
  timeline_entries,
} from "./schema.js";

function castArray<A>(a: A | A[]) {
  return Array.isArray(a) ? a : [a];
}

/**
 * @internal
 * @returns
 */
export function listPages(
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
  partial: string
) {
  return drizzleDb
    .select({ slug: pages.slug })
    .from(pages)
    .where(
      sql`${pages.title} LIKE ${"%" + partial + "%"} OR ${pages.slug} LIKE ${"%" + partial + "%"}`
    )
    .limit(5);
}

/**
 * 构建时间线查询。
 */
export function getTimeline(
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
  drizzleDb: BaseSQLiteDatabase<any, unknown, any, any>,
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
