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

// ============================================
// SEA Launch Pricing (December 2025)
// ============================================
// Strategic flat-rate pricing for Southeast Asia market entry
// Prices are in LOCAL CURRENCY smallest units for the FULL assessment suite (all 4 assessments)
// Each country charges in their native currency for better user experience

export interface SEALaunchPricing {
  priceLocalUnits: number;  // Total price in local currency smallest units (e.g. PHP centavos, VND dong)
  currencyCode: string;     // Local currency code (PHP, VND, IDR, MYR)
  pricingNote: string;      // Description for admin/debug
  isZeroDecimal: boolean;   // Whether currency has no decimal places (VND, IDR)
}

export const SEA_LAUNCH_COUNTRIES: Record<string, SEALaunchPricing> = {
  // Philippines: ₱59 PHP (~$1.00 USD) - PHP uses centavos, so 5900 centavos = ₱59
  PH: { priceLocalUnits: 5900, currencyCode: 'PHP', pricingNote: 'Philippines Pilot - ₱59 PHP', isZeroDecimal: false },
  // Vietnam: 30,000₫ VND (~$1.20 USD) - VND is zero-decimal, so 30000 = 30,000₫
  VN: { priceLocalUnits: 30000, currencyCode: 'VND', pricingNote: 'Vietnam Expansion - 30,000₫ VND', isZeroDecimal: true },
  // Indonesia: Rp18,000 IDR (~$1.10 USD) - IDR uses 2 decimals in Stripe, so 1800000 = Rp18,000.00
  ID: { priceLocalUnits: 1800000, currencyCode: 'IDR', pricingNote: 'Indonesia Expansion - Rp18,000 IDR', isZeroDecimal: false },
  // Malaysia: RM8 MYR (~$1.80 USD) - MYR uses sen, so 800 sen = RM8
  MY: { priceLocalUnits: 800, currencyCode: 'MYR', pricingNote: 'Malaysia Expansion - RM8 MYR', isZeroDecimal: false },
};

// Check if a country uses SEA launch pricing
export function hasSEALaunchPricing(countryCode: string): boolean {
  return countryCode.toUpperCase() in SEA_LAUNCH_COUNTRIES;
}

// Get SEA launch pricing for a country (null if not a SEA launch country)
export function getSEALaunchPricing(countryCode: string): SEALaunchPricing | null {
  return SEA_LAUNCH_COUNTRIES[countryCode.toUpperCase()] || null;
}

// Convert USD cents to GBP pence using current exchange rate
export function convertUSDCentsToGBPPence(usdCents: number): number {
  // USD exchange rate is stored as: 1 GBP = X USD
  // So to convert USD to GBP: divide by exchange rate
  const usdToGbpRate = 1 / CURRENCIES.USD.exchangeRate;
  return Math.round(usdCents * usdToGbpRate);
}

// Get the full suite price in GBP pence for SEA launch countries (for display purposes)
// Converts local currency price to approximate GBP pence
export function getSEALaunchPriceInPence(countryCode: string): number | null {
  const pricing = getSEALaunchPricing(countryCode);
  if (!pricing) return null;
  
  const currency = CURRENCIES[pricing.currencyCode];
  if (!currency) return null;
  
  // Convert local currency to GBP pence
  // For zero-decimal currencies, priceLocalUnits = actual amount (e.g. 30000 VND = 30000)
  // For decimal currencies, priceLocalUnits = smallest unit (e.g. 5900 centavos = ₱59)
  const priceInLocalCurrency = pricing.isZeroDecimal 
    ? pricing.priceLocalUnits 
    : pricing.priceLocalUnits / 100;
  
  // Convert to GBP: local / exchangeRate = GBP
  const priceInGBP = priceInLocalCurrency / currency.exchangeRate;
  
  // Return in pence
  return Math.round(priceInGBP * 100);
}

