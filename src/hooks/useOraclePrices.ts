import { useState, useEffect, useCallback, useRef } from "react";
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
  const [state, setState] = useState<OracleState>({
    prices: new Map(),
    isLive: false,
    primarySource: "none",
    pythConnected: false,
    chainlinkConnected: false,
  });

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);

  // Connect to both oracles
  const pyth = usePythPrices(symbols);
  const chainlink = useChainlinkPrices(symbols);

  // Merge prices: Pyth takes priority, Chainlink fills gaps
  useEffect(() => {
    if (!isMountedRef.current) return;

    const merged = new Map<string, OraclePriceData>();

    // First add all Chainlink prices as base
    chainlink.prices.forEach((data: ChainlinkPriceData, key: string) => {
      const symbol = key.replace("/USD", "");
      merged.set(symbol, {
        symbol,
        price: data.price,
        lastUpdate: data.updatedAt,
        source: "Chainlink",
      });
    });

    // Override with Pyth prices (higher priority - real-time WebSocket)
    pyth.prices.forEach((data: PythPriceData, key: string) => {
      const symbol = key.replace("/USD", "");
      merged.set(symbol, {
        symbol,
        price: data.price,
        confidence: data.confidence,
        lastUpdate: data.publishTime,
        source: "Pyth",
      });
    });

    pricesRef.current = merged;

    const primarySource = pyth.isConnected ? "Pyth" : chainlink.isConnected ? "Chainlink" : "none";

    setState({
      prices: merged,
      isLive: pyth.isConnected || chainlink.isConnected,
      primarySource,
      pythConnected: pyth.isConnected,
      chainlinkConnected: chainlink.isConnected,
    });
  }, [pyth.prices, pyth.isConnected, chainlink.prices, chainlink.isConnected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const getPrice = useCallback((symbol: string): OraclePriceData | undefined => {
    const normalized = symbol.toUpperCase().replace(/USD$/, "");
    return pricesRef.current.get(normalized);
  }, []);

  return {
    prices: state.prices,
    isLive: state.isLive,
    primarySource: state.primarySource,
    pythConnected: state.pythConnected,
    chainlinkConnected: state.chainlinkConnected,
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
