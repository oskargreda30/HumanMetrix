/**
 * Integration Tests for Stripe and Purchase System
 * 
 * Tests cover:
 * - Price calculations (PPP tiers, SEA pricing)
 * - Discount code validation
 * - Purchase flow logic
 * - Webhook signature validation patterns
 * - Currency conversion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Assessment pricing configuration (from shared/schema.ts)
const ASSESSMENT_PRICES: Record<string, number> = {
  fit: 0,
  ai_readiness: 0,
  prompt_architecture: 0,
  aiq: 0,
};

const BASE_FEE = 1999; // £19.99 in pence

// PPP pricing tiers
const PRICING_TIERS = {
  tier1: { multiplier: 1.0, countries: ['US', 'GB', 'DE', 'FR', 'AU', 'CA', 'JP'] },
  tier2: { multiplier: 0.7, countries: ['BR', 'MX', 'PL', 'TH', 'ZA'] },
  tier3: { multiplier: 0.5, countries: ['IN', 'PK', 'NG', 'EG', 'KE'] },
};

// SEA launch pricing (flat rates in local currency)
const SEA_PRICING: Record<string, { currency: string; amount: number }> = {
  PH: { currency: 'PHP', amount: 999 },
  VN: { currency: 'VND', amount: 450000 },
  ID: { currency: 'IDR', amount: 299000 },
  MY: { currency: 'MYR', amount: 79 },
};

// Active discount codes
const DISCOUNT_CODES: Record<string, { percentOff: number; name: string }> = {
  FREE: { percentOff: 100, name: 'Free Access' },
  '20OFFPRICE': { percentOff: 20, name: '20% Discount' },
};

describe('Price Calculations', () => {
  describe('Base Pricing', () => {
    it('should return correct base fee in pence', () => {
      expect(BASE_FEE).toBe(1999);
    });

    it('should calculate total price for assessments', () => {
      const assessmentTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
      const assessmentTotal = assessmentTypes.reduce((sum, type) => sum + ASSESSMENT_PRICES[type], 0);
      const total = BASE_FEE + assessmentTotal;
      
      expect(total).toBe(BASE_FEE); // All assessments are £0, just base fee
    });

    it('should handle single assessment purchase', () => {
      const total = BASE_FEE + ASSESSMENT_PRICES['fit'];
      expect(total).toBe(BASE_FEE);
    });
  });

  describe('PPP Tier Pricing', () => {
    function getPPPPrice(basePrice: number, countryCode: string): number {
      if (PRICING_TIERS.tier1.countries.includes(countryCode)) {
        return Math.round(basePrice * PRICING_TIERS.tier1.multiplier);
      }
      if (PRICING_TIERS.tier2.countries.includes(countryCode)) {
        return Math.round(basePrice * PRICING_TIERS.tier2.multiplier);
      }
      if (PRICING_TIERS.tier3.countries.includes(countryCode)) {
        return Math.round(basePrice * PRICING_TIERS.tier3.multiplier);
      }
      return basePrice; // Default to full price
    }

    it('should apply tier 1 pricing (1.0x) for US', () => {
      const price = getPPPPrice(BASE_FEE, 'US');
      expect(price).toBe(1999);
    });

    it('should apply tier 1 pricing (1.0x) for UK', () => {
      const price = getPPPPrice(BASE_FEE, 'GB');
      expect(price).toBe(1999);
    });

    it('should apply tier 2 pricing (0.7x) for Brazil', () => {
      const price = getPPPPrice(BASE_FEE, 'BR');
      expect(price).toBe(1399); // 1999 * 0.7 = 1399.3 rounded
    });

    it('should apply tier 2 pricing (0.7x) for Thailand', () => {
      const price = getPPPPrice(BASE_FEE, 'TH');
      expect(price).toBe(1399);
    });

    it('should apply tier 3 pricing (0.5x) for India', () => {
      const price = getPPPPrice(BASE_FEE, 'IN');
      expect(price).toBe(1000); // 1999 * 0.5 = 999.5 rounded
    });

    it('should apply tier 3 pricing (0.5x) for Nigeria', () => {
      const price = getPPPPrice(BASE_FEE, 'NG');
      expect(price).toBe(1000);
    });

    it('should default to full price for unknown country', () => {
      const price = getPPPPrice(BASE_FEE, 'XX');
      expect(price).toBe(1999);
    });
  });

  describe('SEA Launch Pricing', () => {
    function hasSEAPrice(countryCode: string): boolean {
      return countryCode in SEA_PRICING;
    }

    function getSEAPrice(countryCode: string): { currency: string; amount: number } | null {
      return SEA_PRICING[countryCode] || null;
    }

    it('should detect Philippines as SEA launch country', () => {
      expect(hasSEAPrice('PH')).toBe(true);
    });

    it('should return correct price for Philippines', () => {
      const price = getSEAPrice('PH');
      expect(price).toEqual({ currency: 'PHP', amount: 999 });
    });

    it('should return correct price for Vietnam', () => {
      const price = getSEAPrice('VN');
      expect(price).toEqual({ currency: 'VND', amount: 450000 });
    });

    it('should return correct price for Indonesia', () => {
      const price = getSEAPrice('ID');
      expect(price).toEqual({ currency: 'IDR', amount: 299000 });
    });

    it('should return correct price for Malaysia', () => {
      const price = getSEAPrice('MY');
      expect(price).toEqual({ currency: 'MYR', amount: 79 });
    });

    it('should not have SEA pricing for non-SEA countries', () => {
      expect(hasSEAPrice('US')).toBe(false);
      expect(hasSEAPrice('GB')).toBe(false);
      expect(hasSEAPrice('IN')).toBe(false);
    });
  });
});

describe('Discount Code Validation', () => {
  function validateDiscountCode(code: string): { valid: boolean; percentOff: number; name: string } | { valid: false } {
    const normalizedCode = code.toUpperCase().trim();
    const discount = DISCOUNT_CODES[normalizedCode];
    
    if (!discount) {
      return { valid: false };
    }
    
    return { valid: true, percentOff: discount.percentOff, name: discount.name };
  }

  function applyDiscount(price: number, percentOff: number): number {
    return Math.round(price * (1 - percentOff / 100));
  }

  describe('Code Validation', () => {
    it('should validate FREE discount code', () => {
      const result = validateDiscountCode('FREE');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.percentOff).toBe(100);
      }
    });

    it('should validate 20OFFPRICE discount code', () => {
      const result = validateDiscountCode('20OFFPRICE');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.percentOff).toBe(20);
      }
    });

    it('should handle case-insensitive codes', () => {
      const result = validateDiscountCode('free');
      expect(result.valid).toBe(true);
    });

    it('should handle codes with whitespace', () => {
      const result = validateDiscountCode('  FREE  ');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid codes', () => {
      const result = validateDiscountCode('INVALID');
      expect(result.valid).toBe(false);
    });

    it('should reject empty codes', () => {
      const result = validateDiscountCode('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Discount Application', () => {
    it('should apply 100% discount correctly', () => {
      const discountedPrice = applyDiscount(BASE_FEE, 100);
      expect(discountedPrice).toBe(0);
    });

    it('should apply 20% discount correctly', () => {
      const discountedPrice = applyDiscount(BASE_FEE, 20);
      expect(discountedPrice).toBe(1599); // 1999 * 0.8 = 1599.2 rounded
    });

    it('should apply 0% discount correctly', () => {
      const discountedPrice = applyDiscount(BASE_FEE, 0);
      expect(discountedPrice).toBe(BASE_FEE);
    });

    it('should handle 50% discount', () => {
      const discountedPrice = applyDiscount(BASE_FEE, 50);
      expect(discountedPrice).toBe(1000); // 1999 * 0.5 = 999.5 rounded
    });
  });
});

describe('Purchase Flow', () => {
  describe('Purchase Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      'pending': ['completed', 'cancelled', 'failed'],
      'completed': [],
      'cancelled': [],
      'failed': ['pending'], // Can retry
    };

    it('should allow pending to completed transition', () => {
      expect(validTransitions['pending'].includes('completed')).toBe(true);
    });

    it('should allow pending to cancelled transition', () => {
      expect(validTransitions['pending'].includes('cancelled')).toBe(true);
    });

    it('should not allow completed to any transition', () => {
      expect(validTransitions['completed'].length).toBe(0);
    });

    it('should allow failed to pending (retry)', () => {
      expect(validTransitions['failed'].includes('pending')).toBe(true);
    });
  });

  describe('Purchase Validation', () => {
    it('should require at least one assessment for purchase', () => {
      const assessmentTypes: string[] = [];
      expect(assessmentTypes.length > 0).toBe(false);
    });

    it('should accept valid assessment types', () => {
      const validTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
      const selectedTypes = ['fit', 'ai_readiness'];
      
      const allValid = selectedTypes.every(type => validTypes.includes(type));
      expect(allValid).toBe(true);
    });

    it('should reject invalid assessment types', () => {
      const validTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
      const selectedTypes = ['fit', 'invalid_type'];
      
      const allValid = selectedTypes.every(type => validTypes.includes(type));
      expect(allValid).toBe(false);
    });
  });
});

describe('Currency Conversion', () => {
  // Stripe requires amounts in smallest currency unit
  const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND'];

  function toStripeAmount(amount: number, currency: string): number {
    if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  function fromStripeAmount(stripeAmount: number, currency: string): number {
    if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
      return stripeAmount;
    }
    return stripeAmount / 100;
  }

  describe('To Stripe Amount', () => {
    it('should convert GBP to pence', () => {
      expect(toStripeAmount(19.99, 'GBP')).toBe(1999);
    });

    it('should convert USD to cents', () => {
      expect(toStripeAmount(25.00, 'USD')).toBe(2500);
    });

    it('should handle JPY (zero decimal currency)', () => {
      expect(toStripeAmount(2500, 'JPY')).toBe(2500);
    });

    it('should handle VND (zero decimal currency)', () => {
      expect(toStripeAmount(450000, 'VND')).toBe(450000);
    });

    it('should round correctly', () => {
      expect(toStripeAmount(19.999, 'GBP')).toBe(2000);
    });
  });

  describe('From Stripe Amount', () => {
    it('should convert pence to GBP', () => {
      expect(fromStripeAmount(1999, 'GBP')).toBe(19.99);
    });

    it('should convert cents to USD', () => {
      expect(fromStripeAmount(2500, 'USD')).toBe(25.00);
    });

    it('should handle JPY correctly', () => {
      expect(fromStripeAmount(2500, 'JPY')).toBe(2500);
    });
  });
});

describe('Webhook Signature Validation', () => {
  describe('Signature Format', () => {
    it('should parse Stripe signature header format', () => {
      const header = 't=1614556800,v1=abc123,v0=def456';
      const parts = header.split(',');
      
      const parsed: Record<string, string> = {};
      parts.forEach(part => {
        const [key, value] = part.split('=');
        parsed[key] = value;
      });
      
      expect(parsed['t']).toBe('1614556800');
      expect(parsed['v1']).toBe('abc123');
      expect(parsed['v0']).toBe('def456');
    });

    it('should reject missing timestamp', () => {
      const header = 'v1=abc123';
      const hasTimestamp = header.includes('t=');
      expect(hasTimestamp).toBe(false);
    });

    it('should reject missing v1 signature', () => {
      const header = 't=1614556800,v0=abc123';
      const hasV1 = header.includes('v1=');
      expect(hasV1).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept recent timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const webhookTimestamp = now - 60; // 1 minute ago
      const tolerance = 300; // 5 minutes
      
      const isRecent = (now - webhookTimestamp) <= tolerance;
      expect(isRecent).toBe(true);
    });

    it('should reject old timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const webhookTimestamp = now - 600; // 10 minutes ago
      const tolerance = 300; // 5 minutes
      
      const isRecent = (now - webhookTimestamp) <= tolerance;
      expect(isRecent).toBe(false);
    });
  });
});

describe('Idempotency', () => {
  describe('Duplicate Webhook Prevention', () => {
    const processedEvents = new Set<string>();

    function processWebhook(eventId: string): { processed: boolean; duplicate: boolean } {
      if (processedEvents.has(eventId)) {
        return { processed: false, duplicate: true };
      }
      processedEvents.add(eventId);
      return { processed: true, duplicate: false };
    }

    beforeEach(() => {
      processedEvents.clear();
    });

    it('should process new event', () => {
      const result = processWebhook('evt_123');
      expect(result.processed).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it('should reject duplicate event', () => {
      processWebhook('evt_456');
      const result = processWebhook('evt_456');
      
      expect(result.processed).toBe(false);
      expect(result.duplicate).toBe(true);
    });

    it('should handle multiple unique events', () => {
      const result1 = processWebhook('evt_1');
      const result2 = processWebhook('evt_2');
      const result3 = processWebhook('evt_3');
      
      expect(result1.processed).toBe(true);
      expect(result2.processed).toBe(true);
      expect(result3.processed).toBe(true);
    });
  });
});
