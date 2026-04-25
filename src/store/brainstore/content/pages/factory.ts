import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer, pipe } from "@yuyi919/tslibs-effect/effect-next";
import { SqlClient, type SqlError } from "effect/unstable/sql";
import { StoreError } from "../../../BrainStoreError.js";
import { Page, PageVersion } from "../../../effect-schema.js";
import { Mappers } from "../../../Mappers.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import { ContentPages, type ContentPagesService } from "./interface.js";

export interface ContentPagesTransactionRunner {
  withTransaction<A, E = never, R = never>(
    effect: Eff.Effect<A, E, R>
  ): Eff.Effect<A, E | SqlError.SqlError, R>;
}

export interface ContentPagesVectorPort {
  deleteVectorsBySlug(slug: string): Eff.Effect<void, StoreError>;
}

export interface ContentPagesDependencies {
  mappers: SqlBuilder;
  sql: ContentPagesTransactionRunner;
  vectors?: ContentPagesVectorPort;
}

export interface ContentPagesLayerOptions {
  vectors?: ContentPagesVectorPort;
}

export const makeContentPages = (
  deps: ContentPagesDependencies
): ContentPagesService => {
  const { mappers, sql, vectors } = deps;
  const catchStoreError = StoreError.catch;
  const pages: ContentPagesService = {
    listPages: Eff.fn("content.pages.listPages")(function* (filters = {}) {
      return yield* pipe(
        mappers.listPages(filters).asEffect(),
        Eff.flatMap((rows) => Eff.all(rows.map(Page.decode)))
      );
    }, catchStoreError),
    getPage: Eff.fn("content.pages.getPage")(function* (slug: string) {
      const result = yield* mappers.getPageBySlug(slug);
      if (!result) return null;
      return yield* Page.decode(result);
    }, catchStoreError),
    updateSlug: Eff.fn("content.pages.updateSlug")(function* (
      oldSlug: string,
      newSlug: string
    ) {
      yield* mappers.updateSlug(oldSlug, newSlug);
    }, catchStoreError),
    resolveSlugs: Eff.fn("content.pages.resolveSlugs")(function* (
      partial: string
    ) {
      const exact = yield* mappers.resolveSlugExact(partial);
      if (exact) return [exact.slug];
      const fuzzy = yield* mappers.resolveSlugFuzzy(partial);
      return fuzzy.map((row) => row.slug);
    }, catchStoreError),
    getTags: Eff.fn("content.pages.getTags")(function* (slug: string) {
      const result = yield* mappers.getTagsBySlug(slug);
      return result.map((row) => row.tag);
    }, catchStoreError),
    createVersion: Eff.fn("content.pages.createVersion")(function* (
      slug: string
    ) {
      const pageResult = yield* mappers.getPageForVersionBySlug(slug);
      if (!pageResult) {
        throw new Error(`Page ${slug} not found`);
      }
      const result = yield* mappers.insertPageVersion({
        page_id: pageResult.id,
        compiled_truth: pageResult.compiled_truth || "",
        frontmatter: pageResult.frontmatter || "{}",
      });
      return PageVersion.decode(result[0]);
    }, catchStoreError),
    getVersions: Eff.fn("content.pages.getVersions")(function* (slug: string) {
      const rows = yield* mappers.getVersionsBySlug(slug);
      return yield* Eff.all(rows.map(PageVersion.decode));
    }, catchStoreError),
    revertToVersion: Eff.fn("content.pages.revertToVersion")(function* (
      slug: string,
      versionId: number
    ) {
      return yield* sql.withTransaction(
        Eff.gen(function* () {
          const versions = yield* mappers.getVersionsBySlug(slug);
          const targetVersion = versions.find(
            (entry) => entry.id === versionId
          );
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
    putPage: Eff.fn("content.pages.putPage")(function* (slug, page) {
      return yield* sql.withTransaction(
        Eff.gen(function* () {
          const record = yield* mappers.upsertPage(slug, page);
          yield* pages.createVersion(slug).pipe(Eff.asVoid);
          return Page.decode(record[0]);
        })
      );
    }, catchStoreError),
    deletePage: Eff.fn("content.pages.deletePage")(function* (slug: string) {
      yield* mappers.deletePageBySlug(slug).asEffect();
      if (vectors) {
        yield* vectors.deleteVectorsBySlug(slug);
      }
    }, catchStoreError),
    addTag: Eff.fn("content.pages.addTag")(function* (
      slug: string,
      tag: string
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.insertTag(pageResult.id, tag);
    }, catchStoreError),
    removeTag: Eff.fn("content.pages.removeTag")(function* (
      slug: string,
      tag: string
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) return;
      yield* mappers.deleteTag(pageResult.id, tag);
    }, catchStoreError),
  };

  return pages;
};

function isDependencies(
  service: ContentPagesService | ContentPagesDependencies | ContentPagesLayerOptions
): service is ContentPagesDependencies {
  return "mappers" in service && "sql" in service;
}

function isService(
  service: ContentPagesService | ContentPagesDependencies | ContentPagesLayerOptions
): service is ContentPagesService {
  return "getPage" in service;
}

export const makeLayer = (
  service: ContentPagesService | ContentPagesDependencies | ContentPagesLayerOptions
) => {
  if (isService(service)) {
    return Layer.succeed(ContentPages, service);
  }
  if (isDependencies(service)) {
    return Layer.succeed(ContentPages, makeContentPages(service));
  }
  return Layer.effect(
    ContentPages,
    Eff.gen(function* () {
      const mappers = yield* Mappers;
      const sql = yield* SqlClient.SqlClient;
      return makeContentPages({
        mappers,
        sql,
        vectors: service.vectors,
      });
    })
  );
};
