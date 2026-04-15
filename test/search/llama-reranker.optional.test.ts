import { describe, expect, test } from "bun:test";
import { LlamaReranker } from "../../src/search/llama-reranker.js";

const modelPath = process.env.GBRAIN_LLAMA_RERANK_MODEL_PATH;

describe("LlamaReranker", () => {
  const it = modelPath ? test : test.skip;

  it("reranks documents without dropping any", async () => {
    const reranker = new LlamaReranker({ modelPath: modelPath! });
    const query = "pizza";
    const documents = [
      "Drinking water is important for staying hydrated.",
      "I love eating pizza with extra cheese.",
      "Mount Everest is the tallest mountain in the world.",
    ];

    const ranked = await reranker.rerank(query, documents);
    expect(ranked).toHaveLength(documents.length);
    expect(new Set(ranked)).toEqual(new Set(documents));
  });
});
