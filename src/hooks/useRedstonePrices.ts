// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 useRedstonePrices — DEPRECATED: Redstone removed due to API issues
// ═══════════════════════════════════════════════════════════════════════════════
// Now returns empty state - all price data comes from WebSocket (price-stream)
// and Pyth SSE fallback exclusively for maximum reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from "react";

export interface RedstonePriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "Redstone";
}

export const REDSTONE_FEED_SYMBOLS: string[] = [];

// Stub hook - Redstone removed due to API issues
export const useRedstonePrices = () => {
  const getPrice = useCallback((_symbol: string): RedstonePriceData | undefined => {
    return undefined;
  }, []);

  return {
    prices: new Map<string, RedstonePriceData>(),
    isConnected: false,
    isLoading: false,
    error: null,
    getPrice,
    lastUpdateTime: 0,
    symbols: REDSTONE_FEED_SYMBOLS,
  };
};
