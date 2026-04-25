import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { ContentChunksService } from "../content/chunks/index.js";
import type { ContentPagesService } from "../content/pages/index.js";
import type { GraphLinksService } from "../graph/links/index.js";
import type { GraphTimelineService } from "../graph/timeline/index.js";
import type { OpsInternalService } from "../ops/internal/index.js";
import type { OpsLifecycleService } from "../ops/lifecycle/index.js";
import type { RetrievalEmbeddingService } from "../retrieval/embedding/index.js";
import type { RetrievalSearchService } from "../retrieval/search/index.js";

export interface BrainStoreTreeService {
  content: {
    pages: ContentPagesService;
    chunks: ContentChunksService;
  };
  graph: {
    links: GraphLinksService;
    timeline: GraphTimelineService;
  };
  retrieval: {
    search: RetrievalSearchService;
    embedding: RetrievalEmbeddingService;
  };
  ops: {
    lifecycle: OpsLifecycleService;
    internal: OpsInternalService;
  };
}

export class BrainStoreTree extends Context.Service<
  BrainStoreTree,
  BrainStoreTreeService
>()("@yui-agent/brain-mastra/BrainStoreTree") {}
