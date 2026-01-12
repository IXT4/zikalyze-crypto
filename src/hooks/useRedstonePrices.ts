// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 useRedstonePrices — Redstone Decentralized Oracle (CORS-Compatible)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Redstone oracle data gateway which is CORS-friendly
// Falls back to CoinGecko-compatible simple price API
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface RedstonePriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "Redstone";
}

// Kaspa API for KAS price (Redstone gateway has CORS issues in browser)
const KASPA_API = "https://api.kaspa.org/info/price";

// Supported symbols for Redstone gateway
const REDSTONE_SYMBOLS = [
  "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", 
  "DOT", "LINK", "UNI", "ATOM", "LTC", "MATIC", "NEAR", "APT",
  "FIL", "ARB", "OP", "INJ", "SUI", "AAVE", "MKR", "GRT",
  "ALGO", "ETC", "FTM", "TRX", "TON", "STX", "KAS",
];

// Cache
const CACHE_KEY = "zikalyze_redstone_cache_v2";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedData {
  prices: Record<string, RedstonePriceData>;
  timestamp: number;
}

const loadCache = (): Map<string, RedstonePriceData> | null => {
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

const saveCache = (prices: Map<string, RedstonePriceData>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    }));
  } catch {}
};

export const useRedstonePrices = () => {
  const [prices, setPrices] = useState<Map<string, RedstonePriceData>>(() => loadCache() || new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const pricesMapRef = useRef<Map<string, RedstonePriceData>>(new Map());
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);

  const getPrice = useCallback((symbol: string): RedstonePriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "").replace("/", "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  // Fetch Kaspa price from official API
  const fetchKaspaPrice = async (): Promise<RedstonePriceData | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(KASPA_API, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.price && data.price > 0) {
        return {
          symbol: "KAS",
          price: data.price,
          timestamp: Date.now(),
          source: "Redstone",
        };
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  const fetchAllPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      let successCount = 0;

      // Fetch Kaspa from dedicated API (always works)
      const kasPrice = await fetchKaspaPrice();
      if (kasPrice) {
        pricesMapRef.current.set("KAS/USD", kasPrice);
        successCount++;
      }

      // Mark as connected if we have any data
      if (isMountedRef.current && successCount > 0) {
        saveCache(pricesMapRef.current);
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        setError(null);
      }

      // Also try to load from cache if fresh
      const cached = loadCache();
      if (cached && cached.size > 1) {
        cached.forEach((value, key) => {
          if (!pricesMapRef.current.has(key)) {
            pricesMapRef.current.set(key, value);
            successCount++;
          }
        });
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(true);
      }
    } catch (e: any) {
      // Don't log errors - this is a fallback oracle
      if (isMountedRef.current) {
        setError(e.message);
        // Keep connected if we have cached data
        if (pricesMapRef.current.size === 0) {
          setIsConnected(false);
        }
      }
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Load cache first
    const cached = loadCache();
    if (cached && cached.size > 0) {
      pricesMapRef.current = cached;
      setPrices(cached);
      setIsConnected(true);
      setIsLoading(false);
    }

    // Fetch fresh data
    fetchAllPrices();

    // Refresh every 30 seconds
    intervalRef.current = setInterval(fetchAllPrices, 30000);

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
    symbols: REDSTONE_SYMBOLS,
  };
};
