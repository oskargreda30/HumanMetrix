import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestDeduplication, getDeduplicationStats } from '../../server/middleware/requestDedup';

function createMockReq(overrides: any = {}) {
  return {
    method: 'GET',
    path: '/api/test',
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    body: {},
    user: null,
    originalUrl: '/api/test',
    url: '/api/test',
    connection: { remoteAddress: '127.0.0.1' },
    socket: {},
    ...overrides,
  };
}

function createMockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
    cookie: vi.fn(),
    statusCode: 200,
    end: vi.fn(),
  };
}

describe('requestDedup middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestDeduplication', () => {
    it('returns a middleware function', () => {
      const middleware = requestDeduplication();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3);
    });

    it('allows GET requests through without dedup', () => {
      const middleware = requestDeduplication();
      const req = createMockReq({ method: 'GET', path: '/api/test' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows non-API paths through', () => {
      const middleware = requestDeduplication();
      const req = createMockReq({ method: 'POST', path: '/some/other/path' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows first POST request through', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-first-' + Date.now();
      const req = createMockReq({ method: 'POST', path: uniquePath, user: { id: 'user-first-' + Date.now() } });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('detects duplicate POST requests within window', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-dup-' + Date.now();
      const userId = 'user-dup-' + Date.now();

      const req1 = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId }, body: { data: 'test' } });
      const res1 = createMockRes();
      const next1 = vi.fn();
      middleware(req1, res1, next1);
      expect(next1).toHaveBeenCalled();

      const req2 = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId }, body: { data: 'test' } });
      const res2 = createMockRes();
      const next2 = vi.fn();
      middleware(req2, res2, next2);

      expect(res2.status).toHaveBeenCalledWith(429);
      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Duplicate request detected. Please wait.',
      }));
      expect(next2).not.toHaveBeenCalled();
    });

    it('allows same request after dedup window expires', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-expire-' + Date.now();
      const userId = 'user-expire-' + Date.now();

      const req1 = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId } });
      const res1 = createMockRes();
      const next1 = vi.fn();
      middleware(req1, res1, next1);

      res1.end();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const req2 = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId } });
          const res2 = createMockRes();
          const next2 = vi.fn();
          middleware(req2, res2, next2);
          expect(next2).toHaveBeenCalled();
          resolve();
        }, 600);
      });
    });

    it('allows PUT requests to be deduplicated', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-put-' + Date.now();
      const userId = 'user-put-' + Date.now();

      const req1 = createMockReq({ method: 'PUT', path: uniquePath, user: { id: userId }, body: { val: 1 } });
      const res1 = createMockRes();
      middleware(req1, res1, vi.fn());

      const req2 = createMockReq({ method: 'PUT', path: uniquePath, user: { id: userId }, body: { val: 1 } });
      const res2 = createMockRes();
      const next2 = vi.fn();
      middleware(req2, res2, next2);

      expect(res2.status).toHaveBeenCalledWith(429);
      expect(next2).not.toHaveBeenCalled();
    });

    it('wraps response.end() for cleanup', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-end-' + Date.now();
      const userId = 'user-end-' + Date.now();

      const req = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId } });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(typeof res.end).toBe('function');
      res.end();
    });

    it('wraps response.json() for cleanup', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-json-' + Date.now();
      const userId = 'user-json-' + Date.now();

      const req = createMockReq({ method: 'POST', path: uniquePath, user: { id: userId } });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      expect(typeof res.json).toBe('function');
      res.json({ success: true });
    });

    it('uses custom methods option', () => {
      const middleware = requestDeduplication({ methods: ['PATCH'] });
      const req = createMockReq({ method: 'POST', path: '/api/test' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('uses custom pathPatterns option', () => {
      const middleware = requestDeduplication({ pathPatterns: [/^\/custom\//] });
      const req = createMockReq({ method: 'POST', path: '/api/test' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getDeduplicationStats', () => {
    it('returns correct format', () => {
      const stats = getDeduplicationStats();
      expect(stats).toHaveProperty('pendingCount');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.pendingCount).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('entries have correct shape when pending requests exist', () => {
      const middleware = requestDeduplication();
      const uniquePath = '/api/test-stats-' + Date.now();
      const req = createMockReq({ method: 'POST', path: uniquePath, user: { id: 'stats-user-' + Date.now() } });
      const res = createMockRes();
      middleware(req, res, vi.fn());

      const stats = getDeduplicationStats();
      if (stats.pendingCount > 0) {
        const entry = stats.entries[0];
        expect(entry).toHaveProperty('key');
        expect(entry).toHaveProperty('age');
        expect(typeof entry.key).toBe('string');
        expect(typeof entry.age).toBe('number');
      }
    });
  });
});
