// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useCryptoPrices — 100% Decentralized Price Feed with ZK Privacy
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth/DIA/Redstone oracles exclusively for live prices
// Metadata from decentralized registry (no centralized API dependencies)
// ZK-encrypted local storage for privacy
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useOraclePrices } from "./useOraclePrices";
import { zkStorage } from "@/lib/zkCrypto";
import { 
  getAllTokenMetadata, 
  getTokenImageUrl,
  type TokenMetadata 
} from "@/lib/decentralizedMetadata";

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number;
  circulating_supply: number;
  lastUpdate?: number;
  source?: string;
}

// Circulating supply estimates (decentralized - from blockchain data)
const CIRCULATING_SUPPLY: Record<string, number> = {
  BTC: 19_600_000,
  ETH: 120_000_000,
  BNB: 145_000_000,
  SOL: 470_000_000,
  XRP: 57_000_000_000,
  ADA: 35_000_000_000,
  DOGE: 145_000_000_000,
  AVAX: 400_000_000,
  DOT: 1_400_000_000,
  LINK: 600_000_000,
  TON: 5_000_000_000,
  MATIC: 10_000_000_000,
  LTC: 74_000_000,
  ATOM: 390_000_000,
  UNI: 600_000_000,
  NEAR: 1_100_000_000,
  APT: 500_000_000,
  ARB: 10_000_000_000,
  OP: 4_000_000_000,
  FIL: 500_000_000,
  KAS: 24_000_000_000,
  FTM: 2_800_000_000,
  SUI: 10_000_000_000,
  INJ: 90_000_000,
  RNDR: 500_000_000,
  GRT: 9_500_000_000,
  AAVE: 15_000_000,
  MKR: 900_000,
  ALGO: 8_000_000_000,
  TRX: 87_000_000_000,
  XLM: 29_000_000_000,
  VET: 72_000_000_000,
  HBAR: 35_000_000_000,
  STX: 1_400_000_000,
};

// Build initial prices from decentralized token registry
const buildInitialPrices = (): CryptoPrice[] => {
  const metadata = getAllTokenMetadata();
  return metadata.map((token, index) => ({
    id: token.id,
    symbol: token.symbol.toLowerCase(),
    name: token.name,
    image: getTokenImageUrl(token.symbol),
    current_price: 0,
    price_change_percentage_24h: 0,
    high_24h: 0,
    low_24h: 0,
    total_volume: 0,
    market_cap: 0,
    market_cap_rank: index + 1,
    circulating_supply: CIRCULATING_SUPPLY[token.symbol] || 0,
    lastUpdate: Date.now(),
    source: "Initializing",
  }));
};

