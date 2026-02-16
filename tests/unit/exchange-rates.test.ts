import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createFetchResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('exchange-rates', () => {
  let getExchangeRates: typeof import('../../server/exchange-rates').getExchangeRates;
  let getExchangeRate: typeof import('../../server/exchange-rates').getExchangeRate;
  let refreshExchangeRates: typeof import('../../server/exchange-rates').refreshExchangeRates;
  let initExchangeRates: typeof import('../../server/exchange-rates').initExchangeRates;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    const mod = await import('../../server/exchange-rates');
    getExchangeRates = mod.getExchangeRates;
    getExchangeRate = mod.getExchangeRate;
    refreshExchangeRates = mod.refreshExchangeRates;
    initExchangeRates = mod.initExchangeRates;
  });

  describe('getExchangeRates', () => {
    it('fetches from API and returns rates', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.27, EUR: 1.20 },
      }));

      const result = await getExchangeRates();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.base).toBe('GBP');
      expect(result.rates.USD).toBe(1.27);
      expect(result.rates.GBP).toBe(1);
    });

    it('returns cached result when cache is fresh', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.27 },
      }));

      await getExchangeRates();
      const result = await getExchangeRates();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.rates.USD).toBe(1.27);
    });

    it('returns fallback rates when API fails and no cache', async () => {
      mockFetch.mockReturnValueOnce(Promise.reject(new Error('Network error')));

      const result = await getExchangeRates();
      expect(result.base).toBe('GBP');
      expect(result.rates.GBP).toBe(1);
      expect(result.rates.USD).toBe(1.27);
      expect(result.rates.EUR).toBe(1.20);
    });

    it('returns stale cache when API fails and cache exists', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.30 },
      }));

      await getExchangeRates();

      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
      mockFetch.mockReturnValueOnce(Promise.reject(new Error('Network error')));

      const result = await getExchangeRates();
      expect(result.rates.USD).toBe(1.30);

      vi.restoreAllMocks();
    });

    it('returns fallback when API returns non-ok status', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({}, false, 500));

      const result = await getExchangeRates();
      expect(result.rates.USD).toBe(1.27);
    });
  });

  describe('getExchangeRate', () => {
    it('returns rate for a specific currency', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.28, EUR: 1.19 },
      }));

      const rate = await getExchangeRate('USD');
      expect(rate).toBe(1.28);
    });

    it('returns 1 for unknown currencies not in fallback', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.28 },
      }));

      const rate = await getExchangeRate('XYZ');
      expect(rate).toBe(1);
    });

    it('returns fallback rate if currency not in API response but in fallback', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.28 },
      }));

      const rate = await getExchangeRate('THB');
      expect(rate).toBe(44.5);
    });
  });

  describe('refreshExchangeRates', () => {
    it('returns true on success', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.29 },
      }));

      const result = await refreshExchangeRates();
      expect(result).toBe(true);
    });

    it('returns false on failure', async () => {
      mockFetch.mockReturnValueOnce(Promise.reject(new Error('fail')));

      const result = await refreshExchangeRates();
      expect(result).toBe(false);
    });
  });

  describe('initExchangeRates', () => {
    it('calls getExchangeRates (fetches from API)', async () => {
      mockFetch.mockReturnValueOnce(createFetchResponse({
        base: 'GBP',
        date: '2026-02-16',
        rates: { USD: 1.27 },
      }));

      await initExchangeRates();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
