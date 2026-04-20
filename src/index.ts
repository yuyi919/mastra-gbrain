import { Mastra } from "@mastra/core/mastra";
import { createGBrainAgent } from "./agent/index.js";
import { createDefaultEmbedder, createDefaultStore } from "./store/index.js";

const defaultEmbedder = await createDefaultEmbedder();
const store = createDefaultStore({
  url: "file::memory:",
  dimension: defaultEmbedder.dimension,
});

// Initialize the store schema
await store.init();

export const gbrainAgent = createGBrainAgent(store, defaultEmbedder);

export const mastra = new Mastra({
  agents: { gbrainAgent },
});
