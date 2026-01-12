// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 useRedstonePrices — Redstone Decentralized Oracle (Expanded Top 100)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Redstone oracle data gateway with verified data feed symbols
// Primary: Redstone API gateway | Fallback: Kaspa dedicated API for KAS
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface RedstonePriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "Redstone";
}

// Redstone data gateway endpoints (CORS-friendly)
const REDSTONE_ENDPOINTS = [
  "https://api.redstone.finance",
  "https://oracle-gateway-1.a.redstone.finance",
];

// Kaspa API for KAS price (dedicated reliable source)
const KASPA_API = "https://api.kaspa.org/info/price";

// Verified Redstone data feed symbols for top 100 cryptocurrencies
// Source: https://app.redstone.finance/#/app/data-services/redstone-primary-prod
export const REDSTONE_FEED_SYMBOLS: string[] = [
  // Top 10
  "BTC", "ETH", "BNB", "SOL", "XRP",
  "ADA", "DOGE", "TRX", "AVAX", "TON",
  // 11-25
  "LINK", "DOT", "MATIC", "LTC", "BCH",
  "SHIB", "DAI", "ATOM", "UNI", "XLM",
  "ETC", "XMR", "ICP", "NEAR", "FIL",
  // 26-50
  "APT", "HBAR", "ARB", "VET", "OP",
  "MKR", "CRO", "KAS", "AAVE", "GRT",
  "RNDR", "INJ", "ALGO", "STX", "FTM",
  "SUI", "THETA", "RUNE", "LDO", "SAND",
  "MANA", "AXS", "FET", "EGLD", "FLOW",
  // 51-75
  "EOS", "CHZ", "CAKE", "XTZ", "KAVA",
  "NEO", "IOTA", "GALA", "SNX", "ZEC",
  "KCS", "CFX", "MINA", "WOO", "ROSE",
  "ZIL", "DYDX", "COMP", "ENJ", "FXS",
  "GMX", "RPL", "CRV", "DASH", "ONE",
  // 76-100
  "BAT", "QTUM", "CELO", "ZRX", "OCEAN",
  "AUDIO", "ANKR", "ICX", "IOTX", "STORJ",
  "SKL", "ONT", "JST", "LUNC", "GLMR",
  "KDA", "RVN", "SC", "WAVES", "XEM",
  "BTT", "LUNA", "AR", "AGIX", "WLD",
  // Additional popular tokens
  "TIA", "SEI", "JUP", "PYTH", "JTO",
  "BONK", "WIF", "PEPE", "FLOKI", "ORDI",
];

