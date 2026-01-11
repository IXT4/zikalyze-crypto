// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiSymbolLivePrice — Decentralized Oracle-based Multi-Symbol Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth Network SSE for decentralized real-time price streaming (~400ms updates)
// with Chainlink as fallback and local 24h tracking for price changes
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";
import { useChainlinkPrices } from "./useChainlinkPrices";

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
const HISTORY_CACHE_KEY = "zikalyze_price_history_v1";
const HISTORY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface PriceHistoryEntry {
  price: number;
  timestamp: number;
}

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

export const useMultiSymbolLivePrice = (
  symbols: string[],
  fallbackPrices?: Record<string, { price: number; change24h: number }>
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
  const lastHistorySaveRef = useRef(0);
  
  // Connect to decentralized oracles
  const { prices: pythPrices, isConnected: pythConnected, lastUpdateTime: pythLastUpdate } = usePythPrices();
  const { prices: chainlinkPrices, isConnected: chainlinkConnected } = useChainlinkPrices();

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

  // Calculate 24h stats from history
  const get24hStats = useCallback((symbol: string, currentPrice: number) => {
    const history = priceHistoryRef.current.get(symbol) || [];
    
    if (history.length === 0) {
      return { change24h: 0, high24h: currentPrice, low24h: currentPrice };
    }

    // Find price from ~24h ago
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
    const change24h = oldestRelevantPrice > 0 
      ? ((currentPrice - oldestRelevantPrice) / oldestRelevantPrice) * 100 
      : 0;

    return { change24h, high24h, low24h };
  }, []);

  // Update prices from oracles
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    const updatedPrices: Record<string, SymbolPriceData> = {};
    const connectedSymbols: string[] = [];
    
    // Process requested symbols
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      const pythKey = `${upperSymbol}/USD`;

      // Try Pyth first (primary decentralized source with SSE streaming)
      const pythPrice = pythPrices.get(pythKey);
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

      // Try Chainlink as fallback
      const chainlinkPrice = chainlinkPrices.get(pythKey);
      if (chainlinkPrice && chainlinkPrice.price > 0) {
        addToHistory(upperSymbol, chainlinkPrice.price);
        const stats = get24hStats(upperSymbol, chainlinkPrice.price);

        updatedPrices[upperSymbol] = {
          price: chainlinkPrice.price,
          change24h: stats.change24h,
          high24h: stats.high24h,
          low24h: stats.low24h,
          volume: 0,
          lastUpdate: chainlinkPrice.updatedAt || now,
          source: "Chainlink Oracle",
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }
      
      // Use fallback if available
      if (fallbackPrices?.[upperSymbol]) {
        updatedPrices[upperSymbol] = {
          price: fallbackPrices[upperSymbol].price,
          change24h: fallbackPrices[upperSymbol].change24h,
          high24h: 0,
          low24h: 0,
          volume: 0,
          lastUpdate: now,
          source: 'Cached',
        };
      }
    }
    
    const isLive = pythConnected || chainlinkConnected;
    const primarySource = pythConnected 
      ? 'Pyth Oracle (SSE)' 
      : chainlinkConnected 
        ? 'Chainlink Oracle' 
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
  }, [pythPrices, chainlinkPrices, pythConnected, chainlinkConnected, symbols, fallbackPrices, addToHistory, get24hStats]);

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
    // No-op: Pyth/Chainlink stream all supported symbols
  }, []);

  const unsubscribe = useCallback((_removeSymbols: string[]) => {
    // No-op: Pyth/Chainlink stream all supported symbols
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
    chainlinkConnected,
    pythLastUpdate,
  };
};
