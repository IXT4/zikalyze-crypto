import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Chainlink Price Feeds - Decentralized on-chain oracle backup
// Only fetches once on mount and caches - no polling

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  updatedAt: number;
  roundId: string;
  source: "Chainlink";
}

// Public RPC endpoints (decentralized, no API key required)
const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://ethereum.publicnode.com",
  "https://1rpc.io/eth",
  "https://cloudflare-eth.com",
];

// Cache for Chainlink prices
const CACHE_KEY = "zikalyze_chainlink_cache_v3";
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

interface CachedPrices {
  prices: Record<string, ChainlinkPriceData>;
  timestamp: number;
}

const loadCache = (): Map<string, ChainlinkPriceData> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedPrices = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return new Map(Object.entries(data.prices));
  } catch {
    return null;
  }
};

const saveCache = (prices: Map<string, ChainlinkPriceData>) => {
  try {
    const data: CachedPrices = {
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

// Chainlink Price Feed Addresses (Ethereum Mainnet)
const CHAINLINK_FEEDS_ETH: Record<string, string> = {
  "BTC/USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  "ETH/USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "LINK/USD": "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  "AAVE/USD": "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  "UNI/USD": "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  "MKR/USD": "0xec1D1B3b0443256cc3860e24a46F108e699cF2Ea",
  "MATIC/USD": "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676",
  "SOL/USD": "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  "AVAX/USD": "0xFF3EEb22B22c1D74C8EED5E02f5D6d30a787C1e5",
  "ATOM/USD": "0xDC4BDB458C6361093069Ca2aD30D74cc152EdC75",
  "DOT/USD": "0x1C07AFb8E2B827c5A4739C6d59Ae3A5035f28734",
  "LTC/USD": "0x6AF09DF7563C363B5763b9102712EbeD3b9e859B",
};

// JSON-RPC call helper
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`RPC failed: ${response.status}`);

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    return result.result;
  } catch (e: any) {
    clearTimeout(timeoutId);
    throw e;
  }
}

function decodeLatestRoundData(data: string): {
  roundId: string;
  answer: bigint;
  updatedAt: number;
} {
  const hex = data.slice(2);
  const roundId = BigInt("0x" + hex.slice(0, 64)).toString();
  const answer = BigInt("0x" + hex.slice(64, 128));
  const updatedAt = Number(BigInt("0x" + hex.slice(192, 256)));
  
  return { roundId, answer, updatedAt };
}

export const useChainlinkPrices = (_symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, ChainlinkPriceData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pricesMapRef = useRef<Map<string, ChainlinkPriceData>>(new Map());
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const getPrice = useCallback((symbol: string): ChainlinkPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchPrices = async () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      // Try cache first
      const cached = loadCache();
      if (cached && cached.size > 0) {
        pricesMapRef.current = cached;
        setPrices(cached);
        setIsConnected(true);
        setIsLoading(false);
        console.log("[Chainlink] Loaded from cache");
        return;
      }

      // Fetch from on-chain (one-time backup fetch)
      const symbols = Object.keys(CHAINLINK_FEEDS_ETH).slice(0, 6); // Limit to 6 for speed
      
      for (const symbol of symbols) {
        if (!isMountedRef.current) break;
        
        const feedAddress = CHAINLINK_FEEDS_ETH[symbol];
        
        for (const rpc of ETH_RPC_ENDPOINTS) {
          try {
            const data = await ethCall(rpc, feedAddress, "0xfeaf968c");
            const decoded = decodeLatestRoundData(data);
            const price = Number(decoded.answer) / 1e8;
            
            if (price > 0) {
              pricesMapRef.current.set(symbol, {
                symbol: symbol.replace("/USD", ""),
                price,
                updatedAt: decoded.updatedAt * 1000,
                roundId: decoded.roundId,
                source: "Chainlink",
              });
              break;
            }
          } catch {
            continue;
          }
        }
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 200));
      }

      if (isMountedRef.current) {
        if (pricesMapRef.current.size > 0) {
          saveCache(pricesMapRef.current);
        }
        setPrices(new Map(pricesMapRef.current));
        setIsConnected(pricesMapRef.current.size > 0);
        setIsLoading(false);
        console.log(`[Chainlink] Fetched ${pricesMapRef.current.size} prices (backup)`);
      }
    };

    // Delay Chainlink fetch - it's a backup to Pyth WebSocket
    const timeout = setTimeout(fetchPrices, 3000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeout);
    };
  }, []);

  return {
    prices,
    isConnected,
    isLoading,
    error,
    getPrice,
    feedsEth: CHAINLINK_FEEDS_ETH,
  };
};

export { CHAINLINK_FEEDS_ETH };
