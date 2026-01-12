import { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

export interface OHLCCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number;
  source: "WebSocket";
}

export interface PythOHLCState {
  candles: OHLCCandle[];
  currentCandle: OHLCCandle | null;
  isStreaming: boolean;
  hasPythFeed: boolean;
  lastTick: number | null;
  ticksReceived: number;
}

// Candle interval in milliseconds
const CANDLE_INTERVALS = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

type CandleInterval = keyof typeof CANDLE_INTERVALS;

// Format labels for different intervals
const INTERVAL_LABELS: Record<CandleInterval, string> = {
  "1m": "1 Min",
  "5m": "5 Min",
  "15m": "15 Min",
  "1h": "1 Hour",
  "4h": "4 Hour",
  "1d": "Daily",
};

// Cache TTL for each interval
const CACHE_TTL: Record<CandleInterval, number> = {
  "1m": 30 * 60 * 1000,
  "5m": 2 * 60 * 60 * 1000,
  "15m": 6 * 60 * 60 * 1000,
  "1h": 24 * 60 * 60 * 1000,
  "4h": 7 * 24 * 60 * 60 * 1000,
  "1d": 30 * 24 * 60 * 60 * 1000,
};

// Supported symbols (all symbols from WebSocket)
export const PYTH_FEED_IDS: Record<string, string> = {
  "BTC/USD": "btc",
  "ETH/USD": "eth",
  "SOL/USD": "sol",
  "BNB/USD": "bnb",
  "XRP/USD": "xrp",
  "ADA/USD": "ada",
  "DOGE/USD": "doge",
  "AVAX/USD": "avax",
  "LINK/USD": "link",
  "DOT/USD": "dot",
};

const STORAGE_KEY_PREFIX = "zikalyze_ohlc_";

interface PersistedCandleData {
  candles: OHLCCandle[];
  currentCandle: OHLCCandle | null;
  ticksReceived: number;
  lastSaved: number;
}

const getStorageKey = (symbol: string, interval: CandleInterval): string => {
  return `${STORAGE_KEY_PREFIX}${symbol.toUpperCase()}_${interval}`;
};

