import { sql } from "drizzle-orm";
import type { DrizzleDb } from "./SqlBuilder.js";

/**
 * 封装对 bun:sqlite 原生 Database 的不安全访问。
 */
export class UnsafeSql {
  constructor(private readonly db: DrizzleDb<"sync">) {}

  queryVectorStoreByIds(ids: number[]) {
    return this.db.all<any>(
      sql`SELECT id, vector FROM vector_store WHERE id IN (${ids.join(",")})`
    );
  }

  traverseGraph(slug: string, depth: number) {
    const sqlQuery = sql`
      WITH RECURSIVE graph AS (
        SELECT p.id, p.slug, p.title, p.type, 0 as depth
        FROM pages p WHERE p.slug = ${slug}
        
        UNION
        
        SELECT p2.id, p2.slug, p2.title, p2.type, g.depth + 1
        FROM graph g
        JOIN links l ON l.from_page_id = g.id
        JOIN pages p2 ON p2.id = l.to_page_id
        WHERE g.depth < ${depth}
      )
      SELECT DISTINCT g.slug, g.title, g.type, g.depth,
        (
          SELECT json_group_array(json_object('to_slug', p3.slug, 'link_type', l2.link_type))
          FROM links l2
          JOIN pages p3 ON p3.id = l2.to_page_id
          WHERE l2.from_page_id = g.id
        ) as links_json
      FROM graph g
      ORDER BY g.depth, g.slug
    `;
    return this.db.all<any>(sqlQuery);
  }

  checkFtsIntegrity() {
    this.db.run(
      sql`INSERT INTO chunks_fts(chunks_fts) VALUES('integrity-check')`
    );
  }
}
