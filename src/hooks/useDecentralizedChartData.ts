// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 useDecentralizedChartData — 100% Decentralized Oracle-Only Chart Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Builds charts exclusively from Pyth, DIA, and Redstone oracle ticks
// Zero centralized exchange or API dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useOraclePrices, OraclePriceData } from "./useOraclePrices";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
  source: "Pyth" | "DIA" | "Redstone";
}

// LocalStorage persistence for chart data
const CHART_CACHE_PREFIX = "zikalyze_dchart_v1_";
const CHART_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedChartData {
  points: ChartDataPoint[];
  timestamp: number;
}

const loadCachedChart = (symbol: string): ChartDataPoint[] => {
  try {
    const cached = localStorage.getItem(`${CHART_CACHE_PREFIX}${symbol}`);
    if (!cached) return [];
    const data: CachedChartData = JSON.parse(cached);
    if (Date.now() - data.timestamp > CHART_CACHE_TTL) {
      localStorage.removeItem(`${CHART_CACHE_PREFIX}${symbol}`);
      return [];
    }
    return data.points;
  } catch {
    return [];
  }
};

const saveCachedChart = (symbol: string, points: ChartDataPoint[]) => {
  try {
    const data: CachedChartData = { points: points.slice(-100), timestamp: Date.now() };
    localStorage.setItem(`${CHART_CACHE_PREFIX}${symbol}`, JSON.stringify(data));
  } catch { }
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const useDecentralizedChartData = (crypto: string) => {
  const symbol = crypto.toUpperCase();
  
  const [chartData, setChartData] = useState<ChartDataPoint[]>(() => loadCachedChart(symbol));
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isBuilding, setIsBuilding] = useState(true);
  const [currentSource, setCurrentSource] = useState<"Pyth" | "DIA" | "Redstone" | null>(null);
  
  const chartDataRef = useRef<ChartDataPoint[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const lastSaveRef = useRef<number>(0);
  
  // Connect to unified oracle prices
  const oracle = useOraclePrices([]);
  
  // Process oracle price updates into chart data points
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const oraclePrice = oracle.getPrice(symbol);
    if (!oraclePrice || oraclePrice.price <= 0) return;
    
    const now = Date.now();
    const newPrice = oraclePrice.price;
    const source = oraclePrice.source;
    
    // Throttle updates to 300ms for smoother chart responsiveness
    if (now - lastUpdateRef.current < 300) return;
    
    // Only add if price changed meaningfully (avoid duplicates)
    if (lastPriceRef.current !== null) {
      const priceDiff = Math.abs(newPrice - lastPriceRef.current) / lastPriceRef.current;
      if (priceDiff < 0.0001) return; // 0.01% threshold - more responsive
    }
    
    lastUpdateRef.current = now;
    const prevPrice = lastPriceRef.current;
    lastPriceRef.current = newPrice;
    
    const newPoint: ChartDataPoint = {
      time: formatTime(new Date(now)),
      price: newPrice,
      volume: 0, // Oracles don't provide volume
      positive: prevPrice !== null ? newPrice >= prevPrice : true,
      source,
    };
    
    // Keep last 100 data points for better chart history
    chartDataRef.current = [...chartDataRef.current.slice(-99), newPoint];
    
    setChartData([...chartDataRef.current]);
    setCurrentSource(source);
    setIsBuilding(chartDataRef.current.length < 3);
    
    // Calculate price change from first to last
    if (chartDataRef.current.length > 1) {
      const firstPrice = chartDataRef.current[0].price;
      const change = ((newPrice - firstPrice) / firstPrice) * 100;
      setPriceChange(change);
    }
    
    // Save to cache every 15 seconds for better persistence
    if (now - lastSaveRef.current > 15000) {
      saveCachedChart(symbol, chartDataRef.current);
      lastSaveRef.current = now;
    }
  }, [oracle.prices, symbol, oracle.getPrice]);
  
  // Load cached data on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const cached = loadCachedChart(symbol);
    if (cached.length > 0) {
      chartDataRef.current = cached;
      setChartData(cached);
      setIsBuilding(cached.length < 5);
      
      if (cached.length > 1) {
        const firstPrice = cached[0].price;
        const lastPrice = cached[cached.length - 1].price;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
        lastPriceRef.current = lastPrice;
      }
    }
    
    return () => {
      mountedRef.current = false;
      // Save on unmount
      if (chartDataRef.current.length > 0) {
        saveCachedChart(symbol, chartDataRef.current);
      }
    };
  }, [symbol]);

  return {
    chartData,
    priceChange,
    isBuilding,
    isLive: oracle.isLive,
    currentSource,
    oracleStatus: {
      pythConnected: oracle.pythConnected,
      diaConnected: oracle.diaConnected,
      redstoneConnected: oracle.redstoneConnected,
      primarySource: oracle.primarySource,
    },
    dataPointCount: chartData.length,
  };
};
