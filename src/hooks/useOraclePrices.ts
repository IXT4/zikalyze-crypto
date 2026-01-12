// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 useOraclePrices — Streamlined Decentralized Oracle (Pyth Only)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth Network SSE exclusively - most reliable decentralized source
// DIA and Redstone removed due to CORS/404 errors in browser environment
// WebSocket (price-stream edge function) is primary, Pyth SSE is fallback
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { usePythPrices, PythPriceData } from "./usePythPrices";

export interface OraclePriceData {
  symbol: string;
  price: number;
  confidence?: number;
  lastUpdate: number;
  source: "Pyth" | "WebSocket";
}

export interface OracleState {
  prices: Map<string, OraclePriceData>;
  isLive: boolean;
  primarySource: "Pyth" | "WebSocket" | "none";
  pythConnected: boolean;
  // Legacy compatibility - always false now
  diaConnected: boolean;
  redstoneConnected: boolean;
}

export const useOraclePrices = (_symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, OraclePriceData>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [primarySource, setPrimarySource] = useState<"Pyth" | "WebSocket" | "none">("none");

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef<number>(0);
  const lastLogRef = useRef<number>(0);

  // Connect to Pyth only - most reliable decentralized oracle
  const pyth = usePythPrices([]);

  // Merge Pyth prices only
  useEffect(() => {
    if (!isMountedRef.current) return;

    // Throttle updates for performance (100ms)
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;

    const merged = new Map<string, OraclePriceData>();
    let pythCount = 0;

    // Add Pyth prices (primary decentralized source)
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
      pythCount++;
    });

    pricesRef.current = merged;

    // Log coverage every 30 seconds
    if (now - lastLogRef.current > 30000 && merged.size > 0) {
      lastLogRef.current = now;
      console.log(`[Oracle] Coverage: ${merged.size} tokens | Pyth: ${pythCount}`);
    }

    const newPrimarySource = pyth.isConnected ? "Pyth" : "none";
    const newIsLive = pyth.isConnected;

    setPrices(new Map(merged));
    setIsLive(newIsLive);
    setPrimarySource(newPrimarySource);
  }, [pyth.prices, pyth.isConnected]);

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
    // Legacy compatibility - DIA/Redstone removed
    diaConnected: false,
    redstoneConnected: false,
    chainlinkConnected: false,
    getPrice,
    pythStatus: {
      isConnected: pyth.isConnected,
      isConnecting: pyth.isConnecting,
      error: pyth.error,
    },
    // Legacy compatibility stubs
    diaStatus: {
      isConnected: false,
      isLoading: false,
      error: null,
    },
    redstoneStatus: {
      isConnected: false,
      isLoading: false,
      error: null,
    },
    chainlinkStatus: {
      isConnected: false,
      isLoading: false,
      error: null,
    },
  };
};
