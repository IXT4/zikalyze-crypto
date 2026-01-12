// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 useDecentralizedChartData — Real-Time WebSocket + Oracle Chart Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Combines WebSocket streaming with Oracle fallback for maximum reliability
// Supports multiple timeframe aggregations (1m, 5m, 15m, 1h, 4h, 1d)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useOraclePrices, OraclePriceData } from "./useOraclePrices";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
  source: "Pyth" | "DIA" | "Redstone" | "WebSocket";
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

interface RawTick {
  price: number;
  timestamp: number;
  source: "Pyth" | "DIA" | "Redstone" | "WebSocket";
}

// Timeframe configuration
const TIMEFRAME_CONFIG: Record<ChartTimeframe, { 
  intervalMs: number; 
  maxPoints: number; 
  label: string;
  throttleMs: number;
}> = {
  "1m": { intervalMs: 60 * 1000, maxPoints: 60, label: "1 Min", throttleMs: 200 },
  "5m": { intervalMs: 5 * 60 * 1000, maxPoints: 60, label: "5 Min", throttleMs: 500 },
  "15m": { intervalMs: 15 * 60 * 1000, maxPoints: 48, label: "15 Min", throttleMs: 1000 },
  "1h": { intervalMs: 60 * 60 * 1000, maxPoints: 24, label: "1 Hour", throttleMs: 2000 },
  "4h": { intervalMs: 4 * 60 * 60 * 1000, maxPoints: 42, label: "4 Hour", throttleMs: 5000 },
  "1d": { intervalMs: 24 * 60 * 60 * 1000, maxPoints: 30, label: "1 Day", throttleMs: 10000 },
};

// LocalStorage persistence for raw tick data
const TICK_CACHE_PREFIX = "zikalyze_ticks_v2_";
const TICK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTickData {
  ticks: RawTick[];
  timestamp: number;
}

const loadCachedTicks = (symbol: string): RawTick[] => {
  try {
    const cached = localStorage.getItem(`${TICK_CACHE_PREFIX}${symbol}`);
    if (!cached) return [];
    const data: CachedTickData = JSON.parse(cached);
    if (Date.now() - data.timestamp > TICK_CACHE_TTL) {
      localStorage.removeItem(`${TICK_CACHE_PREFIX}${symbol}`);
      return [];
    }
    // Filter out old ticks (keep last 24h)
    const cutoff = Date.now() - TICK_CACHE_TTL;
    return data.ticks.filter(t => t.timestamp > cutoff);
  } catch {
    return [];
  }
};

const saveCachedTicks = (symbol: string, ticks: RawTick[]) => {
  try {
    // Keep last 24 hours of ticks, max 5000 entries
    const cutoff = Date.now() - TICK_CACHE_TTL;
    const filteredTicks = ticks.filter(t => t.timestamp > cutoff).slice(-5000);
    const data: CachedTickData = { ticks: filteredTicks, timestamp: Date.now() };
    localStorage.setItem(`${TICK_CACHE_PREFIX}${symbol}`, JSON.stringify(data));
  } catch { }
};

const formatTimeForTimeframe = (timestamp: number, timeframe: ChartTimeframe): string => {
  const date = new Date(timestamp);
  
  switch (timeframe) {
    case "1m":
    case "5m":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    case "15m":
    case "1h":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    case "4h":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        hour12: false,
      });
    case "1d":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
  }
};

// Aggregate raw ticks into OHLC candles for a given timeframe
const aggregateToTimeframe = (
  ticks: RawTick[],
  timeframe: ChartTimeframe
): ChartDataPoint[] => {
  const config = TIMEFRAME_CONFIG[timeframe];
  if (ticks.length === 0) return [];
  
  const now = Date.now();
  const intervalMs = config.intervalMs;
  
  // Group ticks by time interval
  const buckets = new Map<number, RawTick[]>();
  
  for (const tick of ticks) {
    const bucketKey = Math.floor(tick.timestamp / intervalMs) * intervalMs;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(tick);
  }
  
  // Convert buckets to chart data points
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const recentKeys = sortedKeys.slice(-config.maxPoints);
  
  const result: ChartDataPoint[] = [];
  let prevClose = 0;
  
  for (const key of recentKeys) {
    const bucketTicks = buckets.get(key)!;
    const prices = bucketTicks.map(t => t.price);
    
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    
    result.push({
      time: formatTimeForTimeframe(key, timeframe),
      timestamp: key,
      price: close,
      open,
      high,
      low,
      close,
      volume: bucketTicks.length, // Use tick count as proxy for volume
      positive: close >= (prevClose || open),
      source: bucketTicks[bucketTicks.length - 1].source,
    });
    
    prevClose = close;
  }
  
  return result;
};

