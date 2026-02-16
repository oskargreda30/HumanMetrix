import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = vi.hoisted(() => ({
  getPartnerApiKeyByPrefix: vi.fn(),
  getPartnerAccount: vi.fn(),
  updatePartnerApiKeyLastUsed: vi.fn(),
  createUsageEvent: vi.fn(),
  consumePartnerTest: vi.fn(),
  getPartnerQuotaBalance: vi.fn(),
  updatePartnerQuotaNotification: vi.fn(),
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../../server/security-monitor', () => ({
  trackApiCall: vi.fn().mockResolvedValue(false),
  notifyHighApiUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/partner-notifications', () => ({
  trackApiAuthFailure: vi.fn().mockResolvedValue(undefined),
  trackNewIpAccess: vi.fn().mockResolvedValue(undefined),
}));

import bcrypt from 'bcryptjs';
import {
  generateApiKey,
  validateApiKey,
  partnerAuth,
  trackUsage,
  consumeTestCredit,
  getQuotaStatus,
} from '../../server/partner-auth';

function createMockReq(overrides: any = {}) {
  return {
    headers: {},
    path: '/api/test',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('Partner Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateApiKey()', () => {
    it('generates test environment prefix hm_test_', () => {
      const result = generateApiKey('test');
      expect(result.prefix).toBe('hm_test_');
      expect(result.fullKey.startsWith('hm_test_')).toBe(true);
    });

    it('generates live environment prefix hm_live_', () => {
      const result = generateApiKey('live');
      expect(result.prefix).toBe('hm_live_');
      expect(result.fullKey.startsWith('hm_live_')).toBe(true);
    });

    it('defaults to test environment', () => {
      const result = generateApiKey();
      expect(result.prefix).toBe('hm_test_');
    });

    it('returns fullKey, prefix, hash, and hint', () => {
      const result = generateApiKey('test');
      expect(result).toHaveProperty('fullKey');
      expect(result).toHaveProperty('prefix');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('hint');
    });

    it('generates key with correct total length (prefix + 32 chars)', () => {
      const testResult = generateApiKey('test');
      expect(testResult.fullKey.length).toBe(8 + 32);

      const liveResult = generateApiKey('live');
      expect(liveResult.fullKey.length).toBe(8 + 32);
    });

    it('hint is last 4 characters of fullKey', () => {
      const result = generateApiKey('test');
      expect(result.hint).toBe(result.fullKey.slice(-4));
      expect(result.hint.length).toBe(4);
    });

    it('generates bcrypt format hash', () => {
      const result = generateApiKey('test');
      expect(result.hash.startsWith('$2')).toBe(true);
      expect(result.hash.length).toBeGreaterThan(50);
    });

    it('hash validates against fullKey', () => {
      const result = generateApiKey('test');
      expect(bcrypt.compareSync(result.fullKey, result.hash)).toBe(true);
    });

    it('generates unique keys on repeated calls', () => {
      const key1 = generateApiKey('test');
      const key2 = generateApiKey('test');
      expect(key1.fullKey).not.toBe(key2.fullKey);
    });

    it('fullKey contains only alphanumeric chars after prefix', () => {
      const result = generateApiKey('test');
      const randomPart = result.fullKey.slice(8);
      expect(randomPart).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('validateApiKey()', () => {
    it('returns invalid for empty API key', async () => {
      const result = await validateApiKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is required');
    });

    it('returns invalid when key not found by prefix', async () => {
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(null);
      const result = await validateApiKey('xx_test_somekey12345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('returns invalid when key is inactive', async () => {
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: false,
        keyHash: 'hash',
        partnerId: 'p1',
      });
      const result = await validateApiKey('hm_test_somekey12345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has been revoked');
    });

    it('returns invalid when key is expired', async () => {
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: 'hash',
        partnerId: 'p1',
        expiresAt: new Date('2020-01-01'),
      });
      const result = await validateApiKey('hm_test_somekey12345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has expired');
    });

    it('returns invalid when hash does not match', async () => {
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: bcrypt.hashSync('different_key', 10),
        partnerId: 'p1',
        expiresAt: null,
      });
      const result = await validateApiKey('hm_test_somekey12345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('returns invalid when partner not found', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue(null);
      const result = await validateApiKey(fullKey);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Partner account not found');
    });

    it('returns invalid when partner is inactive', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: false,
        apiAccessSuspendedAt: null,
      });
      const result = await validateApiKey(fullKey);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Partner account is inactive');
    });

    it('returns invalid when partner is suspended (apiAccessSuspendedAt set)', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: new Date(),
      });
      const result = await validateApiKey(fullKey);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('API access suspended');
    });

    it('returns valid for correct key with active partner', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-1',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const result = await validateApiKey(fullKey);
      expect(result.valid).toBe(true);
      expect(result.partner).toBeDefined();
      expect(result.keyRecord).toBeDefined();
    });

    it('updates lastUsed on valid key', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-valid-used',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      await validateApiKey(fullKey);
      expect(mockStorage.updatePartnerApiKeyLastUsed).toHaveBeenCalledWith('key-valid-used');
    });

    it('accepts key with no expiration date (null expiresAt)', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-noexp',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const result = await validateApiKey(fullKey);
      expect(result.valid).toBe(true);
    });
  });

  describe('partnerAuth() middleware', () => {
    it('returns 401 for missing Authorization header', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: expect.stringContaining('Authorization'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid Bearer format (Basic auth)', async () => {
      const req = createMockReq({
        headers: { authorization: 'Basic sometoken' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid API key', async () => {
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(null);
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid_key_here_1234567890123456' },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 429 for rate limit exceeded', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-rl',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
        rateLimit: 2,
        permissions: [],
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const middleware = partnerAuth();

      for (let i = 0; i < 2; i++) {
        const req = createMockReq({
          headers: { authorization: `Bearer ${fullKey}` },
        });
        const res = createMockRes();
        const next = vi.fn();
        await middleware(req, res, next);
      }

      const req = createMockReq({
        headers: { authorization: `Bearer ${fullKey}` },
      });
      const res = createMockRes();
      const next = vi.fn();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 for insufficient permissions', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-perm',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
        rateLimit: 1000,
        permissions: ['read'],
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const req = createMockReq({
        headers: { authorization: `Bearer ${fullKey}` },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth(['write', 'admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: expect.stringContaining('write'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches partner and apiKey to request on success', async () => {
      const { fullKey, hash } = generateApiKey('test');
      const partner = { id: 'p1', isActive: true, apiAccessSuspendedAt: null };
      const keyRecord = {
        id: 'key-success',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
        rateLimit: 1000,
        permissions: ['read'],
      };

      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue(keyRecord);
      mockStorage.getPartnerAccount.mockResolvedValue(partner);
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const req = createMockReq({
        headers: { authorization: `Bearer ${fullKey}` },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth(['read']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.partner).toEqual(partner);
      expect(req.apiKey).toEqual(keyRecord);
    });

    it('calls next without permissions check when none required', async () => {
      const { fullKey, hash } = generateApiKey('test');
      mockStorage.getPartnerApiKeyByPrefix.mockResolvedValue({
        id: 'key-noperm',
        isActive: true,
        keyHash: hash,
        partnerId: 'p1',
        expiresAt: null,
        rateLimit: 1000,
        permissions: [],
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        isActive: true,
        apiAccessSuspendedAt: null,
      });
      mockStorage.updatePartnerApiKeyLastUsed.mockResolvedValue(undefined);

      const req = createMockReq({
        headers: { authorization: `Bearer ${fullKey}` },
      });
      const res = createMockRes();
      const next = vi.fn();

      const middleware = partnerAuth();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('trackUsage()', () => {
    it('creates usage event with all parameters', async () => {
      mockStorage.createUsageEvent.mockResolvedValue({ id: 'event-1' });
      await trackUsage('p1', 'key-1', 'session-1', 'session_created', 'fit', false);
      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'p1',
          apiKeyId: 'key-1',
          sessionId: 'session-1',
          eventType: 'session_created',
          assessmentType: 'fit',
          billable: false,
        })
      );
    });

    it('handles null apiKeyId and sessionId', async () => {
      mockStorage.createUsageEvent.mockResolvedValue({ id: 'event-2' });
      await trackUsage('p1', null, null, 'api_call');
      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: null,
          sessionId: null,
        })
      );
    });

    it('handles billable events with billed amount', async () => {
      mockStorage.createUsageEvent.mockResolvedValue({ id: 'event-3' });
      await trackUsage('p1', 'key-1', 'session-1', 'assessment_completed', 'fit', true, 5.0);
      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          billable: true,
          billedAmount: 5.0,
        })
      );
    });

    it('does not throw on storage error', async () => {
      mockStorage.createUsageEvent.mockRejectedValue(new Error('DB error'));
      await expect(trackUsage('p1', null, null, 'api_call')).resolves.toBeUndefined();
    });

    it('passes partnerOrganisationId when provided', async () => {
      mockStorage.createUsageEvent.mockResolvedValue({ id: 'event-4' });
      await trackUsage('p1', 'key-1', 'session-1', 'session_created', 'fit', false, undefined, 'org-1');
      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerOrganisationId: 'org-1',
        })
      );
    });

    it('defaults partnerOrganisationId to null', async () => {
      mockStorage.createUsageEvent.mockResolvedValue({ id: 'event-5' });
      await trackUsage('p1', 'key-1', 'session-1', 'session_created');
      expect(mockStorage.createUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerOrganisationId: null,
        })
      );
    });
  });

  describe('consumeTestCredit()', () => {
    it('successful consumption returns success with remaining', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 50,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: true,
        quotaAlertThreshold: 80,
        billingType: 'prepaid',
        autoTopUpEnabled: false,
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 50,
        remaining: 50,
      });

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(50);
    });

    it('failed consumption returns failure', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: false,
        remaining: 0,
        suspended: true,
      });

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.success).toBe(false);
    });

    it('returns shouldNotifyFirst at first threshold', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 15,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: true,
        quotaAlertThreshold: 80,
        billingType: 'prepaid',
        autoTopUpEnabled: false,
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 85,
        remaining: 15,
      });
      mockStorage.updatePartnerQuotaNotification.mockResolvedValue(undefined);

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.shouldNotifyFirst).toBe(true);
    });

    it('returns shouldNotifyUrgent at urgent threshold', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 3,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: true,
        quotaAlertThreshold: 80,
        billingType: 'prepaid',
        autoTopUpEnabled: false,
        last70NoticeAt: new Date(),
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 97,
        remaining: 3,
      });
      mockStorage.updatePartnerQuotaNotification.mockResolvedValue(undefined);

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.shouldNotifyUrgent).toBe(true);
    });

    it('triggers auto top-up when conditions are met', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 5,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: false,
        billingType: 'prepaid',
        autoTopUpEnabled: true,
        autoTopUpThreshold: 10,
        autoTopUpPackage: 'pack-50',
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 95,
        remaining: 5,
      });

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.shouldAutoTopUp).toBe(true);
    });

    it('does not auto top-up when not prepaid', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 5,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: false,
        billingType: 'postpaid',
        autoTopUpEnabled: true,
        autoTopUpThreshold: 10,
        autoTopUpPackage: 'pack-50',
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 95,
        remaining: 5,
      });

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.shouldAutoTopUp).toBeFalsy();
    });

    it('handles error gracefully returning failure', async () => {
      mockStorage.consumePartnerTest.mockRejectedValue(new Error('DB error'));

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.suspended).toBe(false);
    });

    it('does not notify when quotaAlertEnabled is false', async () => {
      mockStorage.consumePartnerTest.mockResolvedValue({
        success: true,
        remaining: 15,
        suspended: false,
      });
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        companyName: 'Test Corp',
        quotaAlertEnabled: false,
        quotaAlertThreshold: 80,
        billingType: 'prepaid',
        autoTopUpEnabled: false,
        last70NoticeAt: null,
        last90NoticeAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 85,
        remaining: 15,
      });

      const result = await consumeTestCredit('p1', 'session-1', 'fit');
      expect(result.shouldNotifyFirst).toBeFalsy();
    });
  });

  describe('getQuotaStatus()', () => {
    it('returns correct structure with usage percentage', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        apiAccessSuspendedAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 40,
        remaining: 60,
      });

      const result = await getQuotaStatus('p1');
      expect(result).toEqual({
        testsPurchased: 100,
        testsConsumed: 40,
        remaining: 60,
        usagePercentage: 40,
        isSuspended: false,
      });
    });

    it('returns isSuspended true when apiAccessSuspendedAt is set', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        apiAccessSuspendedAt: new Date(),
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 100,
        testsConsumed: 100,
        remaining: 0,
      });

      const result = await getQuotaStatus('p1');
      expect(result.isSuspended).toBe(true);
      expect(result.usagePercentage).toBe(100);
    });

    it('returns 0 usage percentage when no tests purchased', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        apiAccessSuspendedAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 0,
        testsConsumed: 0,
        remaining: 0,
      });

      const result = await getQuotaStatus('p1');
      expect(result.usagePercentage).toBe(0);
    });

    it('rounds usage percentage to integer', async () => {
      mockStorage.getPartnerAccount.mockResolvedValue({
        id: 'p1',
        apiAccessSuspendedAt: null,
      });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({
        testsPurchased: 3,
        testsConsumed: 1,
        remaining: 2,
      });

      const result = await getQuotaStatus('p1');
      expect(result.usagePercentage).toBe(33);
    });
  });
});
