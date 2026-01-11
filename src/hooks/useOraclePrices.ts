import { useState, useEffect, useCallback, useRef } from "react";
import { usePythPrices, PythPriceData } from "./usePythPrices";
import { useChainlinkPrices, ChainlinkPriceData } from "./useChainlinkPrices";

// Unified Oracle Price Hook - Pyth WebSocket Primary, Chainlink Fallback
// 100% decentralized streaming with no centralized API dependencies

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

export const useOraclePrices = (_symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, OraclePriceData>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [primarySource, setPrimarySource] = useState<"Pyth" | "Chainlink" | "none">("none");

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef<number>(0);

  // Connect to both oracles - Pyth WebSocket is primary
  const pyth = usePythPrices([]);
  const chainlink = useChainlinkPrices([]);

  // Merge prices - Pyth is primary, Chainlink is fallback
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Throttle updates to 150ms for smooth UI
    const now = Date.now();
    if (now - lastUpdateRef.current < 150) return;
    lastUpdateRef.current = now;

    const merged = new Map<string, OraclePriceData>();

    // Add Chainlink prices as base (fallback - one-time fetch)
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

    // Override with Pyth prices (primary - real-time WebSocket)
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
  }, [pyth.prices, pyth.isConnected, chainlink.prices, chainlink.isConnected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false;
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
