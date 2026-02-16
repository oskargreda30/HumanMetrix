import { describe, it, expect, vi, beforeAll } from 'vitest';

let dbModule: typeof import('../../server/db');

const mockOn = vi.fn();
const mockPoolInstance = {
  on: mockOn,
  totalCount: 5,
  idleCount: 3,
  waitingCount: 0,
};

let drizzleCalled = false;
let drizzleArgs: any = null;

vi.mock('@neondatabase/serverless', () => {
  return {
    Pool: vi.fn(() => mockPoolInstance),
    neonConfig: { webSocketConstructor: null },
  };
});

vi.mock('drizzle-orm/neon-serverless', () => {
  return {
    drizzle: vi.fn((opts: any) => {
      drizzleCalled = true;
      drizzleArgs = opts;
      return { query: {} };
    }),
  };
});

vi.mock('ws', () => ({ default: vi.fn() }));

vi.mock('@shared/schema', () => ({
  __esModule: true,
  default: {},
  users: {},
}));

vi.mock('../../server/email', () => ({
  notifyCriticalError: vi.fn(),
}));

describe('server/db', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    dbModule = await import('../../server/db');
  });

  it('should export db instance', () => {
    expect(dbModule.db).toBeDefined();
  });

  it('should export pool instance', () => {
    expect(dbModule.pool).toBeDefined();
  });

  it('should call drizzle with client and schema options', () => {
    expect(drizzleCalled).toBe(true);
    expect(drizzleArgs).toHaveProperty('client');
    expect(drizzleArgs).toHaveProperty('schema');
  });

  it('should export getPoolStats function', () => {
    expect(typeof dbModule.getPoolStats).toBe('function');
  });

  it('getPoolStats should return pool statistics', async () => {
    const stats = await dbModule.getPoolStats();
    expect(stats).toEqual({
      totalConnections: 5,
      idleConnections: 3,
      waitingClients: 0,
    });
  });

  it('pool should have on method for event handlers', () => {
    expect(typeof dbModule.pool.on).toBe('function');
  });
});
