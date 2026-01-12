// ═══════════════════════════════════════════════════════════════════════════════
// 🔷 useDIAPrices — DEPRECATED: DIA removed due to persistent 404 errors
// ═══════════════════════════════════════════════════════════════════════════════
// Now returns empty state - all price data comes from WebSocket (price-stream) 
// and Pyth SSE fallback exclusively for maximum reliability
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from "react";

export interface DIAPriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: "DIA";
  volume24h?: number;
}

// Stub hook - DIA removed due to API errors
export const useDIAPrices = () => {
  const getPrice = useCallback((_symbol: string): DIAPriceData | undefined => {
    return undefined;
  }, []);

  return {
    prices: new Map<string, DIAPriceData>(),
    isConnected: false,
    isLoading: false,
    error: null,
    getPrice,
    lastUpdateTime: 0,
    assets: {} as Record<string, string>,
  };
};
