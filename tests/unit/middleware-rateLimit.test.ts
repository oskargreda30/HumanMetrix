import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter, apiRateLimiter, authRateLimiter, assessmentRateLimiter, stripeRateLimiter, getRateLimitStats } from '../../server/middleware/rateLimit';

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

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRateLimiter', () => {
    it('returns a middleware function', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
      expect(typeof limiter).toBe('function');
      expect(limiter.length).toBe(3);
    });

    it('allows requests under the limit', () => {
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
      const req = createMockReq({ ip: 'under-limit-test-' + Date.now() });
      const res = createMockRes();
      const next = vi.fn();

      limiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks requests over the limit with 429', () => {
      const uniqueIp = 'over-limit-test-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

      for (let i = 0; i < 2; i++) {
        const req = createMockReq({ ip: uniqueIp });
        const res = createMockRes();
        const next = vi.fn();
        limiter(req, res, next);
      }

      const req = createMockReq({ ip: uniqueIp });
      const res = createMockRes();
      const next = vi.fn();
      limiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ message: 'Too many requests, please try again later.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('sets correct rate limit headers', () => {
      const uniqueIp = 'headers-test-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
      const req = createMockReq({ ip: uniqueIp });
      const res = createMockRes();
      const next = vi.fn();

      limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('decrements remaining count with each request', () => {
      const uniqueIp = 'decrement-test-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });

      const req1 = createMockReq({ ip: uniqueIp });
      const res1 = createMockRes();
      limiter(req1, res1, vi.fn());
      expect(res1.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);

      const req2 = createMockReq({ ip: uniqueIp });
      const res2 = createMockRes();
      limiter(req2, res2, vi.fn());
      expect(res2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 3);
    });

    it('resets after window expires', () => {
      const uniqueIp = 'reset-test-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 100, maxRequests: 1 });
      const req = createMockReq({ ip: uniqueIp });
      const res = createMockRes();
      const next = vi.fn();

      limiter(req, res, next);
      expect(next).toHaveBeenCalled();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const req2 = createMockReq({ ip: uniqueIp });
          const res2 = createMockRes();
          const next2 = vi.fn();
          limiter(req2, res2, next2);
          expect(next2).toHaveBeenCalled();
          expect(res2.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
          resolve();
        }, 150);
      });
    });

    it('uses custom keyGenerator', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req) => req.headers['x-custom-key'] || 'default',
      });

      const req1 = createMockReq({ headers: { 'x-custom-key': 'user-a-' + Date.now() } });
      const res1 = createMockRes();
      const next1 = vi.fn();
      limiter(req1, res1, next1);
      expect(next1).toHaveBeenCalled();

      const req2 = createMockReq({ headers: { 'x-custom-key': 'user-b-' + Date.now() } });
      const res2 = createMockRes();
      const next2 = vi.fn();
      limiter(req2, res2, next2);
      expect(next2).toHaveBeenCalled();
    });

    it('uses custom message', () => {
      const uniqueIp = 'custom-msg-test-' + Date.now();
      const customMessage = 'Custom rate limit message';
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1, message: customMessage });

      const req1 = createMockReq({ ip: uniqueIp });
      limiter(req1, createMockRes(), vi.fn());

      const req2 = createMockReq({ ip: uniqueIp });
      const res2 = createMockRes();
      limiter(req2, res2, vi.fn());

      expect(res2.status).toHaveBeenCalledWith(429);
      expect(res2.json).toHaveBeenCalledWith({ message: customMessage });
    });

    it('uses x-forwarded-for header for key generation by default', () => {
      const forwardedIp = 'forwarded-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

      const req1 = createMockReq({ headers: { 'x-forwarded-for': forwardedIp }, ip: '10.0.0.1' });
      const res1 = createMockRes();
      limiter(req1, res1, vi.fn());

      const req2 = createMockReq({ headers: { 'x-forwarded-for': forwardedIp }, ip: '10.0.0.1' });
      const res2 = createMockRes();
      const next2 = vi.fn();
      limiter(req2, res2, next2);

      expect(res2.status).toHaveBeenCalledWith(429);
    });
  });

  describe('exported rate limiters', () => {
    it('apiRateLimiter is a function', () => {
      expect(typeof apiRateLimiter).toBe('function');
    });

    it('authRateLimiter is a function', () => {
      expect(typeof authRateLimiter).toBe('function');
    });

    it('assessmentRateLimiter is a function', () => {
      expect(typeof assessmentRateLimiter).toBe('function');
    });

    it('stripeRateLimiter is a function', () => {
      expect(typeof stripeRateLimiter).toBe('function');
    });
  });

  describe('getRateLimitStats', () => {
    it('returns correct format', () => {
      const stats = getRateLimitStats();
      expect(stats).toHaveProperty('entriesCount');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.entriesCount).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('entries have correct shape', () => {
      const uniqueIp = 'stats-test-' + Date.now();
      const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
      limiter(createMockReq({ ip: uniqueIp }), createMockRes(), vi.fn());

      const stats = getRateLimitStats();
      expect(stats.entriesCount).toBeGreaterThan(0);
      const entry = stats.entries[0];
      expect(entry).toHaveProperty('key');
      expect(entry).toHaveProperty('count');
      expect(entry).toHaveProperty('resetsIn');
      expect(typeof entry.key).toBe('string');
      expect(typeof entry.count).toBe('number');
      expect(typeof entry.resetsIn).toBe('number');
    });
  });
});
