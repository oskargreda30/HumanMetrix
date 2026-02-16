/**
 * Integration Tests for CSRF Middleware
 * 
 * Tests the double-submit cookie pattern implementation:
 * - Token generation and cookie setting
 * - Token validation on state-changing methods
 * - Exempt paths (login, signup, webhooks, partner API)
 * - API key bypass
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { csrfProtection, getCsrfToken } from '../../server/middleware/csrf';

// Mock Express request, response, and next function
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/api/test',
    cookies: {},
    headers: {},
    ...overrides,
  };
}

function createMockResponse(): Partial<Response> & { 
  statusCode: number; 
  jsonData: any; 
  cookieData: { name: string; value: string; options: any }[];
} {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    cookieData: [],
    cookie: vi.fn(function(name: string, value: string, options: any) {
      res.cookieData.push({ name, value, options });
      return res;
    }),
    status: vi.fn(function(code: number) {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn(function(data: any) {
      res.jsonData = data;
      return res;
    }),
  };
  return res;
}

describe('CSRF Middleware', () => {
  let middleware: ReturnType<typeof csrfProtection>;
  
  beforeEach(() => {
    middleware = csrfProtection();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate CSRF token if not present in cookies', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      // Should have set a cookie
      expect(res.cookieData.length).toBe(1);
      expect(res.cookieData[0].name).toBe('csrf_token');
      expect(res.cookieData[0].value).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(next).toHaveBeenCalled();
    });

    it('should not regenerate token if already present in cookies', async () => {
      const existingToken = 'existing-token-value-1234567890';
      const req = createMockRequest({
        cookies: { csrf_token: existingToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      // Should not have set a new cookie
      expect(res.cookieData.length).toBe(0);
      expect(next).toHaveBeenCalled();
    });

    it('should attach token to request object', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect((req as any).csrfToken).toBeDefined();
      expect((req as any).csrfToken).toHaveLength(64);
    });
  });

  describe('GET Requests (No Validation)', () => {
    it('should allow GET requests without CSRF token', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should allow HEAD requests without CSRF token', async () => {
      const req = createMockRequest({ method: 'HEAD' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('POST/PUT/PATCH/DELETE Validation', () => {
    const validToken = 'a'.repeat(64);

    it('should reject POST without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/users',
        cookies: { csrf_token: validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.jsonData?.code).toBe('CSRF_VALIDATION_FAILED');
    });

    it('should reject POST with mismatched tokens', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/users',
        cookies: { csrf_token: validToken },
        headers: { 'x-csrf-token': 'different-token' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should allow POST with matching tokens', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/users',
        cookies: { csrf_token: validToken },
        headers: { 'x-csrf-token': validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should reject PUT without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'PUT',
        path: '/api/users/1',
        cookies: { csrf_token: validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should allow PUT with matching tokens', async () => {
      const req = createMockRequest({ 
        method: 'PUT',
        path: '/api/users/1',
        cookies: { csrf_token: validToken },
        headers: { 'x-csrf-token': validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should reject DELETE without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'DELETE',
        path: '/api/users/1',
        cookies: { csrf_token: validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should allow DELETE with matching tokens', async () => {
      const req = createMockRequest({ 
        method: 'DELETE',
        path: '/api/users/1',
        cookies: { csrf_token: validToken },
        headers: { 'x-csrf-token': validToken },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Exempt Paths', () => {
    it('should allow POST to /api/login without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/login',
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should allow POST to /api/signup without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/signup',
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should allow POST to /api/stripe/webhook without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/stripe/webhook',
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should allow POST to /api/partner/sessions without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/partner/sessions',
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should allow POST to /api/partner/sessions/:id without CSRF token', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/partner/sessions/abc123',
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('API Key Bypass', () => {
    it('should bypass CSRF for requests with x-api-key header', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/some-endpoint',
        headers: { 'x-api-key': 'partner-api-key' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass CSRF for requests with Authorization header', async () => {
      const req = createMockRequest({ 
        method: 'POST',
        path: '/api/some-endpoint',
        headers: { 'authorization': 'Bearer token123' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getCsrfToken Helper', () => {
    it('should return token from request object', () => {
      const req = { csrfToken: 'test-token' } as any;
      
      expect(getCsrfToken(req)).toBe('test-token');
    });

    it('should return empty string if no token', () => {
      const req = {} as any;
      
      expect(getCsrfToken(req)).toBe('');
    });
  });

  describe('Cookie Settings', () => {
    it('should set correct cookie options in development', async () => {
      process.env.NODE_ENV = 'development';
      const freshMiddleware = csrfProtection();
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      freshMiddleware(req as Request, res as Response, next as NextFunction);

      expect(res.cookieData[0].options.httpOnly).toBe(false);
      expect(res.cookieData[0].options.secure).toBe(true);
      expect(res.cookieData[0].options.sameSite).toBe('none');
    });

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';
      const freshMiddleware = csrfProtection();
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      freshMiddleware(req as Request, res as Response, next as NextFunction);

      expect(res.cookieData[0].options.secure).toBe(true);
    });
  });
});
