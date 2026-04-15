import { Mastra } from "@mastra/core/mastra";
import { createGBrainAgent } from "./agent/index.js";
import { createDefaultEmbedder, createDefaultStore } from "./store/index.js";

const store = createDefaultStore();
const defaultEmbedder = createDefaultEmbedder();

// Initialize the store schema
await store.init();

export const gbrainAgent = createGBrainAgent(store, defaultEmbedder);

export const mastra = new Mastra({
  agents: { gbrainAgent },
});
