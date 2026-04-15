export function slugifySegment(segment: string): string {
  return segment
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s_-]/gu, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugifyPath(filePath: string): string {
  let path = filePath.replace(/\.mdx?$/i, "");
  path = path.replace(/\\/g, "/");
  path = path.replace(/^\.?\//, "");
  return path.split("/").map(slugifySegment).filter(Boolean).join("/");
}
