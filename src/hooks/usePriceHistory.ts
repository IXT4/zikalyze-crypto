import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

const MAX_HISTORY_POINTS = 20;
const MIN_UPDATE_INTERVAL = 1000; // 1 second between history points

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

// Load cached ticks from chart data and sample for sparkline
const loadCachedTicks = (symbol: string): number[] => {
  try {
    const cached = localStorage.getItem(`${TICK_CACHE_PREFIX}${symbol.toUpperCase()}`);
    if (!cached) return [];
    
    const data: CachedTickData = JSON.parse(cached);
    if (Date.now() - data.timestamp > TICK_CACHE_TTL) {
      return [];
    }
    
    // Sort and get recent prices
    const sortedTicks = data.ticks
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-100); // Get last 100 ticks
    
    if (sortedTicks.length === 0) return [];
    
    const prices = sortedTicks.map(t => t.price);
    
    // Sample evenly to get MAX_HISTORY_POINTS
    if (prices.length <= MAX_HISTORY_POINTS) return prices;
    
    const step = Math.max(1, Math.floor(prices.length / MAX_HISTORY_POINTS));
    const sampled: number[] = [];
    
    for (let i = 0; i < prices.length; i += step) {
      sampled.push(prices[i]);
      if (sampled.length >= MAX_HISTORY_POINTS - 1) break;
    }
    
    // Always include the last price for accuracy
    sampled.push(prices[prices.length - 1]);
    
    return sampled;
  } catch {
    return [];
  }
};

// Global singleton for price history across all components
class PriceHistoryManager {
  private history: Map<string, number[]> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  private listeners: Set<() => void> = new Set();
  private initialized: Set<string> = new Set();
  
  getHistory(symbol: string): number[] {
    const upperSymbol = symbol.toUpperCase();
    
    // Initialize from cache if not done
    if (!this.initialized.has(upperSymbol)) {
      this.initialized.add(upperSymbol);
      const cached = loadCachedTicks(upperSymbol);
      if (cached.length > 0) {
        this.history.set(upperSymbol, cached);
      }
    }
    
    return this.history.get(upperSymbol) || [];
  }
  
  updatePrice(symbol: string, price: number): boolean {
    const upperSymbol = symbol.toUpperCase();
    const now = Date.now();
    const lastUpdate = this.lastUpdate.get(upperSymbol) || 0;
    
    // Throttle updates
    if (now - lastUpdate < MIN_UPDATE_INTERVAL) return false;
    
    // Initialize if needed
    if (!this.initialized.has(upperSymbol)) {
      this.initialized.add(upperSymbol);
      const cached = loadCachedTicks(upperSymbol);
      this.history.set(upperSymbol, cached.length > 0 ? cached : []);
    }
    
    const current = this.history.get(upperSymbol) || [];
    const lastPrice = current[current.length - 1];
    
    // Only add if price changed meaningfully (0.005%)
    if (lastPrice !== undefined && Math.abs(price - lastPrice) / lastPrice < 0.00005) {
      return false;
    }
    
    const newHistory = [...current, price];
    if (newHistory.length > MAX_HISTORY_POINTS) {
      newHistory.shift();
    }
    
    this.history.set(upperSymbol, newHistory);
    this.lastUpdate.set(upperSymbol, now);
    this.notifyListeners();
    
    return true;
  }
  
  refreshFromCache(symbols: string[]) {
    let hasChanges = false;
    
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      const cached = loadCachedTicks(upperSymbol);
      const current = this.history.get(upperSymbol) || [];
      
      // Use cache if it has more/newer data
      if (cached.length > current.length) {
        this.history.set(upperSymbol, cached);
        this.initialized.add(upperSymbol);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.notifyListeners();
    }
  }
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
  
  getAllHistory(): Map<string, number[]> {
    return new Map(this.history);
  }
}

// Singleton instance
const priceHistoryManager = new PriceHistoryManager();

export function usePriceHistory(symbols: string[]) {
  const [version, setVersion] = useState(0);
  const { prices, connected } = useGlobalPriceWebSocket(symbols);
  const symbolsKey = useMemo(() => symbols.map(s => s.toUpperCase()).join(","), [symbols]);
  const mountedRef = useRef(true);
  
  // Subscribe to manager updates
  useEffect(() => {
    mountedRef.current = true;
    
    const unsubscribe = priceHistoryManager.subscribe(() => {
      if (mountedRef.current) {
        setVersion(v => v + 1);
      }
    });
    
    // Initial load from cache
    priceHistoryManager.refreshFromCache(symbols);
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [symbolsKey]);
  
  // Process WebSocket price updates
  useEffect(() => {
    if (!connected || prices.size === 0) return;
    
    prices.forEach((priceData, symbol) => {
      priceHistoryManager.updatePrice(symbol, priceData.price);
    });
  }, [prices, connected]);
  
  // Periodically refresh from chart cache
  useEffect(() => {
    const interval = setInterval(() => {
      priceHistoryManager.refreshFromCache(symbols);
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [symbolsKey]);
  
  const getHistory = useCallback((symbol: string): number[] => {
    return priceHistoryManager.getHistory(symbol);
  }, [version]);
  
  const history = useMemo(() => {
    return priceHistoryManager.getAllHistory();
  }, [version]);
  
  return { history, getHistory };
}
