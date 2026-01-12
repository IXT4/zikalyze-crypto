// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useCryptoPrices — Real-Time WebSocket + Decentralized Oracle Price Feed
// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY: WebSocket streaming for sub-second updates on all 100 cryptos
// FALLBACK: Pyth/DIA/Redstone oracles for coverage
// ZK-encrypted local storage for privacy
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useOraclePrices } from "./useOraclePrices";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";
import { zkStorage } from "@/lib/zkCrypto";
import { 
  getAllTokenMetadata, 
  getTokenImageUrl,
  type TokenMetadata 
} from "@/lib/decentralizedMetadata";
import { safeFetch } from "@/lib/fetchWithRetry";

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

// DeFiLlama token mappings (decentralized price API) - Top 100 coverage
const DEFI_LLAMA_TOKENS: Record<string, string> = {
  // Top 10
  BTC: "coingecko:bitcoin",
  ETH: "coingecko:ethereum",
  BNB: "coingecko:binancecoin",
  SOL: "coingecko:solana",
  XRP: "coingecko:ripple",
  ADA: "coingecko:cardano",
  DOGE: "coingecko:dogecoin",
  TRX: "coingecko:tron",
  AVAX: "coingecko:avalanche-2",
  TON: "coingecko:the-open-network",
  // 11-20
  LINK: "coingecko:chainlink",
  DOT: "coingecko:polkadot",
  MATIC: "coingecko:matic-network",
  LTC: "coingecko:litecoin",
  BCH: "coingecko:bitcoin-cash",
  SHIB: "coingecko:shiba-inu",
  DAI: "coingecko:dai",
  ATOM: "coingecko:cosmos",
  UNI: "coingecko:uniswap",
  XLM: "coingecko:stellar",
  // 21-30
  ETC: "coingecko:ethereum-classic",
  XMR: "coingecko:monero",
  ICP: "coingecko:internet-computer",
  NEAR: "coingecko:near",
  FIL: "coingecko:filecoin",
  APT: "coingecko:aptos",
  HBAR: "coingecko:hedera-hashgraph",
  ARB: "coingecko:arbitrum",
  VET: "coingecko:vechain",
  OP: "coingecko:optimism",
  // 31-40
  MKR: "coingecko:maker",
  CRO: "coingecko:crypto-com-chain",
  KAS: "coingecko:kaspa",
  AAVE: "coingecko:aave",
  GRT: "coingecko:the-graph",
  RNDR: "coingecko:render-token",
  INJ: "coingecko:injective-protocol",
  ALGO: "coingecko:algorand",
  STX: "coingecko:blockstack",
  FTM: "coingecko:fantom",
  // 41-50
  SUI: "coingecko:sui",
  THETA: "coingecko:theta-token",
  RUNE: "coingecko:thorchain",
  LDO: "coingecko:lido-dao",
  SAND: "coingecko:the-sandbox",
  MANA: "coingecko:decentraland",
  AXS: "coingecko:axie-infinity",
  FET: "coingecko:fetch-ai",
  EGLD: "coingecko:elrond-erd-2",
  FLOW: "coingecko:flow",
  // 51-60
  EOS: "coingecko:eos",
  CHZ: "coingecko:chiliz",
  CAKE: "coingecko:pancakeswap-token",
  XTZ: "coingecko:tezos",
  KAVA: "coingecko:kava",
  NEO: "coingecko:neo",
  IOTA: "coingecko:iota",
  GALA: "coingecko:gala",
  SNX: "coingecko:havven",
  ZEC: "coingecko:zcash",
  // 61-70
  KCS: "coingecko:kucoin-shares",
  CFX: "coingecko:conflux-token",
  MINA: "coingecko:mina-protocol",
  WOO: "coingecko:woo-network",
  ROSE: "coingecko:oasis-network",
  ZIL: "coingecko:zilliqa",
  DYDX: "coingecko:dydx",
  COMP: "coingecko:compound-governance-token",
  ENJ: "coingecko:enjincoin",
  FXS: "coingecko:frax-share",
  // 71-80
  GMX: "coingecko:gmx",
  RPL: "coingecko:rocket-pool",
  CRV: "coingecko:curve-dao-token",
  DASH: "coingecko:dash",
  ONE: "coingecko:harmony",
  BAT: "coingecko:basic-attention-token",
  QTUM: "coingecko:qtum",
  CELO: "coingecko:celo",
  ZRX: "coingecko:0x",
  OCEAN: "coingecko:ocean-protocol",
  // 81-90
  AUDIO: "coingecko:audius",
  ANKR: "coingecko:ankr",
  ICX: "coingecko:icon",
  IOTX: "coingecko:iotex",
  STORJ: "coingecko:storj",
  SKL: "coingecko:skale",
  ONT: "coingecko:ontology",
  JST: "coingecko:just",
  LUNC: "coingecko:terra-luna",
  GLMR: "coingecko:moonbeam",
  // 91-100
  KDA: "coingecko:kadena",
  RVN: "coingecko:ravencoin",
  SC: "coingecko:siacoin",
  WAVES: "coingecko:waves",
  XEM: "coingecko:nem",
  BTT: "coingecko:bittorrent",
  LUNA: "coingecko:terra-luna-2",
  AR: "coingecko:arweave",
  AGIX: "coingecko:singularitynet",
  WLD: "coingecko:worldcoin-wld",
};

