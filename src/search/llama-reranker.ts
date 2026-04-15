import { getLlama } from "node-llama-cpp";

export interface LlamaRerankerOptions {
  modelPath: string;
}

export class LlamaReranker {
  private modelPath: string;
  private llamaPromise: Promise<Awaited<ReturnType<typeof getLlama>>> | null =
    null;
  private rankingContextPromise: Promise<any> | null = null;

  constructor(options: LlamaRerankerOptions) {
    this.modelPath = options.modelPath;
  }

  private async getRankingContext() {
    if (!this.rankingContextPromise) {
      this.rankingContextPromise = (async () => {
        if (!this.llamaPromise) {
          this.llamaPromise = getLlama();
        }
        const llama = await this.llamaPromise;
        const model = await llama.loadModel({ modelPath: this.modelPath });
        return model.createRankingContext();
      })();
    }
    return this.rankingContextPromise;
  }

  async rerank(query: string, documents: string[]): Promise<string[]> {
    const ctx = await this.getRankingContext();
    const ranked = await ctx.rankAndSort(query, documents);
    return ranked.map((r: any) => r.document as string);
  }
}
