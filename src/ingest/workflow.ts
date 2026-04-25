import { createHash } from "node:crypto";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { chunkText } from "../chunkers/recursive.js";
import { parseMarkdown } from "../markdown.js";
import { slugifyPath } from "../slug.js";
import type {
  EmbeddingProvider,
  TimelineBatchInput,
} from "../store/interface.js";
import type { ChunkInput, Page, PageInput, ParsedMarkdown } from "../types.js";

export interface IngestResult {
  status: "imported" | "skipped" | "failed";
  slug: string;
  chunks?: number;
  error?: string;
}

export interface IngestionWorkflowStore {
  getPage(slug: string): Promise<Page | null>;
  createVersion(slug: string): Promise<unknown>;
  putPage(slug: string, page: PageInput): Promise<unknown>;
  getTags(slug: string): Promise<string[]>;
  addTag(slug: string, tag: string): Promise<void>;
  removeTag(slug: string, tag: string): Promise<void>;
  upsertChunks(slug: string, chunks: ChunkInput[]): Promise<void>;
  deleteChunks(slug: string): Promise<void>;
  addTimelineEntriesBatch(entries: TimelineBatchInput[]): Promise<unknown>;
  transaction?<T>(fn: (tx: IngestionWorkflowStore) => Promise<T>): Promise<T>;
}

export interface IngestionOptions {
  store: IngestionWorkflowStore;
  embedder: EmbeddingProvider;
  maxBytes?: number;
}