// Circulating supply estimates (decentralized - from blockchain data) - Top 100
const CIRCULATING_SUPPLY: Record<string, number> = {
  // Top 10
  BTC: 19_600_000,
  ETH: 120_000_000,
  BNB: 145_000_000,
  SOL: 470_000_000,
  XRP: 57_000_000_000,
  ADA: 35_000_000_000,
  DOGE: 145_000_000_000,
  TRX: 87_000_000_000,
  AVAX: 400_000_000,
  TON: 5_000_000_000,
  // 11-20
  LINK: 600_000_000,
  DOT: 1_400_000_000,
  MATIC: 10_000_000_000,
  LTC: 74_000_000,
  BCH: 19_600_000,
  SHIB: 589_000_000_000_000,
  DAI: 5_300_000_000,
  ATOM: 390_000_000,
  UNI: 600_000_000,
  XLM: 29_000_000_000,
  // 21-30
  ETC: 145_000_000,
  XMR: 18_400_000,
  ICP: 500_000_000,
  NEAR: 1_100_000_000,
  FIL: 500_000_000,
  APT: 500_000_000,
  HBAR: 35_000_000_000,
  ARB: 10_000_000_000,
  VET: 72_000_000_000,
  OP: 4_000_000_000,
  // 31-40
  MKR: 900_000,
  CRO: 25_000_000_000,
  KAS: 24_000_000_000,
  AAVE: 15_000_000,
  GRT: 9_500_000_000,
  RNDR: 500_000_000,
  INJ: 90_000_000,
  ALGO: 8_000_000_000,
  STX: 1_400_000_000,
  FTM: 2_800_000_000,
  // 41-50
  SUI: 10_000_000_000,
  THETA: 1_000_000_000,
  RUNE: 340_000_000,
  LDO: 890_000_000,
  SAND: 2_100_000_000,
  MANA: 1_900_000_000,
  AXS: 150_000_000,
  FET: 2_600_000_000,
  EGLD: 27_000_000,
  FLOW: 1_500_000_000,
  // 51-60
  EOS: 1_100_000_000,
  CHZ: 8_900_000_000,
  CAKE: 290_000_000,
  XTZ: 970_000_000,
  KAVA: 1_100_000_000,
  NEO: 71_000_000,
  IOTA: 2_800_000_000,
  GALA: 40_000_000_000,
  SNX: 330_000_000,
  ZEC: 16_500_000,
  // 61-70
  KCS: 96_000_000,
  CFX: 4_600_000_000,
  MINA: 1_100_000_000,
  WOO: 1_800_000_000,
  ROSE: 6_600_000_000,
  ZIL: 18_600_000_000,
  DYDX: 270_000_000,
  COMP: 10_000_000,
  ENJ: 1_000_000_000,
  FXS: 100_000_000,
  // 71-80
  GMX: 9_400_000,
  RPL: 20_000_000,
  CRV: 1_300_000_000,
  DASH: 11_400_000,
  ONE: 14_000_000_000,
  BAT: 1_500_000_000,
  QTUM: 105_000_000,
  CELO: 560_000_000,
  ZRX: 850_000_000,
  OCEAN: 610_000_000,
  // 81-90
  AUDIO: 1_200_000_000,
  ANKR: 10_000_000_000,
  ICX: 1_000_000_000,
  IOTX: 9_500_000_000,
  STORJ: 420_000_000,
  SKL: 5_600_000_000,
  ONT: 880_000_000,
  JST: 9_900_000_000,
  LUNC: 5_800_000_000_000,
  GLMR: 1_000_000_000,
  // 91-100
  KDA: 270_000_000,
  RVN: 14_200_000_000,
  SC: 57_000_000_000,
  WAVES: 100_000_000,
  XEM: 9_000_000_000,
  BTT: 950_000_000_000_000,
  LUNA: 700_000_000,
  AR: 66_000_000,
  AGIX: 1_300_000_000,
  WLD: 800_000_000,
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
const DEFI_LLAMA_24H_CACHE_KEY = "zk_defillama_24h_v1";

// Fetch 24h data from DeFiLlama (decentralized aggregator)
const fetchDefiLlama24hData = async (): Promise<Map<string, { change24h: number; price24hAgo: number }>> => {
  const result = new Map<string, { change24h: number; price24hAgo: number }>();
  
  try {
    // Build comma-separated token list
    const tokens = Object.values(DEFI_LLAMA_TOKENS).join(",");
    const url = `https://coins.llama.fi/prices/current/${tokens}?searchWidth=24h`;
    
    const response = await safeFetch(url);
    if (!response) return result;
    const data = await response.json();
    if (!data?.coins) return result;
    
    // Also fetch historical (24h ago) prices
    const timestamp24hAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const histUrl = `https://coins.llama.fi/prices/historical/${timestamp24hAgo}/${tokens}`;
    const histResponse = await safeFetch(histUrl);
    const histData = histResponse ? await histResponse.json() : null;
    
    Object.entries(DEFI_LLAMA_TOKENS).forEach(([symbol, llamaKey]) => {
      const current = data.coins?.[llamaKey];
      const historical = histData?.coins?.[llamaKey];
      
      if (current?.price && historical?.price) {
        const change24h = ((current.price - historical.price) / historical.price) * 100;
        result.set(symbol.toLowerCase(), { 
          change24h, 
          price24hAgo: historical.price 
        });
      }
    });
  } catch (e) {
    console.warn("[Prices] DeFiLlama 24h fetch failed:", e);
  }
  
  return result;
};

export const useCryptoPrices = () => {
  // Initialize with decentralized token registry
  const initialPrices = buildInitialPrices();
  const [prices, setPrices] = useState<CryptoPrice[]>(initialPrices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedSources, setConnectedSources] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  // Get all symbols for WebSocket subscription (server supports 100 symbols max)
  const allSymbols = Array.from(
    new Set(initialPrices.slice(0, 100).map((p) => p.symbol.toUpperCase()))
  );
  
  // PRIMARY: WebSocket streaming for real-time updates
  const websocket = useGlobalPriceWebSocket(allSymbols);
  
  // FALLBACK: Decentralized Oracle Integration - Pyth Primary, DIA/Redstone Fallback
  const oracle = useOraclePrices([]);
  
  // Initialize pricesRef Map from initial prices
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map(
    initialPrices.map(p => [p.symbol, p])
  ));
  
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const pricesInitializedRef = useRef(false);
  const oracleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<Map<string, { price: number; timestamp: number }[]>>(new Map());
  const lastPriceSaveRef = useRef<number>(0);
  const defiLlama24hRef = useRef<Map<string, { change24h: number; price24hAgo: number }>>(new Map());
  const lastDefiLlamaFetchRef = useRef<number>(0);
  
  // Fast throttle for WebSocket updates
  const UPDATE_THROTTLE_MS = 50;
  const PRICE_SAVE_THROTTLE_MS = 5000;
  const DEFI_LLAMA_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

  // Load ZK-encrypted cached prices and fetch DeFiLlama 24h data on mount
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
        
        // Load cached DeFiLlama 24h data
        const llama24hCache = await zkStorage.getItem(DEFI_LLAMA_24H_CACHE_KEY);
        if (llama24hCache) {
          const parsed = JSON.parse(llama24hCache);
          if (parsed.data && Date.now() - parsed.timestamp < DEFI_LLAMA_REFRESH_MS) {
            Object.entries(parsed.data).forEach(([symbol, data]) => {
              defiLlama24hRef.current.set(symbol, data as { change24h: number; price24hAgo: number });
            });
            console.log(`[Prices] ✓ Restored ${defiLlama24hRef.current.size} DeFiLlama 24h entries`);
          }
        }
        
        // Fetch fresh DeFiLlama data
        const fresh24h = await fetchDefiLlama24hData();
        if (fresh24h.size > 0) {
          defiLlama24hRef.current = fresh24h;
          lastDefiLlamaFetchRef.current = Date.now();
          await zkStorage.setItem(DEFI_LLAMA_24H_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: Object.fromEntries(fresh24h),
          }));
          console.log(`[Prices] ✓ Fetched ${fresh24h.size} DeFiLlama 24h percentages`);
        }
      } catch (e) {
        console.warn("[Prices] Failed to load ZK cache:", e);
      } finally {
        pricesInitializedRef.current = true;
        setLoading(false);
      }
    };
    
    loadCachedPrices();
    
    // Refresh DeFiLlama data every 5 minutes
    const interval = setInterval(async () => {
      const fresh24h = await fetchDefiLlama24hData();
      if (fresh24h.size > 0) {
        defiLlama24hRef.current = fresh24h;
        lastDefiLlamaFetchRef.current = Date.now();
      }
    }, DEFI_LLAMA_REFRESH_MS);
    
    return () => clearInterval(interval);
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

  // Calculate 24h change - PRIORITY: DeFiLlama > Local History > Existing
  const calculate24hChange = useCallback((symbol: string, currentPrice: number, existingChange: number): number => {
    const lowerSymbol = symbol.toLowerCase();
    
    // PRIORITY 1: Use DeFiLlama 24h data (decentralized aggregator)
    const llamaData = defiLlama24hRef.current.get(lowerSymbol);
    if (llamaData && llamaData.price24hAgo > 0) {
      const change = ((currentPrice - llamaData.price24hAgo) / llamaData.price24hAgo) * 100;
      // Validate: reasonable crypto range (-99% to +1000%)
      if (change > -99 && change < 1000) {
        return change;
      }
    }
    
    // PRIORITY 2: Use local price history
    const history = priceHistoryRef.current.get(lowerSymbol) || [];
    if (history.length > 10) {
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;
      
      // Find oldest entry from ~24h ago
      const oldEntries = history.filter(h => h.timestamp > cutoff && h.timestamp < now - 20 * 60 * 60 * 1000);
      if (oldEntries.length > 0) {
        const oldPrice = oldEntries[0].price;
        if (oldPrice > 0) {
          const change = ((currentPrice - oldPrice) / oldPrice) * 100;
          if (change > -99 && change < 1000) {
            return change;
          }
        }
      }
    }
    
    // PRIORITY 3: Keep existing change if valid
    if (existingChange !== 0 && existingChange > -99 && existingChange < 1000) {
      return existingChange;
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
            const oracleSource = oracleData.source === "Pyth" ? "Pyth Oracle" : "WebSocket";
            
            // Add to price history for 24h calculations
            addToHistory(symbol, oracleData.price);
            
            // Calculate 24h change from DeFiLlama or local history
            const change24h = calculate24hChange(symbol, oracleData.price, existing.price_change_percentage_24h);
            
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

  // Apply WebSocket prices as PRIMARY source (fastest updates)
  useEffect(() => {
    // Process even if not fully connected - prices may have data
    if (websocket.prices.size === 0) return;
    
    if (wsUpdateTimeoutRef.current) {
      clearTimeout(wsUpdateTimeoutRef.current);
    }
    
    wsUpdateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      let hasUpdates = false;
      
      websocket.prices.forEach((wsData, symbol) => {
        if (!wsData || wsData.price <= 0) return;
        
        const lowerSymbol = symbol.toLowerCase();
        const existing = pricesRef.current.get(lowerSymbol);
        
        if (existing) {
          // FIX: Allow update if existing price is 0 OR if price changed significantly
          const isFirstPrice = existing.current_price === 0 || existing.current_price === undefined;
          const priceDiff = existing.current_price > 0 
            ? Math.abs(existing.current_price - wsData.price) / existing.current_price 
            : 1;
          // Ultra-sensitive threshold so prices visibly move in real time
          const isSignificant = isFirstPrice || priceDiff > 0.000001; // 0.0001% threshold
          
          if (isSignificant) {
            addToHistory(lowerSymbol, wsData.price);
            const change24h = calculate24hChange(lowerSymbol, wsData.price, existing.price_change_percentage_24h);
            
            const newHigh24h = existing.high_24h > 0 ? Math.max(existing.high_24h, wsData.price) : wsData.price;
            const newLow24h = existing.low_24h > 0 ? Math.min(existing.low_24h, wsData.price) : wsData.price;
            
            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
            const estimatedMarketCap = wsData.price * supply;
            
            const updated = {
              ...existing,
              current_price: wsData.price,
              price_change_percentage_24h: change24h !== 0 ? change24h : existing.price_change_percentage_24h,
              high_24h: newHigh24h,
              low_24h: newLow24h,
              market_cap: estimatedMarketCap > 0 ? estimatedMarketCap : existing.market_cap,
              lastUpdate: now,
              source: "WebSocket",
            };
            pricesRef.current.set(lowerSymbol, updated);
            hasUpdates = true;
          }
        } else {
          // FIX: Create new price entry if not existing (for symbols not in initial list)
          const metadata = getAllTokenMetadata().find(m => m.symbol.toLowerCase() === lowerSymbol);
          if (metadata) {
            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || 0;
            const newPrice: CryptoPrice = {
              id: metadata.id,
              symbol: lowerSymbol,
              name: metadata.name,
              image: getTokenImageUrl(metadata.symbol),
              current_price: wsData.price,
              price_change_percentage_24h: 0,
              high_24h: wsData.price,
              low_24h: wsData.price,
              total_volume: 0,
              market_cap: wsData.price * supply,
              market_cap_rank: pricesRef.current.size + 1,
              circulating_supply: supply,
              lastUpdate: now,
              source: "WebSocket",
            };
            pricesRef.current.set(lowerSymbol, newPrice);
            addToHistory(lowerSymbol, wsData.price);
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
    }, UPDATE_THROTTLE_MS);
    
    return () => {
      if (wsUpdateTimeoutRef.current) {
        clearTimeout(wsUpdateTimeoutRef.current);
      }
    };
  }, [websocket.prices, websocket.connected, addToHistory, calculate24hChange, savePricesToZK]);

  // Track live status from WebSocket + oracles
  useEffect(() => {
    const sources: string[] = [];
    
    if (websocket.connected) sources.push("WebSocket");
    if (oracle.pythConnected) sources.push("Pyth Oracle");
    if (oracle.diaConnected) sources.push("DIA Oracle");
    if (oracle.redstoneConnected) sources.push("Redstone Oracle");
    
    setConnectedSources(sources);
    setIsLive(websocket.connected || oracle.isLive);
  }, [websocket.connected, oracle.isLive, oracle.pythConnected, oracle.diaConnected, oracle.redstoneConnected]);

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
