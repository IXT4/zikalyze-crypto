import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

// Supported exchanges in priority order
type Exchange = "binance" | "coinbase" | "kraken" | "coingecko";

// Map symbols to CoinGecko IDs for fallback
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  BNB: "binancecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  NEAR: "near",
  APT: "aptos",
  FIL: "filecoin",
  ARB: "arbitrum",
  OP: "optimism",
  INJ: "injective-protocol",
  SUI: "sui",
  TIA: "celestia",
  SEI: "sei-network",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  WIF: "dogwifcoin",
  BONK: "bonk",
  FLOKI: "floki",
  RENDER: "render-token",
  FET: "fetch-ai",
  AAVE: "aave",
  MKR: "maker",
  GRT: "the-graph",
  IMX: "immutable-x",
  STX: "blockstack",
  RUNE: "thorchain",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  GALA: "gala",
  APE: "apecoin",
  CRV: "curve-dao-token",
  SNX: "synthetix-network-token",
  COMP: "compound-governance-token",
  LDO: "lido-dao",
  ENS: "ethereum-name-service",
  ALGO: "algorand",
  XLM: "stellar",
  VET: "vechain",
  ICP: "internet-computer",
  HBAR: "hedera-hashgraph",
  ETC: "ethereum-classic",
  FTM: "fantom",
  TRX: "tron",
  XMR: "monero",
  EOS: "eos",
  THETA: "theta-token",
  XTZ: "tezos",
  NEO: "neo",
  KAVA: "kava",
  ZEC: "zcash",
  DASH: "dash",
  EGLD: "elrond-erd-2",
  FLOW: "flow",
  MINA: "mina-protocol",
  ROSE: "oasis-network",
  ONE: "harmony",
  ZIL: "zilliqa",
  ENJ: "enjincoin",
  CHZ: "chiliz",
  BAT: "basic-attention-token",
  CAKE: "pancakeswap-token",
  SUSHI: "sushi",
  YFI: "yearn-finance",
  STETH: "staked-ether",
  WBTC: "wrapped-bitcoin",
  TON: "the-open-network",
  LEO: "leo-token",
  OKB: "okb",
  KCS: "kucoin-shares",
  CRO: "crypto-com-chain",
  TUSD: "true-usd",
  USDD: "usdd",
  USDC: "usd-coin",
  BUSD: "binance-usd",
  DAI: "dai",
};

// Coinbase symbol mapping (uses different format: BTC-USD)
const COINBASE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
  DOGE: "DOGE-USD",
  ADA: "ADA-USD",
  AVAX: "AVAX-USD",
  DOT: "DOT-USD",
  MATIC: "MATIC-USD",
  LINK: "LINK-USD",
  UNI: "UNI-USD",
  ATOM: "ATOM-USD",
  LTC: "LTC-USD",
  BCH: "BCH-USD",
  NEAR: "NEAR-USD",
  APT: "APT-USD",
  FIL: "FIL-USD",
  ARB: "ARB-USD",
  OP: "OP-USD",
  INJ: "INJ-USD",
  SUI: "SUI-USD",
  SHIB: "SHIB-USD",
  AAVE: "AAVE-USD",
  MKR: "MKR-USD",
  GRT: "GRT-USD",
  IMX: "IMX-USD",
  SAND: "SAND-USD",
  MANA: "MANA-USD",
  AXS: "AXS-USD",
  GALA: "GALA-USD",
  APE: "APE-USD",
  CRV: "CRV-USD",
  SNX: "SNX-USD",
  COMP: "COMP-USD",
  LDO: "LDO-USD",
  ENS: "ENS-USD",
  ALGO: "ALGO-USD",
  XLM: "XLM-USD",
  ICP: "ICP-USD",
  HBAR: "HBAR-USD",
  ETC: "ETC-USD",
  EOS: "EOS-USD",
  XTZ: "XTZ-USD",
  ZEC: "ZEC-USD",
  DASH: "DASH-USD",
  FLOW: "FLOW-USD",
  ENJ: "ENJ-USD",
  CHZ: "CHZ-USD",
  BAT: "BAT-USD",
  SUSHI: "SUSHI-USD",
  YFI: "YFI-USD",
};

