import { countWords, getSegments } from "../segmenter.js";

const DELIMITERS: string[][] = [
  ["\n\n"],
  ["\n"],
  [
    ". ",
    "! ",
    "? ",
    ".\n",
    "!\n",
    "?\n",
    "。",
    "！",
    "？",
    "．",
    "！",
    "？",
    "۔",
    "؟",
    "॥",
    "!",
    "?",
    ".",
  ], // added full-width forms, Arabic, Hindi
  ["; ", ": ", ", ", "；", "：", "，", "、", "،", "；", ":", ";", ","],
  [],
];

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(text: string, opts?: ChunkOptions): TextChunk[] {
  // const breakPoints = scanBreakPoints(text);
  // const codeFences = findCodeFences(text)
  // return chunkDocumentWithBreakPoints(text,breakPoints, codeFences).map((chunk, index) => ({ text: chunk.text, index: index }))

  const chunkSize = opts?.chunkSize || 300;
  const chunkOverlap = opts?.chunkOverlap || 50;
  if (!text || text.trim().length === 0) return [];
  const wordCount = countWords(text);
  if (wordCount <= chunkSize) {
    return [{ text: text.trim(), index: 0 }];
  }
  const pieces = recursiveSplit(text, 0, chunkSize);
  const merged = greedyMerge(pieces, chunkSize);
  const withOverlap = applyOverlap(merged, chunkOverlap);
  return withOverlap.map((t, i) => ({ text: t.trim(), index: i }));
}

function recursiveSplit(text: string, level: number, target: number): string[] {
  if (level >= DELIMITERS.length) {
    return splitOnWhitespace(text, target);
  }
  const delimiters = DELIMITERS[level];
  if (delimiters.length === 0) {
    return splitOnWhitespace(text, target);
  }
  const pieces = splitAtDelimiters(text, delimiters);
  if (pieces.length <= 1) {
    return recursiveSplit(text, level + 1, target);
  }
  const result: string[] = [];
  for (const piece of pieces) {
    if (countWords(piece) > target) {
      result.push(...recursiveSplit(piece, level + 1, target));
    } else {
      result.push(piece);
    }
  }
  return result;
}

function splitAtDelimiters(text: string, delimiters: string[]): string[] {
  const pieces: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let earliest = -1;
    let earliestDelim = "";
    for (const delim of delimiters) {
      const idx = remaining.indexOf(delim);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestDelim = delim;
      }
    }
    if (earliest === -1) {
      pieces.push(remaining);
      break;
    }
    const piece = remaining.slice(0, earliest + earliestDelim.length);
    if (piece.trim().length > 0) {
      pieces.push(piece);
    }
    remaining = remaining.slice(earliest + earliestDelim.length);
  }
  return pieces.filter((p) => p.trim().length > 0);
}

function splitOnWhitespace(text: string, target: number): string[] {
  const segments = getSegments(text);
  if (segments.length === 0) return [];
  const pieces: string[] = [];
  let currentPiece = "";
  let currentWords = 0;
  for (const s of segments) {
    currentPiece += s.segment;
    if (s.isWordLike) currentWords++;
    if (currentWords >= target) {
      pieces.push(currentPiece);
      currentPiece = "";
      currentWords = 0;
    }
  }
  if (currentPiece.trim().length > 0) {
    pieces.push(currentPiece);
  }
  return pieces;
}

function greedyMerge(pieces: string[], target: number): string[] {
  if (pieces.length === 0) return [];
  const result: string[] = [];
  let current = pieces[0];
  for (let i = 1; i < pieces.length; i++) {
    const combined = current + pieces[i];
    if (countWords(combined) <= Math.ceil(target * 1.5)) {
      current = combined;
    } else {
      result.push(current);
      current = pieces[i];
    }
  }
  if (current.trim().length > 0) {
    result.push(current);
  }
  return result;
}

function applyOverlap(chunks: string[], overlapWords: number): string[] {
  if (chunks.length <= 1 || overlapWords <= 0) return chunks;
  const result: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const prevTrailing = extractTrailingContext(chunks[i - 1], overlapWords);
    result.push(prevTrailing + chunks[i]);
  }
  return result;
}

function extractTrailingContext(text: string, targetWords: number): string {
  const segments = getSegments(text);
  let wordsSeen = 0;
  let startIndex = segments.length - 1;
  for (; startIndex >= 0; startIndex--) {
    if (segments[startIndex].isWordLike) wordsSeen++;
    if (wordsSeen >= targetWords) break;
  }
  if (startIndex < 0) startIndex = 0;

  const trailing = segments
    .slice(startIndex)
    .map((s) => s.segment)
    .join("");
  const boundaryMatch = trailing.match(/[.!?]\s+|[。！？]/);
  if (
    boundaryMatch &&
    boundaryMatch.index !== undefined &&
    boundaryMatch.index < trailing.length / 2
  ) {
    const afterBoundary = trailing.slice(
      boundaryMatch.index + boundaryMatch[0].length
    );
    if (afterBoundary.trim().length > 0) {
      return afterBoundary;
    }
  }
  return trailing;
}
