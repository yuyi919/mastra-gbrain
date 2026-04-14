import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

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

export async function checkBacklinks(baseDir: string, fix: boolean = false): Promise<{ missingCount: number, missingBacklinks: Map<string, Set<string>> }> {
  const files = await findMarkdownFiles(baseDir);
  const fileBasenames = new Map<string, string>(); // basename -> fullpath

  for (const file of files) {
    fileBasenames.set(basename(file, '.md'), file);
  }

  // Use a map to track missing backlinks
  // key: target file full path -> value: Set of source file full paths
  const missingBacklinks = new Map<string, Set<string>>();

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const tree = remark().parse(content);
    const sourceBasename = basename(file, '.md');
    
    // Visit all AST links
    visit(tree, 'link', (node: any) => {
      const url = node.url as string;
      if (url.startsWith('http')) return;
      
      const targetBasename = basename(url, '.md');
      const targetFile = fileBasenames.get(targetBasename);
      
      if (targetFile) {
        // Link exists. Check if targetFile points back to sourceBasename
        // We will defer the actual file read to a second pass or load all to memory
        if (!missingBacklinks.has(targetFile)) {
          missingBacklinks.set(targetFile, new Set());
        }
        missingBacklinks.get(targetFile)!.add(file);
      }
    });
  }

  // 2. Validate missing backlinks
  let missingCount = 0;
  for (const [target, sources] of missingBacklinks.entries()) {
    let content = await readFile(target, 'utf-8');
    const actuallyMissing = new Set<string>();

    for (const source of sources) {
      const sourceBasename = basename(source, '.md');
      // If target file text doesn't contain source slug anywhere, it's missing a backlink
      if (!content.includes(sourceBasename)) {
        actuallyMissing.add(source);
      }
    }

    if (actuallyMissing.size > 0) {
      missingCount++;
      console.log(`\nFile: ${target} is missing backlinks to:`);
      for (const missingSource of actuallyMissing) {
        console.log(`  - ${missingSource}`);
      }

      if (fix) {
        const today = new Date().toISOString().split('T')[0];
        const newEntries = Array.from(actuallyMissing).map(s => {
          const sName = basename(s, '.md');
          // simple relative path for now
          return `- **${today}** | Referenced in [${sName}](./${basename(s)})`;
        }).join('\n');

        // Append below timeline marker if exists, else append at bottom
        if (content.includes('\n---\n')) {
          content += `${newEntries}\n`;
        } else {
          content += `\n---\n${newEntries}\n`;
        }

        await writeFile(target, content, 'utf-8');
        console.log(`🔧 Fixed ${target} by appending to Timeline.`);
      }
    } else {
      // Remove from map if not actually missing
      missingBacklinks.delete(target);
    }
  }

  if (missingCount === 0) {
    console.log('✅ All backlinks are intact.');
  } else {
    console.log(`\n⚠️ Total files missing backlinks: ${missingCount}`);
  }
  
  return { missingCount, missingBacklinks };
}

if (import.meta.main) {
  const mode = process.argv[2]; // 'check' or 'fix'
  const dir = process.argv[3] || '.';
  
  if (mode !== 'check' && mode !== 'fix') {
    console.error('Usage: bun run src/scripts/backlinks.ts <check|fix> <directory>');
    process.exit(1);
  }

  checkBacklinks(resolve(dir), mode === 'fix')
    .then(({ missingCount }) => process.exit(missingCount > 0 && mode === 'check' ? 1 : 0))
    .catch(console.error);
}