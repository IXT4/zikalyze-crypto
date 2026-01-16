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

// Build initial prices from decentralized token registry - show loading state instead of 0
const buildInitialPrices = (): CryptoPrice[] => {
  const metadata = getAllTokenMetadata();
  return metadata.map((token, index) => ({
    id: token.id,
    symbol: token.symbol.toLowerCase(),
    name: token.name,
    image: getTokenImageUrl(token.symbol),
    current_price: -1, // Use -1 to indicate "loading" state, not 0
    price_change_percentage_24h: 0,
    high_24h: 0,
    low_24h: 0,
    total_volume: 0,
    market_cap: 0,
    market_cap_rank: index + 1,
    circulating_supply: CIRCULATING_SUPPLY[token.symbol] || 0,
    lastUpdate: Date.now(),
    source: "Loading",
  }));
};

// ZK-encrypted cache keys
const LIVE_PRICES_CACHE_KEY = "zk_live_prices_v2";
const PRICE_HISTORY_KEY = "zk_price_history_v1";
const DEFI_LLAMA_24H_CACHE_KEY = "zk_defillama_24h_v1";

// Fetch 24h data from DeFiLlama (decentralized aggregator)
const fetchDefiLlama24hData = async (): Promise<Map<string, { change24h: number; price24hAgo: number; volume24h?: number }>> => {
  const result = new Map<string, { change24h: number; price24hAgo: number; volume24h?: number }>();
  
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
        
        // Estimate volume from market cap (typical ratio ~3-8% of market cap for top coins)
        const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || 0;
        const marketCap = current.price * supply;
        // More volatile coins typically have higher relative volume
        const volatilityFactor = Math.min(2, Math.abs(change24h) / 5 + 0.5);
        const estimatedVolume = marketCap * 0.04 * volatilityFactor;
        
        result.set(symbol.toLowerCase(), {
          change24h,
          price24hAgo: historical.price,
          volume24h: estimatedVolume > 0 ? estimatedVolume : undefined,
        });
      }
    });
  } catch (e) {
    console.warn("[Prices] DeFiLlama 24h fetch failed:", e);
  }
  
  return result;
};

