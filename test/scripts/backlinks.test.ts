import { expect, test, beforeAll, afterAll } from 'bun:test';
import { checkBacklinks } from '../../src/scripts/backlinks.ts';
import { resolve, join } from 'node:path';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '../fixtures/scripts/backlinks');
const tempDir = resolve(__dirname, './tmp_backlinks');

beforeAll(async () => {
  // Create a temp directory and copy fixtures there so we can test 'fix' without dirtying fixtures
  if (existsSync(tempDir)) {
    await rm(tempDir, { recursive: true, force: true });
  }
  await mkdir(tempDir, { recursive: true });

  const files = ['fileA.md', 'fileB.md', 'fileC.md', 'fileD.md'];
  for (const f of files) {
    await copyFile(join(fixturesDir, f), join(tempDir, f));
  }
});

afterAll(async () => {
  if (existsSync(tempDir)) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('checkBacklinks (check mode) identifies missing links', async () => {
  // Run check mode
  const { missingCount, missingBacklinks } = await checkBacklinks(tempDir, false);

  // We expect exactly 1 missing link: fileB is missing a link back to fileA
  expect(missingCount).toBe(1);
  
  const fileBPath = join(tempDir, 'fileB.md');
  const fileAPath = join(tempDir, 'fileA.md');
  
  expect(missingBacklinks.has(fileBPath)).toBe(true);
  expect(missingBacklinks.get(fileBPath)?.has(fileAPath)).toBe(true);
  
  // fileD links back to fileC, so no missing links there
  const fileDPath = join(tempDir, 'fileD.md');
  expect(missingBacklinks.has(fileDPath)).toBe(false);
});

test('checkBacklinks (fix mode) appends missing links to Timeline', async () => {
  // Run fix mode
  const { missingCount, missingBacklinks } = await checkBacklinks(tempDir, true);
  expect(missingCount).toBe(1);

  const fileBPath = join(tempDir, 'fileB.md');
  const content = await readFile(fileBPath, 'utf-8');
  
  // Check that the timeline marker '---' and the reference to fileA was appended
  expect(content).toContain('---');
  expect(content).toContain('Referenced in [fileA](./fileA.md)');

  // Run check mode again, it should now report 0 missing links
  const checkAgain = await checkBacklinks(tempDir, false);
  expect(checkAgain.missingCount).toBe(0);
  expect(checkAgain.missingBacklinks.size).toBe(0);
});
