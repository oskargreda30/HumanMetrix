// Multi-currency configuration for global pricing with PPP (Purchasing Power Parity)
// Base currency is GBP (British Pound Sterling)
// Exchange rates are approximate and should be updated periodically
// PPP multipliers adjust prices for local purchasing power

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate from GBP to this currency
  symbolPosition: 'before' | 'after';
  decimalSeparator: string;
  thousandsSeparator: string;
  decimalPlaces: number;
}

// PPP Pricing Tiers - adjust prices based on local purchasing power
export type PricingTier = 'tier1' | 'tier2' | 'tier3';

export const PPP_MULTIPLIERS: Record<PricingTier, number> = {
  tier1: 1.0,   // Western markets - full price (UK, US, EU, Australia, etc.)
  tier2: 0.7,  // Middle markets - 30% discount (Eastern Europe, Latin America, Middle East)
  tier3: 0.5,  // Emerging markets - 50% discount (Southeast Asia, South Asia, Africa)
};

// Map countries to their pricing tier
export const COUNTRY_PRICING_TIER: Record<string, PricingTier> = {
  // Tier 1: Western/High-income markets (1.0x - full price)
  GB: 'tier1', UK: 'tier1',
  US: 'tier1',
  CA: 'tier1',
  AU: 'tier1',
  NZ: 'tier1',
  DE: 'tier1', FR: 'tier1', IT: 'tier1', ES: 'tier1', NL: 'tier1', BE: 'tier1',
  AT: 'tier1', IE: 'tier1', PT: 'tier1', FI: 'tier1', LU: 'tier1',
  CH: 'tier1', LI: 'tier1',
  SE: 'tier1', NO: 'tier1', DK: 'tier1',
  JP: 'tier1',
  SG: 'tier1',
  HK: 'tier1',
  IL: 'tier1',
  AE: 'tier1', SA: 'tier1', QA: 'tier1', KW: 'tier1', BH: 'tier1', OM: 'tier1',
  KR: 'tier1',
  TW: 'tier1',
  
  // Tier 2: Middle markets (0.7x - 30% discount)
  PL: 'tier2', CZ: 'tier2', HU: 'tier2', RO: 'tier2', BG: 'tier2', HR: 'tier2',
  GR: 'tier2', SK: 'tier2', SI: 'tier2', LT: 'tier2', LV: 'tier2', EE: 'tier2',
  MT: 'tier2', CY: 'tier2',
  RU: 'tier2', UA: 'tier2',
  TR: 'tier2',
  BR: 'tier2', MX: 'tier2', AR: 'tier2', CL: 'tier2', CO: 'tier2', PE: 'tier2',
  ZA: 'tier2',
  CN: 'tier2',
  MY: 'tier2',
  
  // Tier 3: Emerging markets (0.5x - 50% discount)
  TH: 'tier3',
  PH: 'tier3',
  ID: 'tier3',
  VN: 'tier3',
  IN: 'tier3',
  PK: 'tier3',
  BD: 'tier3',
  LK: 'tier3',
  NP: 'tier3',
  NG: 'tier3',
  EG: 'tier3',
  KE: 'tier3',
  GH: 'tier3',
  TZ: 'tier3',
  UG: 'tier3',
  MA: 'tier3',
  EC: 'tier3',
};

// Get pricing tier for a country (defaults to tier1 for unlisted countries)
export function getPricingTier(countryCode: string): PricingTier {
  return COUNTRY_PRICING_TIER[countryCode.toUpperCase()] || 'tier1';
}

// Get PPP multiplier for a country
export function getPPPMultiplier(countryCode: string): number {
  const tier = getPricingTier(countryCode);
  return PPP_MULTIPLIERS[tier];
}

