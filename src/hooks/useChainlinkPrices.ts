// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 useChainlinkPrices — DEPRECATED: Now uses DIA + Redstone as backup
// ═══════════════════════════════════════════════════════════════════════════════
// This file now re-exports DIA prices for backwards compatibility
// DIA is CORS-friendly and doesn't require RPC calls that get blocked
// ═══════════════════════════════════════════════════════════════════════════════

import { useDIAPrices, DIAPriceData } from "./useDIAPrices";

// Re-export for compatibility
export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  updatedAt: number;
  roundId: string;
  source: "Chainlink";
}

// Map DIA data to Chainlink format for backwards compatibility
export const useChainlinkPrices = (_symbols: string[] = []) => {
  const dia = useDIAPrices();
  
  const getPrice = (symbol: string): ChainlinkPriceData | undefined => {
    const diaPrice = dia.getPrice(symbol);
    if (!diaPrice) return undefined;
    
    return {
      symbol: diaPrice.symbol,
      price: diaPrice.price,
      updatedAt: diaPrice.timestamp,
      roundId: "DIA-" + Date.now().toString(),
      source: "Chainlink", // Keep as Chainlink for UI compatibility
    };
  };

  return {
    prices: dia.prices,
    isConnected: dia.isConnected,
    isLoading: dia.isLoading,
    error: dia.error,
    getPrice,
    feedsEth: {} as Record<string, string>,
  };
};

// Empty exports for compatibility
export const CHAINLINK_FEEDS_ETH: Record<string, string> = {};
