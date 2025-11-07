import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface BasketItem {
  id: string;
  name: string;
  price: number;
}

interface BasketContextType {
  basketItems: BasketItem[];
  addToBasket: (item: BasketItem) => void;
  removeFromBasket: (id: string) => void;
  clearBasket: () => void;
  getTotalPrice: () => number;
  getBasketCount: () => number;
  isInBasket: (id: string) => boolean;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

const STORAGE_KEY = "humanmetrix-basket";
const BASE_FEE = 0.02;

export function BasketProvider({ children }: { children: ReactNode }) {
  const [basketItems, setBasketItems] = useState<BasketItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
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

  const getTotalPrice = () => {
    const itemsTotal = basketItems.reduce((sum, item) => sum + item.price, 0);
    return basketItems.length > 0 ? BASE_FEE + itemsTotal : 0;
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
        getTotalPrice,
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
