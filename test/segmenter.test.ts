import { describe, expect, test } from "bun:test";
import {
  countWords,
  extractWordsForSearch,
  getSegments,
} from "../src/segmenter.js";

describe("Segmenter Utilities", () => {
  test("countWords accurately counts multi-language words", () => {
    // English: 2 words
    expect(countWords("Hello world!")).toBe(2);

    // Chinese: 5 words
    expect(countWords("这是一个中文测试。")).toBe(5);

    // Japanese: 6 words (これ / は / 日本語 / の / テスト / です)
    expect(countWords("これは日本語のテストです。")).toBe(6);

    // Korean: 4 words
    expect(countWords("이것は 한국어 테스트입니다.")).toBe(4);

    // Russian: 3 words
    expect(countWords("Это русский текст.")).toBe(3);

    // Mixed: 5 words (This / is / a / 中文 / 测试) - Note: 123 might not be counted as a word by all locales
    expect(countWords("This is a 中文 测试 123.")).toBeGreaterThanOrEqual(5);

    // Empty
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("... !!! ???")).toBe(0);
  });

  test("extractWordsForSearch produces space-separated words", () => {
    // Basic extraction
    expect(extractWordsForSearch("Hello world!")).toBe("Hello world");
    expect(extractWordsForSearch("这是一个中文测试。")).toBe(
      "这 是 一个 中文 测试"
    );
    expect(extractWordsForSearch("これは日本語のテストです。")).toBe(
      "これ は 日本語 の テスト です"
    );

    // It should ignore punctuation
    expect(extractWordsForSearch("Hello, world. Is this a test?")).toBe(
      "Hello world Is this a test"
    );
    expect(extractWordsForSearch("“测试”——成功！")).toBe("测试 成功");
  });

  test("getSegments returns all segments including punctuation", () => {
    const segments = getSegments("Hello!");
    expect(segments.length).toBe(2); // "Hello", "!"

    expect(segments[0].segment).toBe("Hello");
    expect(segments[0].isWordLike).toBe(true);

    expect(segments[1].segment).toBe("!");
    expect(segments[1].isWordLike).toBe(false);
  });
});
