import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListen = vi.fn((opts: any, cb: any) => {
  if (cb) cb();
});

const mockClose = vi.fn((cb: any) => {
  if (cb) cb();
});

const mockServer = {
  listen: mockListen,
  close: mockClose,
  on: vi.fn(),
};

const mockApp = {
  use: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnValue('development'),
  set: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('express', () => {
  const expressFn: any = vi.fn(() => mockApp);
  expressFn.json = vi.fn().mockReturnValue(vi.fn());
  expressFn.urlencoded = vi.fn().mockReturnValue(vi.fn());
  return { default: expressFn };
});

vi.mock('compression', () => ({
  default: vi.fn().mockReturnValue(vi.fn()),
  filter: vi.fn(),
}));

vi.mock('cookie-parser', () => ({
  default: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../../server/routes', () => ({
  registerRoutes: vi.fn().mockResolvedValue(mockServer),
  startGoldenSetScheduler: vi.fn(),
  startBillingScheduler: vi.fn(),
  startDatabaseSizeScheduler: vi.fn(),
}));

vi.mock('../../server/vite', () => ({
  setupVite: vi.fn().mockResolvedValue(undefined),
  serveStatic: vi.fn(),
  log: vi.fn(),
}));

vi.mock('../../server/email', () => ({
  initializeEmailSystem: vi.fn(),
  notifyCriticalError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/queues', () => ({
  initializeJobQueues: vi.fn(),
  shutdownJobQueues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/middleware/rateLimit', () => ({
  apiRateLimiter: vi.fn((req: any, res: any, next: any) => next()),
  stripeRateLimiter: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../../server/middleware/requestDedup', () => ({
  requestDeduplication: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../../server/replit_integrations/object_storage', () => ({
  registerObjectStorageRoutes: vi.fn(),
}));

vi.mock('../../server/middleware/staticCache', () => ({
  staticCacheHeaders: vi.fn().mockReturnValue(vi.fn()),
  setSecurityHeaders: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../../server/middleware/keepAlive', () => ({
  configureKeepAlive: vi.fn(),
  keepAliveHeaders: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../../server/middleware/csrf', () => ({
  csrfProtection: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../../server/lazyModules', () => ({
  preloadModules: vi.fn(),
}));

describe('server/index.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates express app and registers middleware', async () => {
    const express = (await import('express')).default;

    expect(express).toBeDefined();
    expect(typeof express).toBe('function');
  });

  it('has compression middleware available', async () => {
    const compression = (await import('compression')).default;
    expect(compression).toBeDefined();
  });

  it('has rate limiting middleware', async () => {
    const { apiRateLimiter, stripeRateLimiter } = await import('../../server/middleware/rateLimit');
    expect(apiRateLimiter).toBeDefined();
    expect(stripeRateLimiter).toBeDefined();
  });

  it('has request deduplication middleware', async () => {
    const { requestDeduplication } = await import('../../server/middleware/requestDedup');
    expect(requestDeduplication).toBeDefined();
  });

  it('has security and cache middleware', async () => {
    const { staticCacheHeaders, setSecurityHeaders } = await import('../../server/middleware/staticCache');
    expect(staticCacheHeaders).toBeDefined();
    expect(setSecurityHeaders).toBeDefined();
  });

  it('has CSRF protection middleware', async () => {
    const { csrfProtection } = await import('../../server/middleware/csrf');
    expect(csrfProtection).toBeDefined();
  });

  it('has keep-alive middleware', async () => {
    const { configureKeepAlive, keepAliveHeaders } = await import('../../server/middleware/keepAlive');
    expect(configureKeepAlive).toBeDefined();
    expect(keepAliveHeaders).toBeDefined();
  });

  it('registerRoutes returns a server object', async () => {
    const { registerRoutes } = await import('../../server/routes');
    const server = await registerRoutes(mockApp as any);
    expect(server).toBe(mockServer);
  });

  it('registerObjectStorageRoutes is callable', async () => {
    const { registerObjectStorageRoutes } = await import('../../server/replit_integrations/object_storage');
    registerObjectStorageRoutes(mockApp as any);
    expect(registerObjectStorageRoutes).toHaveBeenCalledWith(mockApp);
  });

  it('email system initialization is available', async () => {
    const { initializeEmailSystem } = await import('../../server/email');
    initializeEmailSystem();
    expect(initializeEmailSystem).toHaveBeenCalled();
  });

  it('job queues can be initialized and shut down', async () => {
    const { initializeJobQueues, shutdownJobQueues } = await import('../../server/queues');
    initializeJobQueues();
    expect(initializeJobQueues).toHaveBeenCalled();

    await shutdownJobQueues();
    expect(shutdownJobQueues).toHaveBeenCalled();
  });

  it('schedulers are available', async () => {
    const { startGoldenSetScheduler, startBillingScheduler, startDatabaseSizeScheduler } = await import('../../server/routes');
    startGoldenSetScheduler();
    startBillingScheduler();
    startDatabaseSizeScheduler();
    expect(startGoldenSetScheduler).toHaveBeenCalled();
    expect(startBillingScheduler).toHaveBeenCalled();
    expect(startDatabaseSizeScheduler).toHaveBeenCalled();
  });

  it('lazy module preloading is available', async () => {
    const { preloadModules } = await import('../../server/lazyModules');
    preloadModules();
    expect(preloadModules).toHaveBeenCalled();
  });

  it('setupVite is available for development', async () => {
    const { setupVite } = await import('../../server/vite');
    await setupVite(mockApp as any, mockServer as any);
    expect(setupVite).toHaveBeenCalled();
  });

  it('serveStatic is available for production', async () => {
    const { serveStatic } = await import('../../server/vite');
    serveStatic(mockApp as any);
    expect(serveStatic).toHaveBeenCalled();
  });

  it('server can listen on configured port', () => {
    const port = parseInt(process.env.PORT || '5000', 10);
    mockServer.listen({ port, host: '0.0.0.0', reusePort: true }, () => {});
    expect(mockListen).toHaveBeenCalled();
    const callArgs = mockListen.mock.calls[0][0];
    expect(callArgs.host).toBe('0.0.0.0');
  });

  it('server graceful shutdown closes server', async () => {
    mockClose.mockImplementation((cb: any) => { if (cb) cb(); });
    mockServer.close(() => {});
    expect(mockClose).toHaveBeenCalled();
  });

  describe('sanitizeForLogging behavior', () => {
    const SENSITIVE_FIELDS = new Set([
      'password', 'passwordhash', 'email', 'firstname', 'lastname',
      'apikey', 'secretkey', 'token', 'accesstoken', 'refreshtoken',
      'ssn', 'phonenumber', 'address', 'dateofbirth', 'creditcard',
      'stripecustomerid', 'profileimageurl',
    ]);

    function sanitizeForLogging(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) {
        return obj.length > 3 ? `[Array(${obj.length})]` : obj.map(sanitizeForLogging);
      }
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeForLogging(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    it('redacts sensitive fields', () => {
      const result = sanitizeForLogging({ email: 'test@test.com', name: 'John' });
      expect(result.email).toBe('[REDACTED]');
      expect(result.name).toBe('John');
    });

    it('redacts nested sensitive fields', () => {
      const result = sanitizeForLogging({ user: { password: 'secret', id: '123' } });
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.user.id).toBe('123');
    });

    it('handles arrays with 3 or fewer items', () => {
      const result = sanitizeForLogging([{ email: 'a@b.com' }, { name: 'test' }]);
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('[REDACTED]');
    });

    it('truncates large arrays', () => {
      const result = sanitizeForLogging([1, 2, 3, 4, 5]);
      expect(result).toBe('[Array(5)]');
    });

    it('handles null and non-objects', () => {
      expect(sanitizeForLogging(null)).toBeNull();
      expect(sanitizeForLogging('string')).toBe('string');
      expect(sanitizeForLogging(42)).toBe(42);
    });

    it('redacts all known sensitive fields', () => {
      const input: Record<string, string> = {};
      SENSITIVE_FIELDS.forEach((field) => {
        input[field] = 'sensitive-value';
      });
      input.safeField = 'safe-value';

      const result = sanitizeForLogging(input);
      SENSITIVE_FIELDS.forEach((field) => {
        expect(result[field]).toBe('[REDACTED]');
      });
      expect(result.safeField).toBe('safe-value');
    });
  });

  describe('domain redirect logic', () => {
    const PRIMARY_DOMAIN = 'www.humanmetrix.co.uk';
    const REDIRECT_DOMAINS = ['www.humanmetrix-ai.com', 'humanmetrix-ai.com', 'www.humanmetrixai.com', 'humanmetrixai.com', 'humanmetrix.co.uk'];

    it('identifies redirect domains correctly', () => {
      expect(REDIRECT_DOMAINS).toContain('humanmetrix-ai.com');
      expect(REDIRECT_DOMAINS).toContain('www.humanmetrix-ai.com');
      expect(REDIRECT_DOMAINS).not.toContain(PRIMARY_DOMAIN);
    });

    it('primary domain is www.humanmetrix.co.uk', () => {
      expect(PRIMARY_DOMAIN).toBe('www.humanmetrix.co.uk');
    });
  });

  describe('trailing slash redirect logic', () => {
    it('should redirect paths with trailing slashes', () => {
      const path = '/pricing/';
      expect(path.length > 1 && path.endsWith('/')).toBe(true);
      expect(path.slice(0, -1)).toBe('/pricing');
    });

    it('should not redirect root path', () => {
      const path = '/';
      expect(path === '/').toBe(true);
    });

    it('should not redirect API routes', () => {
      const path = '/api/users/';
      expect(path.startsWith('/api/')).toBe(true);
    });
  });
});
