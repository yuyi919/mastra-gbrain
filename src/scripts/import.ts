import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createIngestionWorkflow } from '../ingest/workflow.ts';
import type { StoreProvider, EmbeddingProvider } from '../store/interface.ts';

/**
 * Recursively find all markdown files in a directory.
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Bulk import a directory of markdown files.
 */
export async function bulkImport(
  baseDir: string, 
  storeInstance?: StoreProvider, 
  embedderInstance?: EmbeddingProvider
): Promise<{ imported: number, skipped: number, failed: number }> {
  console.log(`Scanning ${baseDir} for markdown files...`);
  const files = await findMarkdownFiles(baseDir);
  console.log(`Found ${files.length} markdown files.`);

  // If providers are not passed (CLI mode), we initialize default ones
  let activeStore = storeInstance;
  let activeEmbedder = embedderInstance;

  if (!activeStore) {
    const { createDefaultStore } = await import('../store/index.ts');
    activeStore = createDefaultStore();
    await (activeStore as any).init();
  }
  
  if (!activeEmbedder) {
    const { createDefaultEmbedder } = await import('../store/index.ts');
    activeEmbedder = createDefaultEmbedder();
  }

  const workflow = createIngestionWorkflow({
    store: activeStore,
    embedder: activeEmbedder
  });

  const run = await workflow.createRun();
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const relativePath = relative(baseDir, file);
      
      const res = await run.start({
        inputData: {
          relativePath,
          content,
          noEmbed: false
        }
      });

      if (res.status === 'success' && 'result' in res) {
        const result = res.result as any;
        if (result.status === 'imported') {
          imported++;
          console.log(`✅ Imported: ${relativePath} (${result.chunks} chunks)`);
        } else if (result.status === 'skipped') {
          skipped++;
          console.log(`⏭️ Skipped: ${relativePath} (${result.error || 'No changes'})`);
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
  }

  console.log('\n--- Import Summary ---');
  console.log(`Total: ${files.length} | Imported: ${imported} | Skipped: ${skipped} | Failed: ${failed}`);
  
  return { imported, skipped, failed };
}

// Allow running directly from CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dir = args[0] || '.';
  bulkImport(dir)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
