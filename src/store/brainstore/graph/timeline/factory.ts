import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer } from "@yuyi919/tslibs-effect/effect-next";
import { StoreError } from "../../../BrainStoreError.js";
import { Mappers } from "../../../Mappers.js";
import type { SqlBuilder } from "../../../SqlBuilder.js";
import {
  GraphTimeline,
  type GraphTimelineService,
  type TimelineBatchInput,
} from "./interface.js";

export interface GraphTimelineDependencies {
  mappers: SqlBuilder;
}

export const makeGraphTimeline = (
  deps: GraphTimelineDependencies
): GraphTimelineService => {
  const { mappers } = deps;
  const catchStoreError = StoreError.catch;
  return {
    addTimelineEntry: Eff.fn("graph.timeline.addTimelineEntry")(function* (
      slug,
      entry,
      opts
    ) {
      const result = yield* mappers.getPageIdBySlug(slug);
      const pageResult = Array.isArray(result) ? result[0] : result;
      if (!pageResult) {
        if (opts?.skipExistenceCheck) return;
        throw new Error(`addTimelineEntry failed: page "${slug}" not found`);
      }
      yield* mappers.insertTimelineEntry(pageResult.id, entry);
    }, catchStoreError),
    addTimelineEntriesBatch: Eff.fn("graph.timeline.addTimelineEntriesBatch")(
      function* (entries: TimelineBatchInput[]) {
        if (entries.length === 0) return 0;
        let count = 0;
        for (const entry of entries) {
          const result = yield* mappers.getPageIdBySlug(entry.slug);
          const pageResult = Array.isArray(result) ? result[0] : result;
          if (!pageResult) continue;
          const inserted = yield* mappers.insertTimelineEntryReturningId(
            pageResult.id,
            entry
          );
          if (inserted.length > 0) count++;
        }
        return count;
      },
      catchStoreError
    ),
    getTimeline: Eff.fn("graph.timeline.getTimeline")(function* (slug, opts) {
      const result = yield* mappers.getTimeline(slug, opts);
      return result.map((row) => ({
        ...row,
        created_at: new Date(row.created_at),
      }));
    }, catchStoreError),
  };
};

export const makeLayer = (
  service?: GraphTimelineService | GraphTimelineDependencies
) => {
  if (service) {
    return Layer.succeed(
      GraphTimeline,
      "mappers" in service ? makeGraphTimeline(service) : service
    );
  }
  return Layer.effect(
    GraphTimeline,
    Eff.gen(function* () {
      const mappers = yield* Mappers;
      return makeGraphTimeline({ mappers });
    })
  );
};
