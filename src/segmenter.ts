// A global instance of Intl.Segmenter for multi-language word segmentation.
// Using 'undefined' allows it to fall back to the system locale while
// still performing robust word boundary detection globally.
const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

/**
 * Segments a given text into an array of SegmentData objects.
 */
export function getSegments(text: string): Intl.SegmentData[] {
  if (!text) return [];
  return Array.from(segmenter.segment(text));
}

/**
 * Counts the number of word-like segments in a given text.
 * This correctly counts words across multi-lingual texts, 
 * treating CJK characters and words properly unlike simple whitespace splitting.
 */
export function countWords(text: string): number {
  let count = 0;
  for (const s of segmenter.segment(text)) {
    if (s.isWordLike) count++;
  }
  return count;
}

/**
 * Extracts only the word-like segments from a text and joins them with spaces.
 * This is particularly useful for full-text search indexing (like SQLite FTS5) 
 * where implicit boundaries (like in CJK languages) need to be made explicit with spaces.
 */
export function extractWordsForSearch(text: string): string {
  if (!text) return '';
  return Array.from(segmenter.segment(text))
    .filter(s => s.isWordLike)
    .map(s => s.segment)
    .join(' ');
}
