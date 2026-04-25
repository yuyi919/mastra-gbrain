import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { StoreError } from "../../../BrainStoreError.js";
import { GraphNode } from "../../../effect-schema.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import {
  GraphBacklinkCountsService,
  GraphLinks,
  type GraphLinksService,
} from "./interface.js";

export interface GraphLinksDependencies {
  mappers: SqlBuilder;
}

export const makeGraphLinks = (
  deps: GraphLinksDependencies
): GraphLinksService => {
  const { mappers } = deps;
  const catchStoreError = StoreError.catch;
  return {
    addLink: Eff.fn("graph.links.addLink")(function* (
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
    addLinksBatch: Eff.fn("graph.links.addLinksBatch")(function* (links) {
      return links.length;
    }, catchStoreError),
    removeLink: Eff.fn("graph.links.removeLink")(function* (
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
    getLinks: Eff.fn("graph.links.getLinks")(function* (slug: string) {
      const outgoing = yield* mappers.getLinksOutgoingBySlug(slug);
      const incomingRows = yield* mappers.getBacklinksBySlug(slug);
      const incoming = incomingRows.map((row) => ({
        from_slug: row.from_slug,
        to_slug: row.to_slug,
        link_type: row.link_type || "",
        context: row.context || "",
      }));
      return [
        ...outgoing.map((row) => ({
          from_slug: row.from_slug,
          to_slug: row.to_slug,
          link_type: row.link_type || "",
          context: row.context || "",
        })),
        ...incoming,
      ];
    }, catchStoreError),
    getBacklinks: Eff.fn("graph.links.getBacklinks")(function* (slug: string) {
      const rows = yield* mappers.getBacklinksBySlug(slug);
      return rows.map((row) => ({
        from_slug: row.from_slug,
        to_slug: row.to_slug,
        link_type: row.link_type || "",
        context: row.context || "",
      }));
    }, catchStoreError),
    rewriteLinks: Eff.fn("graph.links.rewriteLinks")(function* (
      _oldSlug: string,
      _newSlug: string
    ) {}, catchStoreError),
    traverseGraph: Eff.fn("graph.links.traverseGraph")(function* (
      slug: string,
      depth = 5
    ) {
      const rows = yield* mappers.unsafe.traverseGraph(slug, depth).asEffect();
      return yield* Eff.all(rows.map(GraphNode.decode));
    }, catchStoreError),
    traversePaths: Eff.fn("graph.links.traversePaths")(function* () {
      return [];
    }, catchStoreError),
    getBacklinkCounts: Eff.fn("graph.links.getBacklinkCounts")(function* (
      slugs: string[]
    ) {
      const result = new Map<string, number>();
      if (slugs.length === 0) return result;
      for (const slug of slugs) result.set(slug, 0);
      const rows = yield* mappers.getBacklinkCounts(slugs);
      for (const row of rows) {
        result.set(row.slug, row.cnt);
      }
      return result;
    }, catchStoreError),
  };
};

export const makeLayer = (
  service: GraphLinksService | GraphLinksDependencies
) =>
  Layer.merge(
    Layer.succeed(
      GraphLinks,
      "mappers" in service ? makeGraphLinks(service) : service
    ),
    Layer.succeed(GraphBacklinkCountsService, {
      getBacklinkCounts: ("mappers" in service
        ? makeGraphLinks(service)
        : service
      ).getBacklinkCounts,
    })
  );
