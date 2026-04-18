import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
const mockStorage = vi.hoisted(() => ({
  getPartnerApiKeyByPrefix: vi.fn(),
  getPartnerAccount: vi.fn(),
  updatePartnerApiKeyLastUsed: vi.fn(),
  createUsageEvent: vi.fn(),
}));

vi.mock('../../server/storage', () => ({ storage: mockStorage }));
vi.mock('../../server/partner-notifications', () => ({
  trackApiAuthFailure: vi.fn(),
  trackNewIpAccess: vi.fn(),
}));
vi.mock('../../server/security-monitor', () => ({
  trackApiCall: vi.fn(),
}));

import { generateApiKey, validateApiKey, partnerAuth } from '../../server/partner-auth';


function makeActivePartner(overrides: Record<string, any> = {}) {
  return {
    id: 'partner-1',
    companyName: 'Acme Corp',
    isActive: true,
    apiAccessSuspendedAt: null,
    ...overrides,
  };
}

function makeApiKeyRecord(fullKey: string, overrides: Record<string, any> = {}) {
  const keyHash = bcrypt.hashSync(fullKey, 10);
  return {
    id: 'key-1',
    partnerId: 'partner-1',
    keyPrefix: fullKey.slice(0, 8),
    keyHash,
    isActive: true,
    expiresAt: null,
    rateLimit: 100,
    permissions: ['read', 'write'],
    ...overrides,
  };
}


describe('generateApiKey() (real server/partner-auth.ts)', () => {
  it('generates a live key with hm_live_ prefix', () => {
    const { fullKey, prefix } = generateApiKey('live');
    expect(fullKey.startsWith('hm_live_')).toBe(true);
    expect(prefix).toBe('hm_live_');
    expect(fullKey.length).toBeGreaterThan(8);
  });

  it('generates a test key with hm_test_ prefix by default', () => {
    const { fullKey, prefix } = generateApiKey('test');
    expect(fullKey.startsWith('hm_test_')).toBe(true);
    expect(prefix).toBe('hm_test_');
  });

  it('generates a hash that matches the full key (bcrypt roundtrip)', () => {
    const { fullKey, hash } = generateApiKey();
    expect(bcrypt.compareSync(fullKey, hash)).toBe(true);
  });

  it('generates a 4-character hint from the end of the key', () => {
    const { fullKey, hint } = generateApiKey();
    expect(hint).toBe(fullKey.slice(-4));
    expect(hint).toHaveLength(4);
  });

  it('generates unique keys on each call', () => {
    const key1 = generateApiKey().fullKey;
    const key2 = generateApiKey().fullKey;
    expect(key1).not.toBe(key2);
  });
});


describe('validateApiKey() (real server/partner-auth.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when apiKey is empty string', async () => {
    const result = await validateApiKey('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects when no key record found in storage', async () => {
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(null);
    const result = await validateApiKey('hm_test_unknownkey123456');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid api key/i);
  });

  it('rejects a revoked key (isActive: false)', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey, { isActive: false });
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/revoked/i);
  });

  it('rejects an expired key (expiresAt in the past)', async () => {
    const { fullKey } = generateApiKey();
    const pastDate = new Date(Date.now() - 1000);
    const keyRecord = makeApiKeyRecord(fullKey, { expiresAt: pastDate });
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it('rejects when bcrypt hash does not match (wrong key value)', async () => {
    const { fullKey } = generateApiKey();
    // Store a hash for a different key but same prefix lookup
    const wrongKey = 'hm_test_' + 'z'.repeat(32);
    const keyRecord = makeApiKeyRecord(wrongKey);
    keyRecord.keyPrefix = fullKey.slice(0, 8); // prefix matches, hash won't
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid api key/i);
  });

  it('rejects when partner account not found', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey);
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(null);

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/partner account not found/i);
  });

  it('rejects when partner account is inactive', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey);
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(makeActivePartner({ isActive: false }));

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/inactive/i);
  });

  it('rejects when partner API access is suspended', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey);
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(
      makeActivePartner({ apiAccessSuspendedAt: new Date() })
    );

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/suspended/i);
  });

  it('returns valid=true with partner and keyRecord for a fully valid key', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey);
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const result = await validateApiKey(fullKey);

    expect(result.valid).toBe(true);
    expect(result.partner).toEqual(partner);
    expect(result.keyRecord).toEqual(keyRecord);
    expect(mockStorage.updatePartnerApiKeyLastUsed).toHaveBeenCalledWith(keyRecord.id);
  });

  it('accepts a key with a future expiry date', async () => {
    const { fullKey } = generateApiKey();
    const futureDate = new Date(Date.now() + 86400000);
    const keyRecord = makeApiKeyRecord(fullKey, { expiresAt: futureDate });
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const result = await validateApiKey(fullKey);
    expect(result.valid).toBe(true);
  });
});


