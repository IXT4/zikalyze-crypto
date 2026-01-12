import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

const MAX_HISTORY_POINTS = 20;
const MIN_UPDATE_INTERVAL = 1000;

const TICK_CACHE_PREFIX = "zikalyze_ticks_v2_";
const TICK_CACHE_TTL = 24 * 60 * 60 * 1000;

interface RawTick {
  price: number;
  timestamp: number;
  source: string;
}

interface CachedTickData {
  ticks: RawTick[];
  timestamp: number;
}

const loadCachedTicks = (symbol: string): number[] => {
  try {
    const cached = localStorage.getItem(`${TICK_CACHE_PREFIX}${symbol.toUpperCase()}`);
    if (!cached) return [];
    
    const data: CachedTickData = JSON.parse(cached);
    if (Date.now() - data.timestamp > TICK_CACHE_TTL) return [];
    
    const sortedTicks = data.ticks
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100);
    
    if (sortedTicks.length === 0) return [];
    
    const prices = sortedTicks.map(t => t.price);
    if (prices.length <= MAX_HISTORY_POINTS) return prices;
    
    const step = Math.max(1, Math.floor(prices.length / MAX_HISTORY_POINTS));
    const sampled: number[] = [];
    
    for (let i = 0; i < prices.length; i += step) {
      sampled.push(prices[i]);
      if (sampled.length >= MAX_HISTORY_POINTS - 1) break;
    }
    
    sampled.push(prices[prices.length - 1]);
    return sampled;
  } catch {
    return [];
  }
};

// Global storage
const globalHistory = new Map<string, number[]>();
const globalLastUpdate = new Map<string, number>();

export function usePriceHistory(symbols: string[]) {
  const [history, setHistory] = useState<Map<string, number[]>>(() => new Map());
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  
  // Memoize symbols key to prevent unnecessary re-renders
  const symbolsKey = useMemo(() => symbols.map(s => s.toUpperCase()).join(","), [symbols]);
  
  // Get WebSocket data
  const { prices, connected } = useGlobalPriceWebSocket(symbols);
  
  // Initialize from cache on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (!initializedRef.current && symbols.length > 0) {
      initializedRef.current = true;
      
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        if (!globalHistory.has(upperSymbol)) {
          const cached = loadCachedTicks(upperSymbol);
          globalHistory.set(upperSymbol, cached);
          globalLastUpdate.set(upperSymbol, 0);
        }
      });
      
      setHistory(new Map(globalHistory));
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [symbolsKey]);
  
  // Process WebSocket updates
  useEffect(() => {
    if (!connected || prices.size === 0 || !mountedRef.current) return;
    
    const now = Date.now();
    let hasUpdates = false;
    
    prices.forEach((priceData, symbol) => {
      const upperSymbol = symbol.toUpperCase();
      const lastUpdate = globalLastUpdate.get(upperSymbol) || 0;
      
      if (now - lastUpdate < MIN_UPDATE_INTERVAL) return;
      
      if (!globalHistory.has(upperSymbol)) {
        const cached = loadCachedTicks(upperSymbol);
        globalHistory.set(upperSymbol, cached);
      }
      
      const current = globalHistory.get(upperSymbol) || [];
      const lastPrice = current[current.length - 1];
      
      if (lastPrice === undefined || Math.abs(priceData.price - lastPrice) / lastPrice > 0.0001) {
        const newHistory = [...current, priceData.price];
        if (newHistory.length > MAX_HISTORY_POINTS) {
          newHistory.shift();
        }
        
        globalHistory.set(upperSymbol, newHistory);
        globalLastUpdate.set(upperSymbol, now);
        hasUpdates = true;
      }
    });
    
    if (hasUpdates && mountedRef.current) {
      setHistory(new Map(globalHistory));
    }
  }, [prices, connected]);
  
  // Periodic cache refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      
      let hasUpdates = false;
      
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        const cached = loadCachedTicks(upperSymbol);
        const current = globalHistory.get(upperSymbol) || [];
        
        if (cached.length > current.length) {
          globalHistory.set(upperSymbol, cached);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates && mountedRef.current) {
        setHistory(new Map(globalHistory));
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [symbolsKey]);
  
  const getHistory = useCallback((symbol: string): number[] => {
    return globalHistory.get(symbol.toUpperCase()) || [];
  }, [history]);
  
  return { history, getHistory };
}
