import { Effect } from "effect";
import { createIngestionWorkflow } from "../ingest/workflow.js";
import { BrainStoreProvider } from "../store/index.js";

export const Ingest = BrainStoreProvider.use(({ store, embedder }) => {
  return Effect.gen(function* () {
    return createIngestionWorkflow({
      store,
      embedder,
    });
  });
});
