import { LibSQLStore } from './libsql.ts';
import { DummyEmbeddingProvider } from './dummy-embedder.ts';

// Default global factory functions
export function createDefaultStore() {
  return new LibSQLStore({ url: 'file::memory:', dimension: 1536 });
}

export function createDefaultEmbedder() {
  return new DummyEmbeddingProvider(1536);
}
