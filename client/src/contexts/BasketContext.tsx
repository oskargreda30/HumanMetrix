import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface BasketItem {
  id: string;
  name: string;
  price: number; // Price in pence (not pounds)
}

interface BasketContextType {
  basketItems: BasketItem[];
  addToBasket: (item: BasketItem) => void;
  removeFromBasket: (id: string) => void;
  clearBasket: () => void;
  getTotalPricePence: () => number; // Returns total in pence
  getTotalPricePounds: () => number; // Returns total in pounds (for display)
  getBasketCount: () => number;
  isInBasket: (id: string) => boolean;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

const STORAGE_KEY = "humanmetrix-basket";
const BASE_FEE_PENCE = 1500; // £15.00 in pence

const migrateOldIds = (items: BasketItem[]): BasketItem[] => {
  return items.map(item => ({
    ...item,
    id: item.id.replace(/-/g, '_')
  }));
};

export function BasketProvider({ children }: { children: ReactNode }) {
  const [basketItems, setBasketItems] = useState<BasketItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const items = JSON.parse(stored);
      return migrateOldIds(items);
    } catch (error) {
      console.error("Error loading basket from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(basketItems));
    } catch (error) {
      console.error("Error saving basket to localStorage:", error);
    }
  }, [basketItems]);

  const addToBasket = (item: BasketItem) => {
    setBasketItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeFromBasket = (id: string) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBasket = () => {
    setBasketItems([]);
  };

  const getTotalPricePence = () => {
    const itemsTotalPence = basketItems.reduce((sum, item) => sum + item.price, 0); // Prices already in pence
    const totalPence = basketItems.length > 0 ? BASE_FEE_PENCE + itemsTotalPence : 0;
    return totalPence;
  };

  const getTotalPricePounds = () => {
    return getTotalPricePence() / 100; // Convert pence to pounds for display
  };

  const getBasketCount = () => {
    return basketItems.length;
  };

  const isInBasket = (id: string) => {
    return basketItems.some((item) => item.id === id);
  };

  return (
    <BasketContext.Provider
      value={{
        basketItems,
        addToBasket,
        removeFromBasket,
        clearBasket,
        getTotalPricePence,
        getTotalPricePounds,
        getBasketCount,
        isInBasket,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (context === undefined) {
    throw new Error("useBasket must be used within a BasketProvider");
  }
  return context;
}
