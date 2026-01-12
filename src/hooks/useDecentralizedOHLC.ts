// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useDecentralizedOHLC — 100% Decentralized OHLC Candles from Oracle Ticks
// ═══════════════════════════════════════════════════════════════════════════════
// Aggregates real-time oracle ticks (Pyth, DIA, Redstone) into OHLC candles
// Persists candle history in localStorage for multi-timeframe analysis
// Zero centralized exchange dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useOraclePrices } from "./useOraclePrices";

export interface OHLCCandle {
  timestamp: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number;
  source: "Pyth" | "DIA" | "Redstone" | "Oracle";
}

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

// Candle interval in milliseconds
const CANDLE_INTERVALS: Record<CandleInterval, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

// Cache TTL for each interval
const CACHE_TTL: Record<CandleInterval, number> = {
  "1m": 2 * 60 * 60 * 1000,         // 2 hours
  "5m": 6 * 60 * 60 * 1000,         // 6 hours
  "15m": 24 * 60 * 60 * 1000,       // 24 hours
  "1h": 3 * 24 * 60 * 60 * 1000,    // 3 days
  "4h": 7 * 24 * 60 * 60 * 1000,    // 7 days
  "1d": 30 * 24 * 60 * 60 * 1000,   // 30 days
};

// Max candles to keep per interval
const MAX_CANDLES: Record<CandleInterval, number> = {
  "1m": 120,  // 2 hours of 1m candles
  "5m": 144,  // 12 hours of 5m candles
  "15m": 96,  // 24 hours of 15m candles
  "1h": 72,   // 3 days of 1h candles
  "4h": 42,   // 7 days of 4h candles
  "1d": 30,   // 30 days of daily candles
};

const STORAGE_KEY_PREFIX = "zikalyze_dohlc_v2_";

interface PersistedData {
  candles: Record<CandleInterval, OHLCCandle[]>;
  currentCandles: Record<CandleInterval, OHLCCandle | null>;
  ticksReceived: number;
  lastSaved: number;
}

const getStorageKey = (symbol: string): string => {
  return `${STORAGE_KEY_PREFIX}${symbol.toUpperCase()}`;
};

const loadPersistedData = (symbol: string): PersistedData | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(symbol));
    if (!stored) return null;
    
    const data: PersistedData = JSON.parse(stored);
    const now = Date.now();
    
    // Clean up expired candles per interval
    const cleanedCandles: Record<CandleInterval, OHLCCandle[]> = {} as any;
    const cleanedCurrent: Record<CandleInterval, OHLCCandle | null> = {} as any;
    
    (Object.keys(CANDLE_INTERVALS) as CandleInterval[]).forEach(interval => {
      const ttl = CACHE_TTL[interval];
      const intervalMs = CANDLE_INTERVALS[interval];
      const cutoffTime = now - ttl;
      
      // Filter valid candles
      const candles = data.candles[interval] || [];
      cleanedCandles[interval] = candles.filter(c => c.timestamp > cutoffTime);
      
      // Check if current candle is still in progress
      const current = data.currentCandles[interval];
      if (current) {
        const candleEnd = current.timestamp + intervalMs;
        if (now > candleEnd) {
          // Current candle completed, move to candles array
          cleanedCandles[interval].push(current);
          cleanedCurrent[interval] = null;
        } else {
          cleanedCurrent[interval] = current;
        }
      } else {
        cleanedCurrent[interval] = null;
      }
      
      // Trim to max candles
      cleanedCandles[interval] = cleanedCandles[interval].slice(-MAX_CANDLES[interval]);
    });
    
    return {
      candles: cleanedCandles,
      currentCandles: cleanedCurrent,
      ticksReceived: data.ticksReceived,
      lastSaved: data.lastSaved,
    };
  } catch {
    return null;
  }
};