// Get the Stripe unit amount for SEA launch countries in their local currency
export function getSEALaunchStripeAmount(countryCode: string): { amount: number; currency: string } | null {
  const pricing = getSEALaunchPricing(countryCode);
  if (!pricing) return null;
  
  return {
    amount: pricing.priceLocalUnits,
    currency: pricing.currencyCode.toLowerCase()
  };
}

// ============================================
// PPP Pricing Tiers (for non-SEA countries)
// ============================================

// PPP Pricing Tiers - adjust prices based on local purchasing power
export type PricingTier = 'tier1' | 'tier2' | 'tier3' | 'sea_launch';

export const PPP_MULTIPLIERS: Record<PricingTier, number> = {
  tier1: 1.0,   // Western markets - full price (UK, US, EU, Australia, etc.)
  tier2: 0.5,   // Middle markets - 50% discount (Eastern Europe, Latin America, Middle East)
  sea_launch: 0, // SEA launch countries use fixed pricing, not multipliers
  tier3: 0.25,  // Emerging markets - 75% discount (Southeast Asia, South Asia, Africa)
};

// Map countries to their pricing tier
export const COUNTRY_PRICING_TIER: Record<string, PricingTier> = {
  // SEA Launch Countries (Dec 2025) - Now use PPP tier pricing (sea_launch deprecated)
  PH: 'tier3', // Philippines - PPP tier 3 (0.5x)
  VN: 'tier3', // Vietnam - PPP tier 3 (0.5x)
  ID: 'tier3', // Indonesia - PPP tier 3 (0.5x)
  MY: 'tier3', // Malaysia - PPP tier 3 (0.5x)
  
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
  
  // Tier 3: Emerging markets (0.5x - 50% discount)
  TH: 'tier3', // Thailand - not a launch country
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

// Question locales for assessment content localization
export type QuestionLocale = 'default' | 'sea';

// Determine question locale based on country code
// Tier 3 countries get SEA-localized questions with culturally adjusted wording
export function getQuestionLocale(countryCode: string): QuestionLocale {
  const tier = getPricingTier(countryCode);
  return tier === 'tier3' ? 'sea' : 'default';
}

// Check if a country should use SEA-localized questions
export function usesSEAQuestions(countryCode: string): boolean {
  return getQuestionLocale(countryCode) === 'sea';
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
    decimalPlaces: 2, // PHP has centavos (100 centavos = 1 peso)
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
    exchangeRate: 208,
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

// Convert a single GBP pence amount to local currency and round up
// This matches the frontend display logic (formatPriceWithRate)
// Uses roundPriceUp for consistent rounding across all currencies
export function convertAndRoundToLocalCurrency(
  priceInGBPPence: number,
  currencyCode: string,
  exchangeRate?: number,
  countryCode?: string
): number {
  const currency = CURRENCIES[currencyCode.toUpperCase()];
  if (!currency) return roundPriceUp(priceInGBPPence / 100);
  
  // Apply PPP adjustment if country code provided
  const pppMultiplier = countryCode ? getPPPMultiplier(countryCode) : 1.0;
  const adjustedPriceInPence = priceInGBPPence * pppMultiplier;
  
  // Use provided exchange rate or fall back to hardcoded rate
  const effectiveRate = exchangeRate ?? currency.exchangeRate;
  
  // Convert from GBP pence to local currency units
  const priceInGBP = adjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * effectiveRate;
  
  // Apply consistent rounding using roundPriceUp
  return roundPriceUp(convertedPrice);
}

// Round price based on magnitude for cleaner display (standard rounding: 5+ rounds up)
// - Under 100: round to nearest whole number
// - 100 - 999: round to nearest 10
// - 1,000 - 9,999: round to nearest 100
// - 10,000 - 99,999: round to nearest 1,000
// - 100,000 - 999,999: round to nearest 10,000
// - 1,000,000+: round to nearest 100,000
export function roundPriceUp(price: number, _currency?: CurrencyConfig): number {
  if (price < 100) {
    // Under 100: round to nearest whole number
    return Math.round(price);
  } else if (price < 1000) {
    // Hundreds: round to nearest 10 (e.g. 165 → 170, 164 → 160)
    return Math.round(price / 10) * 10;
  } else if (price < 10000) {
    // Thousands: round to nearest 100
    return Math.round(price / 100) * 100;
  } else if (price < 100000) {
    // Ten thousands: round to nearest 1,000
    return Math.round(price / 1000) * 1000;
  } else if (price < 1000000) {
    // Hundred thousands: round to nearest 10,000
    return Math.round(price / 10000) * 10000;
  } else {
    // Millions+: round to nearest 100,000
    return Math.round(price / 100000) * 100000;
  }
}

// Convert pence to rounded local currency amount (not Stripe units)
// Used for summing individually-rounded prices
export function convertPenceToRoundedLocalCurrency(
  priceInPence: number,
  currencyCode: string,
  exchangeRate?: number
): number {
  const currency = CURRENCIES[currencyCode.toUpperCase()];
  if (!currency) return roundPriceUp(priceInPence / 100);
  
  const effectiveRate = exchangeRate ?? currency.exchangeRate;
  const priceInGBP = priceInPence / 100;
  const convertedPrice = priceInGBP * effectiveRate;
  
  return roundPriceUp(convertedPrice);
}

// Calculate Stripe amount from sum of individually-rounded local prices
// This matches frontend display where each component is rounded then summed
export function calculateStripeAmountFromRoundedTotal(
  roundedLocalTotal: number,
  currencyCode: string
): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
  return isZeroDecimal ? roundedLocalTotal : roundedLocalTotal * 100;
}

// Calculate total price for Stripe in local currency units
// Input: PPP-adjusted pence (already has PPP multiplier applied once)
// This function converts to local currency and applies roundPriceUp
// PPP is NOT applied here - it should already be in the input
export function calculateStripeAmountFromTotalPence(
  pppAdjustedPriceInPence: number,
  currencyCode: string,
  exchangeRate?: number
): number {
  const currency = CURRENCIES[currencyCode.toUpperCase()];
  if (!currency) {
    // Fallback: convert pence to currency units with roundPriceUp
    const priceInUnits = pppAdjustedPriceInPence / 100;
    return roundPriceUp(priceInUnits) * 100; // Return in smallest units (cents)
  }
  
  // Use provided exchange rate or fall back to hardcoded rate
  const effectiveRate = exchangeRate ?? currency.exchangeRate;
  
  // Convert from GBP pence to local currency units
  const priceInGBP = pppAdjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * effectiveRate;
  
  // Apply the same rounding as frontend display (roundPriceUp)
  const roundedPrice = roundPriceUp(convertedPrice);
  
  // For zero-decimal currencies, Stripe expects the whole unit amount
  // For standard currencies, Stripe expects the smallest unit (cents/pence)
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
  return isZeroDecimal ? roundedPrice : roundedPrice * 100;
}

// Format a price in a specific currency with PPP adjustment
// For SEA launch countries, the price is calculated from USD pricing
export function formatPrice(
  priceInPence: number,
  currency: CurrencyConfig,
  options?: { showCode?: boolean; countryCode?: string; isFullSuite?: boolean; skipPPPAdjustment?: boolean }
): string {
  let adjustedPriceInPence: number;
  
  // If skipPPPAdjustment is true, the price already has PPP applied - skip adjustment
  if (options?.skipPPPAdjustment) {
    adjustedPriceInPence = priceInPence;
  } else if (options?.countryCode && options?.isFullSuite) {
    // Check if this is a SEA launch country with fixed pricing
    const seaPriceInPence = getSEALaunchPriceInPence(options.countryCode);
    if (seaPriceInPence !== null) {
      // SEA launch countries use fixed USD-based pricing
      adjustedPriceInPence = seaPriceInPence;
    } else {
      // Apply PPP multiplier for non-SEA countries
      const pppMultiplier = getPPPMultiplier(options.countryCode);
      adjustedPriceInPence = priceInPence * pppMultiplier;
    }
  } else if (options?.countryCode) {
    // Individual assessment price - apply PPP multiplier
    const pppMultiplier = getPPPMultiplier(options.countryCode);
    adjustedPriceInPence = priceInPence * pppMultiplier;
  } else {
    adjustedPriceInPence = priceInPence;
  }
  
  // Convert from GBP pence to target currency
  const priceInGBP = adjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * currency.exchangeRate;
  
  // Round UP appropriately for the currency
  const roundedPrice = roundPriceUp(convertedPrice, currency);
  
  // Format the number (always as whole number since we round up)
  const integerPart = roundedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  
  // Add symbol
  let result = currency.symbolPosition === 'before'
    ? `${currency.symbol}${integerPart}`
    : `${integerPart}${currency.symbol}`;
  
  // Optionally add currency code
  if (options?.showCode) {
    result += ` ${currency.code}`;
  }
  
  return result;
}

// Format a price using a specific exchange rate (for live rates)
export function formatPriceWithRate(
  priceInPence: number,
  currency: CurrencyConfig,
  exchangeRate: number,
  options?: { showCode?: boolean; countryCode?: string }
): string {
  // Note: priceInPence should already have PPP adjustment applied via getAdjustedPriceInPence
  // This function only handles currency conversion and formatting, NOT PPP adjustment
  // The countryCode option is kept for backwards compatibility but no longer applies PPP
  
  // Convert from GBP pence to target currency using provided rate
  const priceInGBP = priceInPence / 100;
  const convertedPrice = priceInGBP * exchangeRate;
  
  // Round UP appropriately for the currency
  const roundedPrice = roundPriceUp(convertedPrice, currency);
  
  // Format the number (always as whole number since we round up)
  const integerPart = roundedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  
  // Add symbol
  let result = currency.symbolPosition === 'before'
    ? `${currency.symbol}${integerPart}`
    : `${integerPart}${currency.symbol}`;
  
  // Optionally add currency code
  if (options?.showCode) {
    result += ` ${currency.code}`;
  }
  
  return result;
}

// Get price in pence after PPP adjustment (for Stripe checkout)
// All countries now use PPP tier pricing (SEA launch fixed pricing deprecated)
export function getPPPAdjustedPriceInPence(priceInPence: number, countryCode: string): number {
  // All countries use PPP multiplier based on their tier
  // SEA countries (PH, VN, ID, MY) are now tier3 with 0.5x multiplier
  const pppMultiplier = getPPPMultiplier(countryCode);
  return Math.round(priceInPence * pppMultiplier);
}

// Get the full assessment suite price for a country (formatted for display)
// This is used when showing prices to users in SEA launch countries
export function getSEALaunchDisplayPrice(countryCode: string): { priceDisplay: string; currencyCode: string; isLaunchCountry: boolean } {
  const pricing = getSEALaunchPricing(countryCode);
  if (!pricing) {
    return { priceDisplay: '', currencyCode: '', isLaunchCountry: false };
  }
  
  const currency = CURRENCIES[pricing.currencyCode];
  if (!currency) {
    return { priceDisplay: '', currencyCode: '', isLaunchCountry: false };
  }
  
  // Format the local currency price
  const displayAmount = pricing.isZeroDecimal 
    ? pricing.priceLocalUnits 
    : pricing.priceLocalUnits / 100;
  
  const formattedAmount = displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: pricing.isZeroDecimal ? 0 : 0,
    maximumFractionDigits: pricing.isZeroDecimal ? 0 : 2,
  });
  
  const priceDisplay = currency.symbolPosition === 'before'
    ? `${currency.symbol}${formattedAmount}`
    : `${formattedAmount}${currency.symbol}`;
  
  return {
    priceDisplay,
    currencyCode: pricing.currencyCode,
    isLaunchCountry: true,
  };
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
// Note: IDR is NOT a zero-decimal currency in Stripe - it uses 2 decimal places
export const ZERO_DECIMAL_CURRENCIES = [
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'GNF', 'KMF', 'MGA',
  'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF', 'BIF', 'DJF'
] as const;