// ZK-encrypted cache keys
const LIVE_PRICES_CACHE_KEY = "zk_live_prices_v2";
const PRICE_HISTORY_KEY = "zk_price_history_v1";

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>(() => buildInitialPrices());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedSources, setConnectedSources] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  // Decentralized Oracle Integration - Pyth Primary, DIA/Redstone Fallback
  const oracle = useOraclePrices([]);
  
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const pricesInitializedRef = useRef(false);
  const oracleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<Map<string, { price: number; timestamp: number }[]>>(new Map());
  const lastPriceSaveRef = useRef<number>(0);
  
  // Balanced throttle for smooth real-time updates
  const UPDATE_THROTTLE_MS = 100;
  const PRICE_SAVE_THROTTLE_MS = 5000;

  // Load ZK-encrypted cached prices on mount
  useEffect(() => {
    const loadCachedPrices = async () => {
      try {
        const cached = await zkStorage.getItem(LIVE_PRICES_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
            // Check if cache is less than 24h old
            if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              const restoredPrices = parsed.data.filter((p: CryptoPrice) => p.current_price > 0);
              if (restoredPrices.length > 0) {
                restoredPrices.forEach((p: CryptoPrice) => pricesRef.current.set(p.symbol, p));
                setPrices(restoredPrices.map((p: CryptoPrice) => ({ ...p, source: "ZK-Cache" })));
                console.log(`[Prices] ✓ Restored ${restoredPrices.length} ZK-encrypted prices`);
              }
            }
          }
        }
        
        // Load price history for 24h calculations
        const historyCache = await zkStorage.getItem(PRICE_HISTORY_KEY);
        if (historyCache) {
          const parsed = JSON.parse(historyCache);
          if (parsed.data) {
            Object.entries(parsed.data).forEach(([symbol, history]) => {
              priceHistoryRef.current.set(symbol, history as { price: number; timestamp: number }[]);
            });
          }
        }
      } catch (e) {
        console.warn("[Prices] Failed to load ZK cache:", e);
      } finally {
        pricesInitializedRef.current = true;
        setLoading(false);
      }
    };
    
    loadCachedPrices();
  }, []);

  // Save prices to ZK-encrypted storage (throttled)
  const savePricesToZK = useCallback(async (pricesToSave: CryptoPrice[]) => {
    const now = Date.now();
    if (now - lastPriceSaveRef.current < PRICE_SAVE_THROTTLE_MS) return;
    lastPriceSaveRef.current = now;
    
    try {
      const validPrices = pricesToSave.filter(p => p.current_price > 0);
      if (validPrices.length > 0) {
        await zkStorage.setItem(LIVE_PRICES_CACHE_KEY, JSON.stringify({
          timestamp: now,
          data: validPrices,
        }));
      }
      
      // Also save price history
      const historyObj: Record<string, { price: number; timestamp: number }[]> = {};
      priceHistoryRef.current.forEach((history, symbol) => {
        // Keep only last 24h of history
        const cutoff = now - 24 * 60 * 60 * 1000;
        historyObj[symbol] = history.filter(h => h.timestamp > cutoff);
      });
      await zkStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify({
        timestamp: now,
        data: historyObj,
      }));
    } catch (e) {
      console.warn("[Prices] Failed to save ZK cache:", e);
    }
  }, []);

  // Calculate 24h change from local price history
  const calculate24hChange = useCallback((symbol: string, currentPrice: number): number => {
    const history = priceHistoryRef.current.get(symbol.toLowerCase()) || [];
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    
    // Find the oldest price within 24h window
    const oldPrices = history.filter(h => h.timestamp > cutoff && h.timestamp < now - 23 * 60 * 60 * 1000);
    if (oldPrices.length > 0) {
      const oldPrice = oldPrices[0].price;
      if (oldPrice > 0) {
        return ((currentPrice - oldPrice) / oldPrice) * 100;
      }
    }
    
    // Fallback: use oldest available price
    if (history.length > 0) {
      const oldestPrice = history[0].price;
      if (oldestPrice > 0 && Math.abs(currentPrice - oldestPrice) / oldestPrice > 0.001) {
        return ((currentPrice - oldestPrice) / oldestPrice) * 100;
      }
    }
    
    return 0;
  }, []);

  // Add price to history
  const addToHistory = useCallback((symbol: string, price: number) => {
    if (price <= 0) return;
    
    const lowerSymbol = symbol.toLowerCase();
    const now = Date.now();
    const history = priceHistoryRef.current.get(lowerSymbol) || [];
    
    // Only add if price changed or enough time passed (5 min)
    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      const priceDiff = Math.abs(price - lastEntry.price) / lastEntry.price;
      const timeDiff = now - lastEntry.timestamp;
      if (priceDiff < 0.001 && timeDiff < 5 * 60 * 1000) return;
    }
    
    // Add new entry and trim old entries
    history.push({ price, timestamp: now });
    const cutoff = now - 24 * 60 * 60 * 1000;
    const trimmed = history.filter(h => h.timestamp > cutoff);
    priceHistoryRef.current.set(lowerSymbol, trimmed);
  }, []);
  
  // Apply Oracle prices as primary source (DECENTRALIZED ONLY)
  useEffect(() => {
    if (!oracle.isLive || oracle.prices.size === 0) return;
    
    if (oracleUpdateTimeoutRef.current) {
      clearTimeout(oracleUpdateTimeoutRef.current);
    }
    
    oracleUpdateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      let hasUpdates = false;
      
      oracle.prices.forEach((oracleData, _key) => {
        if (!oracleData || !oracleData.price || oracleData.price <= 0) return;
        
        const symbol = oracleData.symbol.toLowerCase();
        const existing = pricesRef.current.get(symbol);
        
        if (existing && oracleData.price > 0) {
          const priceDiff = Math.abs(existing.current_price - oracleData.price) / (existing.current_price || 1);
          const isSignificant = priceDiff > 0.0001;
        
          if (isSignificant) {
            const oracleSource = oracleData.source === "Pyth" ? "Pyth Oracle" : 
                                 oracleData.source === "DIA" ? "DIA Oracle" : 
                                 oracleData.source === "API3" ? "API3 Oracle" : "Redstone Oracle";
            
            // Add to price history for 24h calculations
            addToHistory(symbol, oracleData.price);
            
            // Calculate 24h change from local history
            const change24h = calculate24hChange(symbol, oracleData.price);
            
            // Update high/low if price breaks range
            const newHigh24h = existing.high_24h > 0 
              ? Math.max(existing.high_24h, oracleData.price) 
              : oracleData.price;
            const newLow24h = existing.low_24h > 0 
              ? Math.min(existing.low_24h, oracleData.price) 
              : oracleData.price;
            
            // Estimate market cap from price * circulating supply
            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
            const estimatedMarketCap = oracleData.price * supply;
            
            const updated = {
              ...existing,
              current_price: oracleData.price,
              price_change_percentage_24h: change24h !== 0 ? change24h : existing.price_change_percentage_24h,
              high_24h: newHigh24h,
              low_24h: newLow24h,
              market_cap: estimatedMarketCap > 0 ? estimatedMarketCap : existing.market_cap,
              lastUpdate: now,
              source: oracleSource,
            };
            pricesRef.current.set(symbol, updated);
            hasUpdates = true;
          }
        } else if (!existing) {
          // Add new token from oracle
          const metadata = getAllTokenMetadata().find(m => m.symbol.toLowerCase() === symbol);
          if (metadata) {
            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || 0;
            const newPrice: CryptoPrice = {
              id: metadata.id,
              symbol: symbol,
              name: metadata.name,
              image: getTokenImageUrl(metadata.symbol),
              current_price: oracleData.price,
              price_change_percentage_24h: 0,
              high_24h: oracleData.price,
              low_24h: oracleData.price,
              total_volume: 0,
              market_cap: oracleData.price * supply,
              market_cap_rank: pricesRef.current.size + 1,
              circulating_supply: supply,
              lastUpdate: now,
              source: oracleData.source,
            };
            pricesRef.current.set(symbol, newPrice);
            addToHistory(symbol, oracleData.price);
            hasUpdates = true;
          }
        }
      });
      
      if (hasUpdates) {
        const priceArray = Array.from(pricesRef.current.values())
          .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        setPrices(priceArray);
        savePricesToZK(priceArray);
      }
    }, 80);
    
    return () => {
      if (oracleUpdateTimeoutRef.current) {
        clearTimeout(oracleUpdateTimeoutRef.current);
      }
    };
  }, [oracle.prices, oracle.isLive, addToHistory, calculate24hChange, savePricesToZK]);

  // Track live status from decentralized oracles ONLY
  useEffect(() => {
    const sources: string[] = [];
    
    if (oracle.pythConnected) sources.push("Pyth Oracle");
    if (oracle.diaConnected) sources.push("DIA Oracle");
    if (oracle.redstoneConnected) sources.push("Redstone Oracle");
    
    setConnectedSources(sources);
    setIsLive(oracle.isLive);
  }, [oracle.isLive, oracle.pythConnected, oracle.diaConnected, oracle.redstoneConnected]);

  const getPriceBySymbol = useCallback((symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [prices]);

  const getPriceById = useCallback((id: string): CryptoPrice | undefined => {
    return prices.find((p) => p.id === id);
  }, [prices]);

  const refetch = useCallback(() => {
    // With decentralized oracles, no manual refetch needed - data streams automatically
    console.log("[Prices] Decentralized oracles streaming - no refetch needed");
  }, []);

  return { 
    prices, 
    loading, 
    error, 
    connectedExchanges: connectedSources,
    isLive,
    getPriceBySymbol, 
    getPriceById, 
    refetch,
    // Oracle status - fully decentralized
    oracleStatus: {
      isLive: oracle.isLive,
      primarySource: oracle.primarySource,
      pythConnected: oracle.pythConnected,
      diaConnected: oracle.diaConnected,
      redstoneConnected: oracle.redstoneConnected,
      // Legacy compatibility (deprecated - all centralized removed)
      chainlinkConnected: false,
    },
  };
};

// Dynamic symbol to ID mapping based on current prices
export const symbolToId: Record<string, string> = {};
