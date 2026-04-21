import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { pick } from "effect/Struct";
import type { PageFilters } from "../types.js";
import { pages, tags } from "./schema.js";

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
