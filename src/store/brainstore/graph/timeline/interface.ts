import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type {
  TimelineEntry,
  TimelineInput,
  TimelineOpts,
} from "../../../../types.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface GraphTimelineService {
  addTimelineEntry(
    slug: string,
    entry: TimelineInput,
    opts?: { skipExistenceCheck?: boolean }
  ): EngineEffect<void>;
  addTimelineEntriesBatch(
    entries: Array<{
      slug: string;
      date: string;
      source?: string;
      summary: string;
      detail?: string;
    }>
  ): EngineEffect<number>;
  getTimeline(slug: string, opts?: TimelineOpts): EngineEffect<TimelineEntry[]>;
}

export class GraphTimeline extends Context.Service<
  GraphTimeline,
  GraphTimelineService
>()("@yui-agent/brain-mastra/BrainStoreTree/graph/timeline") {}
