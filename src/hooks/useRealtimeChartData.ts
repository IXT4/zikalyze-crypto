import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

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

export const useRealtimeChartData = (symbol: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);

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
        
        // Only reconnect if still supported
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          const binSym = getBinanceSymbol(symbol);
          if (binSym) connectWebSocket(binSym);
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError("Failed to connect");
    }
  }, [symbol, getBinanceSymbol]);

  // Fetch initial historical data
  const fetchHistoricalData = useCallback(async (binanceSymbol: string) => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}USDT&interval=1m&limit=20`
      );
      
      if (!response.ok) {
        if (response.status === 400) {
          // Symbol not found on Binance
          setIsSupported(false);
          setError("Not available on Binance");
          return false;
        }
        throw new Error("Failed to fetch historical data");
      }
      
      const data = await response.json();
      
      // Check if we got valid data
      if (!Array.isArray(data) || data.length === 0) {
        setIsSupported(false);
        setError("No data available");
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
      setError(null);
      return true;
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
      setIsSupported(false);
      setError("Failed to load data");
      return false;
    }
  }, []);

  useEffect(() => {
    // Reset state when symbol changes
    setChartData([]);
    lastPriceRef.current = null;
    setPriceChange(0);
    setIsSupported(true);
    setError(null);
    isConnectedRef.current = false;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Get Binance-compatible symbol
    const binanceSymbol = getBinanceSymbol(symbol);
    
    if (!binanceSymbol) {
      setIsSupported(false);
      setError("Symbol not supported");
      return;
    }
    
    // Fetch historical data first, then connect WebSocket
    fetchHistoricalData(binanceSymbol).then((success) => {
      if (success) {
        connectWebSocket(binanceSymbol);
      }
    });
    
    return () => {
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, fetchHistoricalData, connectWebSocket, getBinanceSymbol]);

  return { chartData, priceChange, isSupported, error };
};