// Fetch current prices from DeFiLlama (fills gaps when oracle/WebSocket don't cover a token)
const fetchDefiLlamaCurrentPrices = async (): Promise<Map<string, number>> => {
  const result = new Map<string, number>();

  try {
    const tokens = Object.values(DEFI_LLAMA_TOKENS).join(",");
    const url = `https://coins.llama.fi/prices/current/${tokens}`;

    const response = await safeFetch(url);
    if (!response) return result;

    const data = await response.json();
    if (!data?.coins) return result;

    Object.entries(DEFI_LLAMA_TOKENS).forEach(([symbol, llamaKey]) => {
      const current = data.coins?.[llamaKey];
      const price = Number(current?.price);
      if (Number.isFinite(price) && price > 0) {
        result.set(symbol.toLowerCase(), price);
      }
    });
  } catch (e) {
    console.warn("[Prices] DeFiLlama current price fetch failed:", e);
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
  const defiLlama24hRef = useRef<Map<string, { change24h: number; price24hAgo: number; volume24h?: number }>>(new Map());
  const lastDefiLlamaFetchRef = useRef<number>(0);
  
  // Ultra-fast updates for real-time streaming
  const UPDATE_THROTTLE_MS = 16; // ~60fps for smooth price updates
  const PRICE_SAVE_THROTTLE_MS = 5000;
  const DEFI_LLAMA_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

  // Load ZK-encrypted cached prices and fetch DeFiLlama data on mount
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
        
        // Fetch fresh DeFiLlama 24h % data
        const fresh24h = await fetchDefiLlama24hData();
        if (fresh24h.size > 0) {
          defiLlama24hRef.current = fresh24h;
          lastDefiLlamaFetchRef.current = Date.now();
          await zkStorage.setItem(
            DEFI_LLAMA_24H_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: Object.fromEntries(fresh24h),
            })
          );
          console.log(`[Prices] ✓ Fetched ${fresh24h.size} DeFiLlama 24h percentages`);
        }

        // Fetch DeFiLlama current prices to fill any "0" gaps immediately
        const current = await fetchDefiLlamaCurrentPrices();
        if (current.size > 0) {
          const now = Date.now();
          let hasGapFills = false;

          const recordHistory = (symbol: string, price: number) => {
            if (price <= 0) return;
            const history = priceHistoryRef.current.get(symbol) || [];
            history.push({ price, timestamp: now });
            const cutoff = now - 24 * 60 * 60 * 1000;
            priceHistoryRef.current.set(symbol, history.filter((h) => h.timestamp > cutoff));
          };

          current.forEach((price, symbol) => {
            const existing = pricesRef.current.get(symbol);
            if (!existing) return;

            // Fill gaps OR update loading state (current_price <= 0)
            if (existing.current_price > 0) return;

            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
            
            // Get 24h change from DeFiLlama cache immediately
            const llamaData = defiLlama24hRef.current.get(symbol);
            const change24h = llamaData?.change24h || 0;
            
            pricesRef.current.set(symbol, {
              ...existing,
              current_price: price,
              price_change_percentage_24h: change24h,
              high_24h: price * (1 + Math.abs(change24h) / 100 * 0.3),
              low_24h: price * (1 - Math.abs(change24h) / 100 * 0.3),
              market_cap: price * supply,
              lastUpdate: now,
              source: "DeFiLlama",
            });
            recordHistory(symbol, price);
            hasGapFills = true;
          });

          if (hasGapFills) {
            const priceArray = Array.from(pricesRef.current.values()).sort(
              (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
            );
            setPrices(priceArray);
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
    
    // Refresh DeFiLlama 24h data every 5 minutes
    const interval24h = setInterval(async () => {
      const fresh24h = await fetchDefiLlama24hData();
      if (fresh24h.size > 0) {
        defiLlama24hRef.current = fresh24h;
        lastDefiLlamaFetchRef.current = Date.now();
      }
    }, DEFI_LLAMA_REFRESH_MS);

    // Refresh DeFiLlama current prices (gap-fill) every 60s
    const intervalCurrent = setInterval(async () => {
      const current = await fetchDefiLlamaCurrentPrices();
      if (current.size === 0) return;

      const now = Date.now();
      let hasGapFills = false;

      const recordHistory = (symbol: string, price: number) => {
        if (price <= 0) return;
        const history = priceHistoryRef.current.get(symbol) || [];
        history.push({ price, timestamp: now });
        const cutoff = now - 24 * 60 * 60 * 1000;
        priceHistoryRef.current.set(symbol, history.filter((h) => h.timestamp > cutoff));
      };

      current.forEach((price, symbol) => {
        const existing = pricesRef.current.get(symbol);
        if (!existing) return;
        if (existing.current_price > 0) return;

        const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
        
        // Get 24h change from DeFiLlama cache immediately
        const llamaData = defiLlama24hRef.current.get(symbol);
        const change24h = llamaData?.change24h || 0;
        
        pricesRef.current.set(symbol, {
          ...existing,
          current_price: price,
          price_change_percentage_24h: change24h,
          high_24h: price * (1 + Math.abs(change24h) / 100 * 0.3),
          low_24h: price * (1 - Math.abs(change24h) / 100 * 0.3),
          market_cap: price * supply,
          lastUpdate: now,
          source: "DeFiLlama",
        });
        recordHistory(symbol, price);
        hasGapFills = true;
      });

      if (hasGapFills) {
        const priceArray = Array.from(pricesRef.current.values()).sort(
          (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
        );
        setPrices(priceArray);
      }
    }, 60000);
    
    return () => {
      clearInterval(interval24h);
      clearInterval(intervalCurrent);
    };
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

  // Calculate 24h change - PRIORITY: DeFiLlama (cached) > DeFiLlama (live) > Local History > Existing
  const calculate24hChange = useCallback((symbol: string, currentPrice: number, existingChange: number): number => {
    const lowerSymbol = symbol.toLowerCase();
    
    // PRIORITY 1: Use DeFiLlama cached 24h change directly (most reliable)
    const llamaData = defiLlama24hRef.current.get(lowerSymbol);
    if (llamaData) {
      // Use pre-calculated change if available
      if (llamaData.change24h !== undefined && llamaData.change24h !== 0) {
        if (llamaData.change24h > -99 && llamaData.change24h < 1000) {
          return llamaData.change24h;
        }
      }
      // Calculate from price24hAgo if available
      if (llamaData.price24hAgo > 0 && currentPrice > 0) {
        const change = ((currentPrice - llamaData.price24hAgo) / llamaData.price24hAgo) * 100;
        if (change > -99 && change < 1000) {
          return change;
        }
      }
    }
    
    // PRIORITY 2: Use local price history (need less history for faster display)
    const history = priceHistoryRef.current.get(lowerSymbol) || [];
    if (history.length >= 3) {
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;
      
      // Find oldest entry from ~24h ago OR use earliest available if less than 24h
      const validHistory = history.filter(h => h.timestamp > cutoff);
      if (validHistory.length >= 2) {
        const oldPrice = validHistory[0].price;
        if (oldPrice > 0 && currentPrice > 0) {
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

  // Get estimated 24h volume from DeFiLlama data
  const getEstimatedVolume = useCallback((symbol: string, existingVolume: number): number => {
    const lowerSymbol = symbol.toLowerCase();
    const llamaData = defiLlama24hRef.current.get(lowerSymbol);
    if (llamaData?.volume24h && llamaData.volume24h > 0) {
      return llamaData.volume24h;
    }
    return existingVolume;
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
  
  // Track oracle and websocket data with refs to prevent infinite loops
  const lastOracleUpdateRef = useRef<number>(0);
  const lastWsUpdateRef = useRef<number>(0);
  const oraclePricesHashRef = useRef<string>("");
  const wsPricesHashRef = useRef<string>("");

  // Apply Oracle prices as primary source (DECENTRALIZED ONLY)
  useEffect(() => {
    if (!oracle.isLive || oracle.prices.size === 0) return;
    
    // Create hash of first 10 prices to detect actual changes
    const pricesHash = Array.from(oracle.prices.entries())
      .slice(0, 10)
      .map(([k, v]) => `${k}:${v.price.toFixed(4)}`)
      .join("|");
    
    // Skip if no actual change
    if (pricesHash === oraclePricesHashRef.current) return;
    oraclePricesHashRef.current = pricesHash;
    
    // Throttle updates - minimum 200ms between updates
    const now = Date.now();
    if (now - lastOracleUpdateRef.current < 200) return;
    lastOracleUpdateRef.current = now;
    
    if (oracleUpdateTimeoutRef.current) {
      clearTimeout(oracleUpdateTimeoutRef.current);
    }
    
    oracleUpdateTimeoutRef.current = setTimeout(() => {
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
            
            addToHistory(symbol, oracleData.price);
            const change24h = calculate24hChange(symbol, oracleData.price, existing.price_change_percentage_24h);
            
            const newHigh24h = existing.high_24h > 0 
              ? Math.max(existing.high_24h, oracleData.price) 
              : oracleData.price;
            const newLow24h = existing.low_24h > 0 
              ? Math.min(existing.low_24h, oracleData.price) 
              : oracleData.price;
            
            const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
            const estimatedMarketCap = oracleData.price * supply;
            const estimatedVolume = getEstimatedVolume(symbol, existing.total_volume);
            
            const updated = {
              ...existing,
              current_price: oracleData.price,
              price_change_percentage_24h: change24h !== 0 ? change24h : existing.price_change_percentage_24h,
              high_24h: newHigh24h,
              low_24h: newLow24h,
              total_volume: estimatedVolume,
              market_cap: estimatedMarketCap > 0 ? estimatedMarketCap : existing.market_cap,
              lastUpdate: now,
              source: oracleSource,
            };
            pricesRef.current.set(symbol, updated);
            hasUpdates = true;
          }
        } else if (!existing) {
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
    }, 100);
    
    return () => {
      if (oracleUpdateTimeoutRef.current) {
        clearTimeout(oracleUpdateTimeoutRef.current);
      }
    };
  }, [oracle.isLive, oracle.prices.size, addToHistory, calculate24hChange, getEstimatedVolume, savePricesToZK]);

  // Apply WebSocket prices as PRIMARY source (fastest updates - no throttling)
  useEffect(() => {
    if (websocket.prices.size === 0) return;
    
    // Create hash to detect actual changes - use more precision for accuracy
    const pricesHash = Array.from(websocket.prices.entries())
      .slice(0, 20)
      .map(([k, v]) => `${k}:${v.price.toFixed(6)}`)
      .join("|");
    
    // Skip if no actual change
    if (pricesHash === wsPricesHashRef.current) return;
    wsPricesHashRef.current = pricesHash;
    
    const now = Date.now();
    lastWsUpdateRef.current = now;
    
    // Process immediately - no timeout delay for real-time accuracy
    let hasUpdates = false;
    
    websocket.prices.forEach((wsData, symbol) => {
      if (!wsData || wsData.price <= 0) return;
      
      const lowerSymbol = symbol.toLowerCase();
      const existing = pricesRef.current.get(lowerSymbol);
      
      if (existing) {
        const isFirstPrice = existing.current_price === 0 || existing.current_price === undefined;
        const priceDiff = existing.current_price > 0 
          ? Math.abs(existing.current_price - wsData.price) / existing.current_price 
          : 1;
        // Any price change is significant for real-time display
        const isSignificant = isFirstPrice || priceDiff > 0.00001;
        
        if (isSignificant) {
          addToHistory(lowerSymbol, wsData.price);
          const change24h = calculate24hChange(lowerSymbol, wsData.price, existing.price_change_percentage_24h);
          
          const newHigh24h = existing.high_24h > 0 ? Math.max(existing.high_24h, wsData.price) : wsData.price;
          const newLow24h = existing.low_24h > 0 ? Math.min(existing.low_24h, wsData.price) : wsData.price;
          
          const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || existing.circulating_supply;
          const estimatedMarketCap = wsData.price * supply;
          const estimatedVolume = getEstimatedVolume(lowerSymbol, existing.total_volume);
          
          pricesRef.current.set(lowerSymbol, {
            ...existing,
            current_price: wsData.price,
            price_change_percentage_24h: change24h !== 0 ? change24h : existing.price_change_percentage_24h,
            high_24h: newHigh24h,
            low_24h: newLow24h,
            total_volume: estimatedVolume,
            market_cap: estimatedMarketCap > 0 ? estimatedMarketCap : existing.market_cap,
            lastUpdate: now,
            source: "WebSocket",
          });
          hasUpdates = true;
        }
      } else {
        const metadata = getAllTokenMetadata().find(m => m.symbol.toLowerCase() === lowerSymbol);
        if (metadata) {
          const supply = CIRCULATING_SUPPLY[symbol.toUpperCase()] || 0;
          pricesRef.current.set(lowerSymbol, {
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
          });
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
  }, [websocket.prices.size, websocket.connected, addToHistory, calculate24hChange, getEstimatedVolume, savePricesToZK]);

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
