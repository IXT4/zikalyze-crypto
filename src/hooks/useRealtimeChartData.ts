import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithRetry as fetchWithRetryUtil, safeFetch } from "@/lib/fetchWithRetry";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

// Data sources - Pyth Oracle (decentralized) primary, CoinGecko fallback for historical
type DataSource = "pyth" | "coingecko";

// Map symbols to CoinGecko IDs for historical data fallback
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", DOGE: "dogecoin",
  BNB: "binancecoin", ADA: "cardano", AVAX: "avalanche-2", DOT: "polkadot",
  MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap", ATOM: "cosmos",
  LTC: "litecoin", BCH: "bitcoin-cash", NEAR: "near", APT: "aptos", FIL: "filecoin",
  ARB: "arbitrum", OP: "optimism", INJ: "injective-protocol", SUI: "sui",
  TIA: "celestia", SEI: "sei-network", PEPE: "pepe", SHIB: "shiba-inu",
  WIF: "dogwifcoin", BONK: "bonk", FLOKI: "floki", RENDER: "render-token",
  FET: "fetch-ai", AAVE: "aave", MKR: "maker", GRT: "the-graph", IMX: "immutable-x",
  STX: "blockstack", RUNE: "thorchain", SAND: "the-sandbox", MANA: "decentraland",
  AXS: "axie-infinity", GALA: "gala", APE: "apecoin", CRV: "curve-dao-token",
  SNX: "synthetix-network-token", COMP: "compound-governance-token", LDO: "lido-dao",
  ENS: "ethereum-name-service", ALGO: "algorand", XLM: "stellar", VET: "vechain",
  ICP: "internet-computer", HBAR: "hedera-hashgraph", ETC: "ethereum-classic",
  FTM: "fantom", TRX: "tron", XMR: "monero", EOS: "eos", THETA: "theta-token",
  XTZ: "tezos", NEO: "neo", KAVA: "kava", ZEC: "zcash", DASH: "dash",
  EGLD: "elrond-erd-2", FLOW: "flow", MINA: "mina-protocol", ROSE: "oasis-network",
  ONE: "harmony", ZIL: "zilliqa", ENJ: "enjincoin", CHZ: "chiliz",
  BAT: "basic-attention-token", CAKE: "pancakeswap-token", SUSHI: "sushi",
  YFI: "yearn-finance", STETH: "staked-ether", WBTC: "wrapped-bitcoin",
  TON: "the-open-network", LEO: "leo-token", OKB: "okb", KCS: "kucoin-shares",
  CRO: "crypto-com-chain", GOMINING: "gomining", GOMI: "gomining",
  WLD: "worldcoin", JUP: "jupiter", JTO: "jito-governance-token", KAS: "kaspa",
  TAO: "bittensor", PYTH: "pyth-network", TRB: "tellor", ORDI: "ordi",
  STG: "stargate-finance", BLUR: "blur", PENDLE: "pendle", DYDX: "dydx-chain",
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<Response> => {
  return fetchWithRetryUtil(url, { timeoutMs, maxRetries: 2 });
};

// Retry wrapper for fetch functions
const fetchWithRetry = async <T>(
  fetchFn: () => Promise<T | null>,
  retries = 2,
  delayMs = 1000
): Promise<T | null> => {
  for (let i = 0; i <= retries; i++) {
    const result = await fetchFn();
    if (result !== null) return result;
    if (i < retries) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
};

// Cache with TTL
interface CacheEntry {
  data: ChartDataPoint[];
  priceChange: number;
  timestamp: number;
  source: DataSource;
}

const dataCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedData = (symbol: string): CacheEntry | null => dataCache.get(symbol.toUpperCase()) || null;
const isCacheValid = (symbol: string): boolean => {
  const cached = dataCache.get(symbol.toUpperCase());
  return cached ? Date.now() - cached.timestamp < CACHE_TTL : false;
};
const setCacheData = (symbol: string, data: ChartDataPoint[], priceChange: number, source: DataSource) => {
  dataCache.set(symbol.toUpperCase(), { data, priceChange, timestamp: Date.now(), source });
};

// Get CoinGecko ID for a symbol
const getCoinGeckoId = (symbol: string, providedId?: string): string | null => {
  if (providedId) return providedId;
  return COINGECKO_ID_MAP[symbol.toUpperCase()] || null;
};

// Fetch historical data from CoinGecko (decentralized-friendly, no API key needed)
const fetchCoinGeckoData = async (symbol: string, coinGeckoId: string): Promise<ChartDataPoint[] | null> => {
  try {
    console.log(`[CoinGecko] Fetching historical data for ${symbol} (${coinGeckoId})`);
    
    // Use days=2 to get automatic hourly data (CoinGecko auto-provides hourly for 2-90 days)
    const response = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=2`
    );
    
    if (!response.ok) {
      console.log(`[CoinGecko] Historical fetch failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.prices || data.prices.length < 2) {
      return null;
    }
    
    // Take last 24 data points (hourly for 24h)
    const prices = data.prices.slice(-24);
    const volumes = data.total_volumes?.slice(-24) || [];
    
    const chartData: ChartDataPoint[] = prices.map((point: [number, number], i: number) => {
      const [timestamp, price] = point;
      const prevPrice = i > 0 ? prices[i - 1][1] : price;
      const volume = volumes[i] ? volumes[i][1] : 0;
      
      return {
        time: formatTime(new Date(timestamp)),
        price: price,
        volume: volume,
        positive: price >= prevPrice,
      };
    });
    
    console.log(`[CoinGecko] ✓ Got ${chartData.length} data points for ${symbol}`);
    return chartData;
  } catch (err) {
    console.log(`[CoinGecko] Error fetching ${symbol}:`, err);
    return null;
  }
};

