import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

const MAX_HISTORY_POINTS = 20;
const MIN_UPDATE_INTERVAL = 1500; // 1.5 seconds between history points

// Use same cache as decentralized chart data for consistency
const TICK_CACHE_PREFIX = "zikalyze_ticks_v2_";
const TICK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface RawTick {
  price: number;
  timestamp: number;
  source: string;
}

interface CachedTickData {
  ticks: RawTick[];
  timestamp: number;
}

// Load cached ticks from chart data
const loadCachedTicks = (symbol: string): number[] => {
  try {
    const cached = localStorage.getItem(`${TICK_CACHE_PREFIX}${symbol.toUpperCase()}`);
    if (!cached) return [];
    const data: CachedTickData = JSON.parse(cached);
    if (Date.now() - data.timestamp > TICK_CACHE_TTL) {
      return [];
    }
    // Return last MAX_HISTORY_POINTS prices from cached ticks
    const prices = data.ticks
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_HISTORY_POINTS * 3) // Get more data, then sample
      .map(t => t.price);
    
    // Sample evenly to get MAX_HISTORY_POINTS
    if (prices.length <= MAX_HISTORY_POINTS) return prices;
    
    const step = Math.floor(prices.length / MAX_HISTORY_POINTS);
    const sampled: number[] = [];
    for (let i = 0; i < prices.length; i += step) {
      sampled.push(prices[i]);
      if (sampled.length >= MAX_HISTORY_POINTS) break;
    }
    // Always include the last price
    if (sampled[sampled.length - 1] !== prices[prices.length - 1]) {
      sampled[sampled.length - 1] = prices[prices.length - 1];
    }
    return sampled;
  } catch {
    return [];
  }
};

// Global price history storage
const globalPriceHistory: Map<string, number[]> = new Map();
const lastUpdateTime: Map<string, number> = new Map();
let initialized = false;

export function usePriceHistory(symbols: string[]) {
  const [history, setHistory] = useState<Map<string, number[]>>(new Map());
  const { prices, connected } = useGlobalPriceWebSocket(symbols);
  const symbolsKey = useMemo(() => symbols.join(","), [symbols]);
  
  // Initialize from cache on first load
  useEffect(() => {
    if (!initialized && symbols.length > 0) {
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        if (!globalPriceHistory.has(upperSymbol)) {
          const cached = loadCachedTicks(upperSymbol);
          if (cached.length > 0) {
            globalPriceHistory.set(upperSymbol, cached);
          } else {
            globalPriceHistory.set(upperSymbol, []);
          }
          lastUpdateTime.set(upperSymbol, 0);
        }
      });
      initialized = true;
      setHistory(new Map(globalPriceHistory));
    }
  }, [symbolsKey]);
  
  // Update history when prices change from WebSocket
  useEffect(() => {
    if (!connected || prices.size === 0) return;
    
    const now = Date.now();
    let hasUpdates = false;
    
    prices.forEach((priceData, symbol) => {
      const upperSymbol = symbol.toUpperCase();
      
      // Initialize if needed
      if (!globalPriceHistory.has(upperSymbol)) {
        const cached = loadCachedTicks(upperSymbol);
        globalPriceHistory.set(upperSymbol, cached.length > 0 ? cached : []);
        lastUpdateTime.set(upperSymbol, 0);
      }
      
      const lastUpdate = lastUpdateTime.get(upperSymbol) || 0;
      
      // Only add point if enough time has passed
      if (now - lastUpdate >= MIN_UPDATE_INTERVAL) {
        const historyArray = globalPriceHistory.get(upperSymbol) || [];
        const lastPrice = historyArray[historyArray.length - 1];
        
        // Only add if price changed meaningfully (0.01%)
        if (lastPrice === undefined || Math.abs(priceData.price - lastPrice) / lastPrice > 0.0001) {
          const newHistory = [...historyArray, priceData.price];
          
          // Trim to max points
          if (newHistory.length > MAX_HISTORY_POINTS) {
            newHistory.shift();
          }
          
          globalPriceHistory.set(upperSymbol, newHistory);
          lastUpdateTime.set(upperSymbol, now);
          hasUpdates = true;
        }
      }
    });
    
    if (hasUpdates) {
      setHistory(new Map(globalPriceHistory));
    }
  }, [prices, connected]);
  
  // Reload from cache periodically to get chart data
  useEffect(() => {
    const interval = setInterval(() => {
      let hasUpdates = false;
      
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        const cached = loadCachedTicks(upperSymbol);
        const current = globalPriceHistory.get(upperSymbol) || [];
        
        // If cache has more data, use it
        if (cached.length > current.length) {
          globalPriceHistory.set(upperSymbol, cached);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        setHistory(new Map(globalPriceHistory));
      }
    }, 10000); // Reload cache every 10 seconds
    
    return () => clearInterval(interval);
  }, [symbolsKey]);
  
  const getHistory = useCallback((symbol: string): number[] => {
    return globalPriceHistory.get(symbol.toUpperCase()) || [];
  }, [history]);
  
  return { history, getHistory };
}