const savePersistedData = (
  symbol: string,
  candles: Record<CandleInterval, OHLCCandle[]>,
  currentCandles: Record<CandleInterval, OHLCCandle | null>,
  ticksReceived: number
): void => {
  try {
    const data: PersistedData = {
      candles,
      currentCandles,
      ticksReceived,
      lastSaved: Date.now(),
    };
    localStorage.setItem(getStorageKey(symbol), JSON.stringify(data));
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
      month: "short", day: "numeric", hour: "2-digit", hour12: true,
    }).replace(",", "");
  }
  if (interval === "1h") {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", hour12: true });
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const getCandleStartTime = (timestamp: number, intervalMs: number): number => {
  return Math.floor(timestamp / intervalMs) * intervalMs;
};

export interface DecentralizedOHLCState {
  candles: Record<CandleInterval, OHLCCandle[]>;
  currentCandles: Record<CandleInterval, OHLCCandle | null>;
  isStreaming: boolean;
  isLive: boolean;
  ticksReceived: number;
  primarySource: string;
}

export const useDecentralizedOHLC = (symbol: string = "BTC") => {
  const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "");
  
  // Connect to unified oracle prices
  const oracle = useOraclePrices([normalizedSymbol]);
  
  const [state, setState] = useState<DecentralizedOHLCState>(() => {
    const persisted = loadPersistedData(normalizedSymbol);
    if (persisted) {
      return {
        candles: persisted.candles,
        currentCandles: persisted.currentCandles,
        isStreaming: false,
        isLive: false,
        ticksReceived: persisted.ticksReceived,
        primarySource: "Cached",
      };
    }
    
    const emptyCandles: Record<CandleInterval, OHLCCandle[]> = {
      "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "1d": [],
    };
    const emptyCurrents: Record<CandleInterval, OHLCCandle | null> = {
      "1m": null, "5m": null, "15m": null, "1h": null, "4h": null, "1d": null,
    };
    
    return {
      candles: emptyCandles,
      currentCandles: emptyCurrents,
      isStreaming: false,
      isLive: false,
      ticksReceived: 0,
      primarySource: "None",
    };
  });
  
  const candlesRef = useRef(state.candles);
  const currentCandlesRef = useRef(state.currentCandles);
  const ticksReceivedRef = useRef(state.ticksReceived);
  const lastProcessedRef = useRef<number>(0);
  const lastSaveRef = useRef<number>(0);
  const mountedRef = useRef(true);
  
  // Process oracle tick into all timeframe candles
  const processTick = useCallback((price: number, timestamp: number, source: string) => {
    if (!mountedRef.current) return;
    
    ticksReceivedRef.current++;
    
    (Object.keys(CANDLE_INTERVALS) as CandleInterval[]).forEach(interval => {
      const intervalMs = CANDLE_INTERVALS[interval];
      const candleStart = getCandleStartTime(timestamp, intervalMs);
      const maxCandles = MAX_CANDLES[interval];
      
      const current = currentCandlesRef.current[interval];
      
      if (current && current.timestamp === candleStart) {
        // Update existing candle
        currentCandlesRef.current[interval] = {
          ...current,
          high: Math.max(current.high, price),
          low: Math.min(current.low, price),
          close: price,
          tickCount: current.tickCount + 1,
        };
      } else {
        // Finalize previous candle if exists
        if (current) {
          candlesRef.current[interval] = [
            ...candlesRef.current[interval],
            current,
          ].slice(-maxCandles);
        }
        
        // Create new candle
        currentCandlesRef.current[interval] = {
          timestamp: candleStart,
          time: formatCandleTime(candleStart, interval),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
          tickCount: 1,
          source: source as any,
        };
      }
    });
    
    // Update state
    setState(prev => ({
      ...prev,
      candles: { ...candlesRef.current },
      currentCandles: { ...currentCandlesRef.current },
      isStreaming: true,
      isLive: oracle.isLive,
      ticksReceived: ticksReceivedRef.current,
      primarySource: source,
    }));
    
    // Save periodically (every 10 seconds)
    const now = Date.now();
    if (now - lastSaveRef.current > 10000) {
      lastSaveRef.current = now;
      savePersistedData(
        normalizedSymbol,
        candlesRef.current,
        currentCandlesRef.current,
        ticksReceivedRef.current
      );
    }
  }, [normalizedSymbol, oracle.isLive]);
  
  // Watch for oracle price updates
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const priceData = oracle.getPrice(normalizedSymbol);
    if (!priceData || priceData.price <= 0) return;
    
    // Deduplicate by lastUpdate
    if (priceData.lastUpdate === lastProcessedRef.current) return;
    lastProcessedRef.current = priceData.lastUpdate;
    
    processTick(priceData.price, priceData.lastUpdate, priceData.source);
  }, [oracle.prices, normalizedSymbol, oracle.getPrice, processTick]);
  
  // Initialize from persisted data when symbol changes
  useEffect(() => {
    const persisted = loadPersistedData(normalizedSymbol);
    
    if (persisted) {
      candlesRef.current = persisted.candles;
      currentCandlesRef.current = persisted.currentCandles;
      ticksReceivedRef.current = persisted.ticksReceived;
      
      setState({
        candles: persisted.candles,
        currentCandles: persisted.currentCandles,
        isStreaming: false,
        isLive: oracle.isLive,
        ticksReceived: persisted.ticksReceived,
        primarySource: "Cached",
      });
    } else {
      const emptyCandles: Record<CandleInterval, OHLCCandle[]> = {
        "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "1d": [],
      };
      const emptyCurrents: Record<CandleInterval, OHLCCandle | null> = {
        "1m": null, "5m": null, "15m": null, "1h": null, "4h": null, "1d": null,
      };
      
      candlesRef.current = emptyCandles;
      currentCandlesRef.current = emptyCurrents;
      ticksReceivedRef.current = 0;
      lastProcessedRef.current = 0;
      
      setState({
        candles: emptyCandles,
        currentCandles: emptyCurrents,
        isStreaming: false,
        isLive: oracle.isLive,
        ticksReceived: 0,
        primarySource: "None",
      });
    }
  }, [normalizedSymbol, oracle.isLive]);
  
  // Cleanup and save on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      savePersistedData(
        normalizedSymbol,
        candlesRef.current,
        currentCandlesRef.current,
        ticksReceivedRef.current
      );
    };
  }, [normalizedSymbol]);
  
  // Get candles for a specific interval (including current forming candle)
  const getCandles = useCallback((interval: CandleInterval): OHLCCandle[] => {
    const completed = state.candles[interval] || [];
    const current = state.currentCandles[interval];
    return current ? [...completed, current] : completed;
  }, [state.candles, state.currentCandles]);
  
  // Get completed candles only (for analysis)
  const getCompletedCandles = useCallback((interval: CandleInterval): OHLCCandle[] => {
    return state.candles[interval] || [];
  }, [state.candles]);
  
  // Check if we have enough data for a specific interval
  const hasEnoughData = useCallback((interval: CandleInterval, minCandles: number = 5): boolean => {
    return getCandles(interval).length >= minCandles;
  }, [getCandles]);
  
  // Estimate when next candle completes
  const getNextCandleTime = useCallback((interval: CandleInterval): number | null => {
    const current = state.currentCandles[interval];
    if (!current) return null;
    return current.timestamp + CANDLE_INTERVALS[interval];
  }, [state.currentCandles]);
  
  return {
    ...state,
    getCandles,
    getCompletedCandles,
    hasEnoughData,
    getNextCandleTime,
    oracleStatus: {
      pythConnected: oracle.pythConnected,
      diaConnected: oracle.diaConnected,
      redstoneConnected: oracle.redstoneConnected,
      primarySource: oracle.primarySource,
    },
  };
};

export { CANDLE_INTERVALS, MAX_CANDLES };
