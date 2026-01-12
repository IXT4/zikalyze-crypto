// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiSymbolLivePrice — WebSocket + Pyth SSE Multi-Symbol Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Uses the global WebSocket (price-stream) as primary data source
// Falls back to Pyth Network SSE for decentralized real-time streaming
// DIA/Redstone removed due to persistent API errors
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

interface SymbolPriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  lastUpdate: number;
  source: string;
}

interface MultiPriceState {
  prices: Record<string, SymbolPriceData>;
  isLive: boolean;
  isConnecting: boolean;
  source: string;
  connectedSymbols: string[];
}

// Cache for 24h price history (persisted for accurate change calculation)
const HISTORY_CACHE_KEY = "zikalyze_price_history_v2";
const HISTORY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cache for API-sourced 24h data (from CoinGecko metadata)
const API_24H_CACHE_KEY = "zikalyze_api_24h_data_v1";
const API_24H_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface PriceHistoryEntry {
  price: number;
  timestamp: number;
}

interface API24hData {
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

// Load API-sourced 24h data
const loadAPI24hData = (): Map<string, API24hData> => {
  try {
    const cached = localStorage.getItem(API_24H_CACHE_KEY);
    if (!cached) return new Map();
    const data = JSON.parse(cached);
    const now = Date.now();
    const result = new Map<string, API24hData>();
    Object.entries(data).forEach(([symbol, entry]) => {
      const typedEntry = entry as API24hData;
      if (now - typedEntry.timestamp < API_24H_CACHE_TTL) {
        result.set(symbol, typedEntry);
      }
    });
    return result;
  } catch {
    return new Map();
  }
};

const saveAPI24hData = (data: Map<string, API24hData>) => {
  try {
    localStorage.setItem(API_24H_CACHE_KEY, JSON.stringify(Object.fromEntries(data)));
  } catch {}
};

const loadPriceHistory = (): Map<string, PriceHistoryEntry[]> => {
  try {
    const cached = localStorage.getItem(HISTORY_CACHE_KEY);
    if (!cached) return new Map();
    const data = JSON.parse(cached);
    const now = Date.now();
    const cleaned: Record<string, PriceHistoryEntry[]> = {};
    Object.entries(data).forEach(([symbol, entries]) => {
      const validEntries = (entries as PriceHistoryEntry[]).filter(
        e => now - e.timestamp < HISTORY_DURATION
      );
      if (validEntries.length > 0) {
        cleaned[symbol] = validEntries;
      }
    });
    return new Map(Object.entries(cleaned));
  } catch {
    return new Map();
  }
};

const savePriceHistory = (history: Map<string, PriceHistoryEntry[]>) => {
  try {
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(Object.fromEntries(history)));
  } catch {}
};

// Validate 24h change is reasonable
const isValidChange24h = (change: number): boolean => {
  return !isNaN(change) && isFinite(change) && change > -99 && change < 1000;
};