export function createIngestionWorkflow(deps: IngestionOptions) {
  const { store, embedder, maxBytes = 5000000 } = deps;

  const parseStep = createStep({
    id: "parse",
    inputSchema: z.object({
      slug: z.string().optional(),
      relativePath: z.string().optional(),
      content: z.string(),
    }),
    outputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
    }),
    execute: async ({ inputData }) => {
      const content = inputData.content;
      const byteLength = Buffer.byteLength(content, "utf-8");
      if (byteLength > maxBytes) {
        return {
          slug: inputData.slug ?? inputData.relativePath ?? "unknown",
          status: "skipped" as const,
          error: `Content too large (${byteLength} bytes, max ${maxBytes})`,
          content_hash: "",
        };
      }

      const relativePath = inputData.relativePath;
      const parsed = parseMarkdown(content, relativePath);

      if (relativePath) {
        const expected = slugifyPath(relativePath);
        if (parsed.slug !== expected) {
          return {
            slug: expected,
            status: "skipped" as const,
            error: `Frontmatter slug "${parsed.slug}" does not match path-derived slug "${expected}" (from ${relativePath})`,
            content_hash: "",
          };
        }
      }

      const slug = relativePath
        ? slugifyPath(relativePath)
        : (inputData.slug ?? parsed.slug);

      const content_hash = createHash("sha256")
        .update(
          JSON.stringify({
            title: parsed.title,
            type: parsed.type,
            compiled_truth: parsed.compiled_truth,
            timeline: parsed.timeline,
            frontmatter: parsed.frontmatter,
            tags: parsed.tags.slice().sort(),
          })
        )
        .digest("hex");

      const existing = await deps.store.getPage(slug);
      return {
        slug,
        status: "ready" as const,
        parsed,
        content_hash,
        existing_hash: existing?.content_hash ?? null,
      };
    },
  });

  const chunkStep = createStep({
    id: "chunk",
    inputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
    }),
    outputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
      chunks: z.custom<ChunkInput[]>(),
    }),
    execute: async ({ inputData }) => {
      if (inputData.status !== "ready") {
        return { ...inputData, chunks: [] };
      }
      const parsed = inputData.parsed as ParsedMarkdown;
      const chunks: ChunkInput[] = [];
      if (parsed.compiled_truth.trim()) {
        for (const c of chunkText(parsed.compiled_truth)) {
          chunks.push({
            chunk_index: chunks.length,
            chunk_text: c.text,
            chunk_source: "compiled_truth",
          });
        }
      }
      if (parsed.timeline.trim()) {
        for (const c of chunkText(parsed.timeline)) {
          chunks.push({
            chunk_index: chunks.length,
            chunk_text: c.text,
            chunk_source: "timeline",
          });
        }
      }
      return { ...inputData, chunks };
    },
  });

  const embedStep = createStep({
    id: "embed",
    inputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
      chunks: z.custom<ChunkInput[]>(),
      noEmbed: z.boolean().optional(),
    }),
    outputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
      chunks: z.custom<ChunkInput[]>(),
    }),
    execute: async ({ inputData }) => {
      const chunks = inputData.chunks as ChunkInput[];
      if (inputData.status !== "ready") return inputData;
      if (inputData.noEmbed) return inputData;
      if (!deps.embedder) return inputData;
      if (chunks.length === 0) return inputData;
      const embeddings = await deps.embedder.embedBatch(
        chunks.map((c) => c.chunk_text)
      );
      for (let i = 0; i < chunks.length; i++) {
        if (embeddings[i]) {
          chunks[i].embedding = new Float32Array(embeddings[i]);
        }
        chunks[i].token_count = Math.ceil(chunks[i].chunk_text.length / 4);
      }
      return { ...inputData, chunks };
    },
  });

  const persistStep = createStep({
    id: "persist",
    inputSchema: z.object({
      slug: z.string(),
      status: z.enum(["ready", "skipped", "error"]),
      error: z.string().optional(),
      parsed: z.custom<ParsedMarkdown>().optional(),
      content_hash: z.string(),
      existing_hash: z.string().nullable().optional(),
      chunks: z.custom<ChunkInput[]>(),
    }),
    outputSchema: z.object({
      slug: z.string(),
      status: z.enum(["imported", "skipped", "error"]),
      chunks: z.number(),
      error: z.string().optional(),
    }),
    execute: async ({ inputData }) => {
      const slug = inputData.slug;
      if (inputData.status !== "ready") {
        return {
          slug,
          status:
            inputData.status === "error"
              ? ("error" as const)
              : ("skipped" as const),
          chunks: 0,
          error: inputData.error,
        };
      }
      const parsed = inputData.parsed as ParsedMarkdown;
      if (inputData.existing_hash === inputData.content_hash) {
        return { slug, status: "skipped" as const, chunks: 0 };
      }
      const content_hash = inputData.content_hash!;

      const write = async (tx: IngestionWorkflowStore) => {
        if (inputData.existing_hash) await tx.createVersion(slug);

        // Ensure frontmatter is saved even if it's an object
        await tx.putPage(slug, {
          type: parsed.type,
          title: parsed.title,
          frontmatter: parsed.frontmatter || {},
          compiled_truth: parsed.compiled_truth,
          timeline: parsed.timeline,
          content_hash,
        });

        const existingTags = await tx.getTags(slug);
        const newTags = new Set(parsed.tags);
        for (const old of existingTags) {
          if (!newTags.has(old)) await tx.removeTag(slug, old);
        }
        for (const tag of parsed.tags) {
          await tx.addTag(slug, tag);
        }

        const chunks = inputData.chunks as ChunkInput[];
        if (chunks.length > 0) {
          await tx.upsertChunks(slug, chunks);
        } else {
          await tx.deleteChunks(slug);
        }

        if (parsed.timeline) {
          const lines = parsed.timeline
            .split("\n")
            .filter((l) => l.trim().startsWith("- "));
          const entries = lines
            .map((line) => {
              const match = line.match(/-\s+(\d{4}(?:-\d{2}-\d{2})?):\s+(.*)/);
              if (match) {
                return {
                  slug,
                  date: match[1],
                  summary: match[2],
                  source: slug,
                  detail: "",
                };
              }
              return {
                slug,
                date: "",
                summary: line.substring(2).trim(),
                source: slug,
                detail: "",
              };
            })
            .filter((e) => e.date !== "");
          await tx.addTimelineEntriesBatch(entries);
        }
      };

      if (deps.store.transaction) {
        await deps.store.transaction(write);
      } else {
        await write(deps.store);
      }
      const chunksCount = (inputData.chunks as ChunkInput[]).length;
      return { slug, status: "imported" as const, chunks: chunksCount };
    },
  });

  return createWorkflow({
    id: "gbrain-ingest",
    inputSchema: z.object({
      slug: z.string().optional(),
      relativePath: z.string().optional(),
      content: z.string(),
      noEmbed: z.boolean().optional(),
    }),
    outputSchema: z.object({
      slug: z.string(),
      status: z.enum(["imported", "skipped", "error"]),
      chunks: z.number(),
      error: z.string().optional(),
    }),
  })
    .then(parseStep)
    .then(chunkStep)
    .then(embedStep)
    .then(persistStep)
    .commit();
}
