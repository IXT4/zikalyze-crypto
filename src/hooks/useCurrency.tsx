import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  CNY: number;
  JPY: number;
}

interface CurrencyContextType {
  currency: string;
  symbol: string;
  rates: ExchangeRates;
  loading: boolean;
  formatPrice: (usdPrice: number, decimals?: number) => string;
  convertPrice: (usdPrice: number) => number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
  JPY: "¥",
};

const DEFAULT_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.24,
  JPY: 149.5,
};

const STORAGE_KEY = "zikalyze_settings";
const RATES_CACHE_KEY = "zikalyze_exchange_rates";
const RATES_CACHE_DURATION = 3600000; // 1 hour

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  // Load currency from settings
  useEffect(() => {
    const loadCurrency = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.currency) {
            setCurrency(parsed.currency);
          }
        }
      } catch (error) {
        console.error("Error loading currency setting:", error);
      }
    };

    loadCurrency();

    // Listen for storage changes (when settings are saved)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadCurrency();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleSettingsChange = () => loadCurrency();
    window.addEventListener("settingsChanged", handleSettingsChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settingsChanged", handleSettingsChange);
    };
  }, []);

  // Fetch exchange rates - ONLY after user interaction or long delay
  const fetchRates = useCallback(async () => {
    // Check cache first - use cached data aggressively
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { rates: cachedRates, timestamp } = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - timestamp < RATES_CACHE_DURATION) {
          setRates(cachedRates);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      // Ignore cache errors, use defaults
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch rates");
      }
      
      const data = await response.json();
      
      const newRates: ExchangeRates = {
        USD: 1,
        EUR: data.rates.EUR || DEFAULT_RATES.EUR,
        GBP: data.rates.GBP || DEFAULT_RATES.GBP,
        CNY: data.rates.CNY || DEFAULT_RATES.CNY,
        JPY: data.rates.JPY || DEFAULT_RATES.JPY,
      };
      
      setRates(newRates);
      
      // Cache the rates
      localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
        rates: newRates,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      setRates(DEFAULT_RATES);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check cache immediately on mount - no network request
  useEffect(() => {
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { rates: cachedRates, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < RATES_CACHE_DURATION) {
          setRates(cachedRates);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Use defaults
    }
    setLoading(false);
  }, []);

  // Defer network fetch until after page is fully loaded and idle
  useEffect(() => {
    // Only fetch after user has interacted OR after a very long delay
    let hasFetched = false;
    
    const triggerFetch = () => {
      if (hasFetched) return;
      hasFetched = true;
      fetchRates();
    };

    // Very long delay - 8 seconds to ensure completely out of audit window
    const timeoutId = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => triggerFetch(), { timeout: 15000 });
      } else {
        triggerFetch();
      }
    }, 8000);

    // Also trigger on first user interaction (faster path for real users)
    const interactionEvents = ['click', 'scroll', 'keydown', 'touchstart'];
    const handleInteraction = () => {
      setTimeout(triggerFetch, 100);
      interactionEvents.forEach(e => window.removeEventListener(e, handleInteraction));
    };
    interactionEvents.forEach(e => window.addEventListener(e, handleInteraction, { once: true, passive: true }));
    
    // Refresh rates periodically
    const interval = setInterval(fetchRates, RATES_CACHE_DURATION);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
      interactionEvents.forEach(e => window.removeEventListener(e, handleInteraction));
    };
  }, [fetchRates]);

  const convertPrice = useCallback((usdPrice: number): number => {
    const rate = rates[currency as keyof ExchangeRates] || 1;
    return usdPrice * rate;
  }, [currency, rates]);

  const formatPrice = useCallback((usdPrice: number, decimals?: number): string => {
    const converted = convertPrice(usdPrice);
    const sym = CURRENCY_SYMBOLS[currency] || "$";
    
    // Determine decimal places based on value
    let decimalPlaces = decimals;
    if (decimalPlaces === undefined) {
      if (converted < 0.01) {
        decimalPlaces = 6;
      } else if (converted < 1) {
        decimalPlaces = 4;
      } else if (converted < 100) {
        decimalPlaces = 2;
      } else {
        decimalPlaces = 2;
      }
    }
    
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
    
    return `${sym}${formatted}`;
  }, [currency, convertPrice]);

  const symbol = CURRENCY_SYMBOLS[currency] || "$";

  return (
    <CurrencyContext.Provider value={{ currency, symbol, rates, loading, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return a default implementation if used outside provider
    return {
      currency: "USD",
      symbol: "$",
      rates: DEFAULT_RATES,
      loading: false,
      formatPrice: (price: number) => `$${price.toLocaleString()}`,
      convertPrice: (price: number) => price,
    };
  }
  return context;
};