describe('partnerAuth() middleware (real server/partner-auth.ts)', () => {
  function makeReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      path: '/api/partner/sessions',
      socket: { remoteAddress: '127.0.0.1' },
      ...overrides,
    };
  }

  function makeRes(): any {
    const res: any = {
      statusCode: 200,
      _json: null,
      status: vi.fn(function (code: number) { res.statusCode = code; return res; }),
      json: vi.fn(function (data: any) { res._json = data; return res; }),
    };
    return res;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const middleware = partnerAuth();
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._json?.error).toBe('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with "Bearer "', async () => {
    const middleware = partnerAuth();
    const req = makeReq({ headers: { authorization: 'Basic abc123' } });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when API key lookup returns no record', async () => {
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(null);
    const middleware = partnerAuth();
    const req = makeReq({ headers: { authorization: 'Bearer hm_test_badkey123456789' } });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when key lacks a required permission', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey, { permissions: ['read'] });
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const middleware = partnerAuth(['admin']); // key only has 'read'
    const req = makeReq({ headers: { authorization: `Bearer ${fullKey}` } });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res._json?.error).toBe('Forbidden');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches partner/apiKey for a valid request', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey, { permissions: ['read', 'write'] });
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const middleware = partnerAuth(['read']);
    const req = makeReq({ headers: { authorization: `Bearer ${fullKey}` } });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.partner).toEqual(partner);
    expect(req.apiKey).toEqual(keyRecord);
  });

  it('calls next() with no required permissions (open partner route)', async () => {
    const { fullKey } = generateApiKey();
    const keyRecord = makeApiKeyRecord(fullKey, { permissions: [] });
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const middleware = partnerAuth();
    const req = makeReq({ headers: { authorization: `Bearer ${fullKey}` } });
    const res = makeRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});


describe('Partner API rate limiting', () => {
  it('returns 429 after exceeding per-key request limit', async () => {
    const { fullKey } = generateApiKey();
    // Use a unique ID per test run to avoid cross-test counter pollution from
    // the module-level rateLimitMap singleton in server/partner-auth.ts
    const uniqueKeyId = `rate-limit-test-${Date.now()}-${Math.random()}`;
    const keyRecord = makeApiKeyRecord(fullKey, {
      id: uniqueKeyId,
      rateLimit: 2,
      permissions: [],
    });
    const partner = makeActivePartner();
    mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
    mockStorage.getPartnerAccount.mockResolvedValue(partner);
    mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

    const middleware = partnerAuth();
    const makeR = () => ({
      headers: { authorization: `Bearer ${fullKey}` },
      path: '/api/partner/sessions',
      socket: { remoteAddress: '127.0.0.1' },
    });
    const makeResHelper = () => {
      const r: any = {
        statusCode: 200, _json: null,
        status: vi.fn(function (c: number) { r.statusCode = c; return r; }),
        json: vi.fn(function (d: any) { r._json = d; return r; }),
      };
      return r;
    };

    // First two calls should succeed (within the limit of 2)
    const res1 = makeResHelper(); const next1 = vi.fn();
    await middleware(makeR(), res1, next1);
    expect(next1).toHaveBeenCalled();

    const res2 = makeResHelper(); const next2 = vi.fn();
    await middleware(makeR(), res2, next2);
    expect(next2).toHaveBeenCalled();

    // Third call should be rate-limited (429)
    const res3 = makeResHelper(); const next3 = vi.fn();
    await middleware(makeR(), res3, next3);
    expect(res3.statusCode).toBe(429);
    expect(next3).not.toHaveBeenCalled();
  });
});
