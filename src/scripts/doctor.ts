import { createDefaultStore } from '../store/index.ts';
import type { StoreProvider } from '../store/interface.ts';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

export async function runDoctor(storeInstance?: StoreProvider, isJson = false): Promise<boolean> {
  if (!isJson) {
    console.log('🩺 Running GBrain Doctor...\n');
  }
  
  const store = storeInstance ?? createDefaultStore();
  const checks: Check[] = [];

  try {
    await store.init();
    const report = await store.getHealthReport();

    // 1. Connection Check
    if (report.connectionOk) {
      checks.push({ name: 'connection', status: 'ok', message: 'Connection: OK' });
    } else {
      throw new Error('Database ping failed.');
    }

    // 2. Schema / Tables Check
    for (const [table, details] of Object.entries(report.tableDetails)) {
      if (details.ok) {
        checks.push({ name: `table_${table}`, status: 'ok', message: `Table '${table}': OK (${details.rows} rows)` });
      } else {
        checks.push({ name: `table_${table}`, status: 'fail', message: `Table '${table}': Missing or Corrupted (${details.error})` });
      }
    }

    // 3. FTS5 Virtual Table Integrity
    if (report.ftsOk) {
      checks.push({ name: 'fts5', status: 'ok', message: 'FTS5 Index: Integrity OK' });
    } else {
      checks.push({ name: 'fts5', status: 'fail', message: 'FTS5 Index: Failed integrity check' });
    }

    // 4. Vector Embedding Coverage Check
    const { total, embedded } = report.vectorCoverage;
    if (embedded >= 0) {
      const coverage = total > 0 ? ((embedded / total) * 100).toFixed(1) : 100;
      if (total > 0 && embedded < total) {
        checks.push({ name: 'vector_coverage', status: 'warn', message: `Vector Coverage: ${coverage}% (${embedded}/${total} chunks embedded)` });
      } else {
        checks.push({ name: 'vector_coverage', status: 'ok', message: `Vector Coverage: ${coverage}% (${embedded}/${total} chunks embedded)` });
      }
    } else {
      checks.push({ name: 'vector_coverage', status: 'warn', message: 'Vector Coverage: Could not determine vector count. Check VectorStore configuration.' });
    }

    // 5. Schema Version Check
    if (report.schemaVersion) {
      const { current, latest, ok } = report.schemaVersion;
      if (ok) {
        checks.push({ name: 'schema_version', status: 'ok', message: `Schema Version: ${current} (latest: ${latest})` });
      } else {
        checks.push({ name: 'schema_version', status: 'warn', message: `Schema Version: ${current}, latest is ${latest}. Migration might be needed.` });
      }
    }

  } catch (error: any) {
    checks.push({ name: 'fatal_error', status: 'fail', message: `Fatal Error: ${error.message}` });
  } finally {
    try {
      if (!storeInstance) {
        await store.dispose();
      }
    } catch(e) {}
  }

  const allHealthy = !checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');

  if (isJson) {
    console.log(JSON.stringify({ status: allHealthy ? 'healthy' : 'unhealthy', checks }, null, 2));
  } else {
    for (const c of checks) {
      const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${c.message}`);
    }
    
    if (!allHealthy) {
      console.log('\nDoctor finished. Status: NEEDS ATTENTION (Failed checks found)');
    } else if (hasWarn) {
      console.log('\nDoctor finished. Status: HEALTHY (with warnings)');
    } else {
      console.log('\nDoctor finished. Status: HEALTHY');
    }
  }

  return allHealthy;
}

if (import.meta.main) {
  const isJson = process.argv.includes('--json');
  runDoctor(undefined, isJson).then(healthy => process.exit(healthy ? 0 : 1)).catch(console.error);
}