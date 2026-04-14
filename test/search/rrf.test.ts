import { describe, test, expect } from 'bun:test';
import { rrfFusion } from '../../src/search/rrf.ts';

describe('rrfFusion', () => {
  test('merges ranked lists and assigns scores', () => {
    const listA = [
      { slug: 'a', chunk_text: 'x', score: 10 },
      { slug: 'b', chunk_text: 'y', score: 9 },
    ];
    const listB = [
      { slug: 'b', chunk_text: 'y', score: 100 },
      { slug: 'c', chunk_text: 'z', score: 99 },
    ];
    const fused = rrfFusion([listA, listB], { k: 60 });
    expect(fused.map(r => r.slug)).toEqual(['b', 'a', 'c']);
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });
});

