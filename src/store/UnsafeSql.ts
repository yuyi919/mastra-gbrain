import { sql } from "drizzle-orm";
import type { DrizzleDb } from "./SqlBuilder.js";

import * as Client from "effect/unstable/sql/SqlClient";
import { Context, Effect } from "effect";

/**
 * 封装对 bun:sqlite 原生 Database 的不安全访问。
 */
export class UnsafeSql<TResultKind extends "sync" | "async" = "async"> {
  constructor(private readonly db: DrizzleDb<TResultKind>) {}

  queryVectorStoreByIds(ids: number[]) {
    return this.db.all<any>(
      sql`SELECT id, vector FROM vector_store WHERE id IN (${ids.join(",")})`
    );
  }

  traverseGraph(slug: string, depth: number) {
    const self = this;
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
        ) as links
      FROM graph g
      ORDER BY g.depth, g.slug
    `;
    return {
      asEffect: () => Effect.gen(function* () {
        const rows = yield* Effect.promise(() => self.db.all<any>(sqlQuery));
        // Map arrays to objects
        return rows.map((row: any) => {
          if (Array.isArray(row)) {
            return {
              slug: row[0],
              title: row[1],
              type: row[2],
              depth: row[3],
              links: row[4],
            };
          }
          return row;
        });
      })
    };
  }

  checkFtsIntegrity() {
    return this.db.run(
      sql`INSERT INTO chunks_fts(chunks_fts) VALUES('integrity-check')`
    );
  }
}