// Check if symbol is supported by Pyth Oracle
const isPythSupported = (symbol: string): boolean => {
  const upperSymbol = symbol.toUpperCase();
  return Object.keys(PYTH_FEED_IDS).includes(upperSymbol);
};

export const useRealtimeChartData = (crypto: string, coinGeckoId?: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [isPythStreaming, setIsPythStreaming] = useState(false);
  const [oracleConnected, setOracleConnected] = useState(false);
  
  const symbol = crypto.toUpperCase();
  const mountedRef = useRef(true);
  const pythDataRef = useRef<ChartDataPoint[]>([]);
  const lastPythPriceRef = useRef<number | null>(null);
  
  // Connect to Pyth Oracle for real-time streaming
  const { prices: pythPrices, isConnected: pythConnected } = usePythPrices();
  
  // Update oracle connection status
  useEffect(() => {
    setOracleConnected(pythConnected);
    if (pythConnected && isPythSupported(symbol)) {
      setIsPythStreaming(true);
    }
  }, [pythConnected, symbol]);
  
  // Handle Pyth Oracle price updates
  useEffect(() => {
    if (!pythConnected || !isPythSupported(symbol)) return;
    
    const pythPrice = pythPrices.get(symbol);
    if (!pythPrice || pythPrice.price <= 0) return;
    
    const now = Date.now();
    const newPrice = pythPrice.price;
    
    // Only add if price changed significantly (0.01%)
    if (lastPythPriceRef.current !== null) {
      const priceDiff = Math.abs(newPrice - lastPythPriceRef.current) / lastPythPriceRef.current;
      if (priceDiff < 0.0001) return;
    }
    
    lastPythPriceRef.current = newPrice;
    
    const newPoint: ChartDataPoint = {
      time: formatTime(new Date(now)),
      price: newPrice,
      volume: 0, // Pyth doesn't provide volume
      positive: pythDataRef.current.length > 0 
        ? newPrice >= pythDataRef.current[pythDataRef.current.length - 1].price
        : true,
    };
    
    // Keep last 50 data points for smooth chart
    pythDataRef.current = [...pythDataRef.current.slice(-49), newPoint];
    
    if (mountedRef.current) {
      setChartData([...pythDataRef.current]);
      setDataSource("pyth");
      setIsLoading(false);
      
      // Calculate 24h change from first to last price
      if (pythDataRef.current.length > 1) {
        const firstPrice = pythDataRef.current[0].price;
        const change = ((newPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
      }
    }
  }, [pythPrices, pythConnected, symbol]);

  // Fetch initial/fallback historical data
  useEffect(() => {
    mountedRef.current = true;
    
    const fetchData = async () => {
      // Check cache first
      if (isCacheValid(symbol)) {
        const cached = getCachedData(symbol);
        if (cached) {
          setChartData(cached.data);
          setPriceChange(cached.priceChange);
          setDataSource(cached.source);
          setIsLoading(false);
          return;
        }
      }
      
      // If Pyth is streaming and we have data, don't fetch fallback
      if (isPythStreaming && pythDataRef.current.length > 5) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Try CoinGecko for historical data (decentralized-friendly)
      const geckoId = getCoinGeckoId(symbol, coinGeckoId);
      if (geckoId) {
        const data = await fetchWithRetry(() => fetchCoinGeckoData(symbol, geckoId));
        if (data && data.length > 0 && mountedRef.current) {
          setChartData(data);
          setDataSource("coingecko");
          setIsLoading(false);
          
          // Calculate price change
          if (data.length > 1) {
            const firstPrice = data[0].price;
            const lastPrice = data[data.length - 1].price;
            const change = ((lastPrice - firstPrice) / firstPrice) * 100;
            setPriceChange(change);
            setCacheData(symbol, data, change, "coingecko");
          }
          return;
        }
      }
      
      // If nothing worked, mark as unsupported
      if (mountedRef.current) {
        setIsSupported(false);
        setIsLoading(false);
        setError("No data available from decentralized sources");
      }
    };
    
    // Only fetch if not already streaming from Pyth
    if (!isPythStreaming || pythDataRef.current.length === 0) {
      fetchData();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [symbol, coinGeckoId, isPythStreaming]);

  return {
    chartData,
    priceChange,
    isLoading,
    isSupported,
    error,
    dataSource,
    isPythStreaming,
    oracleConnected,
  };
};