export const useMultiSymbolLivePrice = (
  symbols: string[],
  fallbackPrices?: Record<string, { price: number; change24h: number; high24h?: number; low24h?: number }>
) => {
  const [state, setState] = useState<MultiPriceState>({
    prices: {},
    isLive: false,
    isConnecting: true,
    source: 'initializing',
    connectedSymbols: [],
  });

  const isMountedRef = useRef(true);
  const priceHistoryRef = useRef<Map<string, PriceHistoryEntry[]>>(loadPriceHistory());
  const api24hDataRef = useRef<Map<string, API24hData>>(loadAPI24hData());
  const lastHistorySaveRef = useRef(0);
  
  // Primary: WebSocket stream from price-stream edge function
  const { 
    prices: wsPrices, 
    connected: wsConnected,
    getPrice: wsGetPrice,
  } = useGlobalPriceWebSocket(symbols);
  
  // Fallback: Pyth SSE (decentralized oracle)
  const { 
    prices: pythPrices, 
    isConnected: pythConnected, 
    lastUpdateTime: pythLastUpdate 
  } = usePythPrices();

  // Update API 24h data from fallback prices
  useEffect(() => {
    if (!fallbackPrices) return;
    const now = Date.now();
    let hasUpdates = false;
    
    Object.entries(fallbackPrices).forEach(([symbol, data]) => {
      if (data.change24h !== undefined && isValidChange24h(data.change24h)) {
        api24hDataRef.current.set(symbol.toUpperCase(), {
          change24h: data.change24h,
          high24h: data.high24h || 0,
          low24h: data.low24h || 0,
          timestamp: now,
        });
        hasUpdates = true;
      }
    });
    
    if (hasUpdates) {
      saveAPI24hData(api24hDataRef.current);
    }
  }, [fallbackPrices]);

  // Add price to history
  const addToHistory = useCallback((symbol: string, price: number) => {
    const now = Date.now();
    const history = priceHistoryRef.current.get(symbol) || [];
    
    const lastEntry = history[history.length - 1];
    if (!lastEntry || now - lastEntry.timestamp > 60000) {
      history.push({ price, timestamp: now });
      
      while (history.length > 1440) {
        history.shift();
      }
      while (history.length > 0 && now - history[0].timestamp > HISTORY_DURATION) {
        history.shift();
      }
      
      priceHistoryRef.current.set(symbol, history);
    }
  }, []);

  // Calculate 24h stats
  const get24hStats = useCallback((symbol: string, currentPrice: number) => {
    const upperSymbol = symbol.toUpperCase();
    
    // PRIORITY 1: API-sourced 24h data
    const apiData = api24hDataRef.current.get(upperSymbol);
    if (apiData && isValidChange24h(apiData.change24h)) {
      const history = priceHistoryRef.current.get(upperSymbol) || [];
      const historicalPrices = history.map(h => h.price);
      
      let high24h = apiData.high24h || currentPrice;
      let low24h = apiData.low24h || currentPrice;
      
      if (historicalPrices.length > 0) {
        high24h = Math.max(high24h, ...historicalPrices, currentPrice);
        low24h = Math.min(low24h, ...historicalPrices, currentPrice);
      } else {
        high24h = Math.max(high24h, currentPrice);
        low24h = Math.min(low24h, currentPrice);
      }
      
      return { change24h: apiData.change24h, high24h, low24h, source: 'API' };
    }
    
    // PRIORITY 2: Local price history
    const history = priceHistoryRef.current.get(upperSymbol) || [];
    
    if (history.length > 0) {
      const now = Date.now();
      const target24hAgo = now - HISTORY_DURATION;
      let oldestRelevantPrice = history[0].price;
      
      for (const entry of history) {
        if (entry.timestamp >= target24hAgo) {
          oldestRelevantPrice = entry.price;
          break;
        }
      }

      const allPrices = [...history.map(h => h.price), currentPrice];
      const high24h = Math.max(...allPrices);
      const low24h = Math.min(...allPrices);
      const calculatedChange = oldestRelevantPrice > 0 
        ? ((currentPrice - oldestRelevantPrice) / oldestRelevantPrice) * 100 
        : 0;

      if (isValidChange24h(calculatedChange)) {
        return { change24h: calculatedChange, high24h, low24h, source: 'History' };
      }
    }
    
    // PRIORITY 3: Fallback data
    const fallback = fallbackPrices?.[upperSymbol];
    if (fallback && isValidChange24h(fallback.change24h)) {
      return { 
        change24h: fallback.change24h, 
        high24h: fallback.high24h || currentPrice, 
        low24h: fallback.low24h || currentPrice,
        source: 'Fallback'
      };
    }

    return { change24h: 0, high24h: currentPrice, low24h: currentPrice, source: 'None' };
  }, [fallbackPrices]);

  // Update prices from WebSocket + Pyth
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    const updatedPrices: Record<string, SymbolPriceData> = {};
    const connectedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      const oracleKey = `${upperSymbol}/USD`;

      // PRIORITY 1: WebSocket stream (real-time from price-stream)
      const wsPrice = wsGetPrice(upperSymbol);
      if (wsPrice && wsPrice.price > 0) {
        addToHistory(upperSymbol, wsPrice.price);
        const stats = get24hStats(upperSymbol, wsPrice.price);

        updatedPrices[upperSymbol] = {
          price: wsPrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: 0,
          lastUpdate: wsPrice.timestamp || now,
          source: `WebSocket (${wsPrice.source || 'Pyth'})`,
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }

      // PRIORITY 2: Pyth SSE fallback
      const pythPrice = pythPrices.get(oracleKey);
      if (pythPrice && pythPrice.price > 0) {
        addToHistory(upperSymbol, pythPrice.price);
        const stats = get24hStats(upperSymbol, pythPrice.price);

        updatedPrices[upperSymbol] = {
          price: pythPrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: 0,
          lastUpdate: pythPrice.publishTime || now,
          source: "Pyth Oracle",
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }
      
      // PRIORITY 3: Cached fallback
      if (fallbackPrices?.[upperSymbol]) {
        const fb = fallbackPrices[upperSymbol];
        updatedPrices[upperSymbol] = {
          price: fb.price,
          change24h: isValidChange24h(fb.change24h) ? fb.change24h : 0,
          high24h: fb.high24h || fb.price,
          low24h: fb.low24h || fb.price,
          volume: 0,
          lastUpdate: now,
          source: 'Cached',
        };
      }
    }
    
    const isLive = wsConnected || pythConnected;
    const primarySource = wsConnected 
      ? 'WebSocket (Pyth + DeFiLlama)' 
      : pythConnected 
        ? 'Pyth Oracle (SSE)' 
        : 'Cached';
    
    setState({
      prices: updatedPrices,
      isLive,
      isConnecting: !isLive && connectedSymbols.length === 0,
      source: primarySource,
      connectedSymbols,
    });

    // Save history every 30 seconds
    if (now - lastHistorySaveRef.current > 30000) {
      savePriceHistory(priceHistoryRef.current);
      lastHistorySaveRef.current = now;
    }
  }, [wsPrices, pythPrices, wsConnected, pythConnected, symbols, fallbackPrices, addToHistory, get24hStats, wsGetPrice]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      savePriceHistory(priceHistoryRef.current);
    };
  }, []);

  const subscribe = useCallback((_newSymbols: string[]) => {}, []);
  const unsubscribe = useCallback((_removeSymbols: string[]) => {}, []);

  const getPrice = useCallback((symbol: string): SymbolPriceData | null => {
    return state.prices[symbol.toUpperCase()] || null;
  }, [state.prices]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    getPrice,
    // Status
    pythConnected,
    wsConnected,
    pythLastUpdate,
    // Legacy compatibility stubs
    diaConnected: false,
    redstoneConnected: false,
    chainlinkConnected: false,
  };
};
