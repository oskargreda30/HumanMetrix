import { describe, it, expect } from 'vitest';
import {
  hasSEALaunchPricing,
  getSEALaunchPricing,
  convertUSDCentsToGBPPence,
  getSEALaunchPriceInPence,
  CURRENCIES,
  SEA_LAUNCH_COUNTRIES,
} from '@shared/currencies';

describe('shared/currencies', () => {
  describe('hasSEALaunchPricing()', () => {
    it('returns true for PH', () => {
      expect(hasSEALaunchPricing('PH')).toBe(true);
    });

    it('returns true for VN', () => {
      expect(hasSEALaunchPricing('VN')).toBe(true);
    });

    it('returns true for ID', () => {
      expect(hasSEALaunchPricing('ID')).toBe(true);
    });

    it('returns true for MY', () => {
      expect(hasSEALaunchPricing('MY')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(hasSEALaunchPricing('ph')).toBe(true);
      expect(hasSEALaunchPricing('vn')).toBe(true);
    });

    it('returns false for US', () => {
      expect(hasSEALaunchPricing('US')).toBe(false);
    });

    it('returns false for GB', () => {
      expect(hasSEALaunchPricing('GB')).toBe(false);
    });

    it('returns false for DE', () => {
      expect(hasSEALaunchPricing('DE')).toBe(false);
    });

    it('returns false for unknown country', () => {
      expect(hasSEALaunchPricing('ZZ')).toBe(false);
    });
  });

  describe('getSEALaunchPricing()', () => {
    it('returns correct pricing for PH', () => {
      const pricing = getSEALaunchPricing('PH');
      expect(pricing).not.toBeNull();
      expect(pricing!.priceLocalUnits).toBe(5900);
      expect(pricing!.currencyCode).toBe('PHP');
      expect(pricing!.isZeroDecimal).toBe(false);
    });

    it('returns correct pricing for VN', () => {
      const pricing = getSEALaunchPricing('VN');
      expect(pricing).not.toBeNull();
      expect(pricing!.priceLocalUnits).toBe(30000);
      expect(pricing!.currencyCode).toBe('VND');
      expect(pricing!.isZeroDecimal).toBe(true);
    });

    it('returns correct pricing for ID', () => {
      const pricing = getSEALaunchPricing('ID');
      expect(pricing).not.toBeNull();
      expect(pricing!.priceLocalUnits).toBe(1800000);
      expect(pricing!.currencyCode).toBe('IDR');
      expect(pricing!.isZeroDecimal).toBe(false);
    });

    it('returns correct pricing for MY', () => {
      const pricing = getSEALaunchPricing('MY');
      expect(pricing).not.toBeNull();
      expect(pricing!.priceLocalUnits).toBe(800);
      expect(pricing!.currencyCode).toBe('MYR');
      expect(pricing!.isZeroDecimal).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(getSEALaunchPricing('ph')).not.toBeNull();
    });

    it('returns null for non-SEA country', () => {
      expect(getSEALaunchPricing('US')).toBeNull();
      expect(getSEALaunchPricing('GB')).toBeNull();
    });

    it('returns null for unknown country', () => {
      expect(getSEALaunchPricing('ZZ')).toBeNull();
    });
  });

  describe('convertUSDCentsToGBPPence()', () => {
    it('converts 0 USD cents to 0 GBP pence', () => {
      expect(convertUSDCentsToGBPPence(0)).toBe(0);
    });

    it('converts 100 USD cents correctly', () => {
      const result = convertUSDCentsToGBPPence(100);
      expect(result).toBe(Math.round(100 * (1 / CURRENCIES.USD.exchangeRate)));
    });

    it('converts 1000 USD cents correctly', () => {
      const result = convertUSDCentsToGBPPence(1000);
      expect(result).toBe(Math.round(1000 * (1 / CURRENCIES.USD.exchangeRate)));
    });

    it('returns a rounded integer', () => {
      const result = convertUSDCentsToGBPPence(127);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('getSEALaunchPriceInPence()', () => {
    it('returns a number for PH', () => {
      const result = getSEALaunchPriceInPence('PH');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('number');
      expect(result!).toBeGreaterThan(0);
    });

    it('returns a number for VN', () => {
      const result = getSEALaunchPriceInPence('VN');
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(0);
    });

    it('returns a number for ID', () => {
      const result = getSEALaunchPriceInPence('ID');
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(0);
    });

    it('returns a number for MY', () => {
      const result = getSEALaunchPriceInPence('MY');
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(0);
    });

    it('returns null for non-SEA country', () => {
      expect(getSEALaunchPriceInPence('US')).toBeNull();
      expect(getSEALaunchPriceInPence('GB')).toBeNull();
    });

    it('returns null for unknown country', () => {
      expect(getSEALaunchPriceInPence('ZZ')).toBeNull();
    });

    it('returns an integer (rounded)', () => {
      const result = getSEALaunchPriceInPence('PH');
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('CURRENCIES object', () => {
    it('exists and is non-empty', () => {
      expect(CURRENCIES).toBeDefined();
      expect(Object.keys(CURRENCIES).length).toBeGreaterThan(0);
    });

    const keyCurrencies = ['GBP', 'USD', 'EUR', 'PHP', 'VND', 'IDR', 'MYR', 'JPY', 'AUD', 'CAD'];

    for (const code of keyCurrencies) {
      it(`has ${code} with required fields`, () => {
        const currency = CURRENCIES[code];
        expect(currency).toBeDefined();
        expect(currency.code).toBe(code);
        expect(currency.symbol).toBeTruthy();
        expect(currency.name).toBeTruthy();
        expect(typeof currency.exchangeRate).toBe('number');
        expect(currency.exchangeRate).toBeGreaterThan(0);
        expect(['before', 'after']).toContain(currency.symbolPosition);
        expect(typeof currency.decimalSeparator).toBe('string');
        expect(typeof currency.thousandsSeparator).toBe('string');
        expect(typeof currency.decimalPlaces).toBe('number');
      });
    }

    it('GBP has exchange rate of 1 (base currency)', () => {
      expect(CURRENCIES.GBP.exchangeRate).toBe(1);
    });

    it('USD exchange rate is greater than 1', () => {
      expect(CURRENCIES.USD.exchangeRate).toBeGreaterThan(1);
    });
  });
});
