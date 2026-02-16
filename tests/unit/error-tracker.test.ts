import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/storage', () => ({
  storage: {
    incrementErrorOccurrence: vi.fn(),
    createErrorLog: vi.fn(),
  },
}));

import { logError, errorTrackingMiddleware, captureRouteError, logManualError } from '../../server/error-tracker';
import { storage } from '../../server/storage';
import type { Request, Response, NextFunction } from 'express';

const mockStorage = storage as any;

describe('error-tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.incrementErrorOccurrence.mockResolvedValue(null);
    mockStorage.createErrorLog.mockResolvedValue({});
  });

  describe('logError', () => {
    it('creates error log with correct fields', async () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      await logError(error, {
        endpoint: '/api/test',
        httpMethod: 'POST',
        httpStatus: 500,
      });

      expect(mockStorage.createErrorLog).toHaveBeenCalledTimes(1);
      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.errorMessage).toBe('Test error');
      expect(call.errorType).toBe('TestError');
      expect(call.severity).toBe('error');
      expect(call.status).toBe('new');
      expect(call.endpoint).toBe('/api/test');
      expect(call.httpMethod).toBe('POST');
      expect(call.occurrenceCount).toBe(1);
      expect(call.fingerprint).toBeDefined();
    });

    it('increments occurrence count for duplicate fingerprints', async () => {
      mockStorage.incrementErrorOccurrence.mockResolvedValue({ id: 1 });

      const error = new Error('Duplicate error');
      await logError(error, { endpoint: '/api/test' });

      expect(mockStorage.incrementErrorOccurrence).toHaveBeenCalledTimes(1);
      expect(mockStorage.createErrorLog).not.toHaveBeenCalled();
    });

    it('handles storage failures gracefully', async () => {
      mockStorage.incrementErrorOccurrence.mockRejectedValue(new Error('DB down'));

      const error = new Error('Some error');
      await expect(logError(error)).resolves.toBeUndefined();
    });

    it('sanitises sensitive fields in request body', async () => {
      const error = new Error('Auth error');
      await logError(error, {
        requestBody: {
          username: 'john',
          password: 'secret123',
          token: 'abc',
          normalField: 'visible',
        },
      });

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.requestBody.password).toBe('[REDACTED]');
      expect(call.requestBody.token).toBe('[REDACTED]');
      expect(call.requestBody.username).toBe('john');
      expect(call.requestBody.normalField).toBe('visible');
    });

    it('assigns warning severity for 4xx status', async () => {
      const error = new Error('Not found');
      await logError(error, { httpStatus: 404 });

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.severity).toBe('warning');
    });

    it('assigns error severity for 5xx status', async () => {
      const error = new Error('Server error');
      await logError(error, { httpStatus: 500 });

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.severity).toBe('error');
    });

    it('extracts user agent and IP from request', async () => {
      const error = new Error('req error');
      const mockReq = {
        headers: { 'user-agent': 'TestBrowser/1.0' },
        ip: '127.0.0.1',
      } as unknown as Request;

      await logError(error, {}, mockReq);

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.userAgent).toBe('TestBrowser/1.0');
      expect(call.ipAddress).toBe('127.0.0.1');
    });
  });

  describe('errorTrackingMiddleware', () => {
    it('extracts user and partner info from request', () => {
      const middleware = errorTrackingMiddleware();
      const error = new Error('middleware error');
      const req = {
        originalUrl: '/api/users',
        method: 'GET',
        body: {},
        headers: {},
        user: { id: 'u1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        partner: { id: 'p1', companyName: 'TestCorp' },
      } as any;
      const res = { statusCode: 500 } as Response;
      const next = vi.fn() as NextFunction;

      middleware(error, req, res, next);

      expect(mockStorage.incrementErrorOccurrence).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });

    it('calls next() with the error', () => {
      const middleware = errorTrackingMiddleware();
      const error = new Error('pass through');
      const req = { originalUrl: '/api/test', method: 'GET', body: {}, headers: {} } as any;
      const res = { statusCode: 500 } as Response;
      const next = vi.fn() as NextFunction;

      middleware(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('captureRouteError', () => {
    it('extracts context from request', () => {
      const error = new Error('route error');
      const req = {
        originalUrl: '/api/data',
        method: 'POST',
        headers: {},
        user: { id: 'u2', email: 'user@test.com', firstName: 'Jane' },
        partner: { id: 'p2', name: 'PartnerCo' },
      } as any;

      captureRouteError(error, req, { httpStatus: 400 });

      expect(mockStorage.incrementErrorOccurrence).toHaveBeenCalled();
    });
  });

  describe('logManualError', () => {
    it('creates error with correct severity for critical', async () => {
      await logManualError('Critical failure', { severity: 'critical' });

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.errorType).toBe('CriticalError');
      expect(call.severity).toBe('critical');
    });

    it('creates error with warning severity', async () => {
      await logManualError('Minor issue', { severity: 'warning' });

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.errorType).toBe('WarningError');
    });

    it('creates error with default severity', async () => {
      await logManualError('Regular error');

      const call = mockStorage.createErrorLog.mock.calls[0][0];
      expect(call.errorType).toBe('Error');
    });
  });
});
