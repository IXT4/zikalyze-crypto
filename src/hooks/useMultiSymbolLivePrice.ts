// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiSymbolLivePrice — Decentralized Oracle-based Multi-Symbol Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth Network Oracle for decentralized real-time price streaming
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
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());
  
  // Connect to decentralized oracles
  const { prices: pythPrices, isConnected: pythConnected } = usePythPrices();
  const { prices: chainlinkPrices, isConnected: chainlinkConnected } = useChainlinkPrices();

  // Update prices from oracles
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    const updatedPrices: Record<string, SymbolPriceData> = { ...state.prices };
    const connectedSymbols: string[] = [];
    
    // Process requested symbols
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      
      // Try Pyth first (primary decentralized source)
      const pythPrice = pythPrices.get(upperSymbol);
      if (pythPrice && pythPrice.price > 0) {
        // Track price history for 24h high/low estimation
        const history = priceHistoryRef.current.get(upperSymbol) || [];
        history.push(pythPrice.price);
        if (history.length > 1440) history.shift(); // Keep ~24h of minute data
        priceHistoryRef.current.set(upperSymbol, history);
        
        const high24h = Math.max(...history);
        const low24h = Math.min(...history);
        
        // Calculate change from oldest price in history
        const oldestPrice = history[0];
        const change24h = oldestPrice > 0 
          ? ((pythPrice.price - oldestPrice) / oldestPrice) * 100 
          : 0;
        
        updatedPrices[upperSymbol] = {
          price: pythPrice.price,
          change24h,
          high24h,
          low24h,
          volume: 0, // Pyth doesn't provide volume
          lastUpdate: now,
          source: 'Pyth Oracle',
        };
        connectedSymbols.push(upperSymbol);
        continue;
      }
      
      // Try Chainlink as fallback
      const chainlinkPrice = chainlinkPrices.get(upperSymbol);
      if (chainlinkPrice && chainlinkPrice.price > 0) {
        const history = priceHistoryRef.current.get(upperSymbol) || [];
        history.push(chainlinkPrice.price);
        if (history.length > 1440) history.shift();
        priceHistoryRef.current.set(upperSymbol, history);
        
        const high24h = Math.max(...history);
        const low24h = Math.min(...history);
        const oldestPrice = history[0];
        const change24h = oldestPrice > 0 
          ? ((chainlinkPrice.price - oldestPrice) / oldestPrice) * 100 
          : 0;
        
        updatedPrices[upperSymbol] = {
          price: chainlinkPrice.price,
          change24h,
          high24h,
          low24h,
          volume: 0,
          lastUpdate: now,
          source: 'Chainlink Oracle',
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
      ? 'Pyth Oracle' 
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
  }, [pythPrices, chainlinkPrices, pythConnected, chainlinkConnected, symbols, fallbackPrices]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
  };
};
