import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  CURRENCIES, 
  getCurrencyForCountry, 
  formatPrice, 
  type CurrencyConfig,
  SUPPORTED_CURRENCIES 
} from "@shared/currencies";

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (currencyCode: string) => void;
  formatLocalPrice: (priceInPence: number) => string;
  formatPriceWithGBP: (priceInPence: number) => { local: string; gbp: string; isGBP: boolean };
  isLoading: boolean;
  countryCode: string | null;
  availableCurrencies: typeof SUPPORTED_CURRENCIES;
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

  const setCurrency = (currencyCode: string) => {
    const newCurrency = CURRENCIES[currencyCode];
    if (newCurrency) {
      setCurrencyState(newCurrency);
      localStorage.setItem(STORAGE_KEY, currencyCode);
    }
  };

  const formatLocalPrice = (priceInPence: number): string => {
    return formatPrice(priceInPence, currency);
  };

  const formatPriceWithGBP = (priceInPence: number) => {
    const localPrice = formatPrice(priceInPence, currency);
    const gbpPrice = `£${(priceInPence / 100).toFixed(2)}`;
    
    return {
      local: localPrice,
      gbp: gbpPrice,
      isGBP: currency.code === 'GBP',
    };
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatLocalPrice,
        formatPriceWithGBP,
        isLoading,
        countryCode,
        availableCurrencies: SUPPORTED_CURRENCIES,
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
