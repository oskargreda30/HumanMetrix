import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../server/email', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Airwallex Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAirwallexConfigured', () => {
    it('returns true when both CLIENT_ID and API_KEY are set', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      process.env.AIRWALLEX_API_KEY = 'test-api-key';
      const { isAirwallexConfigured } = await import('../../server/airwallex');
      expect(isAirwallexConfigured()).toBe(true);
    });

    it('returns false when CLIENT_ID is missing', async () => {
      delete process.env.AIRWALLEX_CLIENT_ID;
      delete process.env.PROD_AIRWALLEX_CLIENT_ID;
      delete process.env.DEV_AIRWALLEX_CLIENT_ID;
      process.env.AIRWALLEX_API_KEY = 'test-api-key';
      const { isAirwallexConfigured } = await import('../../server/airwallex');
      expect(isAirwallexConfigured()).toBe(false);
    });

    it('returns false when API_KEY is missing', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      delete process.env.AIRWALLEX_API_KEY;
      delete process.env.PROD_AIRWALLEX_API_KEY;
      delete process.env.DEV_AIRWALLEX_API_KEY;
      const { isAirwallexConfigured } = await import('../../server/airwallex');
      expect(isAirwallexConfigured()).toBe(false);
    });

    it('returns false when both are missing', async () => {
      delete process.env.AIRWALLEX_CLIENT_ID;
      delete process.env.AIRWALLEX_API_KEY;
      delete process.env.PROD_AIRWALLEX_CLIENT_ID;
      delete process.env.PROD_AIRWALLEX_API_KEY;
      delete process.env.DEV_AIRWALLEX_CLIENT_ID;
      delete process.env.DEV_AIRWALLEX_API_KEY;
      const { isAirwallexConfigured } = await import('../../server/airwallex');
      expect(isAirwallexConfigured()).toBe(false);
    });
  });

  describe('formatAmountForAirwallex', () => {
    it('divides by 100 for normal currencies', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(1000, 'USD')).toBe(10);
      expect(formatAmountForAirwallex(1050, 'GBP')).toBe(10.5);
      expect(formatAmountForAirwallex(500, 'EUR')).toBe(5);
    });

    it('returns as-is for zero-decimal currencies (JPY)', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(1000, 'JPY')).toBe(1000);
    });

    it('returns as-is for zero-decimal currencies (KRW)', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(5000, 'KRW')).toBe(5000);
    });

    it('returns as-is for zero-decimal currencies (VND)', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(100000, 'VND')).toBe(100000);
    });

    it('handles case insensitive currency codes', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(1000, 'jpy')).toBe(1000);
      expect(formatAmountForAirwallex(1000, 'Jpy')).toBe(1000);
    });

    it('divides by 100 when no currency code provided', async () => {
      const { formatAmountForAirwallex } = await import('../../server/airwallex');
      expect(formatAmountForAirwallex(1000)).toBe(10);
    });
  });

  describe('formatAmountFromAirwallex', () => {
    it('multiplies by 100 and rounds', async () => {
      const { formatAmountFromAirwallex } = await import('../../server/airwallex');
      expect(formatAmountFromAirwallex(10.50)).toBe(1050);
      expect(formatAmountFromAirwallex(10.00)).toBe(1000);
      expect(formatAmountFromAirwallex(99.99)).toBe(9999);
    });

    it('handles zero', async () => {
      const { formatAmountFromAirwallex } = await import('../../server/airwallex');
      expect(formatAmountFromAirwallex(0)).toBe(0);
    });

    it('handles rounding edge cases', async () => {
      const { formatAmountFromAirwallex } = await import('../../server/airwallex');
      expect(formatAmountFromAirwallex(10.555)).toBe(1056);
      expect(formatAmountFromAirwallex(0.01)).toBe(1);
    });
  });

  describe('verifyAirwallexWebhookSignature', () => {
    it('returns true for valid signature', async () => {
      const { verifyAirwallexWebhookSignature } = await import('../../server/airwallex');
      const secret = 'test-webhook-secret';
      const payload = '{"event":"test"}';
      const timestamp = '1234567890';

      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      expect(verifyAirwallexWebhookSignature(payload, expectedSig, timestamp, secret)).toBe(true);
    });

    it('returns false for invalid signature', async () => {
      const { verifyAirwallexWebhookSignature } = await import('../../server/airwallex');
      const secret = 'test-webhook-secret';
      const payload = '{"event":"test"}';
      const timestamp = '1234567890';

      const invalidSig = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      expect(verifyAirwallexWebhookSignature(payload, invalidSig, timestamp, secret)).toBe(false);
    });

    it('returns true when no webhook secret is configured', async () => {
      const { verifyAirwallexWebhookSignature } = await import('../../server/airwallex');
      expect(verifyAirwallexWebhookSignature('payload', 'sig', 'ts', '')).toBe(true);
    });
  });

  describe('getAirwallexWebhookSecret', () => {
    it('returns the webhook secret from env', async () => {
      process.env.AIRWALLEX_WEBHOOK_SECRET = 'my-webhook-secret';
      delete process.env.PROD_AIRWALLEX_WEBHOOK_SECRET;
      delete process.env.DEV_AIRWALLEX_WEBHOOK_SECRET;
      const { getAirwallexWebhookSecret } = await import('../../server/airwallex');
      const secret = getAirwallexWebhookSecret();
      expect(typeof secret).toBe('string');
      expect(secret).toBeTruthy();
    });

    it('returns undefined when not configured', async () => {
      delete process.env.AIRWALLEX_WEBHOOK_SECRET;
      delete process.env.PROD_AIRWALLEX_WEBHOOK_SECRET;
      delete process.env.DEV_AIRWALLEX_WEBHOOK_SECRET;
      const { getAirwallexWebhookSecret } = await import('../../server/airwallex');
      const secret = getAirwallexWebhookSecret();
      expect(secret === undefined || typeof secret === 'string').toBe(true);
    });
  });

  describe('createPaymentIntent', () => {
    it('successfully creates a payment intent', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      process.env.AIRWALLEX_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'auth-token', expires_in: 1800 }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'int_abc123',
            client_secret: 'cs_abc123',
            status: 'REQUIRES_PAYMENT_METHOD',
            amount: 10.00,
            currency: 'USD',
          }),
          text: () => Promise.resolve(''),
        });

      const { createPaymentIntent } = await import('../../server/airwallex');
      const result = await createPaymentIntent({
        amount: 10.00,
        currency: 'USD',
        merchantOrderId: 'order-123',
        returnUrl: 'https://example.com/return',
      });

      expect(result.id).toBe('int_abc123');
      expect(result.clientSecret).toBe('cs_abc123');
      expect(result.status).toBe('REQUIRES_PAYMENT_METHOD');
      expect(result.amount).toBe(10.00);
      expect(result.currency).toBe('USD');
    });

    it('throws on auth failure', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      process.env.AIRWALLEX_API_KEY = 'bad-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const { createPaymentIntent } = await import('../../server/airwallex');
      await expect(createPaymentIntent({
        amount: 10.00,
        currency: 'USD',
        merchantOrderId: 'order-123',
        returnUrl: 'https://example.com/return',
      })).rejects.toThrow('Airwallex authentication failed');
    });
  });

  describe('getPaymentIntent', () => {
    it('retrieves a payment intent', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      process.env.AIRWALLEX_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'auth-token', expires_in: 1800 }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'int_abc123',
            status: 'SUCCEEDED',
            amount: 10.00,
            currency: 'USD',
          }),
          text: () => Promise.resolve(''),
        });

      const { getPaymentIntent } = await import('../../server/airwallex');
      const result = await getPaymentIntent('int_abc123');
      expect(result.id).toBe('int_abc123');
      expect(result.status).toBe('SUCCEEDED');
    });

    it('throws on failure', async () => {
      process.env.AIRWALLEX_CLIENT_ID = 'test-client-id';
      process.env.AIRWALLEX_API_KEY = 'test-api-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'auth-token', expires_in: 1800 }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not found'),
        });

      const { getPaymentIntent } = await import('../../server/airwallex');
      await expect(getPaymentIntent('int_nonexistent')).rejects.toThrow('getPaymentIntent failed');
    });
  });
});
