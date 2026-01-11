import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Pyth Network Price Fetcher - Uses REST API polling as SSE has CORS issues
// This provides decentralized price data as a supplementary source

export interface PythPriceData {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  source: "Pyth";
}

// Pyth Hermes REST endpoint
const HERMES_API = "https://hermes.pyth.network";

// Pyth Price Feed IDs for top cryptocurrencies
export const PYTH_FEED_IDS: Record<string, string> = {
  "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "XRP/USD": "ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  "BNB/USD": "2f95862b045670cd22bee3114c39763a4a08a708c89fa42d2e6ecfc48e7ccee7",
  "DOGE/USD": "dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  "ADA/USD": "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "AVAX/USD": "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  "DOT/USD": "ca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97e8d4e0ce2a8f2a",
  "LINK/USD": "8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  "UNI/USD": "78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  "ATOM/USD": "b00b60f88b03a6a6259588d4429f8fcaba3bb11cad1b281129fc3d226e3b668a",
  "LTC/USD": "6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  "NEAR/USD": "c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  "APT/USD": "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  "FIL/USD": "150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  "ARB/USD": "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "OP/USD": "385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  "INJ/USD": "7a5bc1d2b56ad029048cd63964b3ad2776eadf812eef1f5d4b1e5b6d2d86a7c1",
  "SUI/USD": "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  "TIA/USD": "09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
  "SEI/USD": "53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb",
  "AAVE/USD": "2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  "MKR/USD": "9375299e43245e24556e14e0c32a97de74e7c8ed87c2ed40c70fe61bfc31c5f0",
  "GRT/USD": "4d1f8dae0d96236fb98e8f47e8b3edfeae244820c1e8f5725cd1ec5a88bf4321",
  "RUNE/USD": "5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e",
  "ALGO/USD": "fa17ceaf30d19ba51112fdcc750cc83454776f47b3f2f1e8e7c68fb66d8f4e6e",
  "ETC/USD": "7f981f906d7cfe93f618804f1de89e0199ead306edc022d3230b3e8305f391b0",
  "FTM/USD": "5c6c0d2386e3352356c3ab84434fafb5095746a761139a6b4a14dda69e5e1c3e",
  "TRX/USD": "67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2c",
  "TON/USD": "8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026",
  "STX/USD": "ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17",
  "MATIC/USD": "5de33440f6c399aa75d5c11e39eaca4c39a0e7c0cfe6afa9b96cb46e5f41108c",
};

// Reverse mapping
const FEED_ID_TO_SYMBOL = Object.entries(PYTH_FEED_IDS).reduce((acc, [symbol, feedId]) => {
  acc[feedId] = symbol;
  return acc;
}, {} as Record<string, string>);

// Cache for prices
const CACHE_KEY = "zikalyze_pyth_cache_v1";
const CACHE_TTL = 30 * 1000; // 30 seconds

const loadCache = (): Map<string, PythPriceData> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return new Map(Object.entries(data.prices));
  } catch {
    return null;
  }
};

const saveCache = (prices: Map<string, PythPriceData>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    }));
  } catch {}
};

export const usePythPrices = (_symbols: string[] = []) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Map<string, PythPriceData>>(() => loadCache() || new Map());

  const pricesMapRef = useRef<Map<string, PythPriceData>>(new Map());
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);

  const getPrice = useCallback((symbol: string): PythPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  // Fetch prices from Pyth REST API
  const fetchPrices = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;

    try {
      const feedIds = Object.values(PYTH_FEED_IDS);
      const params = new URLSearchParams();
      feedIds.forEach(id => params.append("ids[]", id));
      
      const response = await fetch(
        `${HERMES_API}/v2/updates/price/latest?${params.toString()}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.parsed && Array.isArray(data.parsed)) {
        data.parsed.forEach((feed: any) => {
          const feedId = feed.id;
          const symbol = FEED_ID_TO_SYMBOL[feedId];

          if (symbol && feed.price) {
            const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
            const confidence = parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo);

            if (price > 0) {
              pricesMapRef.current.set(symbol, {
                symbol: symbol.replace("/USD", ""),
                price,
                confidence,
                publishTime: feed.price.publish_time * 1000,
                source: "Pyth",
              });
            }
          }
        });

        if (isMountedRef.current) {
          saveCache(pricesMapRef.current);
          setPrices(new Map(pricesMapRef.current));
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
        }
      }
    } catch (e: any) {
      console.log("[Pyth] Fetch error:", e.message);
      if (isMountedRef.current) {
        setError(e.message);
        // Keep connected=true if we have cached data
        if (pricesMapRef.current.size === 0) {
          setIsConnected(false);
        }
        setIsConnecting(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Load cache immediately
    const cached = loadCache();
    if (cached && cached.size > 0) {
      pricesMapRef.current = cached;
      setPrices(cached);
      setIsConnected(true);
      setIsConnecting(false);
    }

    // Initial fetch
    fetchPrices();

    // Refresh every 5 seconds (Pyth updates ~400ms on-chain, but we poll less frequently)
    intervalRef.current = setInterval(fetchPrices, 5000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  return {
    prices,
    isConnected,
    isConnecting,
    error,
    getPrice,
    feedIds: PYTH_FEED_IDS,
  };
};