// Cache
const CACHE_KEY = "zikalyze_redstone_cache_v3";
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
  const endpointIndexRef = useRef(0);

  const getPrice = useCallback((symbol: string): RedstonePriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "").replace("/", "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  // Fetch Kaspa price from official API (dedicated reliable source)
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

  // Fetch prices from Redstone data gateway in batches
  const fetchRedstonePrice = async (symbol: string, endpointIndex: number): Promise<RedstonePriceData | null> => {
    const endpoint = REDSTONE_ENDPOINTS[endpointIndex % REDSTONE_ENDPOINTS.length];
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Redstone API endpoint for single price
      const response = await fetch(
        `${endpoint}/prices?symbol=${symbol}&provider=redstone-primary-prod`,
        { 
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();
      
      // Handle array response format
      if (Array.isArray(data) && data.length > 0) {
        const priceData = data[0];
        if (priceData.value && priceData.value > 0) {
          return {
            symbol,
            price: priceData.value,
            timestamp: priceData.timestamp || Date.now(),
            source: "Redstone",
          };
        }
      }
      
      // Handle object response format
      if (data[symbol] && data[symbol].value > 0) {
        return {
          symbol,
          price: data[symbol].value,
          timestamp: data[symbol].timestamp || Date.now(),
          source: "Redstone",
        };
      }
    } catch {
      // Silently fail - other oracles provide data
    }
    return null;
  };

  // Fetch multiple prices from Redstone bulk API
  const fetchRedstoneBulkPrices = async (symbols: string[], endpointIndex: number): Promise<Map<string, RedstonePriceData>> => {
    const results = new Map<string, RedstonePriceData>();
    const endpoint = REDSTONE_ENDPOINTS[endpointIndex % REDSTONE_ENDPOINTS.length];
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Redstone bulk price API
      const symbolsParam = symbols.join(",");
      const response = await fetch(
        `${endpoint}/prices?symbols=${symbolsParam}&provider=redstone-primary-prod`,
        { 
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) return results;

      const data = await response.json();
      
      // Parse bulk response - can be array or object format
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.symbol && item.value && item.value > 0) {
            results.set(`${item.symbol}/USD`, {
              symbol: item.symbol,
              price: item.value,
              timestamp: item.timestamp || Date.now(),
              source: "Redstone",
            });
          }
        });
      } else if (typeof data === "object") {
        Object.entries(data).forEach(([symbol, priceData]: [string, any]) => {
          if (priceData && priceData.value && priceData.value > 0) {
            results.set(`${symbol}/USD`, {
              symbol,
              price: priceData.value,
              timestamp: priceData.timestamp || Date.now(),
              source: "Redstone",
            });
          }
        });
      }
    } catch {
      // Silently fail
    }
    
    return results;
  };

  const fetchAllPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      let successCount = 0;
      const currentEndpoint = endpointIndexRef.current;

      // Fetch Kaspa from dedicated API (always reliable)
      const kasPrice = await fetchKaspaPrice();
      if (kasPrice) {
        pricesMapRef.current.set("KAS/USD", kasPrice);
        successCount++;
      }

      // Try bulk fetch first (more efficient)
      const prioritySymbols = REDSTONE_FEED_SYMBOLS.filter(s => s !== "KAS").slice(0, 30);
      const bulkResults = await fetchRedstoneBulkPrices(prioritySymbols, currentEndpoint);
      
      bulkResults.forEach((value, key) => {
        pricesMapRef.current.set(key, value);
        successCount++;
      });

      // If bulk failed, try individual fetches for top assets
      if (bulkResults.size === 0) {
        const topSymbols = ["BTC", "ETH", "SOL", "XRP", "BNB", "ADA", "AVAX", "DOT", "LINK", "ATOM"];
        
        for (const symbol of topSymbols) {
          if (!isMountedRef.current) break;
          
          const price = await fetchRedstonePrice(symbol, currentEndpoint);
          if (price) {
            pricesMapRef.current.set(`${symbol}/USD`, price);
            successCount++;
          }
          
          // Small delay between requests
          await new Promise(r => setTimeout(r, 100));
        }
        
        // Switch endpoint on next fetch if individual fetches also fail
        if (successCount <= 1) {
          endpointIndexRef.current++;
        }
      }

      // Fetch remaining symbols in batches
      const remainingSymbols = REDSTONE_FEED_SYMBOLS.filter(
        s => s !== "KAS" && !pricesMapRef.current.has(`${s}/USD`)
      );
      
      // Batch remaining into groups of 20
      for (let i = 0; i < remainingSymbols.length; i += 20) {
        if (!isMountedRef.current) break;
        
        const batch = remainingSymbols.slice(i, i + 20);
        const batchResults = await fetchRedstoneBulkPrices(batch, currentEndpoint);
        
        batchResults.forEach((value, key) => {
          pricesMapRef.current.set(key, value);
          successCount++;
        });
        
        // Small delay between batches
        if (i + 20 < remainingSymbols.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Update state
      if (isMountedRef.current && successCount > 0) {
        saveCache(pricesMapRef.current);
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        setError(null);
        console.log(`[Redstone] Fetched ${successCount} prices`);
      }
    } catch (e: any) {
      if (isMountedRef.current) {
        setError(e.message);
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
    symbols: REDSTONE_FEED_SYMBOLS,
  };
};
