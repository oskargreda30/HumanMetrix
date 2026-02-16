import { describe, it, expect, vi, beforeEach } from 'vitest';
import { csrfProtection, getCsrfToken } from '../../server/middleware/csrf';

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

describe('csrf middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('csrfProtection', () => {
    it('returns a middleware function', () => {
      const middleware = csrfProtection();
      expect(typeof middleware).toBe('function');
    });

    it('generates token when no cookie exists', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'GET', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          secure: true,
          sameSite: 'none',
          path: '/',
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('reuses existing cookie token', () => {
      const middleware = csrfProtection();
      const existingToken = 'existing-csrf-token-123';
      const req = createMockReq({ method: 'GET', cookies: { csrf_token: existingToken } });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect((req as any).csrfToken).toBe(existingToken);
      expect(next).toHaveBeenCalled();
    });

    it('allows GET requests without token validation', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'GET', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks POST without matching tokens', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/some-protected-route',
        cookies: { csrf_token: 'cookie-token' },
        headers: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks POST when header and cookie tokens do not match', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/some-protected-route',
        cookies: { csrf_token: 'cookie-token' },
        headers: { 'x-csrf-token': 'different-header-token' },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows POST with matching header and cookie tokens', () => {
      const middleware = csrfProtection();
      const token = 'matching-token-abc123';
      const req = createMockReq({
        method: 'POST',
        path: '/api/some-protected-route',
        cookies: { csrf_token: token },
        headers: { 'x-csrf-token': token },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('exempts /api/login path', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/login', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('exempts /api/signup path', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/signup', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts /api/stripe/webhook path', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/stripe/webhook', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts /api/contact path', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/contact', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts /api/webhooks/airwallex path', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/webhooks/airwallex', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts paths with trailing slash match like /api/invite/', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'POST', path: '/api/invite/some-id', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts requests with x-api-key header', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/some-protected-route',
        cookies: {},
        headers: { 'x-api-key': 'some-api-key' },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('exempts requests with authorization header', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/some-protected-route',
        cookies: {},
        headers: { authorization: 'Bearer some-token' },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('exempts abandon endpoint pattern', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/assessments/abc123/abandon',
        cookies: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('does not exempt abandon-like paths that do not match pattern', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'POST',
        path: '/api/assessments/abc123/abandon/extra',
        cookies: {},
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('sets csrfToken on request object', () => {
      const middleware = csrfProtection();
      const req = createMockReq({ method: 'GET', cookies: {} });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect((req as any).csrfToken).toBeDefined();
      expect(typeof (req as any).csrfToken).toBe('string');
      expect((req as any).csrfToken.length).toBeGreaterThan(0);
    });

    it('validates DELETE method as state-changing', () => {
      const middleware = csrfProtection();
      const req = createMockReq({
        method: 'DELETE',
        path: '/api/some-protected-route',
        cookies: { csrf_token: 'token-a' },
        headers: { 'x-csrf-token': 'token-b' },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('validates PATCH method as state-changing', () => {
      const middleware = csrfProtection();
      const token = 'valid-token-xyz';
      const req = createMockReq({
        method: 'PATCH',
        path: '/api/some-protected-route',
        cookies: { csrf_token: token },
        headers: { 'x-csrf-token': token },
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getCsrfToken', () => {
    it('returns token from request', () => {
      const req = createMockReq();
      (req as any).csrfToken = 'test-token-123';

      const token = getCsrfToken(req as any);
      expect(token).toBe('test-token-123');
    });

    it('returns empty string when no token exists', () => {
      const req = createMockReq();
      const token = getCsrfToken(req as any);
      expect(token).toBe('');
    });
  });
});
