// Real-time exchange rate service using Frankfurter API (free, no API key)
// Rates are cached for 1 hour and refreshed automatically

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: number;
}

// Cache for exchange rates
let cachedRates: ExchangeRates | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Fallback rates (GBP-based) in case API fails
const FALLBACK_RATES: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.20,
  CAD: 1.78,
  AUD: 1.96,
  THB: 44.5,
  PHP: 71.5,
  INR: 106,
  JPY: 208,
  CNY: 9.2,
  KRW: 1780,
  SGD: 1.71,
  MYR: 5.65,
  IDR: 20150,
  VND: 31800,
  HKD: 9.9,
  TWD: 40.6,
  PKR: 357,
  BDT: 152,
  LKR: 419,
  NPR: 170,
  AED: 4.67,
  SAR: 4.77,
  QAR: 4.63,
  KWD: 0.39,
  BHD: 0.48,
  OMR: 0.49,
  ILS: 4.6,
  TRY: 43.4,
  ZAR: 22.4,
  EGP: 62.8,
  NGN: 1994,
  KES: 164,
  GHS: 20.2,
  MAD: 12.6,
  TND: 4.0,
  BRL: 7.8,
  MXN: 25.4,
  ARS: 1270,
  CLP: 1133,
  COP: 5550,
  PEN: 4.79,
  PLN: 5.1,
  CZK: 29.8,
  HUF: 490,
  RON: 5.8,
  BGN: 2.28,
  RSD: 137,
  UAH: 52.5,
  RUB: 127,
  SEK: 13.5,
  NOK: 14.1,
  DKK: 8.9,
  CHF: 1.12,
  NZD: 2.14,
};

// Fetch rates from Frankfurter API (ECB data, free, no API key)
async function fetchRatesFromAPI(): Promise<Record<string, number> | null> {
  try {
    // Frankfurter uses EUR as base, we need GBP-based rates
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP', {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.error(`[Exchange Rates] Frankfurter API returned status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.rates && typeof data.rates === 'object') {
      // Add GBP = 1 to the rates
      const rates: Record<string, number> = { GBP: 1, ...data.rates };
      console.log(`[Exchange Rates] Fetched ${Object.keys(rates).length} rates from Frankfurter API (date: ${data.date})`);
      return rates;
    }
    
    return null;
  } catch (error: any) {
    console.error('[Exchange Rates] Failed to fetch from Frankfurter API:', error.message);
    return null;
  }
}

// Get exchange rates (with caching)
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - cachedRates.lastUpdated) < CACHE_TTL) {
    return cachedRates;
  }
  
  // Fetch fresh rates
  const freshRates = await fetchRatesFromAPI();
  
  if (freshRates) {
    cachedRates = {
      base: 'GBP',
      date: new Date().toISOString().split('T')[0],
      rates: freshRates,
      lastUpdated: now,
    };
    return cachedRates;
  }
  
  // If API failed and we have cached rates, extend their TTL
  if (cachedRates) {
    console.warn('[Exchange Rates] API failed, using stale cached rates');
    return cachedRates;
  }
  
  // No cached rates available, use fallback
  console.warn('[Exchange Rates] Using fallback rates');
  return {
    base: 'GBP',
    date: new Date().toISOString().split('T')[0],
    rates: FALLBACK_RATES,
    lastUpdated: now,
  };
}

// Get a single exchange rate (GBP to target currency)
export async function getExchangeRate(currencyCode: string): Promise<number> {
  const rates = await getExchangeRates();
  return rates.rates[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1;
}

// Force refresh rates (for manual refresh)
export async function refreshExchangeRates(): Promise<boolean> {
  const freshRates = await fetchRatesFromAPI();
  
  if (freshRates) {
    cachedRates = {
      base: 'GBP',
      date: new Date().toISOString().split('T')[0],
      rates: freshRates,
      lastUpdated: Date.now(),
    };
    return true;
  }
  
  return false;
}

// Pre-warm the cache on server startup
export async function initExchangeRates(): Promise<void> {
  console.log('[Exchange Rates] Initializing exchange rate service...');
  await getExchangeRates();
  console.log('[Exchange Rates] Exchange rate service ready');
}
