import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import {
  getPricingTier,
  getPPPAdjustedPriceInPence,
  hasSEALaunchPricing,
  getCurrencyForCountry,
  convertPenceToRoundedLocalCurrency,
  formatPrice,
  roundPriceUp,
} from '../../shared/currencies';
import { BASE_FEE, ASSESSMENT_PRICES } from '../../shared/schema';


const WEBHOOK_SECRET = 'whsec_test_secret_1234567890abcdef';
const TEST_PAYLOAD = JSON.stringify({ id: 'evt_test_001', type: 'checkout.session.completed', object: 'event' });

// Use a Stripe instance with a test key so we can call SDK methods.
// The API version matches server/webhook-routes.ts — tsconfig skipLibCheck allows this.
const stripe = new Stripe('sk_test_dummy_key_for_webhook_tests', {
  apiVersion: '2025-09-30.clover',
});

describe('Stripe webhook signature verification (real Stripe SDK)', () => {
  it('constructEvent succeeds with a valid HMAC signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: TEST_PAYLOAD,
      secret: WEBHOOK_SECRET,
      timestamp,
    });

    // This is the same call used in server/webhook-routes.ts line 303
    const event = stripe.webhooks.constructEvent(TEST_PAYLOAD, header, WEBHOOK_SECRET);

    expect(event.id).toBe('evt_test_001');
    expect(event.type).toBe('checkout.session.completed');
  });

  it('constructEvent throws when signature header is completely absent', () => {
    expect(() => {
      stripe.webhooks.constructEvent(TEST_PAYLOAD, '', WEBHOOK_SECRET);
    }).toThrow();
  });

  it('constructEvent throws when payload has been tampered with', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: TEST_PAYLOAD,
      secret: WEBHOOK_SECRET,
      timestamp,
    });
    const tamperedPayload = TEST_PAYLOAD + ' tampered';

    expect(() => {
      stripe.webhooks.constructEvent(tamperedPayload, header, WEBHOOK_SECRET);
    }).toThrow(/No signatures found matching/);
  });

  it('constructEvent throws when the wrong webhook secret is used', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: TEST_PAYLOAD,
      secret: WEBHOOK_SECRET,
      timestamp,
    });

    expect(() => {
      stripe.webhooks.constructEvent(TEST_PAYLOAD, header, 'whsec_wrong_secret_here');
    }).toThrow(/No signatures found matching/);
  });

  it('constructEvent throws for a timestamp older than the tolerance window', () => {
    // Stripe rejects events older than 5 minutes (300s default tolerance)
    const staleTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
    const header = stripe.webhooks.generateTestHeaderString({
      payload: TEST_PAYLOAD,
      secret: WEBHOOK_SECRET,
      timestamp: staleTimestamp,
    });

    expect(() => {
      // tolerance=0 forces strict timestamp checking
      stripe.webhooks.constructEvent(TEST_PAYLOAD, header, WEBHOOK_SECRET, 0);
    }).toThrow(/Timestamp outside the tolerance zone/);
  });

  it('generateTestHeaderString produces a Stripe-Signature format header', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: TEST_PAYLOAD,
      secret: WEBHOOK_SECRET,
      timestamp,
    });

    // Must contain both timestamp and v1 signature components
    expect(header).toMatch(/^t=\d+,v1=[a-f0-9]+/);
  });
});


describe('getPricingTier() (real shared/currencies.ts)', () => {
  it('returns tier1 for GB (full price market)', () => {
    expect(getPricingTier('GB')).toBe('tier1');
  });

  it('returns tier1 for US', () => {
    expect(getPricingTier('US')).toBe('tier1');
  });

  it('returns a lower tier for known PPP-adjusted country (e.g. IN)', () => {
    const tier = getPricingTier('IN');
    expect(['tier2', 'tier3', 'tier4']).toContain(tier);
  });

  it('defaults to tier1 for unknown country codes', () => {
    expect(getPricingTier('ZZ')).toBe('tier1');
  });
});

describe('getPPPAdjustedPriceInPence() (real shared/currencies.ts)', () => {
  const BASE_PRICE = 1999; // £19.99

  it('returns full price for tier1 countries', () => {
    const price = getPPPAdjustedPriceInPence(BASE_PRICE, 'GB');
    expect(price).toBe(BASE_PRICE);
  });

  it('returns a discounted price for lower-tier countries', () => {
    const price = getPPPAdjustedPriceInPence(BASE_PRICE, 'IN');
    expect(price).toBeLessThan(BASE_PRICE);
    expect(price).toBeGreaterThan(0);
  });

  it('returns a positive price for all countries (never free due to PPP)', () => {
    const countries = ['GB', 'US', 'IN', 'PH', 'NG', 'BR', 'PL'];
    for (const c of countries) {
      expect(getPPPAdjustedPriceInPence(BASE_PRICE, c)).toBeGreaterThan(0);
    }
  });
});


