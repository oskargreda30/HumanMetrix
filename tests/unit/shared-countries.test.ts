import { describe, it, expect } from 'vitest';
import {
  COUNTRIES,
  getCountryByCode,
  type Country,
} from '@shared/countries';

describe('shared/countries', () => {
  describe('COUNTRIES array', () => {
    it('is non-empty', () => {
      expect(COUNTRIES.length).toBeGreaterThan(0);
    });

    it('has more than 100 countries', () => {
      expect(COUNTRIES.length).toBeGreaterThan(100);
    });

    it('each country has required fields', () => {
      for (const country of COUNTRIES) {
        expect(country.code, `Missing code for ${country.name}`).toBeTruthy();
        expect(country.name, `Missing name for code ${country.code}`).toBeTruthy();
        expect(country.dialCode, `Missing dialCode for ${country.code}`).toBeTruthy();
        expect(country.flag, `Missing flag for ${country.code}`).toBeTruthy();
      }
    });

    it('each country code is a 2-letter string', () => {
      for (const country of COUNTRIES) {
        expect(country.code).toMatch(/^[A-Z]{2}$/);
      }
    });

    it('each dial code starts with +', () => {
      for (const country of COUNTRIES) {
        expect(country.dialCode.startsWith('+'), `${country.code} dialCode should start with +`).toBe(true);
      }
    });

    it('country codes are unique', () => {
      const codes = COUNTRIES.map(c => c.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('specific countries exist', () => {
    const expectedCountries: Array<{ code: string; name: string }> = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'PH', name: 'Philippines' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'ID', name: 'Indonesia' },
      { code: 'MY', name: 'Malaysia' },
    ];

    for (const expected of expectedCountries) {
      it(`contains ${expected.name} (${expected.code})`, () => {
        const found = COUNTRIES.find(c => c.code === expected.code);
        expect(found).toBeDefined();
        expect(found!.name).toBe(expected.name);
      });
    }
  });

  describe('getCountryByCode()', () => {
    it('returns correct country for US', () => {
      const country = getCountryByCode('US');
      expect(country).toBeDefined();
      expect(country!.name).toBe('United States');
      expect(country!.dialCode).toBe('+1');
    });

    it('returns correct country for GB', () => {
      const country = getCountryByCode('GB');
      expect(country).toBeDefined();
      expect(country!.name).toBe('United Kingdom');
    });

    it('returns correct country for PH', () => {
      const country = getCountryByCode('PH');
      expect(country).toBeDefined();
      expect(country!.name).toBe('Philippines');
    });

    it('is case-insensitive', () => {
      const country = getCountryByCode('us');
      expect(country).toBeDefined();
      expect(country!.code).toBe('US');
    });

    it('returns undefined for unknown code', () => {
      expect(getCountryByCode('ZZ')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getCountryByCode('')).toBeUndefined();
    });
  });
});
