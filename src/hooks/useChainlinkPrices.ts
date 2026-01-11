import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Chainlink Price Feeds as fallback oracle
// Uses public RPC endpoints for decentralized access with caching

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  updatedAt: number;
  roundId: string;
  source: "Chainlink";
}

export interface ChainlinkState {
  prices: Map<string, ChainlinkPriceData>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// Public RPC endpoints (decentralized, no API key required) - prioritized by reliability
const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://ethereum.publicnode.com",
  "https://1rpc.io/eth",
  "https://cloudflare-eth.com",
];

// Cache for Chainlink prices to reduce RPC calls
const CACHE_KEY = "zikalyze_chainlink_cache_v2";
const CACHE_TTL = 60 * 1000; // 1 minute cache

interface CachedPrices {
  prices: Record<string, ChainlinkPriceData>;
  timestamp: number;
}

// Load cached prices
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

// Save prices to cache
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

// Chainlink Price Feed Addresses (Ethereum Mainnet) - Only verified working feeds
const CHAINLINK_FEEDS_ETH: Record<string, string> = {
  "BTC/USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  "ETH/USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "LINK/USD": "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  "AAVE/USD": "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  "UNI/USD": "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  "SNX/USD": "0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699",
  "MKR/USD": "0xec1D1B3b0443256cc3860e24a46F108e699cF2Ea",
  "COMP/USD": "0xdbd020CAeF83eFd542f4De03864e8c6C86E8e83C",
  "CRV/USD": "0xCd627aA160A6fA45Eb793D19286F3e3D4f8D99F3",
  "MATIC/USD": "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676",
  "SOL/USD": "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  "AVAX/USD": "0xFF3EEb22B22c1D74C8EED5E02f5D6d30a787C1e5",
  "ATOM/USD": "0xDC4BDB458C6361093069Ca2aD30D74cc152EdC75",
  "DOT/USD": "0x1C07AFb8E2B827c5A4739C6d59Ae3A5035f28734",
  "LTC/USD": "0x6AF09DF7563C363B5763b9102712EbeD3b9e859B",
  "ETC/USD": "0xaEA2808407B7319A31A383B6F8B60f04BCa23cE2",
  "FIL/USD": "0x1A31D42149e82Eb99777f903C08A2E41A00085d3",
  "TRX/USD": "0xacD0D1A29759CC01E8D925371B72cb2b5610EA25",
};

// Chainlink Feeds on Arbitrum - verified working feeds only
const CHAINLINK_FEEDS_ARB: Record<string, string> = {
  "BTC/USD": "0x6ce185860a4963106506C203335A2910D5F2A2FE",
  "ETH/USD": "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  "LINK/USD": "0x86E53CF1B870786351Da77A57575e79CB55812CB",
  "ARB/USD": "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
};

// Simple JSON-RPC call helper with timeout
async function ethCall(rpcUrl: string, to: string, data: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
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

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw e;
  }
}

// Encode function call data
function encodeLatestRoundData(): string {
  return "0xfeaf968c";
}

// Decode latestRoundData response
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

// Longer refresh interval - Chainlink is backup to Pyth
const REFRESH_INTERVAL = 60000; // 60 seconds

// Track failed endpoints with cooldown
const failedEndpoints = new Map<string, number>();
const ENDPOINT_COOLDOWN = 180000; // 3 minute cooldown

const isEndpointAvailable = (url: string): boolean => {
  const failedAt = failedEndpoints.get(url);
  if (!failedAt) return true;
  if (Date.now() - failedAt > ENDPOINT_COOLDOWN) {
    failedEndpoints.delete(url);
    return true;
  }
  return false;
};

const markEndpointFailed = (url: string) => {
  failedEndpoints.set(url, Date.now());
};

