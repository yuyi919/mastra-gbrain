import { BrainStore, type EngineEffect } from "../store/BrainStore.js";
import type { StoreError } from "../store/BrainStoreError.js";
import type { StoreProvider } from "../store/interface.js";
import type { SearchOpts, SearchResult } from "../types.js";
import { rrfFusion } from "./rrf.js";
import * as Effect from "@yuyi919/tslibs-effect/effect-next";

export interface HybridSearchOpts extends SearchOpts {
  embed?: (text: string) => Promise<number[]>;
  queryVariants?: string[];
  rrfK?: number;
  keyFn?: (r: SearchResult) => string;
  cosineThreshold?: number;
  maxTypeRatio?: number;
  maxPerPage?: number;
}

const COSINE_DEDUP_THRESHOLD = 0.85;
const MAX_TYPE_RATIO = 0.6;
const MAX_PER_PAGE = 3; // Keep 2-3 chunks per page

export function hybridSearchEffect(
  query: string,
  opts?: HybridSearchOpts,
  queryVector?: number[]
): Effect.Effect<SearchResult[], StoreError, BrainStore> {
  return Effect.gen(function* () {
    const backend = yield* BrainStore;
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const innerLimit = Math.min(limit * 2, 200);

    const keywordResults = yield* backend.searchKeyword(query, {
      ...opts,
      limit: innerLimit,
    });

    if (!opts?.embed && !queryVector) {
      return dedupResults(keywordResults, opts).slice(offset, offset + limit);
    }

    const queries =
      opts?.queryVariants && opts.queryVariants.length > 0
        ? opts.queryVariants
        : [query];
    let vectorLists: SearchResult[][] = [];
    try {
      if (queryVector) {
        vectorLists = [
          yield* backend.searchVector(queryVector, { ...opts, limit: innerLimit }),
        ];
      } else if (opts?.embed) {
        const embeddings = yield* Effect.promise(() => Promise.all(queries.map((q) => opts!.embed!(q))));
        vectorLists = yield* Effect.all(
          embeddings.map((e) =>
            backend.searchVector(e, { ...opts, limit: innerLimit })
          )
        );
      }
    } catch {
      vectorLists = [];
    }

    if (vectorLists.length === 0) {
      return dedupResults(keywordResults, opts).slice(offset, offset + limit);
    }

    const fused = rrfFusion([...vectorLists, keywordResults], {
      k: opts?.rrfK,
      keyFn: opts?.keyFn,
    });

    return dedupResults(fused, opts).slice(offset, offset + limit);
  });
}

export async function hybridSearch(
  backend: StoreProvider,
  query: string,
  opts?: HybridSearchOpts,
  queryVector?: number[]
): Promise<SearchResult[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const innerLimit = Math.min(limit * 2, 200);

  // Keyword search retrieves more chunks to allow deduplication (if dedupe=true)
  const keywordResults = await backend.searchKeyword(query, {
    ...opts,
    limit: innerLimit,
  });

  if (!opts?.embed && !queryVector) {
    return dedupResults(keywordResults, opts).slice(offset, offset + limit);
  }

  const queries =
    opts?.queryVariants && opts.queryVariants.length > 0
      ? opts.queryVariants
      : [query];
  let vectorLists: SearchResult[][] = [];
  try {
    if (queryVector) {
      vectorLists = [
        await backend.searchVector(queryVector, { ...opts, limit: innerLimit }),
      ];
    } else if (opts?.embed) {
      const embeddings = await Promise.all(queries.map((q) => opts!.embed!(q)));
      vectorLists = await Promise.all(
        embeddings.map((e) =>
          backend.searchVector(e, { ...opts, limit: innerLimit })
        )
      );
    }
  } catch {
    vectorLists = [];
  }

  if (vectorLists.length === 0) {
    return dedupResults(keywordResults, opts).slice(offset, offset + limit);
  }

  // rrfFusion expects array of lists and scores them based on their rank in each list
  const fused = rrfFusion([...vectorLists, keywordResults], {
    k: opts?.rrfK,
    keyFn: opts?.keyFn,
  });

  // The fused list is sorted best-to-worst (descending score). We pass it through deduplication.
  return dedupResults(fused, opts).slice(offset, offset + limit);
}