// Kraken symbol mapping (uses different format: XBT for BTC)
const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  BTC: "XBT/USD",
  ETH: "ETH/USD",
  SOL: "SOL/USD",
  XRP: "XRP/USD",
  DOGE: "DOGE/USD",
  ADA: "ADA/USD",
  AVAX: "AVAX/USD",
  DOT: "DOT/USD",
  MATIC: "MATIC/USD",
  LINK: "LINK/USD",
  UNI: "UNI/USD",
  ATOM: "ATOM/USD",
  LTC: "LTC/USD",
  BCH: "BCH/USD",
  NEAR: "NEAR/USD",
  APT: "APT/USD",
  FIL: "FIL/USD",
  SHIB: "SHIB/USD",
  AAVE: "AAVE/USD",
  MKR: "MKR/USD",
  GRT: "GRT/USD",
  SAND: "SAND/USD",
  MANA: "MANA/USD",
  AXS: "AXS/USD",
  GALA: "GALA/USD",
  APE: "APE/USD",
  CRV: "CRV/USD",
  SNX: "SNX/USD",
  COMP: "COMP/USD",
  LDO: "LDO/USD",
  ENS: "ENS/USD",
  ALGO: "ALGO/USD",
  XLM: "XLM/USD",
  ETC: "ETC/USD",
  EOS: "EOS/USD",
  XTZ: "XTZ/USD",
  ZEC: "ZEC/USD",
  DASH: "DASH/USD",
  FLOW: "FLOW/USD",
  ENJ: "ENJ/USD",
  BAT: "BAT/USD",
  SUSHI: "SUSHI/USD",
  YFI: "YFI/USD",
  TRX: "TRX/USD",
  XMR: "XMR/USD",
};

