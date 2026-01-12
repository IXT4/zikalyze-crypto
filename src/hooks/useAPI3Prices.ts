import { useState, useEffect, useCallback, useRef } from "react";

// API3 dAPI - Decentralized API for real-time price data
// Uses Nodary API (API3's free data provider) for browser-compatible access

export interface API3PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "API3";
}

// API3 Nodary endpoints (CORS-friendly, free tier)
const API3_NODARY_API = "https://api.nodary.io/signed-data";

// Mapping of common symbols to API3/Nodary feed names
const API3_FEEDS: Record<string, string> = {
  "BTC/USD": "BTC/USD",
  "ETH/USD": "ETH/USD",
  "SOL/USD": "SOL/USD",
  "BNB/USD": "BNB/USD",
  "XRP/USD": "XRP/USD",
  "ADA/USD": "ADA/USD",
  "DOGE/USD": "DOGE/USD",
  "AVAX/USD": "AVAX/USD",
  "DOT/USD": "DOT/USD",
  "LINK/USD": "LINK/USD",
  "MATIC/USD": "MATIC/USD",
  "UNI/USD": "UNI/USD",
  "ATOM/USD": "ATOM/USD",
  "LTC/USD": "LTC/USD",
  "FIL/USD": "FIL/USD",
  "ARB/USD": "ARB/USD",
  "OP/USD": "OP/USD",
  "NEAR/USD": "NEAR/USD",
  "APT/USD": "APT/USD",
  "SUI/USD": "SUI/USD",
};

// Cache settings
const CACHE_KEY = "api3_prices_cache";
const CACHE_TTL = 60 * 1000; // 1 minute

interface CachedData {
  prices: Record<string, API3PriceData>;
  timestamp: number;
}

const loadCache = (): Map<string, API3PriceData> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return new Map(Object.entries(data.prices));
  } catch {
    return null;
  }
};

const saveCache = (prices: Map<string, API3PriceData>) => {
  try {
    const data: CachedData = {
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

export const useAPI3Prices = () => {
  const [prices, setPrices] = useState<Map<string, API3PriceData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const pricesMapRef = useRef<Map<string, API3PriceData>>(new Map());
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);

  const getPrice = useCallback((symbol: string): API3PriceData | undefined => {
    const normalized = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalized);
  }, []);

  const fetchPrice = useCallback(async (symbol: string, feedName: string): Promise<API3PriceData | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      // Fetch from Nodary signed data API
      const response = await fetch(`${API3_NODARY_API}/${encodeURIComponent(feedName)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Nodary returns signed data with value and timestamp
      if (data && data.encodedValue) {
        // encodedValue is a hex string representing the price
        const priceValue = parseInt(data.encodedValue, 16);
        // API3 prices typically use 18 decimals
        const price = priceValue / 1e18;

        if (price > 0) {
          return {
            symbol,
            price,
            timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
            source: "API3",
          };
        }
      }

      return null;
    } catch (err) {
      return null;
    }
  }, []);

  const fetchAllPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      const symbols = Object.keys(API3_FEEDS);
      const batchSize = 5;
      const newPrices = new Map(pricesMapRef.current);
      let successCount = 0;

      for (let i = 0; i < symbols.length; i += batchSize) {
        if (!isMountedRef.current) break;

        const batch = symbols.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(symbol => fetchPrice(symbol, API3_FEEDS[symbol]))
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            newPrices.set(batch[index], result.value);
            successCount++;
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (isMountedRef.current) {
        pricesMapRef.current = newPrices;
        saveCache(newPrices);
        setPrices(new Map(newPrices));
        setIsConnected(successCount > 0);
        setLastUpdateTime(Date.now());
        setError(successCount === 0 ? "No API3 data available" : null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError("API3 fetch failed");
        setIsConnected(false);
      }
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchPrice]);

  useEffect(() => {
    isMountedRef.current = true;

    // Load from cache first
    const cached = loadCache();
    if (cached && cached.size > 0) {
      pricesMapRef.current = cached;
      setPrices(cached);
      setIsConnected(true);
      setIsLoading(false);
    }

    // Fetch fresh data
    fetchAllPrices();

    // Refresh every 20 seconds
    intervalRef.current = setInterval(fetchAllPrices, 20000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAllPrices]);

  return {
    prices,
    isConnected,
    isLoading,
    error,
    getPrice,
    lastUpdateTime,
    supportedFeeds: API3_FEEDS,
  };
};
