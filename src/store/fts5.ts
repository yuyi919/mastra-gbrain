// =============================================================================
// FTS Search
// =============================================================================

export function sanitizeFTS5Term(term: string): string {
  return term.replace(/[^\p{L}\p{N}'_]/gu, "").toLowerCase();
}

/**
 * Check if a token is a hyphenated compound word (e.g., multi-agent, DEC-0054, gpt-4).
 * Returns true if the token contains internal hyphens between word/digit characters.
 */
function isHyphenatedToken(token: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{N}'-]*-[\p{L}\p{N}][\p{L}\p{N}'-]*$/u.test(
    token
  );
}

/**
 * Sanitize a hyphenated term into an FTS5 phrase by splitting on hyphens
 * and sanitizing each part. Returns the parts joined by spaces for use
 * inside FTS5 quotes: "multi agent" matches "multi-agent" in porter tokenizer.
 */
function sanitizeHyphenatedTerm(term: string): string {
  return term
    .split("-")
    .map((t) => sanitizeFTS5Term(t))
    .filter((t) => t)
    .join(" ");
}
/**
 * Parse lex query syntax into FTS5 query.
 *
 * Supports:
 * - Quoted phrases: "exact phrase" → "exact phrase" (exact match)
 * - Negation: -term or -"phrase" → uses FTS5 NOT operator
 * - Hyphenated tokens: multi-agent, DEC-0054, gpt-4 → treated as phrases
 * - Plain terms: term → "term"* (prefix match)
 *
 * FTS5 NOT is a binary operator: `term1 NOT term2` means "match term1 but not term2".
 * So `-term` only works when there are also positive terms.
 *
 * Hyphen disambiguation: `-sports` at a word boundary is negation, but `multi-agent`
 * (where `-` is between word characters) is treated as a hyphenated phrase.
 * When a leading `-` is followed by what looks like a hyphenated compound word
 * (e.g., `-multi-agent`), the entire token is treated as a negated phrase.
 *
 * Examples:
 *   performance -sports     → "performance"* NOT "sports"*
 *   "machine learning"      → "machine learning"
 *   multi-agent memory      → "multi agent" AND "memory"*
 *   DEC-0054               → "dec 0054"
 *   -multi-agent            → NOT "multi agent"
 */
export function buildFTS5Query(query: string): string | null {
  const positive: string[] = [];
  const negative: string[] = [];

  let i = 0;
  const s = query.trim();

  while (i < s.length) {
    // Skip whitespace
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (i >= s.length) break;

    // Check for negation prefix
    const negated = s[i] === "-";
    if (negated) i++;

    // Check for quoted phrase
    if (s[i] === '"') {
      const start = i + 1;
      i++;
      while (i < s.length && s[i] !== '"') i++;
      const phrase = s.slice(start, i).trim();
      i++; // skip closing quote
      if (phrase.length > 0) {
        const sanitized = phrase
          .split(/\s+/)
          .map((t) => sanitizeFTS5Term(t))
          .filter((t) => t)
          .join(" ");
        if (sanitized) {
          const ftsPhrase = `"${sanitized}"`; // Exact phrase, no prefix match
          if (negated) {
            negative.push(ftsPhrase);
          } else {
            positive.push(ftsPhrase);
          }
        }
      }
    } else {
      // Plain term (until whitespace or quote)
      const start = i;
      while (i < s.length && !/[\s"]/.test(s[i]!)) i++;
      const term = s.slice(start, i);

      // Handle hyphenated tokens: multi-agent, DEC-0054, gpt-4
      // These get split into phrase queries so FTS5 porter tokenizer matches them.
      if (isHyphenatedToken(term)) {
        const sanitized = sanitizeHyphenatedTerm(term);
        if (sanitized) {
          const ftsPhrase = `"${sanitized}"`; // Phrase match (no prefix)
          if (negated) {
            negative.push(ftsPhrase);
          } else {
            positive.push(ftsPhrase);
          }
        }
      } else {
        const sanitized = sanitizeFTS5Term(term);
        if (sanitized) {
          const ftsTerm = `"${sanitized}"*`; // Prefix match
          if (negated) {
            negative.push(ftsTerm);
          } else {
            positive.push(ftsTerm);
          }
        }
      }
    }
  }

  if (positive.length === 0 && negative.length === 0) return null;

  // If only negative terms, we can't search (FTS5 NOT is binary)
  if (positive.length === 0) return null;

  // Join positive terms with AND
  let result = positive.join(" AND ");

  // Add NOT clause for negative terms
  for (const neg of negative) {
    result = `${result} NOT ${neg}`;
  }

  return result;
}
