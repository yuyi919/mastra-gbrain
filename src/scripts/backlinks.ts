import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, basename, dirname, relative } from 'node:path';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

function extractPageTitle(content: string): string {
  const fmMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m);
  if (fmMatch) return fmMatch[1];
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return 'Untitled';
}

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

export async function checkBacklinks(baseDir: string, fix: boolean = false, dryRun: boolean = false): Promise<{ missingCount: number, missingBacklinks: Map<string, Set<string>> }> {
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
        
        const newEntries = [];
        for (const s of actuallyMissing) {
          const sContent = await readFile(s, 'utf-8');
          const title = extractPageTitle(sContent);
          let relPath = relative(dirname(target), s);
          if (!relPath.startsWith('.')) {
            relPath = './' + relPath;
          }
          newEntries.push(`- **${today}** | Referenced in [${title}](${relPath})`);
        }
        const entriesStr = newEntries.join('\n');

        // Insert into Timeline section
        if (content.includes('## Timeline')) {
          const parts = content.split('## Timeline');
          const afterTimeline = parts[1];
          const nextSection = afterTimeline.match(/\n## /);
          if (nextSection) {
            const insertIdx = parts[0].length + '## Timeline'.length + nextSection.index!;
            content = content.slice(0, insertIdx) + '\n' + entriesStr + content.slice(insertIdx);
          } else {
            content = content.trimEnd() + '\n' + entriesStr + '\n';
          }
        } else {
          // Add Timeline section
          content = content.trimEnd() + '\n\n## Timeline\n\n' + entriesStr + '\n';
        }

        if (!dryRun) {
          await writeFile(target, content, 'utf-8');
          console.log(`🔧 Fixed ${target} by appending to Timeline.`);
        } else {
          console.log(`🔍 [Dry Run] Would fix ${target} by appending to Timeline:\n${entriesStr}`);
        }
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
  const args = process.argv.slice(2);
  const mode = args[0]; // 'check' or 'fix'
  const dryRun = args.includes('--dry-run');
  const dir = args.filter(a => a !== 'check' && a !== 'fix' && a !== '--dry-run')[0] || '.';
  
  if (mode !== 'check' && mode !== 'fix') {
    console.error('Usage: bun run src/scripts/backlinks.ts <check|fix> <directory> [--dry-run]');
    process.exit(1);
  }

  checkBacklinks(resolve(dir), mode === 'fix', dryRun)
    .then(({ missingCount }) => process.exit(missingCount > 0 && mode === 'check' ? 1 : 0))
    .catch(console.error);
}