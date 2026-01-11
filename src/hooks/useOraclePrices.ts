import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePythPrices, PythPriceData } from "./usePythPrices";
import { useChainlinkPrices, ChainlinkPriceData } from "./useChainlinkPrices";

// Unified Oracle Price Hook - Pyth Primary, Chainlink Fallback
// Pure decentralized streaming with no centralized API dependencies

export interface OraclePriceData {
  symbol: string;
  price: number;
  confidence?: number;
  lastUpdate: number;
  source: "Pyth" | "Chainlink";
}

export interface OracleState {
  prices: Map<string, OraclePriceData>;
  isLive: boolean;
  primarySource: "Pyth" | "Chainlink" | "none";
  pythConnected: boolean;
  chainlinkConnected: boolean;
}

export const useOraclePrices = (symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, OraclePriceData>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [primarySource, setPrimarySource] = useState<"Pyth" | "Chainlink" | "none">("none");

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to both oracles - memoize symbols to prevent unnecessary re-renders
  const memoizedSymbols = useMemo(() => symbols, [symbols.join(',')]);
  const pyth = usePythPrices(memoizedSymbols);
  const chainlink = useChainlinkPrices(memoizedSymbols);

  // Merge prices - Pyth is primary, Chainlink is fallback
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Clear pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Fast debounce for smooth updates
    updateTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const merged = new Map<string, OraclePriceData>();

      // Add Chainlink prices as base (fallback)
      chainlink.prices.forEach((data: ChainlinkPriceData, key: string) => {
        if (!data || !data.price || data.price <= 0) return;
        const symbol = key.replace("/USD", "").toUpperCase();
        merged.set(symbol, {
          symbol,
          price: data.price,
          lastUpdate: data.updatedAt || Date.now(),
          source: "Chainlink",
        });
      });

      // Override with Pyth prices (primary - real-time SSE)
      pyth.prices.forEach((data: PythPriceData, key: string) => {
        if (!data || !data.price || data.price <= 0) return;
        const symbol = key.replace("/USD", "").toUpperCase();
        merged.set(symbol, {
          symbol,
          price: data.price,
          confidence: data.confidence,
          lastUpdate: data.publishTime || Date.now(),
          source: "Pyth",
        });
      });

      pricesRef.current = merged;

      const newPrimarySource = pyth.isConnected ? "Pyth" : chainlink.isConnected ? "Chainlink" : "none";
      const newIsLive = pyth.isConnected || chainlink.isConnected;

      setPrices(new Map(merged));
      setIsLive(newIsLive);
      setPrimarySource(newPrimarySource);
    }, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [pyth.prices, pyth.isConnected, chainlink.prices, chainlink.isConnected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const getPrice = useCallback((symbol: string): OraclePriceData | undefined => {
    const normalized = symbol.toUpperCase().replace(/USD$/, "");
    return pricesRef.current.get(normalized);
  }, []);

  return {
    prices,
    isLive,
    primarySource,
    pythConnected: pyth.isConnected,
    chainlinkConnected: chainlink.isConnected,
    getPrice,
    pythStatus: {
      isConnected: pyth.isConnected,
      isConnecting: pyth.isConnecting,
      error: pyth.error,
    },
    chainlinkStatus: {
      isConnected: chainlink.isConnected,
      isLoading: chainlink.isLoading,
      error: chainlink.error,
    },
  };
};
