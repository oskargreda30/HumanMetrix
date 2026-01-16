import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 50 : 20,
  idleTimeoutMillis: isProduction ? 60000 : 30000,
  connectionTimeoutMillis: isProduction ? 10000 : 5000,
});

console.log(`✅ Database pool configured (max: ${isProduction ? 50 : 20} connections)`);

pool.on('error', async (err) => {
  console.error('❌ Database pool error:', err.message);
  
  // Notify super admins of database connection errors
  try {
    const { notifyCriticalError } = await import('./email');
    await notifyCriticalError({
      source: 'Database Pool',
      error: err,
      additionalContext: {
        poolStats: {
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingClients: pool.waitingCount,
        },
      },
    });
  } catch (notifyError: any) {
    console.error('[Database] Failed to send error notification:', notifyError.message);
  }
});

pool.on('connect', () => {
  console.log('✅ New database connection established');
});

export const db = drizzle({ client: pool, schema });

export async function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
  };
}
