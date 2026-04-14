import matter from 'gray-matter';
import type { PageType, ParsedMarkdown } from './types.ts';
import { slugifyPath } from './slug.ts';

export function parseMarkdown(content: string, filePath?: string): ParsedMarkdown {
  const { data: frontmatter, content: body } = matter(content);
  const { compiled_truth, timeline } = splitBody(body);
  const type = (frontmatter.type as PageType) || inferType(filePath);
  const title = (frontmatter.title as string) || inferTitle(filePath);
  const tags = extractTags(frontmatter);
  const slug = (frontmatter.slug as string) || inferSlug(filePath);
  const cleanFrontmatter = { ...frontmatter };
  delete cleanFrontmatter.type;
  delete cleanFrontmatter.title;
  delete cleanFrontmatter.tags;
  delete cleanFrontmatter.slug;
  return {
    frontmatter: cleanFrontmatter,
    compiled_truth: compiled_truth.trim(),
    timeline: timeline.trim(),
    slug,
    type,
    title,
    tags,
  };
}

export function splitBody(body: string): { compiled_truth: string; timeline: string } {
  const lines = body.split('\n');
  let splitIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '---') {
      const beforeContent = lines.slice(0, i).join('\n').trim();
      if (beforeContent.length > 0) {
        splitIndex = i;
        break;
      }
    }
  }
  if (splitIndex === -1) {
    return { compiled_truth: body, timeline: '' };
  }
  const compiled_truth = lines.slice(0, splitIndex).join('\n');
  const timeline = lines.slice(splitIndex + 1).join('\n');
  return { compiled_truth, timeline };
}

export function serializeMarkdown(
  frontmatter: Record<string, unknown>,
  compiled_truth: string,
  timeline: string,
  meta: { type: PageType; title: string; tags: string[] },
): string {
  const fullFrontmatter: Record<string, unknown> = {
    type: meta.type,
    title: meta.title,
    ...frontmatter,
  };
  if (meta.tags.length > 0) {
    fullFrontmatter.tags = meta.tags;
  }
  const yamlContent = matter.stringify('', fullFrontmatter).trim();
  let body = compiled_truth;
  if (timeline) {
    body += '\n\n---\n\n' + timeline;
  }
  return yamlContent + '\n\n' + body + '\n';
}

function inferType(filePath?: string): PageType {
  if (!filePath) return 'concept';
  const lower = ('/' + filePath).toLowerCase();
  if (lower.includes('/people/') || lower.includes('/person/')) return 'person';
  if (lower.includes('/companies/') || lower.includes('/company/')) return 'company';
  if (lower.includes('/deals/') || lower.includes('/deal/')) return 'deal';
  if (lower.includes('/yc/')) return 'yc';
  if (lower.includes('/civic/')) return 'civic';
  if (lower.includes('/projects/') || lower.includes('/project/')) return 'project';
  if (lower.includes('/sources/') || lower.includes('/source/')) return 'source';
  if (lower.includes('/media/')) return 'media';
  return 'concept';
}

function inferTitle(filePath?: string): string {
  if (!filePath) return 'Untitled';
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1]?.replace(/\.md$/i, '') || 'Untitled';
  return filename.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function inferSlug(filePath?: string): string {
  if (!filePath) return 'untitled';
  return slugifyPath(filePath);
}

function extractTags(frontmatter: Record<string, unknown>): string[] {
  const tags = frontmatter.tags;
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

