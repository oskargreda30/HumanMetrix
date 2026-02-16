// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

let cookieValue = '';
Object.defineProperty(document, 'cookie', {
  get: () => cookieValue,
  set: (v: string) => { cookieValue = v; },
  configurable: true,
});

function safeJsonParse(body: string) {
  try { return JSON.parse(body); } catch { return {}; }
}

function makeResponse(body: string, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue(safeJsonParse(body)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

describe('queryClient module', () => {
  let getHumanReadableError: typeof import('@/lib/queryClient').getHumanReadableError;
  let apiRequest: typeof import('@/lib/queryClient').apiRequest;
  let getQueryFn: typeof import('@/lib/queryClient').getQueryFn;
  let queryClient: typeof import('@/lib/queryClient').queryClient;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    cookieValue = '';
    const mod = await import('@/lib/queryClient');
    getHumanReadableError = mod.getHumanReadableError;
    apiRequest = mod.apiRequest;
    getQueryFn = mod.getQueryFn;
    queryClient = mod.queryClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHumanReadableError', () => {
    it('returns message from Error instance', () => {
      expect(getHumanReadableError(new Error('something broke'))).toBe('something broke');
    });

    it('returns fallback for Error with empty message', () => {
      const err = new Error('');
      expect(getHumanReadableError(err, 'fallback')).toBe('fallback');
    });

    it('returns string error directly', () => {
      expect(getHumanReadableError('bad request')).toBe('bad request');
    });

    it('parses JSON string with message field', () => {
      expect(getHumanReadableError(JSON.stringify({ message: 'from json' }))).toBe('from json');
    });

    it('returns raw string for valid JSON without recognized message fields', () => {
      const jsonStr = JSON.stringify({ foo: 'bar' });
      expect(getHumanReadableError(jsonStr)).toBe(jsonStr);
    });

    it('returns raw string for invalid JSON', () => {
      expect(getHumanReadableError('not json at all')).toBe('not json at all');
    });

    it('extracts message from object', () => {
      expect(getHumanReadableError({ message: 'obj msg' })).toBe('obj msg');
    });

    it('extracts error from object', () => {
      expect(getHumanReadableError({ error: 'err field' })).toBe('err field');
    });

    it('extracts detail from object', () => {
      expect(getHumanReadableError({ detail: 'detail field' })).toBe('detail field');
    });

    it('extracts errorMessage from object', () => {
      expect(getHumanReadableError({ errorMessage: 'errMsg field' })).toBe('errMsg field');
    });

    it('extracts first string from errors array', () => {
      expect(getHumanReadableError({ errors: ['first error', 'second'] })).toBe('first error');
    });

    it('extracts message from first object in errors array', () => {
      expect(getHumanReadableError({ errors: [{ message: 'nested msg' }] })).toBe('nested msg');
    });

    it('extracts first string from array input', () => {
      expect(getHumanReadableError(['arr string'])).toBe('arr string');
    });

    it('extracts message from first object in array input', () => {
      expect(getHumanReadableError([{ message: 'arr obj msg' }])).toBe('arr obj msg');
    });

    it('returns fallback for object with no recognized fields', () => {
      expect(getHumanReadableError({ foo: 'bar' }, 'my fallback')).toBe('my fallback');
    });

    it('returns fallback for null', () => {
      expect(getHumanReadableError(null)).toBe('An unexpected error occurred');
    });

    it('returns fallback for undefined', () => {
      expect(getHumanReadableError(undefined)).toBe('An unexpected error occurred');
    });

    it('returns fallback for number', () => {
      expect(getHumanReadableError(42, 'num fallback')).toBe('num fallback');
    });

    it('returns fallback for empty string', () => {
      expect(getHumanReadableError('', 'empty fallback')).toBe('empty fallback');
    });

    it('uses default fallback message', () => {
      expect(getHumanReadableError(null)).toBe('An unexpected error occurred');
    });
  });

  describe('apiRequest', () => {
    it('makes a successful GET request', async () => {
      const res = makeResponse('{"ok":true}');
      mockFetch.mockResolvedValue(res);

      const result = await apiRequest('GET', '/api/test');
      expect(result).toBe(res);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }));
    });

    it('makes a successful POST with data, Content-Type header, and CSRF token', async () => {
      cookieValue = 'other=abc; csrf_token=mytoken123';
      const res = makeResponse('{"ok":true}');
      mockFetch.mockResolvedValue(res);

      await apiRequest('POST', '/api/create', { name: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(callArgs[1].headers['x-csrf-token']).toBe('mytoken123');
      expect(callArgs[1].body).toBe(JSON.stringify({ name: 'test' }));
    });

    it('does not add CSRF header for GET even if token exists', async () => {
      cookieValue = 'csrf_token=tok';
      const res = makeResponse('{}');
      mockFetch.mockResolvedValue(res);

      await apiRequest('GET', '/api/data');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['x-csrf-token']).toBeUndefined();
    });

    it('handles no csrf_token in cookies', async () => {
      cookieValue = 'session=abc; other=xyz';
      const res = makeResponse('{}');
      mockFetch.mockResolvedValue(res);

      await apiRequest('POST', '/api/action', { x: 1 });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['x-csrf-token']).toBeUndefined();
    });

    it('handles empty cookie string', async () => {
      cookieValue = '';
      const res = makeResponse('{}');
      mockFetch.mockResolvedValue(res);

      await apiRequest('POST', '/api/action', { x: 1 });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['x-csrf-token']).toBeUndefined();
    });

    it('handles cookie without = sign', async () => {
      cookieValue = 'nocookieequals';
      const res = makeResponse('{}');
      mockFetch.mockResolvedValue(res);

      await apiRequest('POST', '/api/test', { a: 1 });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['x-csrf-token']).toBeUndefined();
    });

    it('throws on non-ok response with text error', async () => {
      const res = makeResponse('Not Found', 404, 'Not Found');
      (res as any).ok = false;
      mockFetch.mockResolvedValue(res);

      await expect(apiRequest('GET', '/api/missing')).rejects.toThrow('Not Found');
    });

    it('throws on non-ok response with JSON body containing message', async () => {
      const res = makeResponse(JSON.stringify({ message: 'Validation failed' }), 400, 'Bad Request');
      (res as any).ok = false;
      mockFetch.mockResolvedValue(res);

      await expect(apiRequest('GET', '/api/bad')).rejects.toThrow('Validation failed');
    });

    it('throws generic message when error looks like raw JSON object', async () => {
      const res = makeResponse(JSON.stringify({ unknownField: true }), 500, 'Server Error');
      (res as any).ok = false;
      mockFetch.mockResolvedValue(res);

      await expect(apiRequest('GET', '/api/fail')).rejects.toThrow('Request failed with status 500');
    });

    it('throws timeout message on AbortError', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      await expect(apiRequest('GET', '/api/slow')).rejects.toThrow(
        'Request timeout - please check your connection and try again'
      );
    });

    it('re-throws non-AbortError errors', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      await expect(apiRequest('GET', '/api/down')).rejects.toThrow('Failed to fetch');
    });

    it('uses custom timeout option', async () => {
      vi.useFakeTimers();
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });

      const promise = apiRequest('GET', '/api/slow', undefined, { timeoutMs: 100 });

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Request timeout - please check your connection and try again');
      vi.useRealTimers();
    });

    it('adds CSRF header for PUT, PATCH, DELETE methods', async () => {
      cookieValue = 'csrf_token=tok123';

      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        mockFetch.mockReset();
        const res = makeResponse('{}');
        mockFetch.mockResolvedValue(res);

        await apiRequest(method, '/api/resource', { id: 1 });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers['x-csrf-token']).toBe('tok123');
      }
    });

    it('uses statusText when response body is empty', async () => {
      const res = makeResponse('', 403, 'Forbidden');
      (res as any).ok = false;
      (res.text as any).mockResolvedValue('');
      mockFetch.mockResolvedValue(res);

      await expect(apiRequest('GET', '/api/auth')).rejects.toThrow('Forbidden');
    });
  });

  describe('getQueryFn', () => {
    it('returns JSON on successful fetch', async () => {
      const data = { id: 1, name: 'test' };
      const res = makeResponse(JSON.stringify(data));
      mockFetch.mockResolvedValue(res);

      const queryFn = getQueryFn<typeof data>({ on401: 'throw' });
      const result = await queryFn({ queryKey: ['/api/items'] } as any);

      expect(result).toEqual(data);
    });

    it('returns null on 401 with on401="returnNull"', async () => {
      const res = makeResponse('Unauthorized', 401, 'Unauthorized');
      mockFetch.mockResolvedValue(res);

      const queryFn = getQueryFn({ on401: 'returnNull' });
      const result = await queryFn({ queryKey: ['/api/me'] } as any);

      expect(result).toBeNull();
    });

    it('throws on 401 with on401="throw"', async () => {
      const res = makeResponse('Unauthorized', 401, 'Unauthorized');
      (res as any).ok = false;
      mockFetch.mockResolvedValue(res);

      const queryFn = getQueryFn({ on401: 'throw' });
      await expect(queryFn({ queryKey: ['/api/me'] } as any)).rejects.toThrow();
    });

    it('throws on non-ok response', async () => {
      const res = makeResponse('Server Error', 500, 'Internal Server Error');
      (res as any).ok = false;
      mockFetch.mockResolvedValue(res);

      const queryFn = getQueryFn({ on401: 'throw' });
      await expect(queryFn({ queryKey: ['/api/data'] } as any)).rejects.toThrow();
    });

    it('throws timeout message on AbortError', async () => {
      const abortError = new DOMException('aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      const queryFn = getQueryFn({ on401: 'throw' });
      await expect(queryFn({ queryKey: ['/api/slow'] } as any)).rejects.toThrow(
        'Request timeout - please check your connection and try again'
      );
    });

    it('joins multi-segment query keys', async () => {
      const res = makeResponse('{"ok":true}');
      mockFetch.mockResolvedValue(res);

      const queryFn = getQueryFn({ on401: 'throw' });
      await queryFn({ queryKey: ['/api/items', '123'] } as any);

      expect(mockFetch).toHaveBeenCalledWith('/api/items/123', expect.any(Object));
    });

    it('re-throws non-AbortError errors', async () => {
      const err = new TypeError('Network failed');
      mockFetch.mockRejectedValue(err);

      const queryFn = getQueryFn({ on401: 'throw' });
      await expect(queryFn({ queryKey: ['/api/x'] } as any)).rejects.toThrow('Network failed');
    });
  });

  describe('queryClient instance', () => {
    it('is an instance of QueryClient', () => {
      expect(queryClient).toBeInstanceOf(QueryClient);
    });

    it('has retry disabled for queries', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.retry).toBe(false);
    });

    it('has retry disabled for mutations', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.mutations?.retry).toBe(false);
    });
  });
});
