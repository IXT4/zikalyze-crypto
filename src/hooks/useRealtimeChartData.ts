import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

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

// Map CoinGecko symbols to Binance symbols
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  XRP: "XRP",
  DOGE: "DOGE",
  BNB: "BNB",
  ADA: "ADA",
  AVAX: "AVAX",
  DOT: "DOT",
  MATIC: "MATIC",
  LINK: "LINK",
  UNI: "UNI",
  ATOM: "ATOM",
  LTC: "LTC",
  BCH: "BCH",
  NEAR: "NEAR",
  APT: "APT",
  FIL: "FIL",
  ARB: "ARB",
  OP: "OP",
  INJ: "INJ",
  SUI: "SUI",
  TIA: "TIA",
  SEI: "SEI",
  PEPE: "PEPE",
  SHIB: "SHIB",
  WIF: "WIF",
  BONK: "BONK",
  FLOKI: "FLOKI",
  RENDER: "RENDER",
  FET: "FET",
  AAVE: "AAVE",
  MKR: "MKR",
  GRT: "GRT",
  IMX: "IMX",
  STX: "STX",
  RUNE: "RUNE",
  SAND: "SAND",
  MANA: "MANA",
  AXS: "AXS",
  GALA: "GALA",
  APE: "APE",
  CRV: "CRV",
  SNX: "SNX",
  COMP: "COMP",
  LDO: "LDO",
  ENS: "ENS",
  ALGO: "ALGO",
  XLM: "XLM",
  VET: "VET",
  ICP: "ICP",
  HBAR: "HBAR",
  ETC: "ETC",
  FTM: "FTM",
  TRX: "TRX",
  XMR: "XMR",
  EOS: "EOS",
  THETA: "THETA",
  XTZ: "XTZ",
  NEO: "NEO",
  KAVA: "KAVA",
  ZEC: "ZEC",
  DASH: "DASH",
  EGLD: "EGLD",
  FLOW: "FLOW",
  MINA: "MINA",
  ROSE: "ROSE",
  ONE: "ONE",
  ZIL: "ZIL",
  ENJ: "ENJ",
  CHZ: "CHZ",
  BAT: "BAT",
  CAKE: "CAKE",
  SUSHI: "SUSHI",
  YFI: "YFI",
  DYDX: "DYDX",
  GMT: "GMT",
  BLUR: "BLUR",
  MASK: "MASK",
  WLD: "WLD",
  JTO: "JTO",
  PYTH: "PYTH",
  JUP: "JUP",
  STRK: "STRK",
  DYM: "DYM",
  ALT: "ALT",
  PIXEL: "PIXEL",
  ORDI: "ORDI",
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fetchWithTimeout = async (url: string, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const useRealtimeChartData = (symbol: string, coinGeckoId?: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"binance" | "coingecko" | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);
  const refreshIntervalRef = useRef<number | null>(null);

  // Get Binance-compatible symbol
  const getBinanceSymbol = useCallback((sym: string): string | null => {
    const upperSym = sym.toUpperCase();
    // Check mapping first
    if (BINANCE_SYMBOL_MAP[upperSym]) {
      return BINANCE_SYMBOL_MAP[upperSym];
    }
    // Only allow alphanumeric symbols (no underscores, etc.)
    if (/^[A-Z0-9]+$/.test(upperSym) && upperSym.length <= 10) {
      return upperSym;
    }
    return null;
  }, []);

  // Get CoinGecko ID for fallback
  const getCoinGeckoId = useCallback((sym: string): string | null => {
    if (coinGeckoId) return coinGeckoId;
    const upperSym = sym.toUpperCase();
    return COINGECKO_ID_MAP[upperSym] || null;
  }, [coinGeckoId]);

  // Fetch data from CoinGecko as fallback
  const fetchCoinGeckoData = useCallback(async (cgId: string): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=1`
      );

      if (!response.ok) {
        setError(`CoinGecko error (${response.status})`);
        return false;
      }
      
      const data = await response.json();
      
      if (!data.prices || data.prices.length === 0) {
        setError("CoinGecko returned no data");
        return false;
      }

      // Take the last 20 data points
      const recentPrices = data.prices.slice(-20);
      const recentVolumes = data.total_volumes?.slice(-20) || [];
      
      const historicalData: ChartDataPoint[] = recentPrices.map((pricePoint: [number, number], index: number) => {
        const [timestamp, price] = pricePoint;
        const prevPrice = index > 0 ? recentPrices[index - 1][1] : price;
        const volume = recentVolumes[index]?.[1] || 0;
        
        return {
          time: formatTime(new Date(timestamp)),
          price: price,
          volume: volume,
          positive: price >= prevPrice,
        };
      });
      
      if (historicalData.length > 0) {
        lastPriceRef.current = historicalData[0].price;
        const latestPrice = historicalData[historicalData.length - 1].price;
        const change = ((latestPrice - historicalData[0].price) / historicalData[0].price) * 100;
        setPriceChange(change);
      }
      
      setChartData(historicalData);
      setIsSupported(true);
      setDataSource("coingecko");
      setError(null);
      return true;
    } catch (error) {
      const msg = error instanceof DOMException && error.name === "AbortError"
        ? "CoinGecko request timed out"
        : "Failed to fetch CoinGecko data";
      console.error(msg, error);
      setError(msg);
      return false;
    }
  }, []);

  const connectWebSocket = useCallback((binanceSymbol: string) => {
    if (isConnectedRef.current) return;
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}usdt@kline_1m`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        isConnectedRef.current = true;
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.k) {
            const kline = data.k;
            const closePrice = parseFloat(kline.c);
            const openPrice = parseFloat(kline.o);
            const volume = parseFloat(kline.v);
            const closeTime = new Date(kline.T);
            
            const isPositive = closePrice >= openPrice;
            const timeStr = formatTime(closeTime);
            
            // Calculate price change from first data point
            if (lastPriceRef.current === null) {
              lastPriceRef.current = closePrice;
            }
            
            const change = ((closePrice - lastPriceRef.current) / lastPriceRef.current) * 100;
            setPriceChange(change);
            
            setChartData((prev) => {
              const newPoint: ChartDataPoint = {
                time: timeStr,
                price: closePrice,
                volume: volume,
                positive: isPositive,
              };
              
              // Check if we already have this time, update it
              const existingIndex = prev.findIndex(p => p.time === timeStr);
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = newPoint;
                return updated;
              }
              
              // Add new point, keep last 20 points
              const updated = [...prev, newPoint];
              if (updated.length > 20) {
                updated.shift();
                // Update reference price to oldest point
                if (updated.length > 0) {
                  lastPriceRef.current = updated[0].price;
                }
              }
              return updated;
            });
          }
        } catch (e) {
          console.error("Chart WebSocket parse error:", e);
        }
      };
      
      ws.onerror = () => {
        setError("WebSocket connection failed");
      };
      
      ws.onclose = () => {
        isConnectedRef.current = false;
        
        // Only reconnect if using Binance source
        if (dataSource === "binance" && reconnectTimeoutRef.current === null) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            const binSym = getBinanceSymbol(symbol);
            if (binSym) connectWebSocket(binSym);
          }, 5000);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError("Failed to connect");
    }
  }, [symbol, getBinanceSymbol, dataSource]);

  // Fetch initial historical data from Binance
  const fetchBinanceData = useCallback(async (binanceSymbol: string): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}USDT&interval=1m&limit=20`
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // Check if we got valid data
      if (!Array.isArray(data) || data.length === 0) {
        return false;
      }
      
      const historicalData: ChartDataPoint[] = data.map((kline: any[]) => {
        const closeTime = new Date(kline[6]);
        const openPrice = parseFloat(kline[1]);
        const closePrice = parseFloat(kline[4]);
        const volume = parseFloat(kline[5]);
        
        return {
          time: formatTime(closeTime),
          price: closePrice,
          volume: volume,
          positive: closePrice >= openPrice,
        };
      });
      
      if (historicalData.length > 0) {
        lastPriceRef.current = historicalData[0].price;
        const latestPrice = historicalData[historicalData.length - 1].price;
        const change = ((latestPrice - historicalData[0].price) / historicalData[0].price) * 100;
        setPriceChange(change);
      }
      
      setChartData(historicalData);
      setIsSupported(true);
      setDataSource("binance");
      setError(null);
      return true;
    } catch (error) {
      console.error("Failed to fetch Binance data:", error);
      return false;
    }
  }, []);

  // Setup periodic refresh for CoinGecko data (since no WebSocket)
  const setupCoinGeckoRefresh = useCallback((cgId: string) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Refresh every 60 seconds (CoinGecko rate limits)
    refreshIntervalRef.current = window.setInterval(() => {
      fetchCoinGeckoData(cgId);
    }, 60000);
  }, [fetchCoinGeckoData]);

  useEffect(() => {
    // Reset state when symbol changes
    setChartData([]);
    lastPriceRef.current = null;
    setPriceChange(0);
    setIsLoading(true);
    setIsSupported(true);
    setError(null);
    setDataSource(null);
    isConnectedRef.current = false;

    // Close existing connections and intervals
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    const loadData = async () => {
      try {
        // Try Binance first
        const binanceSymbol = getBinanceSymbol(symbol);

        if (binanceSymbol) {
          const binanceSuccess = await fetchBinanceData(binanceSymbol);
          if (binanceSuccess) {
            setDataSource("binance");
            connectWebSocket(binanceSymbol);
            return;
          }
        }

        // Fallback to CoinGecko
        const cgId = getCoinGeckoId(symbol);
        if (cgId) {
          const cgSuccess = await fetchCoinGeckoData(cgId);
          if (cgSuccess) {
            setupCoinGeckoRefresh(cgId);
            return;
          }
        }

        // Neither worked
        setIsSupported(false);
        setError((prev) => prev || "Data not available for this asset");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    return () => {
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
    };
  }, [symbol, fetchBinanceData, fetchCoinGeckoData, connectWebSocket, getBinanceSymbol, getCoinGeckoId, setupCoinGeckoRefresh]);

  return { chartData, priceChange, isLoading, isSupported, error, dataSource };
};
