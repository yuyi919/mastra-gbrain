import type { EmbeddingProvider } from "./interface.js";

export class DummyEmbeddingProvider implements EmbeddingProvider {
  public readonly dimension: number;

  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }

  async embedQuery(text: string): Promise<number[]> {
    // Return a mock vector
    return new Array(this.dimension).fill(0).map(() => Math.random());
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Return mock vectors for each text
    return texts.map(() =>
      new Array(this.dimension).fill(0).map(() => Math.random())
    );
  }
}
