import type { EmbeddingProvider } from './interface.ts';
import { getLlama } from 'node-llama-cpp';

type Lang = 'en' | 'zh';

export interface LlamaEmbeddingProviderOptions {
  modelPathEn?: string;
  modelPathZh?: string;
  defaultLang?: Lang;
  onModelUsed?: (lang: Lang, text: string) => void;
}

export class LlamaEmbeddingProvider implements EmbeddingProvider {
  public readonly dimension: number;

  private modelPathEn?: string;
  private modelPathZh?: string;
  private defaultLang: Lang;
  private onModelUsed?: (lang: Lang, text: string) => void;

  private llamaPromise: Promise<Awaited<ReturnType<typeof getLlama>>> | null = null;
  private embeddingContexts = new Map<Lang, Promise<any>>();

  constructor(options: LlamaEmbeddingProviderOptions) {
    this.modelPathEn = options.modelPathEn;
    this.modelPathZh = options.modelPathZh;
    this.defaultLang = options.defaultLang ?? 'en';
    this.onModelUsed = options.onModelUsed;
    this.dimension = 768;
  }

  private detectLang(text: string): Lang {
    if (this.modelPathEn && !this.modelPathZh) return 'en';
    if (this.modelPathZh && !this.modelPathEn) return 'zh';
    if (/[\p{Script=Han}]/u.test(text)) return 'zh';
    return 'en';
  }

  private getModelPath(lang: Lang): string {
    if (lang === 'zh') {
      if (!this.modelPathZh) {
        if (this.modelPathEn) return this.modelPathEn;
        throw new Error('Missing modelPathZh');
      }
      return this.modelPathZh;
    }

    if (!this.modelPathEn) {
      if (this.modelPathZh) return this.modelPathZh;
      throw new Error('Missing modelPathEn');
    }
    return this.modelPathEn;
  }

  private async getEmbeddingContext(lang: Lang) {
    const existing = this.embeddingContexts.get(lang);
    if (existing) return existing;

    const promise = (async () => {
      if (!this.llamaPromise) {
        this.llamaPromise = getLlama();
      }
      const llama = await this.llamaPromise;
      const model = await llama.loadModel({ modelPath: this.getModelPath(lang) });
      return model.createEmbeddingContext();
    })();

    this.embeddingContexts.set(lang, promise);
    return promise;
  }

  async embedQuery(text: string): Promise<number[]> {
    const lang = this.detectLang(text) ?? this.defaultLang;
    this.onModelUsed?.(lang, text);
    const ctx = await this.getEmbeddingContext(lang);
    const embedding = await ctx.getEmbeddingFor(text);
    return Array.from(embedding.vector as ArrayLike<number>);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const byLang = new Map<Lang, { index: number; text: string }[]>();
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!;
      const lang = this.detectLang(text) ?? this.defaultLang;
      this.onModelUsed?.(lang, text);
      const list = byLang.get(lang) ?? [];
      list.push({ index: i, text });
      byLang.set(lang, list);
    }

    const out: number[][] = new Array(texts.length);
    for (const [lang, items] of byLang) {
      const ctx = await this.getEmbeddingContext(lang);
      for (const item of items) {
        const embedding = await ctx.getEmbeddingFor(item.text);
        out[item.index] = Array.from(embedding.vector as ArrayLike<number>);
      }
    }

    return out;
  }
}

