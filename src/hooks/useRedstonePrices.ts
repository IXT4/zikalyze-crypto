// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 useRedstonePrices — Redstone Decentralized Oracle (No CORS, Free API)
// ═══════════════════════════════════════════════════════════════════════════════
// Redstone is a modular oracle with a free, browser-compatible REST API
// Uses data from multiple sources, aggregated off-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface RedstonePriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "Redstone";
}

// Redstone public API
const REDSTONE_API = "https://api.redstone.finance";

// Supported symbols
const REDSTONE_SYMBOLS = [
  "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", 
  "DOT", "LINK", "UNI", "ATOM", "LTC", "MATIC", "NEAR", "APT",
  "FIL", "ARB", "OP", "INJ", "SUI", "AAVE", "MKR", "GRT",
  "ALGO", "ETC", "FTM", "TRX", "TON", "STX", "KAS",
];

// Cache
const CACHE_KEY = "zikalyze_redstone_cache_v1";
const CACHE_TTL = 60 * 1000; // 1 minute

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

  const fetchAllPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Fetch multiple symbols at once (excluding KAS which needs special handling)
      const redstoneFetchSymbols = REDSTONE_SYMBOLS.filter(s => s !== "KAS");
      const symbolsQuery = redstoneFetchSymbols.join(",");
      const response = await fetch(
        `${REDSTONE_API}/prices?symbols=${symbolsQuery}&provider=redstone-primary-prod`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Redstone API error: ${response.status}`);
      }

      const data = await response.json();
      let successCount = 0;

      // Parse response - Redstone returns { SYMBOL: { value: price, timestamp: ts } }
      for (const symbol of redstoneFetchSymbols) {
        if (data[symbol] && data[symbol].value > 0) {
          const priceData: RedstonePriceData = {
            symbol: symbol,
            price: data[symbol].value,
            timestamp: data[symbol].timestamp || Date.now(),
            source: "Redstone",
          };
          pricesMapRef.current.set(`${symbol}/USD`, priceData);
          successCount++;
        }
      }

      // Fetch Kaspa from dedicated API
      try {
        const kasController = new AbortController();
        const kasTimeoutId = setTimeout(() => kasController.abort(), 5000);
        const kasResponse = await fetch("https://api.kaspa.org/info/price", { signal: kasController.signal });
        clearTimeout(kasTimeoutId);
        
        if (kasResponse.ok) {
          const kasData = await kasResponse.json();
          if (kasData.price && kasData.price > 0) {
            pricesMapRef.current.set("KAS/USD", {
              symbol: "KAS",
              price: kasData.price,
              timestamp: Date.now(),
              source: "Redstone", // Label as Redstone for consistency
            });
            successCount++;
          }
        }
      } catch {
        // Silently fail for Kaspa - other oracles may have it
      }

      if (isMountedRef.current && successCount > 0) {
        saveCache(pricesMapRef.current);
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        setError(null);
        console.log(`[Redstone] Fetched ${successCount} prices`);
      }
    } catch (e: any) {
      console.error("[Redstone] Fetch error:", e.message);
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
      console.log("[Redstone] Loaded from cache");
    }

    // Fetch fresh data
    fetchAllPrices();

    // Refresh every 15 seconds
    intervalRef.current = setInterval(fetchAllPrices, 15000);

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