// Comprehensive currency configurations
export const CURRENCIES: Record<string, CurrencyConfig> = {
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    exchangeRate: 1,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1.27,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRate: 1.17,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 2,
  },
  THB: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    exchangeRate: 44.5,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  PHP: {
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    exchangeRate: 71.5,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    exchangeRate: 106,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    exchangeRate: 192,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    exchangeRate: 9.2,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  KRW: {
    code: 'KRW',
    symbol: '₩',
    name: 'South Korean Won',
    exchangeRate: 1780,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    exchangeRate: 1.71,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  MYR: {
    code: 'MYR',
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    exchangeRate: 5.65,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    exchangeRate: 20150,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    exchangeRate: 31800,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    exchangeRate: 1.95,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    exchangeRate: 2.12,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    exchangeRate: 1.78,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    exchangeRate: 1.12,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: "'",
    decimalPlaces: 2,
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    exchangeRate: 13.5,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  NOK: {
    code: 'NOK',
    symbol: 'kr',
    name: 'Norwegian Krone',
    exchangeRate: 13.8,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    name: 'Danish Krone',
    exchangeRate: 8.75,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 2,
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish Zloty',
    exchangeRate: 5.1,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 2,
  },
  CZK: {
    code: 'CZK',
    symbol: 'Kč',
    name: 'Czech Koruna',
    exchangeRate: 29.5,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  HUF: {
    code: 'HUF',
    symbol: 'Ft',
    name: 'Hungarian Forint',
    exchangeRate: 465,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  RON: {
    code: 'RON',
    symbol: 'lei',
    name: 'Romanian Leu',
    exchangeRate: 5.85,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 2,
  },
  BGN: {
    code: 'BGN',
    symbol: 'лв',
    name: 'Bulgarian Lev',
    exchangeRate: 2.3,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 2,
  },
  HRK: {
    code: 'HRK',
    symbol: 'kn',
    name: 'Croatian Kuna',
    exchangeRate: 8.85,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 2,
  },
  RUB: {
    code: 'RUB',
    symbol: '₽',
    name: 'Russian Ruble',
    exchangeRate: 115,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  UAH: {
    code: 'UAH',
    symbol: '₴',
    name: 'Ukrainian Hryvnia',
    exchangeRate: 52.5,
    symbolPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimalPlaces: 0,
  },
  TRY: {
    code: 'TRY',
    symbol: '₺',
    name: 'Turkish Lira',
    exchangeRate: 43.5,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  ILS: {
    code: 'ILS',
    symbol: '₪',
    name: 'Israeli Shekel',
    exchangeRate: 4.65,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    exchangeRate: 4.67,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  SAR: {
    code: 'SAR',
    symbol: '﷼',
    name: 'Saudi Riyal',
    exchangeRate: 4.77,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    exchangeRate: 23.2,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    exchangeRate: 1950,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  EGP: {
    code: 'EGP',
    symbol: 'E£',
    name: 'Egyptian Pound',
    exchangeRate: 62.5,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    exchangeRate: 164,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    exchangeRate: 16.2,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    exchangeRate: 6.2,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 2,
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Mexican Peso',
    exchangeRate: 25.5,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  ARS: {
    code: 'ARS',
    symbol: 'AR$',
    name: 'Argentine Peso',
    exchangeRate: 1280,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  CLP: {
    code: 'CLP',
    symbol: 'CL$',
    name: 'Chilean Peso',
    exchangeRate: 1220,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  COP: {
    code: 'COP',
    symbol: 'CO$',
    name: 'Colombian Peso',
    exchangeRate: 5450,
    symbolPosition: 'before',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    decimalPlaces: 0,
  },
  PEN: {
    code: 'PEN',
    symbol: 'S/',
    name: 'Peruvian Sol',
    exchangeRate: 4.75,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    exchangeRate: 355,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  BDT: {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi Taka',
    exchangeRate: 152,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  LKR: {
    code: 'LKR',
    symbol: 'Rs',
    name: 'Sri Lankan Rupee',
    exchangeRate: 372,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  NPR: {
    code: 'NPR',
    symbol: 'रू',
    name: 'Nepalese Rupee',
    exchangeRate: 170,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  TWD: {
    code: 'TWD',
    symbol: 'NT$',
    name: 'Taiwan Dollar',
    exchangeRate: 41,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 0,
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    exchangeRate: 9.9,
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimalPlaces: 2,
  },
};

// Country to currency code mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Europe
  GB: 'GBP', UK: 'GBP',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR', SK: 'EUR',
  SI: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR', MT: 'EUR', CY: 'EUR',
  LU: 'EUR',
  CH: 'CHF', LI: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  HR: 'EUR', // Croatia joined Euro in 2023
  RU: 'RUB',
  UA: 'UAH',
  TR: 'TRY',
  
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  
  // South America
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  EC: 'USD', // Ecuador uses USD
  
  // Asia Pacific
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  TW: 'TWD',
  HK: 'HKD',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
  VN: 'VND',
  PH: 'PHP',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  AU: 'AUD',
  NZ: 'NZD',
  
  // Middle East
  IL: 'ILS',
  AE: 'AED',
  SA: 'SAR',
  QA: 'USD', // Qatar Riyal pegged to USD, using USD for simplicity
  KW: 'USD', // Kuwait Dinar, using USD for simplicity
  BH: 'USD', // Bahrain Dinar, using USD for simplicity
  OM: 'USD', // Oman Rial, using USD for simplicity
  
  // Africa
  ZA: 'ZAR',
  NG: 'NGN',
  EG: 'EGP',
  KE: 'KES',
  GH: 'GHS',
  MA: 'EUR', // Morocco often uses EUR for international transactions
  TZ: 'USD', // Tanzania uses USD for international transactions
  UG: 'USD', // Uganda uses USD for international transactions
};

// Get currency config for a country code
export function getCurrencyForCountry(countryCode: string): CurrencyConfig {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

// Format a price in a specific currency with PPP adjustment
export function formatPrice(
  priceInPence: number,
  currency: CurrencyConfig,
  options?: { showCode?: boolean; countryCode?: string }
): string {
  // Apply PPP multiplier if country code is provided
  const pppMultiplier = options?.countryCode ? getPPPMultiplier(options.countryCode) : 1.0;
  const adjustedPriceInPence = priceInPence * pppMultiplier;
  
  // Convert from GBP pence to target currency
  const priceInGBP = adjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * currency.exchangeRate;
  
  // Round based on decimal places
  const roundedPrice = currency.decimalPlaces === 0
    ? Math.round(convertedPrice)
    : Number(convertedPrice.toFixed(currency.decimalPlaces));
  
  // Format the number
  const parts = roundedPrice.toFixed(currency.decimalPlaces).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  const formattedNumber = currency.decimalPlaces > 0
    ? `${integerPart}${currency.decimalSeparator}${parts[1]}`
    : integerPart;
  
  // Add symbol
  let result = currency.symbolPosition === 'before'
    ? `${currency.symbol}${formattedNumber}`
    : `${formattedNumber}${currency.symbol}`;
  
  // Optionally add currency code
  if (options?.showCode) {
    result += ` ${currency.code}`;
  }
  
  return result;
}

// Get price in pence after PPP adjustment (for Stripe checkout)
export function getPPPAdjustedPriceInPence(priceInPence: number, countryCode: string): number {
  const pppMultiplier = getPPPMultiplier(countryCode);
  return Math.round(priceInPence * pppMultiplier);
}

// Get display price with both local and GBP
export function getDisplayPriceWithGBP(priceInPence: number, currency: CurrencyConfig): {
  localPrice: string;
  gbpPrice: string;
  isGBP: boolean;
} {
  const gbpPrice = `£${(priceInPence / 100).toFixed(2)}`;
  const localPrice = formatPrice(priceInPence, currency);
  
  return {
    localPrice,
    gbpPrice,
    isGBP: currency.code === 'GBP',
  };
}

// Supported currencies for the currency selector
export const SUPPORTED_CURRENCIES = [
  'GBP', 'USD', 'EUR', 'THB', 'PHP', 'INR', 'JPY', 'CNY', 'KRW',
  'SGD', 'MYR', 'IDR', 'AUD', 'NZD', 'CAD', 'CHF', 'AED', 'SAR',
  'ZAR', 'BRL', 'MXN', 'PLN', 'TRY', 'HKD', 'TWD'
] as const;

// Reverse mapping: currency to representative country (for PPP tier lookup when manually selecting currency)
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  GBP: 'GB',
  USD: 'US',
  EUR: 'DE', // Use Germany as representative for Eurozone (tier1)
  THB: 'TH',
  PHP: 'PH',
  INR: 'IN',
  JPY: 'JP',
  CNY: 'CN',
  KRW: 'KR',
  SGD: 'SG',
  MYR: 'MY',
  IDR: 'ID',
  AUD: 'AU',
  NZD: 'NZ',
  CAD: 'CA',
  CHF: 'CH',
  AED: 'AE',
  SAR: 'SA',
  ZAR: 'ZA',
  BRL: 'BR',
  MXN: 'MX',
  PLN: 'PL',
  TRY: 'TR',
  HKD: 'HK',
  TWD: 'TW',
  VND: 'VN',
  PKR: 'PK',
  BDT: 'BD',
  LKR: 'LK',
  NPR: 'NP',
};

export type SupportedCurrencyCode = typeof SUPPORTED_CURRENCIES[number];

// Zero-decimal currencies for Stripe (no cents/pence subdivision)
// These currencies don't use decimal amounts in Stripe
export const ZERO_DECIMAL_CURRENCIES = [
  'JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG', 'GNF', 'KMF', 'MGA',
  'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF', 'BIF', 'DJF', 'KHR'
] as const;

// Convert GBP pence to local currency amount for Stripe
// Handles zero-decimal currencies correctly
export function convertToStripeCurrencyAmount(
  priceInGBPPence: number,
  currencyCode: string,
  countryCode?: string
): number {
  const currency = CURRENCIES[currencyCode.toUpperCase()];
  if (!currency) {
    // Fallback to GBP if currency not found
    return priceInGBPPence;
  }
  
  // Apply PPP adjustment if country code provided
  const pppMultiplier = countryCode ? getPPPMultiplier(countryCode) : 1.0;
  const adjustedPriceInPence = priceInGBPPence * pppMultiplier;
  
  // Convert from GBP pence to target currency
  const priceInGBP = adjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * currency.exchangeRate;
  
  // Check if this is a zero-decimal currency
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
  
  if (isZeroDecimal) {
    // For zero-decimal currencies, Stripe expects the whole unit amount
    return Math.round(convertedPrice);
  } else {
    // For standard currencies, Stripe expects the smallest unit (cents/pence)
    return Math.round(convertedPrice * 100);
  }
}

// Get the Stripe currency code (lowercase) for a country
export function getStripeCurrencyCode(countryCode: string): string {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'GBP';
  return currencyCode.toLowerCase();
}