// Convert GBP pence to local currency amount for Stripe
// Uses the same rounding logic as formatPrice for consistency
// Optional exchangeRate parameter allows using live rates instead of hardcoded fallbacks
export function convertToStripeCurrencyAmount(
  priceInGBPPence: number,
  currencyCode: string,
  countryCode?: string,
  exchangeRate?: number
): number {
  const currency = CURRENCIES[currencyCode.toUpperCase()];
  if (!currency) {
    // Fallback to GBP if currency not found
    return priceInGBPPence;
  }
  
  // Apply PPP adjustment if country code provided
  const pppMultiplier = countryCode ? getPPPMultiplier(countryCode) : 1.0;
  const adjustedPriceInPence = priceInGBPPence * pppMultiplier;
  
  // Use provided exchange rate or fall back to hardcoded rate
  const effectiveRate = exchangeRate ?? currency.exchangeRate;
  
  // Convert from GBP pence to target currency (same as formatPrice)
  const priceInGBP = adjustedPriceInPence / 100;
  const convertedPrice = priceInGBP * effectiveRate;
  
  // Apply the same rounding as display (roundPriceUp)
  const roundedDisplayPrice = roundPriceUp(convertedPrice, currency);
  
  // Check if this is a zero-decimal currency
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyCode.toUpperCase() as any);
  
  if (isZeroDecimal) {
    // For zero-decimal currencies, Stripe expects the whole unit amount
    return roundedDisplayPrice;
  } else {
    // For standard currencies, Stripe expects the smallest unit (cents/pence)
    return roundedDisplayPrice * 100;
  }
}

