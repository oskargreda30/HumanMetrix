import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  CURRENCIES, 
  getCurrencyForCountry, 
  formatPriceWithRate, 
  type CurrencyConfig,
  SUPPORTED_CURRENCIES,
  getPPPMultiplier,
  getPricingTier,
  type PricingTier,
  getPPPAdjustedPriceInPence,
  hasSEALaunchPricing,
  getSEALaunchPricing,
  type SEALaunchPricing
} from "@shared/currencies";

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (currencyCode: string) => void; // Only changes display currency, not PPP tier
  formatLocalPrice: (priceInPence: number) => string;
  formatSuitePrice: (priceInPence: number) => string; // For full suite pricing (SEA launch)
  isLoading: boolean;
  countryCode: string | null;
  availableCurrencies: typeof SUPPORTED_CURRENCIES;
  pricingTier: PricingTier;
  pppMultiplier: number;
  getAdjustedPriceInPence: (priceInPence: number) => number;
  getSuiteAdjustedPriceInPence: (priceInPence: number) => number; // For full suite (SEA launch)
  isVPN: boolean;
  isSEALaunchCountry: boolean; // Whether user is in a SEA launch country
  seaLaunchPricing: SEALaunchPricing | null; // SEA launch pricing details if applicable
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "humanmetrix-currency";
const COUNTRY_STORAGE_KEY = "humanmetrix-country";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(CURRENCIES.GBP);
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isVPN, setIsVPN] = useState(false);
  const [liveExchangeRates, setLiveExchangeRates] = useState<Record<string, number> | null>(null);
  const [userManuallySelectedCurrency, setUserManuallySelectedCurrency] = useState(false);

  // Fetch location and exchange rates - reusable for network change detection
  // updateCurrency: if false, only updates country/VPN/rates but preserves user's currency selection
  const fetchLocationAndRates = async (isRetry = false, updateCurrency = true) => {
    try {
      // Cache-busting timestamp to bypass ALL caching (CDN, service worker, browser)
      const cacheBuster = `_t=${Date.now()}`;
      
      // Fetch both geolocation and exchange rates in parallel
      // Use cache: 'no-store' AND query param to force completely fresh requests
      const [geoResponse, ratesResponse] = await Promise.all([
        fetch(`/api/geolocation?${cacheBuster}`, { cache: 'no-store' }),
        fetch(`/api/exchange-rates?${cacheBuster}`, { cache: 'no-store' })
      ]);
      
      // Process exchange rates
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json();
        if (ratesData.rates) {
          setLiveExchangeRates(ratesData.rates);
        }
      }
      
      // Process geolocation
      if (geoResponse.ok) {
        const data = await geoResponse.json();
        
        // Set VPN status
        setIsVPN(data.isVPN === true);
        
        if (data.countryCode && data.detected) {
          // Use detected country for PPP pricing (not from localStorage)
          setCountryCode(data.countryCode);
          localStorage.setItem(COUNTRY_STORAGE_KEY, data.countryCode);
          
          // Only update display currency if allowed (not when user manually selected)
          if (updateCurrency) {
            const detectedCurrency = getCurrencyForCountry(data.countryCode);
            setCurrencyState(detectedCurrency);
            localStorage.setItem(STORAGE_KEY, detectedCurrency.code);
          }
        } else if (!isRetry) {
          // Geolocation failed - use saved preferences as fallback (only on initial load)
          const savedCurrency = localStorage.getItem(STORAGE_KEY);
          const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
          
          if (savedCurrency && CURRENCIES[savedCurrency]) {
            setCurrencyState(CURRENCIES[savedCurrency]);
          }
          if (savedCountry) {
            setCountryCode(savedCountry);
          }
        }
      } else if (!isRetry) {
        // API error - use saved preferences (only on initial load)
        const savedCurrency = localStorage.getItem(STORAGE_KEY);
        const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
        
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setCurrencyState(CURRENCIES[savedCurrency]);
        }
        if (savedCountry) {
          setCountryCode(savedCountry);
        }
      }
    } catch (error) {
      console.error('Failed to fetch location/rates:', error);
      // On error during initial load, use saved preferences
      if (!isRetry) {
        const savedCurrency = localStorage.getItem(STORAGE_KEY);
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setCurrencyState(CURRENCIES[savedCurrency]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchLocationAndRates(false);
  }, []);

  // Auto-reload on network change (detects VPN toggle)
  useEffect(() => {
    // Handler for network changes - updates currency since network changed
    const handleNetworkChange = () => {
      // Reset manual selection flag on network change (VPN toggle should update currency)
      setUserManuallySelectedCurrency(false);
      // Small delay to let the new network connection stabilise
      setTimeout(() => {
        fetchLocationAndRates(true, true); // Update currency on network change
      }, 1000);
    };

    // Listen for online event (fires when connection is restored)
    window.addEventListener('online', handleNetworkChange);
    
    // Listen for Network Information API changes (more granular, catches VPN toggles)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleNetworkChange);
    }

    // Periodic check only updates country/VPN/rates, NOT the display currency
    // This preserves user's manual currency selection
    // 5 minutes is sufficient - VPN changes are caught by Network Information API
    const intervalId = setInterval(() => {
      // Only re-check if the page is visible
      if (!document.hidden) {
        // Don't update currency if user manually selected one
        fetchLocationAndRates(true, !userManuallySelectedCurrency);
      }
    }, 300000); // Check every 5 minutes (reduced from 30s for performance)

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      if (connection) {
        connection.removeEventListener('change', handleNetworkChange);
      }
      clearInterval(intervalId);
    };
  }, [userManuallySelectedCurrency]);

  // setCurrency only changes the DISPLAY currency, not the country code
  // Country code (for PPP) is determined solely by geolocation
  const setCurrency = (currencyCode: string) => {
    const newCurrency = CURRENCIES[currencyCode];
    if (newCurrency) {
      setCurrencyState(newCurrency);
      localStorage.setItem(STORAGE_KEY, currencyCode);
      // Mark that user manually selected a currency - don't override on periodic checks
      setUserManuallySelectedCurrency(true);
      // Note: We intentionally do NOT update countryCode here
      // PPP pricing is based on geolocation, not user-selected currency
    }
  };

  // Format price with PPP adjustment and live exchange rates
  // VPN users see full price (no PPP discount)
  const formatLocalPrice = (priceInPence: number): string => {
    // Get the exchange rate - prefer live rates, fallback to hardcoded
    const exchangeRate = liveExchangeRates?.[currency.code] ?? currency.exchangeRate;
    
    if (isVPN) {
      // VPN users get full price - use GB for no discount
      return formatPriceWithRate(priceInPence, currency, exchangeRate, { countryCode: 'GB' });
    }
    return formatPriceWithRate(priceInPence, currency, exchangeRate, { countryCode: countryCode || 'GB' });
  };

  // Format full suite price (handles SEA launch pricing)
  // For SEA launch countries, shows the fixed USD price converted to local currency
  const formatSuitePrice = (priceInPence: number): string => {
    const exchangeRate = liveExchangeRates?.[currency.code] ?? currency.exchangeRate;
    const effectiveCountry = isVPN ? 'GB' : (countryCode || 'GB');
    
    // Check if this is a SEA launch country
    if (!isVPN && countryCode && hasSEALaunchPricing(countryCode)) {
      // For SEA launch countries, use fixed USD pricing
      const seaPricing = getSEALaunchPricing(countryCode);
      if (seaPricing) {
        // Convert USD cents to local currency
        const usdRate = liveExchangeRates?.['USD'] ?? CURRENCIES.USD.exchangeRate;
        const priceInUSD = seaPricing.priceUSDCents / 100;
        const localPrice = priceInUSD * (exchangeRate / usdRate);
        // Return formatted price
        const roundedPrice = Math.ceil(localPrice);
        const formattedNum = roundedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
        return currency.symbolPosition === 'before' 
          ? `${currency.symbol}${formattedNum}`
          : `${formattedNum}${currency.symbol}`;
      }
    }
    
    // Non-SEA countries use PPP multiplier
    return formatPriceWithRate(priceInPence, currency, exchangeRate, { countryCode: effectiveCountry });
  };

  // Get PPP-adjusted price in pence (for Stripe checkout)
  // VPN users get full price (no PPP adjustment)
  const getAdjustedPriceInPence = (priceInPence: number): number => {
    if (isVPN) {
      return priceInPence; // Full price for VPN users
    }
    return getPPPAdjustedPriceInPence(priceInPence, countryCode || 'GB');
  };

  // Get full suite adjusted price in pence (for SEA launch countries)
  const getSuiteAdjustedPriceInPence = (priceInPence: number): number => {
    if (isVPN) {
      return priceInPence; // Full price for VPN users
    }
    // getPPPAdjustedPriceInPence already handles SEA launch pricing
    return getPPPAdjustedPriceInPence(priceInPence, countryCode || 'GB');
  };

  // Get pricing tier and multiplier for the current country
  // VPN users always get tier1 (full price)
  const pricingTier: PricingTier = isVPN ? 'tier1' : getPricingTier(countryCode || 'GB');
  const pppMultiplier = isVPN ? 1.0 : getPPPMultiplier(countryCode || 'GB');
  
  // SEA launch country detection
  const isSEALaunchCountry = !isVPN && countryCode ? hasSEALaunchPricing(countryCode) : false;
  const seaLaunchPricing = !isVPN && countryCode ? getSEALaunchPricing(countryCode) : null;

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatLocalPrice,
        formatSuitePrice,
        isLoading,
        countryCode,
        availableCurrencies: SUPPORTED_CURRENCIES,
        pricingTier,
        pppMultiplier,
        getAdjustedPriceInPence,
        getSuiteAdjustedPriceInPence,
        isVPN,
        isSEALaunchCountry,
        seaLaunchPricing,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