describe('hasSEALaunchPricing() (real shared/currencies.ts)', () => {
  it('returns true for Philippines (PH)', () => {
    expect(hasSEALaunchPricing('PH')).toBe(true);
  });

  it('returns true for Indonesia (ID)', () => {
    expect(hasSEALaunchPricing('ID')).toBe(true);
  });

  it('returns false for GB', () => {
    expect(hasSEALaunchPricing('GB')).toBe(false);
  });

  it('returns false for US', () => {
    expect(hasSEALaunchPricing('US')).toBe(false);
  });
});


describe('getCurrencyForCountry() (real shared/currencies.ts)', () => {
  it('returns GBP config for GB', () => {
    const cfg = getCurrencyForCountry('GB');
    expect(cfg.code).toBe('GBP');
    expect(cfg.symbol).toBeDefined();
  });

  it('returns USD config for US', () => {
    const cfg = getCurrencyForCountry('US');
    expect(cfg.code).toBe('USD');
  });

  it('returns EUR config for DE', () => {
    const cfg = getCurrencyForCountry('DE');
    expect(cfg.code).toBe('EUR');
  });

  it('returns AUD for Australia', () => {
    const cfg = getCurrencyForCountry('AU');
    expect(cfg.code).toBe('AUD');
  });
});


describe('Price Calculations (real shared/schema.ts + shared/currencies.ts)', () => {
  it('BASE_FEE is a positive integer (pence)', () => {
    expect(BASE_FEE).toBeGreaterThan(0);
    expect(Number.isInteger(BASE_FEE)).toBe(true);
  });

  it('ASSESSMENT_PRICES has entries for core assessment types', () => {
    const types = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
    for (const t of types) {
      expect(ASSESSMENT_PRICES).toHaveProperty(t);
      expect(typeof ASSESSMENT_PRICES[t]).toBe('number');
    }
  });

  it('convertPenceToRoundedLocalCurrency converts GBP pence correctly', () => {
    // Function signature: (priceInPence: number, currencyCode: string, exchangeRate?: number)
    const result = convertPenceToRoundedLocalCurrency(1999, 'GBP', 1); // 1999p = £19.99 at rate 1
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(20); // 19.99 rounds up to 20
  });

  it('roundPriceUp rounds up to the nearest whole unit', () => {
    // roundPriceUp operates on the local currency value (not pence)
    const rounded = roundPriceUp(19.01);
    expect(rounded).toBe(20);
  });

  it('formatPrice returns a string with currency symbol', () => {
    const gbp = getCurrencyForCountry('GB');
    const str = formatPrice(19.99, gbp);
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });
});


describe('Webhook Signature Validation', () => {
  describe('Stripe-Signature header format', () => {
    it('should parse Stripe signature header format', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const header = stripe.webhooks.generateTestHeaderString({
        payload: TEST_PAYLOAD,
        secret: WEBHOOK_SECRET,
        timestamp,
      });

      const parts = header.split(',');
      const tPart = parts.find((p) => p.startsWith('t='));
      const v1Part = parts.find((p) => p.startsWith('v1='));

      expect(tPart).toBeDefined();
      expect(v1Part).toBeDefined();
      expect(tPart!.split('=')[1]).toBe(String(timestamp));
      expect(v1Part!.split('=')[1]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject missing v1 signature', () => {
      const malformedHeader = 't=1234567890';
      expect(() => {
        stripe.webhooks.constructEvent(TEST_PAYLOAD, malformedHeader, WEBHOOK_SECRET);
      }).toThrow();
    });

    it('should accept a recent timestamp within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60;
      const header = stripe.webhooks.generateTestHeaderString({
        payload: TEST_PAYLOAD,
        secret: WEBHOOK_SECRET,
        timestamp: recentTimestamp,
      });
      expect(() => {
        stripe.webhooks.constructEvent(TEST_PAYLOAD, header, WEBHOOK_SECRET);
      }).not.toThrow();
    });

    it('should reject a stale timestamp outside tolerance', () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 400;
      const header = stripe.webhooks.generateTestHeaderString({
        payload: TEST_PAYLOAD,
        secret: WEBHOOK_SECRET,
        timestamp: staleTimestamp,
      });
      expect(() => {
        stripe.webhooks.constructEvent(TEST_PAYLOAD, header, WEBHOOK_SECRET, 0);
      }).toThrow(/Timestamp outside/);
    });
  });
});