// Binance symbol mapping
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC", ETH: "ETH", SOL: "SOL", XRP: "XRP", DOGE: "DOGE", BNB: "BNB",
  ADA: "ADA", AVAX: "AVAX", DOT: "DOT", MATIC: "MATIC", LINK: "LINK", UNI: "UNI",
  ATOM: "ATOM", LTC: "LTC", BCH: "BCH", NEAR: "NEAR", APT: "APT", FIL: "FIL",
  ARB: "ARB", OP: "OP", INJ: "INJ", SUI: "SUI", TIA: "TIA", SEI: "SEI",
  PEPE: "PEPE", SHIB: "SHIB", WIF: "WIF", BONK: "BONK", FLOKI: "FLOKI",
  RENDER: "RENDER", FET: "FET", AAVE: "AAVE", MKR: "MKR", GRT: "GRT", IMX: "IMX",
  STX: "STX", RUNE: "RUNE", SAND: "SAND", MANA: "MANA", AXS: "AXS", GALA: "GALA",
  APE: "APE", CRV: "CRV", SNX: "SNX", COMP: "COMP", LDO: "LDO", ENS: "ENS",
  ALGO: "ALGO", XLM: "XLM", VET: "VET", ICP: "ICP", HBAR: "HBAR", ETC: "ETC",
  FTM: "FTM", TRX: "TRX", XMR: "XMR", EOS: "EOS", THETA: "THETA", XTZ: "XTZ",
  NEO: "NEO", KAVA: "KAVA", ZEC: "ZEC", DASH: "DASH", EGLD: "EGLD", FLOW: "FLOW",
  MINA: "MINA", ROSE: "ROSE", ONE: "ONE", ZIL: "ZIL", ENJ: "ENJ", CHZ: "CHZ",
  BAT: "BAT", CAKE: "CAKE", SUSHI: "SUSHI", YFI: "YFI", DYDX: "DYDX", GMT: "GMT",
  BLUR: "BLUR", MASK: "MASK", WLD: "WLD", JTO: "JTO", PYTH: "PYTH", JUP: "JUP",
  STRK: "STRK", DYM: "DYM", ALT: "ALT", PIXEL: "PIXEL", ORDI: "ORDI",
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fetchWithTimeout = async (url: string, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Cache with TTL
interface CacheEntry {
  data: ChartDataPoint[];
  priceChange: number;
  timestamp: number;
  exchange: Exchange;
}

const dataCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Backoff state per exchange per coin
const backoffState = new Map<string, { attempts: number; nextRetry: number }>();
const BASE_BACKOFF = 3000;
const MAX_BACKOFF = 2 * 60 * 1000;

const getBackoffKey = (symbol: string, exchange: Exchange) => `${symbol}-${exchange}`;

const getBackoffDelay = (attempts: number): number => {
  return Math.min(BASE_BACKOFF * Math.pow(2, attempts), MAX_BACKOFF);
};

const canRetry = (key: string): boolean => {
  const state = backoffState.get(key);
  if (!state) return true;
  return Date.now() >= state.nextRetry;
};

const recordFailure = (key: string) => {
  const state = backoffState.get(key) || { attempts: 0, nextRetry: 0 };
  state.attempts += 1;
  state.nextRetry = Date.now() + getBackoffDelay(state.attempts);
  backoffState.set(key, state);
};

const recordSuccess = (key: string) => {
  backoffState.delete(key);
};

const getCachedData = (symbol: string): CacheEntry | null => {
  return dataCache.get(symbol.toUpperCase()) || null;
};

const isCacheValid = (symbol: string): boolean => {
  const cached = dataCache.get(symbol.toUpperCase());
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
};

const setCacheData = (symbol: string, data: ChartDataPoint[], priceChange: number, exchange: Exchange) => {
  dataCache.set(symbol.toUpperCase(), { data, priceChange, timestamp: Date.now(), exchange });
};

export const useRealtimeChartData = (symbol: string, coinGeckoId?: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<Exchange | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);
  const refreshIntervalRef = useRef<number | null>(null);
  const currentExchangeRef = useRef<Exchange | null>(null);
  const symbolRef = useRef(symbol);

  // Get exchange-specific symbol
  const getExchangeSymbol = useCallback((sym: string, exchange: Exchange): string | null => {
    const upperSym = sym.toUpperCase();
    switch (exchange) {
      case "binance":
        return BINANCE_SYMBOL_MAP[upperSym] || null;
      case "coinbase":
        return COINBASE_SYMBOL_MAP[upperSym] || null;
      case "kraken":
        return KRAKEN_SYMBOL_MAP[upperSym] || null;
      case "coingecko":
        if (coinGeckoId) return coinGeckoId;
        return COINGECKO_ID_MAP[upperSym] || null;
      default:
        return null;
    }
  }, [coinGeckoId]);

  // Parse WebSocket message based on exchange
  const parseWebSocketMessage = useCallback((exchange: Exchange, data: any): { price: number; volume: number; time: Date } | null => {
    try {
      switch (exchange) {
        case "binance":
          if (data.k) {
            return {
              price: parseFloat(data.k.c),
              volume: parseFloat(data.k.v),
              time: new Date(data.k.T),
            };
          }
          break;
        case "coinbase":
          if (data.type === "ticker" && data.price) {
            return {
              price: parseFloat(data.price),
              volume: parseFloat(data.volume_24h || "0"),
              time: new Date(data.time || Date.now()),
            };
          }
          break;
        case "kraken":
          // Kraken ticker format: [channelID, tickerData, channelName, pair]
          if (Array.isArray(data) && data.length >= 2 && typeof data[1] === "object") {
            const ticker = data[1];
            if (ticker.c && Array.isArray(ticker.c)) {
              return {
                price: parseFloat(ticker.c[0]),
                volume: parseFloat(ticker.v?.[1] || "0"),
                time: new Date(),
              };
            }
          }
          break;
      }
    } catch (e) {
      console.error(`Parse error for ${exchange}:`, e);
    }
    return null;
  }, []);

  // Fetch historical data from Binance
  const fetchBinanceData = useCallback(async (binanceSymbol: string): Promise<ChartDataPoint[] | null> => {
    const backoffKey = getBackoffKey(symbol, "binance");
    if (!canRetry(backoffKey)) return null;

    try {
      const response = await fetchWithTimeout(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}USDT&interval=1m&limit=20`
      );
      
      if (!response.ok) {
        recordFailure(backoffKey);
        return null;
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        recordFailure(backoffKey);
        return null;
      }
      
      recordSuccess(backoffKey);
      return data.map((kline: any[]) => ({
        time: formatTime(new Date(kline[6])),
        price: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        positive: parseFloat(kline[4]) >= parseFloat(kline[1]),
      }));
    } catch {
      recordFailure(backoffKey);
      return null;
    }
  }, [symbol]);

  // Fetch historical data from Coinbase
  const fetchCoinbaseData = useCallback(async (coinbaseSymbol: string): Promise<ChartDataPoint[] | null> => {
    const backoffKey = getBackoffKey(symbol, "coinbase");
    if (!canRetry(backoffKey)) return null;

    try {
      const end = new Date();
      const start = new Date(end.getTime() - 20 * 60 * 1000); // 20 minutes ago
      const response = await fetchWithTimeout(
        `https://api.exchange.coinbase.com/products/${coinbaseSymbol}/candles?granularity=60&start=${start.toISOString()}&end=${end.toISOString()}`
      );
      
      if (!response.ok) {
        recordFailure(backoffKey);
        return null;
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        recordFailure(backoffKey);
        return null;
      }
      
      recordSuccess(backoffKey);
      // Coinbase returns [time, low, high, open, close, volume] in descending order
      return data.reverse().slice(-20).map((candle: number[]) => ({
        time: formatTime(new Date(candle[0] * 1000)),
        price: candle[4], // close
        volume: candle[5],
        positive: candle[4] >= candle[3], // close >= open
      }));
    } catch {
      recordFailure(backoffKey);
      return null;
    }
  }, [symbol]);

  // Fetch historical data from Kraken
  const fetchKrakenData = useCallback(async (krakenSymbol: string): Promise<ChartDataPoint[] | null> => {
    const backoffKey = getBackoffKey(symbol, "kraken");
    if (!canRetry(backoffKey)) return null;

    try {
      const pair = krakenSymbol.replace("/", "");
      const response = await fetchWithTimeout(
        `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1`
      );
      
      if (!response.ok) {
        recordFailure(backoffKey);
        return null;
      }
      
      const data = await response.json();
      if (data.error?.length > 0) {
        recordFailure(backoffKey);
        return null;
      }
      
      const resultKey = Object.keys(data.result).find(k => k !== "last");
      if (!resultKey || !Array.isArray(data.result[resultKey])) {
        recordFailure(backoffKey);
        return null;
      }
      
      recordSuccess(backoffKey);
      const ohlc = data.result[resultKey].slice(-20);
      return ohlc.map((candle: any[]) => ({
        time: formatTime(new Date(candle[0] * 1000)),
        price: parseFloat(candle[4]), // close
        volume: parseFloat(candle[6]),
        positive: parseFloat(candle[4]) >= parseFloat(candle[1]), // close >= open
      }));
    } catch {
      recordFailure(backoffKey);
      return null;
    }
  }, [symbol]);

  // Fetch from CoinGecko (no WebSocket, polling only)
  const fetchCoinGeckoData = useCallback(async (cgId: string): Promise<ChartDataPoint[] | null> => {
    const backoffKey = getBackoffKey(symbol, "coingecko");
    if (!canRetry(backoffKey)) return null;

    try {
      const response = await fetchWithTimeout(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=1`
      );

      if (!response.ok) {
        recordFailure(backoffKey);
        return null;
      }
      
      const data = await response.json();
      if (!data.prices || data.prices.length === 0) {
        recordFailure(backoffKey);
        return null;
      }

      recordSuccess(backoffKey);
      const recentPrices = data.prices.slice(-20);
      const recentVolumes = data.total_volumes?.slice(-20) || [];
      
      return recentPrices.map((pricePoint: [number, number], index: number) => {
        const [timestamp, price] = pricePoint;
        const prevPrice = index > 0 ? recentPrices[index - 1][1] : price;
        return {
          time: formatTime(new Date(timestamp)),
          price,
          volume: recentVolumes[index]?.[1] || 0,
          positive: price >= prevPrice,
        };
      });
    } catch {
      recordFailure(backoffKey);
      return null;
    }
  }, [symbol]);

  // Connect WebSocket to exchange
  const connectWebSocket = useCallback((exchange: Exchange, exchangeSymbol: string) => {
    if (isConnectedRef.current || symbolRef.current !== symbol) return;
    
    let wsUrl: string;
    let subscribeMessage: string | null = null;

    switch (exchange) {
      case "binance":
        wsUrl = `wss://stream.binance.com:9443/ws/${exchangeSymbol.toLowerCase()}usdt@kline_1m`;
        break;
      case "coinbase":
        wsUrl = "wss://ws-feed.exchange.coinbase.com";
        subscribeMessage = JSON.stringify({
          type: "subscribe",
          product_ids: [exchangeSymbol],
          channels: ["ticker"],
        });
        break;
      case "kraken":
        wsUrl = "wss://ws.kraken.com";
        subscribeMessage = JSON.stringify({
          event: "subscribe",
          pair: [exchangeSymbol],
          subscription: { name: "ticker" },
        });
        break;
      default:
        return;
    }
    
    try {
      const ws = new WebSocket(wsUrl);
      currentExchangeRef.current = exchange;
      
      ws.onopen = () => {
        isConnectedRef.current = true;
        setError(null);
        if (subscribeMessage) {
          ws.send(subscribeMessage);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const parsed = parseWebSocketMessage(exchange, data);
          
          if (parsed) {
            const timeStr = formatTime(parsed.time);
            
            if (lastPriceRef.current === null) {
              lastPriceRef.current = parsed.price;
            }
            
            const change = ((parsed.price - lastPriceRef.current) / lastPriceRef.current) * 100;
            setPriceChange(change);
            
            setChartData((prev) => {
              const newPoint: ChartDataPoint = {
                time: timeStr,
                price: parsed.price,
                volume: parsed.volume,
                positive: parsed.price >= (prev[prev.length - 1]?.price || parsed.price),
              };
              
              const existingIndex = prev.findIndex(p => p.time === timeStr);
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = newPoint;
                return updated;
              }
              
              const updated = [...prev, newPoint];
              if (updated.length > 20) {
                updated.shift();
                if (updated.length > 0) {
                  lastPriceRef.current = updated[0].price;
                }
              }
              return updated;
            });
          }
        } catch (e) {
          console.error(`${exchange} WebSocket parse error:`, e);
        }
      };
      
      ws.onerror = () => {
        console.warn(`${exchange} WebSocket error`);
      };
      
      ws.onclose = () => {
        isConnectedRef.current = false;
        
        // Reconnect if still on same symbol
        if (symbolRef.current === symbol && reconnectTimeoutRef.current === null) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            const sym = getExchangeSymbol(symbol, exchange);
            if (sym) connectWebSocket(exchange, sym);
          }, 5000);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error(`Failed to create ${exchange} WebSocket:`, error);
    }
  }, [symbol, parseWebSocketMessage, getExchangeSymbol]);

  // Setup CoinGecko polling
  const setupCoinGeckoRefresh = useCallback((cgId: string) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = window.setInterval(async () => {
      const data = await fetchCoinGeckoData(cgId);
      if (data && data.length > 0) {
        setChartData(data);
        const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
        setPriceChange(change);
        setCacheData(symbol, data, change, "coingecko");
      }
    }, 60000);
  }, [fetchCoinGeckoData, symbol]);

  // Cleanup function
  const cleanup = useCallback(() => {
    isConnectedRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    symbolRef.current = symbol;
    
    // Check cache first
    const cached = getCachedData(symbol);
    if (cached && isCacheValid(symbol)) {
      setChartData(cached.data);
      setPriceChange(cached.priceChange);
      setDataSource(cached.exchange);
      setIsLoading(false);
      if (cached.data.length > 0) {
        lastPriceRef.current = cached.data[0].price;
      }
    } else {
      setChartData([]);
      lastPriceRef.current = null;
      setPriceChange(0);
      setIsLoading(true);
    }
    
    setIsSupported(true);
    setError(null);
    cleanup();

    const loadData = async () => {
      const exchanges: Exchange[] = ["binance", "coinbase", "kraken", "coingecko"];
      
      for (const exchange of exchanges) {
        if (symbolRef.current !== symbol) return; // Symbol changed, abort
        
        const exchangeSymbol = getExchangeSymbol(symbol, exchange);
        if (!exchangeSymbol) continue;
        
        let data: ChartDataPoint[] | null = null;
        
        switch (exchange) {
          case "binance":
            data = await fetchBinanceData(exchangeSymbol);
            break;
          case "coinbase":
            data = await fetchCoinbaseData(exchangeSymbol);
            break;
          case "kraken":
            data = await fetchKrakenData(exchangeSymbol);
            break;
          case "coingecko":
            data = await fetchCoinGeckoData(exchangeSymbol);
            break;
        }
        
        if (data && data.length > 0) {
          const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
          setChartData(data);
          setPriceChange(change);
          setDataSource(exchange);
          setIsLoading(false);
          setCacheData(symbol, data, change, exchange);
          
          if (data.length > 0) {
            lastPriceRef.current = data[0].price;
          }
          
          // Connect WebSocket for live updates (not for CoinGecko)
          if (exchange !== "coingecko") {
            connectWebSocket(exchange, exchangeSymbol);
          } else {
            setupCoinGeckoRefresh(exchangeSymbol);
          }
          return;
        }
      }
      
      // All exchanges failed
      setIsSupported(false);
      setError("Data not available for this asset");
      setIsLoading(false);
    };

    loadData();
    
    return cleanup;
  }, [symbol, cleanup, fetchBinanceData, fetchCoinbaseData, fetchKrakenData, fetchCoinGeckoData, getExchangeSymbol, connectWebSocket, setupCoinGeckoRefresh]);

  return { chartData, priceChange, isLoading, isSupported, error, dataSource };
};
