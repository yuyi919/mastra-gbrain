import type { Database } from "bun:sqlite";
import type { BrainHealth, BrainStats } from "../types.js";

/**
 * 封装对 bun:sqlite 原生 Database 的不安全访问。
 */
export class UnsafeSql {
  constructor(private readonly db: Database) {}

  exec(sqlText: string) {
    return this.db.run(sqlText);
  }

  queryVectorStoreByIds(ids: number[]) {
    return this.db
      .query(
        `SELECT id, vector FROM vector_store WHERE id IN (${ids.map((id) => `?`).join(",")})`
      )
      .all(...ids) as any[];
  }

  traverseGraph(slug: string, depth: number) {
    const sqlQuery = `
      WITH RECURSIVE graph AS (
        SELECT p.id, p.slug, p.title, p.type, 0 as depth
        FROM pages p WHERE p.slug = ?
        
        UNION
        
        SELECT p2.id, p2.slug, p2.title, p2.type, g.depth + 1
        FROM graph g
        JOIN links l ON l.from_page_id = g.id
        JOIN pages p2 ON p2.id = l.to_page_id
        WHERE g.depth < ?
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
    return this.db.query(sqlQuery).all(slug, depth) as any[];
  }

  getStats(): BrainStats {
    const pageCount = this.db
      .query("SELECT count(*) as count FROM pages")
      .get() as { count: number };
    const chunkCount = this.db
      .query("SELECT count(*) as count FROM content_chunks")
      .get() as { count: number };
    const embeddedCount = this.db
      .query(
        "SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL"
      )
      .get() as { count: number };
    const linkCount = this.db
      .query("SELECT count(*) as count FROM links")
      .get() as { count: number };
    const tagCount = this.db
      .query("SELECT count(DISTINCT tag) as count FROM tags")
      .get() as { count: number };
    const timelineEntryCount = this.db
      .query("SELECT count(*) as count FROM timeline_entries")
      .get() as { count: number };

    const types = this.db
      .query(
        "SELECT type, count(*) as count FROM pages GROUP BY type ORDER BY count DESC"
      )
      .all() as { type: string; count: number }[];
    const pages_by_type: Record<string, number> = {};
    for (const t of types) {
      pages_by_type[t.type] = t.count;
    }

    return {
      page_count: pageCount.count,
      chunk_count: chunkCount.count,
      embedded_count: embeddedCount.count,
      link_count: linkCount.count,
      tag_count: tagCount.count,
      timeline_entry_count: timelineEntryCount.count,
      pages_by_type,
    };
  }

  getHealth(): BrainHealth {
    const pageCount = (
      this.db.query("SELECT count(*) as count FROM pages").get() as {
        count: number;
      }
    ).count;
    const chunkCount = (
      this.db.query("SELECT count(*) as count FROM content_chunks").get() as {
        count: number;
      }
    ).count;
    const embeddedCount = (
      this.db
        .query(
          "SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL"
        )
        .get() as { count: number }
    ).count;
    const stalePages = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM pages p
      WHERE (p.compiled_truth != '' OR p.timeline != '')
        AND NOT EXISTS (SELECT 1 FROM content_chunks cc WHERE cc.page_id = p.id)
    `
        )
        .get() as { count: number }
    ).count;
    const orphanPages = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM pages p
      WHERE NOT EXISTS (SELECT 1 FROM links l WHERE l.to_page_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM links l WHERE l.from_page_id = p.id)
    `
        )
        .get() as { count: number }
    ).count;
    const deadLinks = (
      this.db
        .query(
          `
      SELECT count(*) as count FROM links l
      WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = l.to_page_id)
    `
        )
        .get() as { count: number }
    ).count;
    const missingEmbeddings = chunkCount - embeddedCount;
    const linkCount = (
      this.db.query("SELECT count(*) as count FROM links").get() as {
        count: number;
      }
    ).count;
    const pagesWithTimeline = (
      this.db
        .query("SELECT count(DISTINCT page_id) as count FROM timeline_entries")
        .get() as { count: number }
    ).count;
    const entityCount = (
      this.db
        .query(
          "SELECT count(*) as count FROM pages WHERE type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;
    const entityWithLinks = (
      this.db
        .query(
          "SELECT count(DISTINCT to_page_id) as count FROM links l JOIN pages p ON p.id = l.to_page_id WHERE p.type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;
    const entityWithTimeline = (
      this.db
        .query(
          "SELECT count(DISTINCT page_id) as count FROM timeline_entries t JOIN pages p ON p.id = t.page_id WHERE p.type IN ('person', 'company')"
        )
        .get() as { count: number }
    ).count;

    const embedCoverage = chunkCount > 0 ? embeddedCount / chunkCount : 1;
    const linkDensity = pageCount > 0 ? Math.min(linkCount / pageCount, 1) : 0;
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

    const mostConnectedRows = this.db
      .query(
        `
      SELECT p.slug, 
             (SELECT count(*) FROM links WHERE from_page_id = p.id OR to_page_id = p.id) as link_count
      FROM pages p
      ORDER BY link_count DESC
      LIMIT 5
    `
      )
      .all() as { slug: string; link_count: number }[];

    return {
      page_count: pageCount,
      embed_coverage: embedCoverage,
      stale_pages: stalePages,
      orphan_pages: orphanPages,
      missing_embeddings: missingEmbeddings,
      brain_score: brainScore,
      link_coverage: entityCount > 0 ? entityWithLinks / entityCount : 1,
      timeline_coverage: entityCount > 0 ? entityWithTimeline / entityCount : 1,
      most_connected: mostConnectedRows,
    };
  }

  checkConnection() {
    const dbTest = this.db.query("SELECT 1 as result").get() as
      | { result: number }
      | undefined;
    return !!dbTest && dbTest.result === 1;
  }

  getTableRowCount(table: string) {
    const res = this.db
      .query(`SELECT count(*) as count FROM ${table}`)
      .get() as { count: number };
    return res?.count ?? 0;
  }

  checkFtsIntegrity() {
    this.db
      .query(`INSERT INTO chunks_fts(chunks_fts) VALUES('integrity-check')`)
      .run();
  }

  getVectorCoverage() {
    const total = (
      this.db.query(`SELECT count(*) as count FROM content_chunks`).get() as {
        count: number;
      }
    )?.count;
    const embedded = (
      this.db
        .query(
          `SELECT count(*) as count FROM content_chunks WHERE embedded_at IS NOT NULL`
        )
        .get() as { count: number }
    )?.count;
    return { total: total || 0, embedded: embedded || 0 };
  }
}
