import { describe, it, expect, vi } from 'vitest';
import { staticCacheHeaders, setSecurityHeaders } from '../../server/middleware/staticCache';

function createMockReq(overrides: any = {}) {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    body: {},
    user: null,
    originalUrl: '/',
    url: '/',
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

describe('staticCache middleware', () => {
  describe('staticCacheHeaders', () => {
    it('returns a middleware function', () => {
      const middleware = staticCacheHeaders();
      expect(typeof middleware).toBe('function');
    });

    it('sets no-store, no-cache for API paths', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/api/users' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate');
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(next).toHaveBeenCalled();
    });

    it('sets no-cache, must-revalidate for HTML paths', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/index.html' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, must-revalidate');
      expect(next).toHaveBeenCalled();
    });

    it('sets no-cache, must-revalidate for root path', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, must-revalidate');
      expect(next).toHaveBeenCalled();
    });

    it('sets immutable cache for hashed JS assets', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/assets/app.a1b2c3d4.js' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
      expect(next).toHaveBeenCalled();
    });

    it('sets immutable cache for hashed CSS assets', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/assets/style.abcdef12.css' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
      expect(next).toHaveBeenCalled();
    });

    it('sets 1 day cache for static assets without hash', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/images/logo.png' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(next).toHaveBeenCalled();
    });

    it('sets 1 day cache for .jpg files', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/photos/hero.jpg' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(next).toHaveBeenCalled();
    });

    it('does not set cache header for other paths', () => {
      const middleware = staticCacheHeaders();
      const req = createMockReq({ path: '/some/other/path' });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('setSecurityHeaders', () => {
    it('returns a middleware function', () => {
      const middleware = setSecurityHeaders();
      expect(typeof middleware).toBe('function');
    });

    it('sets X-Content-Type-Options header', () => {
      const middleware = setSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('sets X-Frame-Options header', () => {
      const middleware = setSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    });

    it('sets X-XSS-Protection header', () => {
      const middleware = setSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('sets Referrer-Policy header', () => {
      const middleware = setSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('calls next after setting all headers', () => {
      const middleware = setSecurityHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledTimes(4);
    });
  });
});
