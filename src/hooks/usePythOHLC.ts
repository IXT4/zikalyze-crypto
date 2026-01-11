import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";

export interface OHLCCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number;
  source: "Pyth";
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
};

type CandleInterval = keyof typeof CANDLE_INTERVALS;

const formatCandleTime = (timestamp: number, interval: CandleInterval): string => {
  const date = new Date(timestamp);
  if (interval === "1m" || interval === "5m") {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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
  const pythFeedKey = `${normalizedSymbol}/USD`;
  const hasPythFeed = !!PYTH_FEED_IDS[pythFeedKey];
  
  const { prices, isConnected, getPrice } = usePythPrices(
    hasPythFeed ? [normalizedSymbol] : []
  );

  const [state, setState] = useState<PythOHLCState>({
    candles: [],
    currentCandle: null,
    isStreaming: false,
    hasPythFeed,
    lastTick: null,
    ticksReceived: 0,
  });

  const candlesRef = useRef<OHLCCandle[]>([]);
  const currentCandleRef = useRef<OHLCCandle | null>(null);
  const ticksReceivedRef = useRef(0);
  const lastProcessedTimeRef = useRef<number>(0);
  const intervalMs = CANDLE_INTERVALS[interval];

  // Process new Pyth price tick into OHLC candle
  const processTick = useCallback((price: number, timestamp: number) => {
    const candleStart = getCandleStartTime(timestamp, intervalMs);
    
    ticksReceivedRef.current++;
    
    // Check if this tick belongs to the current candle
    if (currentCandleRef.current && currentCandleRef.current.timestamp === candleStart) {
      // Update current candle
      currentCandleRef.current = {
        ...currentCandleRef.current,
        high: Math.max(currentCandleRef.current.high, price),
        low: Math.min(currentCandleRef.current.low, price),
        close: price,
        tickCount: currentCandleRef.current.tickCount + 1,
      };
    } else {
      // New candle period - finalize current candle if exists
      if (currentCandleRef.current) {
        candlesRef.current = [...candlesRef.current, currentCandleRef.current].slice(-maxCandles);
      }
      
      // Create new candle
      currentCandleRef.current = {
        time: formatCandleTime(candleStart, interval),
        timestamp: candleStart,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0, // Pyth doesn't provide volume
        tickCount: 1,
        source: "Pyth",
      };
    }

    // Update state
    setState(prev => ({
      ...prev,
      candles: candlesRef.current,
      currentCandle: currentCandleRef.current,
      isStreaming: true,
      lastTick: price,
      ticksReceived: ticksReceivedRef.current,
    }));
  }, [intervalMs, interval, maxCandles]);

  // Watch for Pyth price updates
  useEffect(() => {
    if (!hasPythFeed || !isConnected) return;

    const priceData = getPrice(normalizedSymbol);
    if (priceData && priceData.publishTime !== lastProcessedTimeRef.current) {
      lastProcessedTimeRef.current = priceData.publishTime;
      processTick(priceData.price, priceData.publishTime);
    }
  }, [prices, hasPythFeed, isConnected, normalizedSymbol, getPrice, processTick]);

  // Reset when symbol changes
  useEffect(() => {
    candlesRef.current = [];
    currentCandleRef.current = null;
    ticksReceivedRef.current = 0;
    lastProcessedTimeRef.current = 0;
    
    setState({
      candles: [],
      currentCandle: null,
      isStreaming: false,
      hasPythFeed,
      lastTick: null,
      ticksReceived: 0,
    });
  }, [normalizedSymbol, hasPythFeed]);

  // Combine completed candles with current forming candle for display
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
  };
};

export { CANDLE_INTERVALS };
export type { CandleInterval };
