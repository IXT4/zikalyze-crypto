// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 useChainlinkPrices — DEPRECATED: Stub for backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════════
// All price data now comes from WebSocket (price-stream) and Pyth SSE fallback
// This hook exists only for backwards compatibility with existing components
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from "react";

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  updatedAt: number;
  roundId: string;
  source: "Chainlink";
}

// Stub hook - Chainlink/DIA removed, all data from WebSocket + Pyth
export const useChainlinkPrices = (_symbols: string[] = []) => {
  const getPrice = useCallback((_symbol: string): ChainlinkPriceData | undefined => {
    return undefined;
  }, []);

  return {
    prices: new Map(),
    isConnected: false,
    isLoading: false,
    error: null,
    getPrice,
    feedsEth: {} as Record<string, string>,
  };
};

export const CHAINLINK_FEEDS_ETH: Record<string, string> = {};
