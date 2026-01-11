// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiSymbolLivePrice — Decentralized Oracle-based Multi-Symbol Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth Network SSE for decentralized real-time price streaming (~400ms updates)
// with DIA and Redstone as fallbacks (all CORS-friendly, no blocked requests)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";
import { useDIAPrices } from "./useDIAPrices";
import { useRedstonePrices } from "./useRedstonePrices";

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
const API_24H_CACHE_TTL = 10 * 60 * 1000; // 10 minutes (CoinGecko refresh rate)

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
      // Only use if not stale (10 minutes)
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
    // Clean old entries
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

// Validate 24h change is reasonable (prevent anomalies)
const isValidChange24h = (change: number): boolean => {
  // Allow -99% to +1000% (reasonable crypto ranges)
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
  
  // Connect to decentralized oracles (all CORS-friendly)
  const { prices: pythPrices, isConnected: pythConnected, lastUpdateTime: pythLastUpdate } = usePythPrices();
  const { prices: diaPrices, isConnected: diaConnected, lastUpdateTime: diaLastUpdate } = useDIAPrices();
  const { prices: redstonePrices, isConnected: redstoneConnected, lastUpdateTime: redstoneLastUpdate } = useRedstonePrices();

  // Update API 24h data from fallback prices (CoinGecko metadata)
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

  // Add price to history (sample every minute to avoid storage bloat)
  const addToHistory = useCallback((symbol: string, price: number) => {
    const now = Date.now();
    const history = priceHistoryRef.current.get(symbol) || [];
    
    // Only add if different from last entry or 1 minute passed
    const lastEntry = history[history.length - 1];
    if (!lastEntry || now - lastEntry.timestamp > 60000) {
      history.push({ price, timestamp: now });
      
      // Keep only last 24 hours, max 1440 entries (1 per minute)
      while (history.length > 1440) {
        history.shift();
      }
      // Remove entries older than 24h
      while (history.length > 0 && now - history[0].timestamp > HISTORY_DURATION) {
        history.shift();
      }
      
      priceHistoryRef.current.set(symbol, history);
    }
  }, []);

  // Calculate 24h stats - PRIORITY: API data > local history > fallback
  const get24hStats = useCallback((symbol: string, currentPrice: number) => {
    const upperSymbol = symbol.toUpperCase();
    
    // PRIORITY 1: Use API-sourced 24h data (from CoinGecko) if available and fresh
    const apiData = api24hDataRef.current.get(upperSymbol);
    if (apiData && isValidChange24h(apiData.change24h)) {
      // Calculate dynamic high/low that includes current price
      const history = priceHistoryRef.current.get(upperSymbol) || [];
      const historicalPrices = history.map(h => h.price);
      
      // Use API high/low as base, but update if current price exceeds
      let high24h = apiData.high24h || currentPrice;
      let low24h = apiData.low24h || currentPrice;
      
      if (historicalPrices.length > 0) {
        high24h = Math.max(high24h, ...historicalPrices, currentPrice);
        low24h = Math.min(low24h, ...historicalPrices, currentPrice);
      } else {
        high24h = Math.max(high24h, currentPrice);
        low24h = Math.min(low24h, currentPrice);
      }
      
      return { 
        change24h: apiData.change24h, 
        high24h, 
        low24h,
        source: 'API'
      };
    }
    
    // PRIORITY 2: Calculate from local price history
    const history = priceHistoryRef.current.get(upperSymbol) || [];
    
    if (history.length > 0) {
      const now = Date.now();
      const target24hAgo = now - HISTORY_DURATION;
      let oldestRelevantPrice = history[0].price;
      
      // Find the entry closest to 24h ago
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

      // Only use local calculation if it's valid
      if (isValidChange24h(calculatedChange)) {
        return { 
          change24h: calculatedChange, 
          high24h, 
          low24h,
          source: 'History'
        };
      }
    }
    
    // PRIORITY 3: Use fallback data if provided
    const fallback = fallbackPrices?.[upperSymbol];
    if (fallback && isValidChange24h(fallback.change24h)) {
      return { 
        change24h: fallback.change24h, 
        high24h: fallback.high24h || currentPrice, 
        low24h: fallback.low24h || currentPrice,
        source: 'Fallback'
      };
    }

    // Default: return zeros (insufficient data)
    return { 
      change24h: 0, 
      high24h: currentPrice, 
      low24h: currentPrice,
      source: 'None'
    };
  }, [fallbackPrices]);

  // Update prices from oracles
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    const updatedPrices: Record<string, SymbolPriceData> = {};
    const connectedSymbols: string[] = [];
    
    // Process requested symbols
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      const oracleKey = `${upperSymbol}/USD`;

      // Try Pyth first (primary decentralized source with SSE streaming)
      const pythPrice = pythPrices.get(oracleKey);
      if (pythPrice && pythPrice.price > 0) {
        // Add to history for 24h tracking
        addToHistory(upperSymbol, pythPrice.price);
        const stats = get24hStats(upperSymbol, pythPrice.price);

        updatedPrices[upperSymbol] = {
          price: pythPrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: 0, // Pyth doesn't provide volume
          lastUpdate: pythPrice.publishTime || now,
          source: "Pyth Oracle",
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }

      // Try DIA as second fallback (CORS-friendly REST API)
      const diaPrice = diaPrices.get(oracleKey);
      if (diaPrice && diaPrice.price > 0) {
        addToHistory(upperSymbol, diaPrice.price);
        const stats = get24hStats(upperSymbol, diaPrice.price);

        updatedPrices[upperSymbol] = {
          price: diaPrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: diaPrice.volume24h || 0,
          lastUpdate: diaPrice.timestamp || now,
          source: "DIA Oracle",
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }

      // Try Redstone as third fallback (CORS-friendly REST API)
      const redstonePrice = redstonePrices.get(oracleKey);
      if (redstonePrice && redstonePrice.price > 0) {
        addToHistory(upperSymbol, redstonePrice.price);
        const stats = get24hStats(upperSymbol, redstonePrice.price);

        updatedPrices[upperSymbol] = {
          price: redstonePrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: 0,
          lastUpdate: redstonePrice.timestamp || now,
          source: "Redstone Oracle",
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }
      
      // Use fallback if available (with proper 24h data)
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
    
    const isLive = pythConnected || diaConnected || redstoneConnected;
    const primarySource = pythConnected 
      ? 'Pyth Oracle (SSE)' 
      : diaConnected 
        ? 'DIA Oracle' 
        : redstoneConnected
          ? 'Redstone Oracle'
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
  }, [pythPrices, diaPrices, redstonePrices, pythConnected, diaConnected, redstoneConnected, symbols, fallbackPrices, addToHistory, get24hStats]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Save history on unmount
      savePriceHistory(priceHistoryRef.current);
    };
  }, []);

  // Subscribe/unsubscribe are no-ops since oracles stream all supported symbols
  const subscribe = useCallback((_newSymbols: string[]) => {
    // No-op: All oracles stream all supported symbols
  }, []);

  const unsubscribe = useCallback((_removeSymbols: string[]) => {
    // No-op: All oracles stream all supported symbols
  }, []);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string): SymbolPriceData | null => {
    return state.prices[symbol.toUpperCase()] || null;
  }, [state.prices]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    getPrice,
    // Oracle status
    pythConnected,
    diaConnected,
    redstoneConnected,
    pythLastUpdate,
    // Legacy compatibility
    chainlinkConnected: diaConnected,
  };
};
