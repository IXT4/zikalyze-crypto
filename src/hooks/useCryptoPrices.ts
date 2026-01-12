import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { safeFetch } from "@/lib/fetchWithRetry";
import { useOraclePrices } from "./useOraclePrices";

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

interface CoinGeckoCoin {
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
}

// Stablecoins to exclude
const STABLECOINS = [
  // USD stablecoins (all variations)
  "usdt", "usdc", "busd", "dai", "tusd", "usdp", "usdd", "gusd", 
  "frax", "lusd", "susd", "eurs", "usdj", "fdusd", "pyusd", "eurc",
  "ustc", "usde", "susde", "cusd", "usdx", "husd", "nusd", "musd",
  "dola", "usdk", "tribe", "fei", "mim", "spell", "ust", "usdn",
  "usd1", "rusd", "zusd", "dusd", "ousd", "vusd", "ausd", "eusd",
  // Wrapped/pegged assets
  "wbtc", "weth", "steth", "reth", "cbeth", "wsteth", "frxeth", "sfrxeth",
  "hbtc", "renbtc", "tbtc", "sbtc", "pbtc", "obtc",
  // Restaking assets
  "ezeth", "rseth", "weeth", "eeth", "pufeth", "kelp", "renzo", "eigenlayer",
  "ether-fi", "puffer-finance", "kelp-dao", "restaked-eth", "restaked-ether",
  "eigenpie", "bedrock", "mantle-staked-ether", "meth", "sweth", "ankr-staked-eth",
  // Stakewise
  "stakewise", "oseth", "swise", "stakewise-staked-eth",
  // Gold/commodity backed
  "xaut", "paxg", "gold", "dgld", "pmgt",
  // Other stable/wrapped
  "wrapped-bitcoin", "staked-ether", "rocket-pool-eth", "coinbase-wrapped-staked-eth",
  "lido-staked-ether", "frax-ether", "binance-peg-ethereum",
  // PayPal, First Digital, etc
  "paypal-usd", "first-digital-usd", "gemini-dollar", "pax-gold", "tether-gold",
  "true-usd", "ethena-usde", "ethena", "sdai", "savingsdai"
];

// Check if symbol starts with USD variations
const isUsdPrefixed = (symbol: string): boolean => {
  const lower = symbol.toLowerCase();
  return lower.startsWith("usd") || lower.startsWith("rusd") || 
         lower.startsWith("zusd") || lower.startsWith("eusd") ||
         lower.startsWith("ausd") || lower.startsWith("cusd");
};

// Priority tokens to always include if available
const PRIORITY_TOKENS = [
  "gomining", "bitcoin", "ethereum", "solana", "ripple", "binancecoin",
  "cardano", "dogecoin", "avalanche-2", "chainlink", "polkadot", "sui",
  "near", "aptos", "arbitrum", "optimism", "injective-protocol", "celestia",
  "render-token", "fetch-ai", "worldcoin", "jupiter", "jito-governance-token",
  "kaspa", "fantom", "hedera-hashgraph", "vechain", "algorand", "toncoin",
  "internet-computer", "filecoin", "cosmos", "the-graph", "aave", "maker"
];