const loadPersistedCandles = (
  symbol: string,
  interval: CandleInterval
): PersistedCandleData | null => {
  try {
    const key = getStorageKey(symbol, interval);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data: PersistedCandleData = JSON.parse(stored);
    const now = Date.now();
    const ttl = CACHE_TTL[interval];

    if (now - data.lastSaved > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    const intervalMs = CANDLE_INTERVALS[interval];
    const cutoffTime = now - ttl;
    const validCandles = data.candles.filter(c => c.timestamp > cutoffTime);

    let currentCandle = data.currentCandle;
    if (currentCandle) {
      const candleEnd = currentCandle.timestamp + intervalMs;
      if (now > candleEnd) {
        validCandles.push(currentCandle);
        currentCandle = null;
      }
    }

    return {
      candles: validCandles,
      currentCandle,
      ticksReceived: data.ticksReceived,
      lastSaved: data.lastSaved,
    };
  } catch {
    return null;
  }
};

const saveCandles = (
  symbol: string,
  interval: CandleInterval,
  candles: OHLCCandle[],
  currentCandle: OHLCCandle | null,
  ticksReceived: number
): void => {
  try {
    const key = getStorageKey(symbol, interval);
    const data: PersistedCandleData = {
      candles,
      currentCandle,
      ticksReceived,
      lastSaved: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

const formatCandleTime = (timestamp: number, interval: CandleInterval): string => {
  const date = new Date(timestamp);
  
  if (interval === "1d") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  
  if (interval === "4h") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      hour12: true,
    }).replace(",", "");
  }
  
  if (interval === "1h") {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
  }
  
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getCandleStartTime = (timestamp: number, intervalMs: number): number => {
  return Math.floor(timestamp / intervalMs) * intervalMs;
};

export const usePythOHLC = (
  symbol: string = "BTC",
  interval: CandleInterval = "1m",
  maxCandles: number = 30
) => {
  const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "");
  const hasPythFeed = true; // WebSocket supports all symbols
  
  // Use global WebSocket for price data
  const { prices, connected: isConnected, getPrice } = useGlobalPriceWebSocket([normalizedSymbol]);

  const [state, setState] = useState<PythOHLCState>(() => {
    const persisted = loadPersistedCandles(normalizedSymbol, interval);
    if (persisted) {
      return {
        candles: persisted.candles,
        currentCandle: persisted.currentCandle,
        isStreaming: false,
        hasPythFeed,
        lastTick: persisted.currentCandle?.close ?? null,
        ticksReceived: persisted.ticksReceived,
      };
    }
    return {
      candles: [],
      currentCandle: null,
      isStreaming: false,
      hasPythFeed,
      lastTick: null,
      ticksReceived: 0,
    };
  });

  const candlesRef = useRef<OHLCCandle[]>(state.candles);
  const currentCandleRef = useRef<OHLCCandle | null>(state.currentCandle);
  const ticksReceivedRef = useRef(state.ticksReceived);
  const lastProcessedPriceRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const intervalMs = CANDLE_INTERVALS[interval];
  const saveIntervalMs = interval === "1m" ? 10000 : 5000;

  const processTick = useCallback((price: number, timestamp: number) => {
    const candleStart = getCandleStartTime(timestamp, intervalMs);
    
    ticksReceivedRef.current++;
    
    if (currentCandleRef.current && currentCandleRef.current.timestamp === candleStart) {
      currentCandleRef.current = {
        ...currentCandleRef.current,
        high: Math.max(currentCandleRef.current.high, price),
        low: Math.min(currentCandleRef.current.low, price),
        close: price,
        tickCount: currentCandleRef.current.tickCount + 1,
      };
    } else {
      if (currentCandleRef.current) {
        candlesRef.current = [...candlesRef.current, currentCandleRef.current].slice(-maxCandles);
      }
      
      currentCandleRef.current = {
        time: formatCandleTime(candleStart, interval),
        timestamp: candleStart,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        tickCount: 1,
        source: "WebSocket",
      };
    }

    const now = Date.now();
    if (now - lastSaveTimeRef.current > saveIntervalMs) {
      lastSaveTimeRef.current = now;
      saveCandles(
        normalizedSymbol,
        interval,
        candlesRef.current,
        currentCandleRef.current,
        ticksReceivedRef.current
      );
    }

    setState(prev => ({
      ...prev,
      candles: candlesRef.current,
      currentCandle: currentCandleRef.current,
      isStreaming: true,
      lastTick: price,
      ticksReceived: ticksReceivedRef.current,
    }));
  }, [intervalMs, interval, maxCandles, normalizedSymbol, saveIntervalMs]);

  // Watch for WebSocket price updates
  useEffect(() => {
    if (!isConnected) return;

    const priceData = getPrice(normalizedSymbol);
    if (priceData && priceData.price !== lastProcessedPriceRef.current) {
      lastProcessedPriceRef.current = priceData.price;
      processTick(priceData.price, priceData.timestamp || Date.now());
    }
  }, [prices, isConnected, normalizedSymbol, getPrice, processTick]);

  // Load persisted data when symbol or interval changes
  useEffect(() => {
    const persisted = loadPersistedCandles(normalizedSymbol, interval);
    
    if (persisted) {
      candlesRef.current = persisted.candles;
      currentCandleRef.current = persisted.currentCandle;
      ticksReceivedRef.current = persisted.ticksReceived;
      
      setState({
        candles: persisted.candles,
        currentCandle: persisted.currentCandle,
        isStreaming: false,
        hasPythFeed,
        lastTick: persisted.currentCandle?.close ?? null,
        ticksReceived: persisted.ticksReceived,
      });
    } else {
      candlesRef.current = [];
      currentCandleRef.current = null;
      ticksReceivedRef.current = 0;
      lastProcessedPriceRef.current = 0;
      
      setState({
        candles: [],
        currentCandle: null,
        isStreaming: false,
        hasPythFeed,
        lastTick: null,
        ticksReceived: 0,
      });
    }
  }, [normalizedSymbol, interval, hasPythFeed]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (candlesRef.current.length > 0 || currentCandleRef.current) {
        saveCandles(
          normalizedSymbol,
          interval,
          candlesRef.current,
          currentCandleRef.current,
          ticksReceivedRef.current
        );
      }
    };
  }, [normalizedSymbol, interval]);

  const allCandles = state.currentCandle 
    ? [...state.candles, state.currentCandle]
    : state.candles;

  return {
    candles: allCandles,
    completedCandles: state.candles,
    currentCandle: state.currentCandle,
    isStreaming: state.isStreaming,
    isConnected,
    hasPythFeed,
    lastTick: state.lastTick,
    ticksReceived: state.ticksReceived,
    interval,
    hasPersistedData: state.candles.length > 0 && !state.isStreaming,
  };
};

export { CANDLE_INTERVALS, INTERVAL_LABELS };
export type { CandleInterval };