// Get the Stripe currency code (lowercase) for a country
export function getStripeCurrencyCode(countryCode: string): string {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'GBP';
  return currencyCode.toLowerCase();
}

// Convert SEA launch USD cents price to local currency amount for Stripe
// This bypasses PPP adjustment since SEA launch uses fixed USD pricing
// Conversion: USD → Target currency (direct cross-rate)
export function convertSEALaunchPriceToStripeAmount(
  priceUSDCents: number,
  targetCurrencyCode: string
): number {
  const targetCurrency = CURRENCIES[targetCurrencyCode.toUpperCase()];
  const usdCurrency = CURRENCIES.USD;
  
  if (!targetCurrency || !usdCurrency) {
    // Fallback to USD cents if currency not found
    return priceUSDCents;
  }
  
  // If target is USD, just return the cents
  if (targetCurrencyCode.toUpperCase() === 'USD') {
    return priceUSDCents;
  }
  
  // Convert USD cents to USD dollars
  const priceUSD = priceUSDCents / 100;
  
  // Cross-rate conversion: USD → Target
  // Our exchange rates are GBP-based (1 GBP = X currency)
  // USD rate: 1 GBP = 1.27 USD
  // PHP rate: 1 GBP = 71.5 PHP
  // So: 1 USD = 71.5/1.27 = 56.3 PHP
  // Formula: priceInTarget = priceUSD * (targetRate / usdRate)
  const crossRate = targetCurrency.exchangeRate / usdCurrency.exchangeRate;
  const priceInTargetCurrency = priceUSD * crossRate;
  
  // Check if this is a zero-decimal currency
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(targetCurrencyCode.toUpperCase() as any);
  
  // Apply consistent rounding using roundPriceUp
  const roundedPrice = roundPriceUp(priceInTargetCurrency);
  
  if (isZeroDecimal) {
    // For zero-decimal currencies, Stripe expects the whole unit amount
    return roundedPrice;
  } else {
    // For standard currencies, Stripe expects the smallest unit (cents/pence)
    return roundedPrice * 100;
  }
}
