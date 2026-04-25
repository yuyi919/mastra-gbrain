import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { GraphNode, GraphPath, Link } from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface GraphBacklinkCounts {
  getBacklinkCounts(slugs: string[]): EngineEffect<Map<string, number>>;
}

export interface GraphLinksService extends GraphBacklinkCounts {
  addLink(
    fromSlug: string,
    toSlug: string,
    linkType?: string,
    context?: string
  ): EngineEffect<void>;
  addLinksBatch?(links: Link[]): EngineEffect<number>;
  removeLink(fromSlug: string, toSlug: string): EngineEffect<void>;
  getLinks(slug: string): EngineEffect<Link[]>;
  getBacklinks(slug: string): EngineEffect<Link[]>;
  rewriteLinks(oldSlug: string, newSlug: string): EngineEffect<void>;
  traverseGraph(slug: string, depth?: number): EngineEffect<GraphNode[]>;
  traversePaths?(
    slug: string,
    opts?: {
      depth?: number;
      linkType?: string;
      direction?: "in" | "out" | "both";
    }
  ): EngineEffect<GraphPath[]>;
}

export class GraphBacklinkCountsService extends Context.Service<
  GraphBacklinkCountsService,
  GraphBacklinkCounts
>()("@yui-agent/brain-mastra/BrainStoreTree/graph/links/backlink-counts") {}

export class GraphLinks extends Context.Service<
  GraphLinks,
  GraphLinksService
>()("@yui-agent/brain-mastra/BrainStoreTree/graph/links") {}
