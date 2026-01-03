/**
 * CLI script to check whether tests should run before deployment
 * This script reads directly from the database and outputs the result
 * Used by the build script to determine if tests should be skipped
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure neon for serverless
neonConfig.webSocketConstructor = ws;

async function checkTestSetting(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // No database configured, default to running tests
    console.log('RUN_TESTS');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'run_tests_before_deploy' LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      // No setting found, default to running tests
      console.log('RUN_TESTS');
    } else {
      const value = result.rows[0].value;
      // If value is explicitly false, skip tests
      if (value === false || value === 'false') {
        console.log('SKIP_TESTS');
      } else {
        console.log('RUN_TESTS');
      }
    }
  } catch (error) {
    // If we can't check the database, default to running tests (fail-safe)
    console.error('Warning: Could not check database setting, defaulting to run tests');
    console.log('RUN_TESTS');
  } finally {
    await pool.end();
  }
  
  process.exit(0);
}

checkTestSetting();
