import { describe, expect, test } from "bun:test";
import { slugifyPath, slugifySegment } from "../src/slug.js";

describe("slug utility", () => {
  test("slugifySegment handles basic english text", () => {
    expect(slugifySegment("Hello World")).toBe("hello-world");
    expect(slugifySegment("Some@Weird!Chars#123")).toBe("someweirdchars123");
  });

  test("slugifySegment handles chinese text", () => {
    expect(slugifySegment("这是一个中文测试")).toBe("这是一个中文测试");
    expect(slugifySegment("Hello 世界 123")).toBe("hello-世界-123");
  });

  test("slugifySegment handles mixed unicode", () => {
    expect(slugifySegment("café au lait")).toBe("café-au-lait");
    expect(slugifySegment("こんにちは")).toBe("こんにちは");
  });

  test("slugifyPath processes file paths correctly", () => {
    expect(slugifyPath("src/components/button.md")).toBe(
      "src/components/button"
    );
    expect(slugifyPath("src/components/button.mdx")).toBe(
      "src/components/button"
    );
    expect(slugifyPath("./docs/concepts/知识.md")).toBe("docs/concepts/知识");
    expect(slugifyPath("docs\\windows\\path.md")).toBe("docs/windows/path");
    expect(slugifyPath("/absolute/path/test.md")).toBe("absolute/path/test");
  });
});
