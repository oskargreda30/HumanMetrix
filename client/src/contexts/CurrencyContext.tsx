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
  setCurrency: (currencyCode: string, newCountryCode?: string) => void;
  formatLocalPrice: (priceInPence: number) => string;
  isLoading: boolean;
  countryCode: string | null;
  availableCurrencies: typeof SUPPORTED_CURRENCIES;
  pricingTier: PricingTier;
  pppMultiplier: number;
  getAdjustedPriceInPence: (priceInPence: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "humanmetrix-currency";
const COUNTRY_STORAGE_KEY = "humanmetrix-country";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(CURRENCIES.GBP);
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  // Detect user's location on mount
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Check if user has a saved preference
        const savedCurrency = localStorage.getItem(STORAGE_KEY);
        const savedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
        
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setCurrencyState(CURRENCIES[savedCurrency]);
          if (savedCountry) {
            setCountryCode(savedCountry);
          }
          setIsLoading(false);
          return;
        }

        // Fetch geolocation from our API
        const response = await fetch('/api/geolocation');
        if (response.ok) {
          const data = await response.json();
          if (data.countryCode) {
            setCountryCode(data.countryCode);
            localStorage.setItem(COUNTRY_STORAGE_KEY, data.countryCode);
            
            // Get currency for the detected country
            const detectedCurrency = getCurrencyForCountry(data.countryCode);
            setCurrencyState(detectedCurrency);
            
            // Save to localStorage for future visits
            localStorage.setItem(STORAGE_KEY, detectedCurrency.code);
          }
        }
      } catch (error) {
        console.error('Failed to detect currency:', error);
        // Keep default GBP
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, []);

  const setCurrency = (currencyCode: string, newCountryCode?: string) => {
    const newCurrency = CURRENCIES[currencyCode];
    if (newCurrency) {
      setCurrencyState(newCurrency);
      localStorage.setItem(STORAGE_KEY, currencyCode);
      // Update country code if provided (for PPP pricing tier)
      if (newCountryCode) {
        setCountryCode(newCountryCode);
        localStorage.setItem(COUNTRY_STORAGE_KEY, newCountryCode);
      }
    }
  };

  // Format price with PPP adjustment applied
  const formatLocalPrice = (priceInPence: number): string => {
    return formatPrice(priceInPence, currency, { countryCode: countryCode || 'GB' });
  };

  // Get PPP-adjusted price in pence (for Stripe checkout)
  const getAdjustedPriceInPence = (priceInPence: number): number => {
    return getPPPAdjustedPriceInPence(priceInPence, countryCode || 'GB');
  };

  // Get pricing tier and multiplier for the current country
  const pricingTier = getPricingTier(countryCode || 'GB');
  const pppMultiplier = getPPPMultiplier(countryCode || 'GB');

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