const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Fallback prices are placeholders - will be replaced with live Oracle data
const FALLBACK_CRYPTOS: CryptoPrice[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 1, circulating_supply: 19600000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 2, circulating_supply: 120000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 3, circulating_supply: 145000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 4, circulating_supply: 470000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 5, circulating_supply: 57000000000, lastUpdate: Date.now(), source: "Loading" },
];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedSources, setConnectedSources] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  // Decentralized Oracle Integration - Pyth Primary, Chainlink Fallback
  // Use empty array to get all symbols from oracles
  const oracle = useOraclePrices([]);
  
  const cryptoListRef = useRef<{ symbol: string; name: string; id: string }[]>([]);
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const pricesInitializedRef = useRef(false);
  const oracleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Balanced throttle for smooth real-time updates (100ms)
  const UPDATE_THROTTLE_MS = 100;
  
  // Apply Oracle prices as primary source (Pyth/DIA/Redstone) - DECENTRALIZED ONLY
  // Preserves 24h change data from CoinGecko while updating live prices
  useEffect(() => {
    if (!oracle.isLive || oracle.prices.size === 0) return;
    
    // Clear any pending update
    if (oracleUpdateTimeoutRef.current) {
      clearTimeout(oracleUpdateTimeoutRef.current);
    }
    
    // Smooth debounce for stable updates (80ms)
    oracleUpdateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      let hasUpdates = false;
      
      oracle.prices.forEach((oracleData, _key) => {
        if (!oracleData || !oracleData.price || oracleData.price <= 0) return;
        
        const symbol = oracleData.symbol.toLowerCase();
        const existing = pricesRef.current.get(symbol);
        
        if (existing && oracleData.price > 0) {
          // Oracle prices take priority - update if significantly different
          const priceDiff = Math.abs(existing.current_price - oracleData.price) / (existing.current_price || 1);
          const isSignificant = priceDiff > 0.0001; // 0.01% threshold
        
          if (isSignificant) {
            const oracleSource = oracleData.source === "Pyth" ? "Pyth Oracle" : 
                                 oracleData.source === "DIA" ? "DIA Oracle" : "Redstone Oracle";
            
            // CRITICAL: Preserve CoinGecko 24h data while updating live price
            // Only update high_24h/low_24h if new price breaks the range
            const newHigh24h = existing.high_24h > 0 
              ? Math.max(existing.high_24h, oracleData.price) 
              : oracleData.price;
            const newLow24h = existing.low_24h > 0 
              ? Math.min(existing.low_24h, oracleData.price) 
              : oracleData.price;
            
            const updated = {
              ...existing,
              current_price: oracleData.price,
              // Preserve API 24h change - this is the accurate value from CoinGecko
              price_change_percentage_24h: existing.price_change_percentage_24h,
              high_24h: newHigh24h,
              low_24h: newLow24h,
              lastUpdate: now,
              source: oracleSource,
            };
            pricesRef.current.set(symbol, updated);
            hasUpdates = true;
          }
        }
      });
      
      // Batch update state only if there were changes
      if (hasUpdates) {
        setPrices(Array.from(pricesRef.current.values()));
      }
    }, 80); // 80ms debounce for smooth streaming
    
    return () => {
      if (oracleUpdateTimeoutRef.current) {
        clearTimeout(oracleUpdateTimeoutRef.current);
      }
    };
  }, [oracle.prices, oracle.isLive]);

  // Update price with source tracking and throttling
  const updatePrice = useCallback((symbol: string, updates: Partial<CryptoPrice>, source: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    const now = Date.now();
    
    // CRITICAL: Never overwrite valid prices with zeros
    if (updates.current_price !== undefined && updates.current_price <= 0) {
      delete updates.current_price;
    }
    if (updates.high_24h !== undefined && updates.high_24h <= 0) {
      delete updates.high_24h;
    }
    if (updates.low_24h !== undefined && updates.low_24h <= 0) {
      delete updates.low_24h;
    }
    if (updates.total_volume !== undefined && updates.total_volume <= 0) {
      delete updates.total_volume;
    }
    if (updates.market_cap !== undefined && updates.market_cap <= 0) {
      delete updates.market_cap;
    }
    
    // If no valid updates remain, skip entirely
    if (Object.keys(updates).length === 0) {
      return;
    }
    
    // Throttle updates
    const lastUpdate = lastUpdateTimeRef.current.get(normalizedSymbol) || 0;
    if (now - lastUpdate < UPDATE_THROTTLE_MS) {
      return;
    }
    
    lastUpdateTimeRef.current.set(normalizedSymbol, now);
    
    setPrices(prev => prev.map(coin => {
      if (coin.symbol === normalizedSymbol) {
        const updated = {
          ...coin,
          ...updates,
          lastUpdate: now,
          source,
        };
        pricesRef.current.set(normalizedSymbol, updated);
        return updated;
      }
      return coin;
    }));
  }, []);

  const TOP100_CACHE_KEY = "zikalyze_top100_cache_v1";
  const TOP100_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
  
  // Live prices cache - persists current prices for instant load
  const LIVE_PRICES_CACHE_KEY = "zikalyze_live_prices_v1";
  const LIVE_PRICES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  const lastPriceSaveRef = useRef<number>(0);
  const PRICE_SAVE_THROTTLE_MS = 5000;

  const loadCachedTop100 = (): CoinGeckoCoin[] | null => {
    try {
      const raw = localStorage.getItem(TOP100_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts: number; data: CoinGeckoCoin[] };
      if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
      if (Date.now() - parsed.ts > TOP100_CACHE_TTL_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  const saveCachedTop100 = (data: CoinGeckoCoin[]) => {
    try {
      localStorage.setItem(TOP100_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore storage errors
    }
  };
  
  // Load persisted live prices
  const loadCachedLivePrices = (): CryptoPrice[] | null => {
    try {
      const raw = localStorage.getItem(LIVE_PRICES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts: number; data: CryptoPrice[] };
      if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
      if (Date.now() - parsed.ts > LIVE_PRICES_CACHE_TTL_MS) return null;
      return parsed.data.filter(p => p.current_price > 0);
    } catch {
      return null;
    }
  };
  
  // Save current live prices to localStorage (throttled)
  const saveLivePrices = useCallback((pricesToSave: CryptoPrice[]) => {
    const now = Date.now();
    if (now - lastPriceSaveRef.current < PRICE_SAVE_THROTTLE_MS) return;
    lastPriceSaveRef.current = now;
    
    try {
      const validPrices = pricesToSave.filter(p => p.current_price > 0);
      if (validPrices.length > 0) {
        localStorage.setItem(LIVE_PRICES_CACHE_KEY, JSON.stringify({ 
          ts: now, 
          data: validPrices 
        }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    // Prevent re-fetching if already initialized
    if (pricesInitializedRef.current) return;
    pricesInitializedRef.current = true;
    
    // PRIORITY 1: Load persisted live prices first
    const livePricesCache = loadCachedLivePrices();
    if (livePricesCache && livePricesCache.length > 0) {
      cryptoListRef.current = livePricesCache.map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id,
      }));
      
      livePricesCache.forEach((p) => pricesRef.current.set(p.symbol, p));
      setPrices(livePricesCache.map(p => ({ ...p, source: "Restored" })));
      console.log(`[Top100] ✓ Restored ${livePricesCache.length} prices from last session`);
    } else {
      // PRIORITY 2: Fall back to CoinGecko metadata cache
      const cached = loadCachedTop100();
      if (cached && cached.length > 0) {
        const cleanData = cached.filter(
          (coin) =>
            !STABLECOINS.includes(coin.symbol.toLowerCase()) &&
            !STABLECOINS.includes(coin.id.toLowerCase()) &&
            !isUsdPrefixed(coin.symbol)
        );
        const sortedData = cleanData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        const filteredData = sortedData.slice(0, 100);
        
        cryptoListRef.current = filteredData.map((coin) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          id: coin.id,
        }));
        
        const initialPrices: CryptoPrice[] = filteredData.map((coin, index) => ({
          id: coin.id,
          symbol: coin.symbol.toLowerCase(),
          name: coin.name,
          image: coin.image,
          current_price: coin.current_price ?? 0,
          price_change_percentage_24h: coin.price_change_percentage_24h ?? 0,
          high_24h: coin.high_24h ?? 0,
          low_24h: coin.low_24h ?? 0,
          total_volume: coin.total_volume ?? 0,
          market_cap: coin.market_cap ?? 0,
          market_cap_rank: coin.market_cap_rank ?? index + 1,
          circulating_supply: coin.circulating_supply ?? 0,
          lastUpdate: Date.now(),
          source: "Cache",
        }));
        
        initialPrices.forEach((p) => pricesRef.current.set(p.symbol, p));
        setPrices(initialPrices);
        console.log('[Top100] Loaded initial prices from metadata cache');
      } else {
        // PRIORITY 3: Use fallback skeleton (loading state)
        const fallbackWithTimestamp = FALLBACK_CRYPTOS.map((c) => ({ ...c, lastUpdate: Date.now() }));
        setPrices(fallbackWithTimestamp);
        fallbackWithTimestamp.forEach((p) => pricesRef.current.set(p.symbol, p));
        cryptoListRef.current = fallbackWithTimestamp.map((coin) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          id: coin.id,
        }));
      }
    }

    const buildTop100 = (coins: CoinGeckoCoin[], source: string) => {
      const cleanData = coins.filter(
        (coin) =>
          !STABLECOINS.includes(coin.symbol.toLowerCase()) &&
          !STABLECOINS.includes(coin.id.toLowerCase()) &&
          !isUsdPrefixed(coin.symbol)
      );

      const sortedData = cleanData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
      const filteredData = sortedData.slice(0, 100);

      cryptoListRef.current = filteredData.map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id,
      }));

      const cryptoPrices: CryptoPrice[] = filteredData.map((coin, index) => ({
        id: coin.id,
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price ?? 0,
        price_change_percentage_24h: coin.price_change_percentage_24h ?? 0,
        high_24h: coin.high_24h ?? 0,
        low_24h: coin.low_24h ?? 0,
        total_volume: coin.total_volume ?? 0,
        market_cap: coin.market_cap ?? 0,
        market_cap_rank: coin.market_cap_rank ?? index + 1,
        circulating_supply: coin.circulating_supply ?? 0,
        lastUpdate: Date.now(),
        source,
      }));

      cryptoPrices.forEach((p) => pricesRef.current.set(p.symbol, p));
      setPrices(cryptoPrices);
      setError(null);
      console.log(`[Top100] ✓ Loaded ${cryptoPrices.length} coins metadata from ${source}`);
    };

    try {
      setLoading(true);

      // Fetch metadata from CoinGecko (only for images, names, market cap - NOT live prices)
      const page1Url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`;
      const page2Url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`;

      const res1 = await safeFetch(page1Url, { timeoutMs: 12000, maxRetries: 2 });

      if (!res1) {
        const cached = loadCachedTop100();
        if (cached) {
          buildTop100(cached, "Cache");
        }
        return;
      }

      if (res1.status === 429) {
        const cached = loadCachedTop100();
        if (cached) {
          console.log("[CoinGecko] Rate limited, using cache");
          buildTop100(cached, "Cache");
        }
        return;
      }

      if (!res1.ok) {
        throw new Error(`CoinGecko HTTP ${res1.status}`);
      }

      const data1: CoinGeckoCoin[] = await res1.json();

      // If filtering would reduce below 100, grab page 2 too.
      const tentativeClean = data1.filter(
        (coin) =>
          !STABLECOINS.includes(coin.symbol.toLowerCase()) &&
          !STABLECOINS.includes(coin.id.toLowerCase()) &&
          !isUsdPrefixed(coin.symbol)
      );

      let merged = data1;
      if (tentativeClean.length < 120) {
        const res2 = await safeFetch(page2Url, { timeoutMs: 12000, maxRetries: 2 });
        if (res2?.ok) {
          const data2: CoinGeckoCoin[] = await res2.json();
          merged = [...data1, ...data2];
        }
      }

      saveCachedTop100(merged);
      buildTop100(merged, "CoinGecko");
    } catch (err) {
      const cached = loadCachedTop100();
      if (cached) {
        buildTop100(cached, "Cache");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch - only for metadata
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Track live status from decentralized oracles ONLY
  useEffect(() => {
    const sources: string[] = [];
    
    if (oracle.pythConnected) {
      sources.push("Pyth Oracle");
    }
    if (oracle.chainlinkConnected) {
      sources.push("Chainlink Oracle");
    }
    
    setConnectedSources(sources);
    setIsLive(oracle.isLive);
  }, [oracle.isLive, oracle.pythConnected, oracle.chainlinkConnected]);

  // Persist live prices to localStorage for session restoration
  useEffect(() => {
    if (prices.length > 0 && isLive) {
      saveLivePrices(prices);
    }
  }, [prices, isLive, saveLivePrices]);

  const getPriceBySymbol = useCallback((symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [prices]);

  const getPriceById = useCallback((id: string): CryptoPrice | undefined => {
    return prices.find((p) => p.id === id);
  }, [prices]);

  return { 
    prices, 
    loading, 
    error, 
    connectedExchanges: connectedSources,
    isLive,
    getPriceBySymbol, 
    getPriceById, 
    refetch: fetchPrices,
    // Oracle status - fully decentralized
    oracleStatus: {
      isLive: oracle.isLive,
      primarySource: oracle.primarySource,
      pythConnected: oracle.pythConnected,
      diaConnected: oracle.diaConnected,
      redstoneConnected: oracle.redstoneConnected,
      // Legacy compatibility
      chainlinkConnected: oracle.diaConnected || oracle.chainlinkConnected || false,
    },
  };
};

// Dynamic symbol to ID mapping based on current prices
export const symbolToId: Record<string, string> = {};
