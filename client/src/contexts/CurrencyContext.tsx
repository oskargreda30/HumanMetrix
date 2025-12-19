import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  CURRENCIES, 
  getCurrencyForCountry, 
  formatPrice, 
  type CurrencyConfig,
  SUPPORTED_CURRENCIES,
  getPPPMultiplier,
  getPricingTier,
  type PricingTier,
  getPPPAdjustedPriceInPence
} from "@shared/currencies";

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (currencyCode: string) => void; // Only changes display currency, not PPP tier
  formatLocalPrice: (priceInPence: number) => string;
  isLoading: boolean;
  countryCode: string | null;
  availableCurrencies: typeof SUPPORTED_CURRENCIES;
  pricingTier: PricingTier;
  pppMultiplier: number;
  getAdjustedPriceInPence: (priceInPence: number) => number;
  isVPN: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "humanmetrix-currency";
const COUNTRY_STORAGE_KEY = "humanmetrix-country";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(CURRENCIES.GBP);
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isVPN, setIsVPN] = useState(false);

  // Detect user's location on mount - ALWAYS use geolocation for PPP pricing
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // ALWAYS fetch geolocation first - this determines PPP pricing
        const response = await fetch('/api/geolocation');
        if (response.ok) {
          const data = await response.json();
          
          // Set VPN status
          setIsVPN(data.isVPN === true);
          
          if (data.countryCode && data.detected) {
            // Use detected country for PPP pricing (not from localStorage)
            setCountryCode(data.countryCode);
            
            // Get currency for the detected country
            const detectedCurrency = getCurrencyForCountry(data.countryCode);
            setCurrencyState(detectedCurrency);
            
            // Save to localStorage (but geolocation always takes priority on next visit)
            localStorage.setItem(STORAGE_KEY, detectedCurrency.code);
            localStorage.setItem(COUNTRY_STORAGE_KEY, data.countryCode);
          } else {
            // Geolocation failed - use saved preferences as fallback
            const savedCurrency = localStorage.getItem(STORAGE_KEY);
            const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
            
            if (savedCurrency && CURRENCIES[savedCurrency]) {
              setCurrencyState(CURRENCIES[savedCurrency]);
            }
            if (savedCountry) {
              setCountryCode(savedCountry);
            }
          }
        } else {
          // API error - use saved preferences
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
        console.error('Failed to detect location:', error);
        // On error, use saved preferences but assume no VPN
        const savedCurrency = localStorage.getItem(STORAGE_KEY);
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setCurrencyState(CURRENCIES[savedCurrency]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    detectLocation();
  }, []);

  // setCurrency only changes the DISPLAY currency, not the country code
  // Country code (for PPP) is determined solely by geolocation
  const setCurrency = (currencyCode: string) => {
    const newCurrency = CURRENCIES[currencyCode];
    if (newCurrency) {
      setCurrencyState(newCurrency);
      localStorage.setItem(STORAGE_KEY, currencyCode);
      // Note: We intentionally do NOT update countryCode here
      // PPP pricing is based on geolocation, not user-selected currency
    }
  };

  // Format price with PPP adjustment applied
  // VPN users see full price (no PPP discount)
  const formatLocalPrice = (priceInPence: number): string => {
    if (isVPN) {
      // VPN users get full price - use GB for no discount
      return formatPrice(priceInPence, currency, { countryCode: 'GB' });
    }
    return formatPrice(priceInPence, currency, { countryCode: countryCode || 'GB' });
  };

  // Get PPP-adjusted price in pence (for Stripe checkout)
  // VPN users get full price (no PPP adjustment)
  const getAdjustedPriceInPence = (priceInPence: number): number => {
    if (isVPN) {
      return priceInPence; // Full price for VPN users
    }
    return getPPPAdjustedPriceInPence(priceInPence, countryCode || 'GB');
  };

  // Get pricing tier and multiplier for the current country
  // VPN users always get tier1 (full price)
  const pricingTier: PricingTier = isVPN ? 'tier1' : getPricingTier(countryCode || 'GB');
  const pppMultiplier = isVPN ? 1.0 : getPPPMultiplier(countryCode || 'GB');

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatLocalPrice,
        isLoading,
        countryCode,
        availableCurrencies: SUPPORTED_CURRENCIES,
        pricingTier,
        pppMultiplier,
        getAdjustedPriceInPence,
        isVPN,
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
