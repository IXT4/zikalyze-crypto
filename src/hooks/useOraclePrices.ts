import { useState, useEffect, useCallback, useRef } from "react";
import { usePythPrices, PythPriceData } from "./usePythPrices";
import { useDIAPrices, DIAPriceData } from "./useDIAPrices";
import { useRedstonePrices, RedstonePriceData } from "./useRedstonePrices";
import { useAPI3Prices, API3PriceData } from "./useAPI3Prices";

// Unified Oracle Price Hook - Pyth SSE Primary, DIA + API3 + Redstone Fallback
// 100% decentralized streaming with no centralized API dependencies
// No CORS issues - all oracles have browser-compatible APIs

export interface OraclePriceData {
  symbol: string;
  price: number;
  confidence?: number;
  lastUpdate: number;
  source: "Pyth" | "DIA" | "API3" | "Redstone";
}

export interface OracleState {
  prices: Map<string, OraclePriceData>;
  isLive: boolean;
  primarySource: "Pyth" | "DIA" | "API3" | "Redstone" | "none";
  pythConnected: boolean;
  diaConnected: boolean;
  api3Connected: boolean;
  redstoneConnected: boolean;
}

export const useOraclePrices = (_symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, OraclePriceData>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [primarySource, setPrimarySource] = useState<"Pyth" | "DIA" | "API3" | "Redstone" | "none">("none");

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef<number>(0);

  // Connect to all decentralized oracles
  const pyth = usePythPrices([]);
  const dia = useDIAPrices();
  const api3 = useAPI3Prices();
  const redstone = useRedstonePrices();

  const lastLogRef = useRef<number>(0);

  // Merge prices - Pyth is primary, DIA + Redstone are fallbacks
  // API3 is optional tertiary but often unavailable
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Balanced throttle for smooth real-time streaming (100ms)
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;

    const merged = new Map<string, OraclePriceData>();
    const sourceCounts = { Pyth: 0, DIA: 0, API3: 0, Redstone: 0 };

    // Add Redstone prices as base (tertiary fallback)
    redstone.prices.forEach((data: RedstonePriceData, key: string) => {
      if (!data || !data.price || data.price <= 0) return;
      const symbol = key.replace("/USD", "").toUpperCase();
      merged.set(symbol, {
        symbol,
        price: data.price,
        lastUpdate: data.timestamp || Date.now(),
        source: "Redstone",
      });
      sourceCounts.Redstone++;
    });

    // Add API3 prices if available (optional)
    api3.prices.forEach((data: API3PriceData, key: string) => {
      if (!data || !data.price || data.price <= 0) return;
      const symbol = key.replace("/USD", "").toUpperCase();
      merged.set(symbol, {
        symbol,
        price: data.price,
        lastUpdate: data.timestamp || Date.now(),
        source: "API3",
      });
      sourceCounts.API3++;
    });

    // Add DIA prices (secondary fallback)
    dia.prices.forEach((data: DIAPriceData, key: string) => {
      if (!data || !data.price || data.price <= 0) return;
      const symbol = key.replace("/USD", "").toUpperCase();
      merged.set(symbol, {
        symbol,
        price: data.price,
        lastUpdate: data.timestamp || Date.now(),
        source: "DIA",
      });
      sourceCounts.DIA++;
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
      sourceCounts.Pyth++;
    });

    pricesRef.current = merged;

    // Log coverage every 30 seconds
    if (now - lastLogRef.current > 30000 && merged.size > 0) {
      lastLogRef.current = now;
      console.log(`[Oracle] Coverage: ${merged.size} tokens | Pyth: ${sourceCounts.Pyth}, DIA: ${sourceCounts.DIA}, Redstone: ${sourceCounts.Redstone}, API3: ${sourceCounts.API3}`);
    }

    const newPrimarySource = pyth.isConnected 
      ? "Pyth" 
      : dia.isConnected 
        ? "DIA" 
        : redstone.isConnected 
          ? "Redstone" 
          : api3.isConnected
            ? "API3"
            : "none";
    const newIsLive = pyth.isConnected || dia.isConnected || redstone.isConnected || api3.isConnected;

    setPrices(new Map(merged));
    setIsLive(newIsLive);
    setPrimarySource(newPrimarySource);
  }, [pyth.prices, pyth.isConnected, dia.prices, dia.isConnected, api3.prices, api3.isConnected, redstone.prices, redstone.isConnected]);

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
    diaConnected: dia.isConnected,
    api3Connected: api3.isConnected,
    redstoneConnected: redstone.isConnected,
    // Legacy compatibility
    chainlinkConnected: dia.isConnected,
    getPrice,
    pythStatus: {
      isConnected: pyth.isConnected,
      isConnecting: pyth.isConnecting,
      error: pyth.error,
    },
    diaStatus: {
      isConnected: dia.isConnected,
      isLoading: dia.isLoading,
      error: dia.error,
    },
    api3Status: {
      isConnected: api3.isConnected,
      isLoading: api3.isLoading,
      error: api3.error,
    },
    redstoneStatus: {
      isConnected: redstone.isConnected,
      isLoading: redstone.isLoading,
      error: redstone.error,
    },
    // Legacy compatibility
    chainlinkStatus: {
      isConnected: dia.isConnected,
      isLoading: dia.isLoading,
      error: dia.error,
    },
  };
};
