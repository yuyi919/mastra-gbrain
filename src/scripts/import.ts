import { existsSync, type Stats } from "node:fs";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { cpus, homedir, totalmem } from "node:os";
import { join, relative } from "node:path";
import { createIngestionWorkflow } from "../ingest/workflow.js";
import type { EmbeddingProvider, StoreProvider } from "../store/interface.js";

function defaultWorkers(): number {
  const cpuCount = cpus().length;
  const memGB = totalmem() / 1024 ** 3;
  const byPool = 8;
  const byCpu = Math.max(2, cpuCount);
  const byMem = Math.floor(memGB * 2);
  return Math.min(byPool, byCpu, byMem);
}

/**
 * Recursively find all markdown files in a directory.
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    if (entry === "node_modules") continue;

    const fullPath = join(dir, entry);
    let statInfo: Stats;
    try {
      statInfo = await lstat(fullPath);
    } catch {
      console.warn(`[import] Skipping unreadable path: ${fullPath}`);
      continue;
    }

    if (statInfo.isSymbolicLink()) {
      console.warn(`[import] Skipping symlink: ${fullPath}`);
      continue;
    }

    if (statInfo.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (
      statInfo.isFile() &&
      (entry.endsWith(".md") || entry.endsWith(".mdx"))
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Bulk import a directory of markdown files.
 */
export async function bulkImport(
  baseDir: string,
  storeInstance?: StoreProvider,
  embedderInstance?: EmbeddingProvider,
  options: { workerCount?: number; fresh?: boolean } = {}
): Promise<{ imported: number; skipped: number; failed: number }> {
  console.log(`Scanning ${baseDir} for markdown files...`);
  const allFiles = await findMarkdownFiles(baseDir);
  console.log(`Found ${allFiles.length} markdown files.`);

  const fresh = options.fresh || false;
  const workerCount = options.workerCount || defaultWorkers();

  const checkpointPath = join(homedir(), ".gbrain", "import-checkpoint.json");
  let files = allFiles;
  let resumeIndex = 0;

  if (!fresh && existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(await readFile(checkpointPath, "utf-8"));
      if (cp.dir === baseDir && cp.totalFiles === allFiles.length) {
        resumeIndex = cp.processedIndex;
        files = allFiles.slice(resumeIndex);
        console.log(
          `Resuming from checkpoint: skipping ${resumeIndex} already-processed files`
        );
      }
    } catch {
      // Invalid checkpoint, start fresh
    }
  }

  // If providers are not passed (CLI mode), we initialize default ones
  let activeStore = storeInstance;
  let activeEmbedder = embedderInstance;

  if (!activeStore) {
    const { createDefaultStore } = await import("../store/index.js");
    activeStore = createDefaultStore();
    await (activeStore as any).init();
  }

  if (!activeEmbedder) {
    const { createDefaultEmbedder } = await import("../store/index.js");
    activeEmbedder = await createDefaultEmbedder();
  }

  const workflow = createIngestionWorkflow({
    store: activeStore,
    embedder: activeEmbedder,
  });

  const actualWorkers = Math.max(1, workerCount);
  if (actualWorkers > 1) {
    console.log(`Using ${actualWorkers} parallel workers`);
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  async function processFile(file: string) {
    // Each concurrent task should have its own run to avoid state conflicts
    const run = await workflow.createRun();
    try {
      const content = await readFile(file, "utf-8");
      const relativePath = relative(baseDir, file);

      const res = await run.start({
        inputData: {
          relativePath,
          content,
          noEmbed: false,
        },
      });

      if (res.status === "success" && "result" in res) {
        const result = res.result as any;
        if (result.status === "imported") {
          imported++;
          console.log(`✅ Imported: ${relativePath} (${result.chunks} chunks)`);
        } else if (result.status === "skipped") {
          skipped++;
          console.log(
            `⏭️ Skipped: ${relativePath} (${result.error || "No changes"})`
          );
        } else {
          failed++;
          console.log(`❌ Failed: ${relativePath} (${result.error})`);
        }
      } else {
        failed++;
        console.log(`❌ Failed: ${relativePath} (Workflow error)`);
      }
    } catch (error: any) {
      failed++;
      console.log(`❌ Failed to read/process ${file}: ${error.message}`);
    }

    processed++;
    if (processed % 100 === 0 || processed === files.length) {
      if (processed % 100 === 0) {
        try {
          const cpDir = join(homedir(), ".gbrain");
          if (!existsSync(cpDir)) {
            await mkdir(cpDir, { recursive: true });
          }
          await writeFile(
            checkpointPath,
            JSON.stringify({
              dir: baseDir,
              totalFiles: allFiles.length,
              processedIndex: resumeIndex + processed,
              timestamp: new Date().toISOString(),
            })
          );
        } catch {
          /* non-fatal */
        }
      }
    }
  }

  // Concurrent execution
  if (actualWorkers > 1) {
    let queueIndex = 0;
    await Promise.all(
      Array.from({ length: actualWorkers }, async () => {
        while (true) {
          const idx = queueIndex++;
          if (idx >= files.length) break;
          await processFile(files[idx]);
        }
      })
    );
  } else {
    for (const file of files) {
      await processFile(file);
    }
  }

  if (failed === 0 && existsSync(checkpointPath)) {
    try {
      await rm(checkpointPath);
    } catch {
      /* non-fatal */
    }
  } else if (failed > 0 && existsSync(checkpointPath)) {
    console.log(
      `  Checkpoint preserved (${failed} errors). Run again to retry failed files.`
    );
  }

  console.log("\n--- Import Summary ---");
  console.log(
    `Total: ${files.length} | Imported: ${imported} | Skipped: ${skipped} | Failed: ${failed}`
  );

  return { imported, skipped, failed };
}

// Allow running directly from CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const workersIdx = args.indexOf("--workers");
  const workerCount =
    workersIdx !== -1 ? parseInt(args[workersIdx + 1], 10) : undefined;
  const fresh = args.includes("--fresh");

  const flagValues = new Set<number>();
  if (workersIdx !== -1) flagValues.add(workersIdx + 1);
  const dir =
    args.find((a, i) => !a.startsWith("--") && !flagValues.has(i)) || ".";

  bulkImport(dir, undefined, undefined, { workerCount, fresh })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
