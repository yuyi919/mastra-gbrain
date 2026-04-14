import type { SearchResult } from '../types.ts';
import { rrfFusion } from './rrf.ts';
import type { StoreProvider } from '../store/interface.ts';

export interface SearchOpts {
  limit?: number;
  offset?: number;
}

export interface HybridSearchOpts extends SearchOpts {
  embed?: (text: string) => Promise<number[]>;
  queryVariants?: string[];
  rrfK?: number;
  keyFn?: (r: SearchResult) => string;
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
  const keywordResults = await backend.searchKeyword(query, { ...opts, limit: innerLimit });
  if (!opts?.embed && !queryVector) {
    return dedupResults(keywordResults).slice(offset, offset + limit);
  }
  const queries = (opts?.queryVariants && opts.queryVariants.length > 0) ? opts.queryVariants : [query];
  let vectorLists: SearchResult[][] = [];
  try {
    if (queryVector) {
      vectorLists = [await backend.searchVector(queryVector, { ...opts, limit: innerLimit })];
    } else if (opts?.embed) {
      const embeddings = await Promise.all(queries.map(q => opts!.embed!(q)));
      vectorLists = await Promise.all(embeddings.map(e => backend.searchVector(e, { ...opts, limit: innerLimit })));
    }
  } catch {
    vectorLists = [];
  }
  if (vectorLists.length === 0) {
    return dedupResults(keywordResults).slice(offset, offset + limit);
  }
  const fused = rrfFusion([...vectorLists, keywordResults], { k: opts?.rrfK, keyFn: opts?.keyFn });
  return dedupResults(fused).slice(offset, offset + limit);
}

export function dedupResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = `${r.slug}:${r.chunk_text.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

