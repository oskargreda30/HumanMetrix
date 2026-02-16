import { describe, it, expect, vi } from 'vitest';
import { configureKeepAlive, keepAliveHeaders } from '../../server/middleware/keepAlive';

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

describe('keepAlive middleware', () => {
  describe('configureKeepAlive', () => {
    it('sets keepAliveTimeout to 65000', () => {
      const mockServer: any = {
        keepAliveTimeout: 0,
        headersTimeout: 0,
      };

      configureKeepAlive(mockServer);

      expect(mockServer.keepAliveTimeout).toBe(65000);
    });

    it('sets headersTimeout to 66000', () => {
      const mockServer: any = {
        keepAliveTimeout: 0,
        headersTimeout: 0,
      };

      configureKeepAlive(mockServer);

      expect(mockServer.headersTimeout).toBe(66000);
    });
  });

  describe('keepAliveHeaders', () => {
    it('returns a middleware function', () => {
      const middleware = keepAliveHeaders();
      expect(typeof middleware).toBe('function');
    });

    it('sets Connection header to keep-alive', () => {
      const middleware = keepAliveHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('sets Keep-Alive header', () => {
      const middleware = keepAliveHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Keep-Alive', 'timeout=65, max=1000');
    });

    it('calls next after setting headers', () => {
      const middleware = keepAliveHeaders();
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