export const useDecentralizedChartData = (
  crypto: string,
  timeframe: ChartTimeframe = "1m"
) => {
  const symbol = crypto.toUpperCase();
  const config = TIMEFRAME_CONFIG[timeframe];
  
  // Store raw ticks for aggregation
  const rawTicksRef = useRef<RawTick[]>(loadCachedTicks(symbol));
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isBuilding, setIsBuilding] = useState(true);
  const [currentSource, setCurrentSource] = useState<"Pyth" | "DIA" | "Redstone" | "WebSocket" | null>(null);
  
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const lastSaveRef = useRef<number>(0);
  const lastAggregationRef = useRef<number>(0);
  
  // Use the GLOBAL WebSocket for real-time streaming (singleton - no duplicate connections)
  const ws = useGlobalPriceWebSocket([symbol]);
  
  // Connect to unified oracle prices as fallback
  const oracle = useOraclePrices([]);
  
  // Load cached ticks on mount/symbol change
  useEffect(() => {
    mountedRef.current = true;
    rawTicksRef.current = loadCachedTicks(symbol);
    
    // Initial aggregation from cache
    if (rawTicksRef.current.length > 0) {
      const aggregated = aggregateToTimeframe(rawTicksRef.current, timeframe);
      setChartData(aggregated);
      setIsBuilding(aggregated.length < 3);
      
      if (aggregated.length > 1) {
        const firstPrice = aggregated[0].price;
        const lastPrice = aggregated[aggregated.length - 1].price;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
        lastPriceRef.current = lastPrice;
      }
    }
    
    return () => {
      mountedRef.current = false;
      if (rawTicksRef.current.length > 0) {
        saveCachedTicks(symbol, rawTicksRef.current);
      }
    };
  }, [symbol]);
  
  // Re-aggregate when timeframe changes
  useEffect(() => {
    if (rawTicksRef.current.length > 0) {
      const aggregated = aggregateToTimeframe(rawTicksRef.current, timeframe);
      setChartData(aggregated);
      
      if (aggregated.length > 1) {
        const firstPrice = aggregated[0].price;
        const lastPrice = aggregated[aggregated.length - 1].price;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
      }
    }
  }, [timeframe]);
  
  // Process WebSocket price updates (primary source)
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const wsPrice = ws.getPrice(symbol);
    if (!wsPrice || wsPrice.price <= 0) return;
    
    const now = Date.now();
    const newPrice = wsPrice.price;
    
    // Use timeframe-appropriate throttling for smooth updates
    const throttleMs = config.throttleMs;
    if (now - lastUpdateRef.current < throttleMs) return;
    
    // Always record real price changes, skip only truly identical prices
    if (lastPriceRef.current !== null && newPrice === lastPriceRef.current) {
      return;
    }
    
    lastUpdateRef.current = now;
    lastPriceRef.current = newPrice;
    
    // Add new tick from WebSocket
    const newTick: RawTick = {
      price: newPrice,
      timestamp: wsPrice.timestamp || now,
      source: "WebSocket",
    };
    
    rawTicksRef.current = [...rawTicksRef.current, newTick];
    setCurrentSource("WebSocket");
    
    // Aggregate on every meaningful update for accurate real-time streaming
    const aggregated = aggregateToTimeframe(rawTicksRef.current, timeframe);
    setChartData(aggregated);
    setIsBuilding(aggregated.length < 3);
    
    if (aggregated.length > 1) {
      const firstPrice = aggregated[0].price;
      const lastPrice = aggregated[aggregated.length - 1].price;
      const change = ((lastPrice - firstPrice) / firstPrice) * 100;
      setPriceChange(change);
    }
    
    // Save to cache periodically
    if (now - lastSaveRef.current > 30000) {
      saveCachedTicks(symbol, rawTicksRef.current);
      lastSaveRef.current = now;
    }
  }, [ws.prices, symbol, ws.getPrice, timeframe, config.throttleMs]);
  
  // Process oracle price updates into raw ticks
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const oraclePrice = oracle.getPrice(symbol);
    if (!oraclePrice || oraclePrice.price <= 0) return;
    
    const now = Date.now();
    const newPrice = oraclePrice.price;
    const source = oraclePrice.source;
    
    // Throttle based on timeframe
    if (now - lastUpdateRef.current < config.throttleMs) return;
    
    // Only add if price changed meaningfully
    if (lastPriceRef.current !== null) {
      const priceDiff = Math.abs(newPrice - lastPriceRef.current) / lastPriceRef.current;
      if (priceDiff < 0.0001) return; // 0.01% threshold
    }
    
    lastUpdateRef.current = now;
    lastPriceRef.current = newPrice;
    
    // Add new tick
    const newTick: RawTick = {
      price: newPrice,
      timestamp: now,
      source,
    };
    
    rawTicksRef.current = [...rawTicksRef.current, newTick];
    setCurrentSource(source);
    
    // Re-aggregate periodically based on timeframe
    const aggregationInterval = Math.min(config.throttleMs * 2, 2000);
    if (now - lastAggregationRef.current > aggregationInterval) {
      lastAggregationRef.current = now;
      
      const aggregated = aggregateToTimeframe(rawTicksRef.current, timeframe);
      setChartData(aggregated);
      setIsBuilding(aggregated.length < 3);
      
      if (aggregated.length > 1) {
        const firstPrice = aggregated[0].price;
        const lastPrice = aggregated[aggregated.length - 1].price;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
      }
    }
    
    // Save to cache periodically
    if (now - lastSaveRef.current > 30000) {
      saveCachedTicks(symbol, rawTicksRef.current);
      lastSaveRef.current = now;
    }
  }, [oracle.prices, symbol, oracle.getPrice, timeframe, config.throttleMs]);

  return {
    chartData,
    priceChange,
    isBuilding,
    isLive: ws.connected || oracle.isLive,
    currentSource,
    oracleStatus: {
      pythConnected: oracle.pythConnected,
      diaConnected: oracle.diaConnected,
      redstoneConnected: oracle.redstoneConnected,
      primarySource: ws.connected ? "WebSocket" as const : oracle.primarySource,
    },
    dataPointCount: chartData.length,
    timeframeConfig: config,
    rawTickCount: rawTicksRef.current.length,
  };
};

export { TIMEFRAME_CONFIG };