export function dedupResults(
  results: SearchResult[],
  opts?: {
    cosineThreshold?: number;
    maxTypeRatio?: number;
    maxPerPage?: number;
  }
): SearchResult[] {
  const threshold = opts?.cosineThreshold ?? COSINE_DEDUP_THRESHOLD;
  const maxRatio = opts?.maxTypeRatio ?? MAX_TYPE_RATIO;
  const maxPerPage = opts?.maxPerPage ?? MAX_PER_PAGE;

  const preDedup = results;
  let deduped: SearchResult[] = [];

  // 1. dedupBySource (Keep top N per page based on current sorting order)
  const byPageCount = new Map<string, number>();
  for (const r of results) {
    const count = byPageCount.get(r.slug) || 0;
    if (count < 3) {
      deduped.push(r);
      byPageCount.set(r.slug, count + 1);
    }
  }

  // 2. dedupByTextSimilarity (Jaccard)
  const keptSim: SearchResult[] = [];
  for (const r of deduped) {
    const rWords = new Set(r.chunk_text.toLowerCase().split(/\s+/));
    let tooSimilar = false;
    for (const k of keptSim) {
      const kWords = new Set(k.chunk_text.toLowerCase().split(/\s+/));
      let intersectionSize = 0;
      for (const w of rWords) {
        if (kWords.has(w)) intersectionSize++;
      }
      const unionSize = rWords.size + kWords.size - intersectionSize;
      const jaccard = intersectionSize / unionSize;

      if (jaccard > threshold) {
        tooSimilar = true;
        break;
      }
    }
    if (!tooSimilar) {
      keptSim.push(r);
    }
  }
  deduped = keptSim;

  // 3. enforceTypeDiversity
  const maxPerType = Math.max(1, Math.ceil(deduped.length * maxRatio));
  const typeCounts = new Map<string, number>();
  const keptType: SearchResult[] = [];
  for (const r of deduped) {
    const count = typeCounts.get(r.type) || 0;
    if (count < maxPerType) {
      keptType.push(r);
      typeCounts.set(r.type, count + 1);
    }
  }
  deduped = keptType;

  // 4. capPerPage
  const pageCounts = new Map<string, number>();
  const keptCap: SearchResult[] = [];
  for (const r of deduped) {
    const count = pageCounts.get(r.slug) || 0;
    if (count < maxPerPage) {
      keptCap.push(r);
      pageCounts.set(r.slug, count + 1);
    }
  }
  deduped = keptCap;

  // 5. guaranteeCompiledTruth
  const finalByPage = new Map<string, SearchResult[]>();
  for (const r of deduped) {
    const existing = finalByPage.get(r.slug) || [];
    existing.push(r);
    finalByPage.set(r.slug, existing);
  }

  const output = [...deduped];

  for (const [slug, pageChunks] of finalByPage) {
    const hasCompiledTruth = pageChunks.some(
      (c) => c.chunk_source === "compiled_truth"
    );
    if (hasCompiledTruth) continue;

    const candidate = preDedup.find(
      (r) => r.slug === slug && r.chunk_source === "compiled_truth"
    );
    if (!candidate) continue;

    // Find the worst chunk in the current output for this slug
    // Since output preserves the original sorted order (best to worst),
    // the last occurrence for this slug is the worst.
    let lowestIdx = -1;
    for (let i = 0; i < output.length; i++) {
      if (output[i].slug === slug) {
        lowestIdx = i;
      }
    }

    if (lowestIdx !== -1) {
      output[lowestIdx] = candidate;
    }
  }

  return output;
}
