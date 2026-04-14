import { createDefaultStore } from '../store/index.ts';
import type { StoreProvider } from '../store/interface.ts';

export async function runDoctor(storeInstance?: StoreProvider): Promise<boolean> {
  console.log('🩺 Running GBrain Doctor...\n');
  
  const store = storeInstance ?? createDefaultStore();
  let allHealthy = true;

  try {
    await store.init();
    const report = await store.getHealthReport();

    // 1. Connection Check
    if (report.connectionOk) {
      console.log('✅ Connection: OK');
    } else {
      throw new Error('Database ping failed.');
    }

    // 2. Schema / Tables Check
    for (const [table, details] of Object.entries(report.tableDetails)) {
      if (details.ok) {
        console.log(`✅ Table '${table}': OK (${details.rows} rows)`);
      } else {
        console.log(`❌ Table '${table}': Missing or Corrupted (${details.error})`);
        allHealthy = false;
      }
    }

    // 3. FTS5 Virtual Table Integrity
    if (report.ftsOk) {
      console.log('✅ FTS5 Index: Integrity OK');
    } else {
      console.log(`❌ FTS5 Index: Failed integrity check`);
      allHealthy = false;
    }

    // 4. Vector Embedding Coverage Check
    const { total, embedded } = report.vectorCoverage;
    if (embedded >= 0) {
      const coverage = total > 0 ? ((embedded / total) * 100).toFixed(1) : 100;
      if (total > 0 && embedded < total) {
        console.log(`⚠️ Vector Coverage: ${coverage}% (${embedded}/${total} chunks embedded)`);
        allHealthy = false;
      } else {
        console.log(`✅ Vector Coverage: ${coverage}% (${embedded}/${total} chunks embedded)`);
      }
    } else {
      console.log('⚠️ Vector Coverage: Could not determine vector count. Check VectorStore configuration.');
    }

  } catch (error: any) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    allHealthy = false;
  } finally {
    try {
      if (!storeInstance) {
        await store.dispose();
      }
    } catch(e) {}
  }

  console.log(`\nDoctor finished. Status: ${allHealthy ? 'HEALTHY' : 'NEEDS ATTENTION'}`);
  return allHealthy;
}

if (import.meta.main) {
  runDoctor().then(healthy => process.exit(healthy ? 0 : 1)).catch(console.error);
}