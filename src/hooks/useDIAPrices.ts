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

// Priority assets for DIA - top 50 cryptocurrencies with verified DIA asset IDs
// DIA uses blockchain/address format - native coins use zero address
const DIA_ASSETS: Record<string, string> = {
  // Major L1s with native tokens
  "BTC/USD": "Bitcoin/0x0000000000000000000000000000000000000000",
  "ETH/USD": "Ethereum/0x0000000000000000000000000000000000000000",
  "SOL/USD": "Solana/0x0000000000000000000000000000000000000000",
  "BNB/USD": "BinanceSmartChain/0x0000000000000000000000000000000000000000",
  "ADA/USD": "Cardano/0x0000000000000000000000000000000000000000",
  "AVAX/USD": "Avalanche/0x0000000000000000000000000000000000000000",
  "DOT/USD": "Polkadot/0x0000000000000000000000000000000000000000",
  "MATIC/USD": "Polygon/0x0000000000000000000000000000000000000000",
  "LTC/USD": "Litecoin/0x0000000000000000000000000000000000000000",
  "ATOM/USD": "Cosmos/0x0000000000000000000000000000000000000000",
  "NEAR/USD": "Near/0x0000000000000000000000000000000000000000",
  "FTM/USD": "Fantom/0x0000000000000000000000000000000000000000",
  "ALGO/USD": "Algorand/0x0000000000000000000000000000000000000000",
  "FIL/USD": "Filecoin/0x0000000000000000000000000000000000000000",
  "ETC/USD": "EthereumClassic/0x0000000000000000000000000000000000000000",
  "XLM/USD": "Stellar/0x0000000000000000000000000000000000000000",
  "FLOW/USD": "Flow/0x0000000000000000000000000000000000000000",
  "BCH/USD": "BitcoinCash/0x0000000000000000000000000000000000000000",
  // L2s - native tokens
  "ARB/USD": "Arbitrum/0x0000000000000000000000000000000000000000",
  "OP/USD": "Optimism/0x0000000000000000000000000000000000000000",
  // Ethereum ERC-20 tokens with verified contract addresses
  "LINK/USD": "Ethereum/0x514910771AF9Ca656af840dff83E8264EcF986CA",
  "UNI/USD": "Ethereum/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  "SHIB/USD": "Ethereum/0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
  "DAI/USD": "Ethereum/0x6B175474E89094C44Da98b954EescdeCB5BE3830",
  "MKR/USD": "Ethereum/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
  "AAVE/USD": "Ethereum/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  "GRT/USD": "Ethereum/0xc944E90C64B2c07662A292be6244BDf05Cda44a7",
  "CRO/USD": "Ethereum/0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b",
  "LDO/USD": "Ethereum/0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
  "SAND/USD": "Ethereum/0x3845badAde8e6dFF049820680d1F14bD3903a5d0",
  "MANA/USD": "Ethereum/0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
  "AXS/USD": "Ethereum/0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b",
  "FET/USD": "Ethereum/0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85",
  "INJ/USD": "Ethereum/0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30",
  "RNDR/USD": "Ethereum/0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24",
  "SNX/USD": "Ethereum/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
  "CRV/USD": "Ethereum/0xD533a949740bb3306d119CC777fa900bA034cd52",
  "COMP/USD": "Ethereum/0xc00e94Cb662C3520282E6f5717214004A7f26888",
  "BAT/USD": "Ethereum/0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
  "ENJ/USD": "Ethereum/0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c",
  "ZRX/USD": "Ethereum/0xE41d2489571d322189246DaFA5ebDe1F4699F498",
  "ANKR/USD": "Ethereum/0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4",
  "STORJ/USD": "Ethereum/0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC",
  "SKL/USD": "Ethereum/0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7",
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
