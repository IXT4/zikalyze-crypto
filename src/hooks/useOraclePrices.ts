// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 useOraclePrices — WebSocket-Powered Oracle Prices
// ═══════════════════════════════════════════════════════════════════════════════
// Uses the global WebSocket (price-stream edge function) for all oracle data
// The edge function fetches from Pyth, CoinGecko, and DeFiLlama
// No direct Pyth SSE connection needed - reduces connection overhead
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

export interface OraclePriceData {
  symbol: string;
  price: number;
  confidence?: number;
  lastUpdate: number;
  source: "Pyth" | "WebSocket" | "CoinGecko" | "DeFiLlama";
}

export interface OracleState {
  prices: Map<string, OraclePriceData>;
  isLive: boolean;
  primarySource: "Pyth" | "WebSocket" | "none";
  pythConnected: boolean;
  diaConnected: boolean;
  redstoneConnected: boolean;
}

export const useOraclePrices = (_symbols: string[] = []) => {
  const [prices, setPrices] = useState<Map<string, OraclePriceData>>(new Map());
  const [isLive, setIsLive] = useState(false);

  const pricesRef = useRef<Map<string, OraclePriceData>>(new Map());
  const isMountedRef = useRef(true);

  // Use the global WebSocket - edge function handles Pyth/CoinGecko/DeFiLlama
  const ws = useGlobalPriceWebSocket([]);

  // Map WebSocket prices to oracle format
  useEffect(() => {
    if (!isMountedRef.current) return;

    const merged = new Map<string, OraclePriceData>();

    ws.prices.forEach((data, symbol) => {
      if (!data || !data.price || data.price <= 0) return;
      merged.set(symbol, {
        symbol,
        price: data.price,
        lastUpdate: data.timestamp || Date.now(),
        source: (data.source as OraclePriceData["source"]) || "WebSocket",
      });
    });

    pricesRef.current = merged;
    setPrices(new Map(merged));
    setIsLive(ws.connected);
  }, [ws.prices, ws.connected]);

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
    primarySource: ws.connected ? "WebSocket" : "none" as "Pyth" | "WebSocket" | "none",
    pythConnected: ws.connected, // Edge function uses Pyth as primary source
    diaConnected: false,
    redstoneConnected: false,
    chainlinkConnected: false,
    getPrice,
    pythStatus: {
      isConnected: ws.connected,
      isConnecting: ws.connecting,
      error: ws.error,
    },
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