export const useChainlinkPrices = (symbols: string[] = []) => {
  // Initialize state without calling functions to avoid React queue issues
  const [prices, setPrices] = useState<Map<string, ChainlinkPriceData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pricesMapRef = useRef<Map<string, ChainlinkPriceData>>(new Map());
  const rpcIndexRef = useRef(0);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef(false);
  const initializedRef = useRef(false);

  // Memoize symbols to prevent unnecessary effect triggers
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const getPrice = useCallback((symbol: string): ChainlinkPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  const fetchPrice = useCallback(async (
    symbol: string,
    feedAddress: string
  ): Promise<ChainlinkPriceData | null> => {
    // Filter available endpoints
    const availableEndpoints = ETH_RPC_ENDPOINTS.filter(isEndpointAvailable);
    if (availableEndpoints.length === 0) {
      availableEndpoints.push(ETH_RPC_ENDPOINTS[0]);
    }
    
    for (let attempt = 0; attempt < Math.min(availableEndpoints.length, 2); attempt++) {
      const rpcIndex = (rpcIndexRef.current + attempt) % availableEndpoints.length;
      const rpcUrl = availableEndpoints[rpcIndex];
      
      try {
        const data = await ethCall(rpcUrl, feedAddress, encodeLatestRoundData());
        const decoded = decodeLatestRoundData(data);
        
        const price = Number(decoded.answer) / 1e8;
        
        if (price > 0) {
          rpcIndexRef.current = rpcIndex;
          
          return {
            symbol: symbol.replace("/USD", ""),
            price,
            updatedAt: decoded.updatedAt * 1000,
            roundId: decoded.roundId,
            source: "Chainlink",
          };
        }
      } catch (e: any) {
        if (!e.message?.includes("429") && !e.message?.includes("timeout")) {
          console.log(`[Chainlink] ${symbol} failed on ${rpcUrl}`);
        }
        markEndpointFailed(rpcUrl);
        continue;
      }
    }
    
    return null;
  }, []);

  const fetchAllPrices = useCallback(async () => {
    if (!isMountedRef.current || isFetchingRef.current) return;
    
    // Rate limit: don't fetch more than once per 15 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 15000) return;
    
    isFetchingRef.current = true;
    lastFetchRef.current = now;

    const feedsToUse = symbols.length > 0
      ? symbols.map(s => s.toUpperCase().replace(/USD$/, "") + "/USD")
      : Object.keys(CHAINLINK_FEEDS_ETH);

    const uniqueSymbols = [...new Set(feedsToUse)]
      .filter(sym => CHAINLINK_FEEDS_ETH[sym] || CHAINLINK_FEEDS_ARB[sym])
      .slice(0, 8); // Limit to 8 symbols to avoid rate limits

    const results: ChainlinkPriceData[] = [];

    // Sequential fetching to avoid rate limits
    for (const symbol of uniqueSymbols) {
      if (!isMountedRef.current) break;
      
      // Small delay between requests
      if (results.length > 0) {
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Try ETH mainnet first (more reliable)
      if (CHAINLINK_FEEDS_ETH[symbol]) {
        const result = await fetchPrice(symbol, CHAINLINK_FEEDS_ETH[symbol]);
        if (result) {
          results.push(result);
          pricesMapRef.current.set(symbol, result);
          continue;
        }
      }
      
      // Fallback to Arbitrum
      if (CHAINLINK_FEEDS_ARB[symbol]) {
        const result = await fetchPrice(symbol, CHAINLINK_FEEDS_ARB[symbol]);
        if (result) {
          results.push(result);
          pricesMapRef.current.set(symbol, result);
        }
      }
    }

    isFetchingRef.current = false;

    if (isMountedRef.current) {
      // Save to cache
      if (results.length > 0) {
        saveCache(pricesMapRef.current);
      }
      
      setPrices(new Map(pricesMapRef.current));
      setIsConnected(pricesMapRef.current.size > 0);
      setIsLoading(false);
      setError(results.length === 0 && pricesMapRef.current.size === 0 ? "No prices available" : null);
    }
  }, [symbolsKey, fetchPrice]);

  // Load cache on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const cached = loadCache();
    if (cached && cached.size > 0) {
      pricesMapRef.current = cached;
      setPrices(cached);
      setIsConnected(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Delay initial fetch - Pyth SSE is primary, Chainlink is backup
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        fetchAllPrices();
      }
    }, 5000);

    // Set up refresh interval
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchAllPrices();
      }
    }, REFRESH_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAllPrices]);

  return {
    prices,
    isConnected,
    isLoading,
    error,
    getPrice,
    refresh: fetchAllPrices,
    feedsEth: CHAINLINK_FEEDS_ETH,
    feedsArb: CHAINLINK_FEEDS_ARB,
  };
};

export { CHAINLINK_FEEDS_ETH, CHAINLINK_FEEDS_ARB };
