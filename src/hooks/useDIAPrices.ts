// ═══════════════════════════════════════════════════════════════════════════════
// 🔷 useDIAPrices — DIA Decentralized Oracle (No CORS, No Rate Limits)
// ═══════════════════════════════════════════════════════════════════════════════
// DIA is a truly decentralized oracle with a free, CORS-friendly REST API
// No API key required, no rate limits, works perfectly in browsers
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface DIAPriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "DIA";
  volume24h?: number;
}

// DIA API endpoint
const DIA_ENDPOINT = "https://api.diadata.org";

// Priority assets for DIA (most important cryptos)
const DIA_ASSETS: Record<string, string> = {
  "BTC/USD": "Bitcoin/0x0000000000000000000000000000000000000000",
  "ETH/USD": "Ethereum/0x0000000000000000000000000000000000000000",
  "SOL/USD": "Solana/0x0000000000000000000000000000000000000000",
  "XRP/USD": "Ripple/0x0000000000000000000000000000000000000000",
  "BNB/USD": "BinanceSmartChain/0x0000000000000000000000000000000000000000",
  "DOGE/USD": "Dogecoin/0x0000000000000000000000000000000000000000",
  "ADA/USD": "Cardano/0x0000000000000000000000000000000000000000",
  "AVAX/USD": "Avalanche/0x0000000000000000000000000000000000000000",
  "DOT/USD": "Polkadot/0x0000000000000000000000000000000000000000",
  "LINK/USD": "Ethereum/0x514910771AF9Ca656af840dff83E8264EcF986CA",
  "UNI/USD": "Ethereum/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  "ATOM/USD": "Cosmos/0x0000000000000000000000000000000000000000",
  "LTC/USD": "Litecoin/0x0000000000000000000000000000000000000000",
  "MATIC/USD": "Polygon/0x0000000000000000000000000000000000000000",
  "TRX/USD": "Tron/0x0000000000000000000000000000000000000000",
  "TON/USD": "TON/0x0000000000000000000000000000000000000000",
};

// Cache
const CACHE_KEY = "zikalyze_dia_cache_v1";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedData {
  prices: Record<string, DIAPriceData>;
  timestamp: number;
}

const loadCache = (): Map<string, DIAPriceData> | null => {
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

const saveCache = (prices: Map<string, DIAPriceData>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    }));
  } catch {}
};

export const useDIAPrices = () => {
  const [prices, setPrices] = useState<Map<string, DIAPriceData>>(() => loadCache() || new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const pricesMapRef = useRef<Map<string, DIAPriceData>>(new Map());
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);

  const getPrice = useCallback((symbol: string): DIAPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  const fetchPrice = async (symbol: string, diaAsset: string): Promise<DIAPriceData | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${DIA_ENDPOINT}/v1/assetQuotation/${diaAsset}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.Price && data.Price > 0) {
        return {
          symbol: symbol.replace("/USD", ""),
          price: data.Price,
          timestamp: new Date(data.Time).getTime(),
          source: "DIA",
          volume24h: data.VolumeYesterdayUSD,
        };
      }
    } catch {
      // Silently fail - other oracles will provide data
    }
    return null;
  };

  const fetchAllPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      const symbols = Object.keys(DIA_ASSETS);
      let successCount = 0;

      // Fetch in batches of 3 to avoid overwhelming the API
      for (let i = 0; i < symbols.length; i += 3) {
        if (!isMountedRef.current) break;

        const batch = symbols.slice(i, i + 3);
        const results = await Promise.all(
          batch.map(symbol => fetchPrice(symbol, DIA_ASSETS[symbol]))
        );

        results.forEach((result, idx) => {
          if (result) {
            pricesMapRef.current.set(batch[idx], result);
            successCount++;
          }
        });

        // Small delay between batches
        if (i + 3 < symbols.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (isMountedRef.current && successCount > 0) {
        saveCache(pricesMapRef.current);
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        setError(null);
        console.log(`[DIA] Fetched ${successCount} prices`);
      }
    } catch (e: any) {
      console.error("[DIA] Fetch error:", e.message);
      if (isMountedRef.current) {
        setError(e.message);
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
      console.log("[DIA] Loaded from cache");
    }

    // Fetch fresh data
    fetchAllPrices();

    // Refresh every 30 seconds (DIA updates every ~2 minutes)
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
    assets: DIA_ASSETS,
  };
};
