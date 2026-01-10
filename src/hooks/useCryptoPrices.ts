import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithRetry, safeFetch } from "@/lib/fetchWithRetry";

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

// CoinGecko ID to CoinCap ID mapping (they differ for many coins)
const COINGECKO_TO_COINCAP: Record<string, string> = {
  "bitcoin": "bitcoin",
  "ethereum": "ethereum",
  "tether": "tether",
  "ripple": "xrp",
  "solana": "solana",
  "binancecoin": "binance-coin",
  "dogecoin": "dogecoin",
  "usd-coin": "usd-coin",
  "cardano": "cardano",
  "tron": "tron",
  "avalanche-2": "avalanche",
  "chainlink": "chainlink",
  "the-open-network": "the-open-network",
  "shiba-inu": "shiba-inu",
  "sui": "sui",
  "stellar": "stellar",
  "polkadot": "polkadot",
  "hedera-hashgraph": "hedera-hashgraph",
  "bitcoin-cash": "bitcoin-cash",
  "unus-sed-leo": "unus-sed-leo",
  "litecoin": "litecoin",
  "cosmos": "cosmos",
  "uniswap": "uniswap",
  "near": "near-protocol",
  "ethereum-classic": "ethereum-classic",
  "aptos": "aptos",
  "render-token": "render-token",
  "vechain": "vechain",
  "internet-computer": "internet-computer",
  "matic-network": "polygon",
  "polygon": "polygon",
  "crypto-com-chain": "crypto-com-coin",
  "filecoin": "filecoin",
  "arbitrum": "arbitrum",
  "maker": "maker",
  "algorand": "algorand",
  "kaspa": "kaspa",
  "optimism": "optimism",
  "aave": "aave",
  "immutable-x": "immutable-x",
  "injective-protocol": "injective-protocol",
  "fantom": "fantom",
  "blockstack": "stacks",
  "stacks": "stacks",
  "monero": "monero",
  "theta-token": "theta",
  "the-graph": "the-graph",
  "dogwifcoin": "dogwifcoin",
  "bonk": "bonk",
  "pepe": "pepe",
  "floki": "floki-inu",
  "fetch-ai": "fetch-ai",
  "thorchain": "thorchain",
  "the-sandbox": "the-sandbox",
  "decentraland": "decentraland",
  "axie-infinity": "axie-infinity",
  "gala": "gala",
  "apecoin": "apecoin",
  "curve-dao-token": "curve-dao-token",
  "synthetix-network-token": "synthetix-network-token",
  "compound-governance-token": "compound",
  "lido-dao": "lido-dao",
  "ethereum-name-service": "ethereum-name-service",
  "eos": "eos",
  "tezos": "tezos",
  "neo": "neo",
  "kava": "kava",
  "zcash": "zcash",
  "dash": "dash",
  "elrond-erd-2": "elrond-erd-2",
  "flow": "flow",
  "mina-protocol": "mina",
  "oasis-network": "oasis-network",
  "harmony": "harmony",
  "zilliqa": "zilliqa",
  "enjincoin": "enjin-coin",
  "chiliz": "chiliz",
  "basic-attention-token": "basic-attention-token",
  "pancakeswap-token": "pancakeswap-token",
  "sushi": "sushiswap",
  "yearn-finance": "yearn-finance",
  "wrapped-bitcoin": "wrapped-bitcoin",
  "okb": "okb",
  "celestia": "celestia",
  "sei-network": "sei-network",
  "bittensor": "bittensor",
  "pyth-network": "pyth-network",
  "ordi": "ordi",
  "blur": "blur",
  "pendle": "pendle",
  "worldcoin-wld": "worldcoin-wld",
  "jupiter-exchange-solana": "jupiter-exchange-solana",
  "ondo-finance": "ondo-finance",
  "xdc-network": "xdc-network",
  "jasmy": "jasmy",
  "iota": "iota",
  "quant-network": "quant",
  "core": "core",
  "stepn": "green-metaverse-token",
  "starknet": "starknet-token",
  "notcoin": "notcoin",
  "zksync": "zksync",
  "eigenlayer": "eigenlayer",
  "popcat": "popcat-sol",
  "arweave": "arweave",
  "storj": "storj",
  "livepeer": "livepeer",
  "osmosis": "osmosis",
  "celo": "celo",
  "klaytn": "klaytn",
  "gmx": "gmx",
  "balancer": "balancer",
  "ocean-protocol": "ocean-protocol",
  "singularitynet": "singularitynet",
  "akash-network": "akash-network",
  "mantle": "mantle",
  "beam-2": "beam",
  "ronin": "ronin",
  "flare-networks": "flare-networks",
  "conflux-token": "conflux-network",
  "theta-fuel": "theta-fuel",
  "bittorrent": "bittorrent",
  "wink": "wink",
  "just": "just",
  "gomining-token": "gomining",
  "gomining": "gomining",
};

// No caching - always fetch fresh data from WebSocket
// CoinGecko is only used for initial metadata (images, names)

// Fallback prices are placeholders - will be replaced with live CoinGecko data
// These are only used for initial render before API data loads
const FALLBACK_CRYPTOS: CryptoPrice[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 1, circulating_supply: 19600000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 2, circulating_supply: 120000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 3, circulating_supply: 145000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 4, circulating_supply: 470000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 5, circulating_supply: 57000000000, lastUpdate: Date.now(), source: "Loading" },
];

// Exchange WebSocket endpoints - prioritize most reliable free sources
const EXCHANGES = {
  // Binance combined stream - most reliable, handles 100+ symbols
  binance: {
    url: "wss://stream.binance.com:9443/ws",
    combinedUrl: "wss://stream.binance.com:9443/stream?streams=",
    name: "Binance",
  },
  // Binance.US fallback for US users
  binanceUs: {
    url: "wss://stream.binance.us:9443/ws",
    combinedUrl: "wss://stream.binance.us:9443/stream?streams=",
    name: "BinanceUS",
  },
  // CoinCap - free, supports many altcoins
  coincap: {
    url: "wss://ws.coincap.io/prices?assets=",
    name: "CoinCap",
  },
  // Kraken - reliable for major pairs
  kraken: {
    url: "wss://ws.kraken.com",
    name: "Kraken",
  },
};

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedExchanges, setConnectedExchanges] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  // WebSocket refs - simplified to most reliable free sources
  const binanceWsRef = useRef<WebSocket | null>(null);
  const coincapWsRef = useRef<WebSocket | null>(null);
  const krakenWsRef = useRef<WebSocket | null>(null);
  
  const reconnectTimeoutsRef = useRef<Record<string, number>>({});
  const cryptoListRef = useRef<{ symbol: string; name: string; id: string }[]>([]);
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const coinIdMapRef = useRef<Map<string, string>>(new Map()); // CoinCap ID to symbol mapping
  const exchangesConnectedRef = useRef(false);
  
  // Throttle interval - minimum 2 seconds between updates per coin for readable UI
  const UPDATE_THROTTLE_MS = 2000;

  // Update price with source tracking and throttling for readable updates
  const updatePrice = useCallback((symbol: string, updates: Partial<CryptoPrice>, source: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    const now = Date.now();
    
    // Throttle updates - only update if enough time has passed
    const lastUpdate = lastUpdateTimeRef.current.get(normalizedSymbol) || 0;
    if (now - lastUpdate < UPDATE_THROTTLE_MS) {
      return; // Skip this update, too soon
    }
    
    lastUpdateTimeRef.current.set(normalizedSymbol, now);
    
    setPrices(prev => prev.map(coin => {
      if (coin.symbol === normalizedSymbol) {
        // Smart volume handling: WebSocket gives single-exchange volume which is always lower
        // than CoinGecko's aggregated multi-exchange volume
        let finalUpdates = { ...updates };
        
        if (updates.total_volume !== undefined && coin.total_volume > 0) {
          const volumeRatio = updates.total_volume / coin.total_volume;
          
          // Case 1: WebSocket volume is unreasonably low (< 5% of current) - ignore it
          if (volumeRatio < 0.05) {
            delete finalUpdates.total_volume;
          }
          // Case 2: WebSocket volume is significantly higher (> 120%) - could be a spike, use it
          else if (volumeRatio > 1.2) {
            finalUpdates.total_volume = updates.total_volume;
          }
          // Case 3: WebSocket volume is between 5% and 50% of current - blend conservatively
          // This handles single-exchange vs multi-exchange discrepancy
          else if (volumeRatio < 0.5) {
            // Keep mostly the CoinGecko value, slight movement for realism
            finalUpdates.total_volume = coin.total_volume * 0.95 + updates.total_volume * 0.05;
          }
          // Case 4: WebSocket volume is between 50% and 120% - normal range, blend moderately
          else {
            finalUpdates.total_volume = coin.total_volume * 0.8 + updates.total_volume * 0.2;
          }
        }
        
        const updated = {
          ...coin,
          ...finalUpdates,
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

  const fetchPrices = useCallback(async () => {
    // Initialize with fallback data immediately so UI is responsive
    if (prices.length === 0) {
      const fallbackWithTimestamp = FALLBACK_CRYPTOS.map((c) => ({ ...c, lastUpdate: Date.now() }));
      setPrices(fallbackWithTimestamp);
      fallbackWithTimestamp.forEach((p) => pricesRef.current.set(p.symbol, p));
      cryptoListRef.current = fallbackWithTimestamp.map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id,
      }));
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
      console.log(`[Top100] ✓ Loaded ${cryptoPrices.length} coins from ${source}`);
    };

    try {
      setLoading(true);

      // Fetch enough rows so that after filtering stablecoins/restakes we still have 100
      const page1Url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`;
      const page2Url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`;

      const res1 = await safeFetch(page1Url, { timeoutMs: 12000, maxRetries: 2 });

      if (!res1) {
        const cached = loadCachedTop100();
        if (cached) {
          buildTop100(cached, "Cache");
        } else {
          console.log("[CoinGecko] Fetch failed and no cache available");
        }
        return;
      }

      if (res1.status === 429) {
        const cached = loadCachedTop100();
        if (cached) {
          console.log("[CoinGecko] Rate limited, using cache");
          buildTop100(cached, "Cache");
        } else {
          console.log("[CoinGecko] Rate limited and no cache available");
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
      } else {
        console.log("[CoinGecko] Fetch failed, using fallback data");
      }
    } finally {
      setLoading(false);
    }
  }, [prices.length]);

  // Connect to CoinCap WebSocket - FREE, supports ALL cryptocurrencies
  const connectCoinCap = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (coincapWsRef.current) {
      try { coincapWsRef.current.close(); } catch (e) {}
    }

    try {
      // Build CoinCap asset list - convert CoinGecko IDs to CoinCap IDs
      const coincapIds: string[] = [];
      cryptoListRef.current.forEach(c => {
        const coincapId = COINGECKO_TO_COINCAP[c.id] || c.id;
        coincapIds.push(coincapId);
        coinIdMapRef.current.set(coincapId, c.symbol.toLowerCase());
        coinIdMapRef.current.set(c.id, c.symbol.toLowerCase());
      });
      
      const assetIds = coincapIds.join(",");
      const ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${assetIds}`);
      
      // Connection timeout
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`[CoinCap] Connection timeout, retrying...`);
          ws.close();
        }
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log(`[CoinCap] Connected successfully`);
        setConnectedExchanges(prev => 
          prev.includes("CoinCap") ? prev : [...prev, "CoinCap"]
        );
        setIsLive(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          Object.entries(data).forEach(([coinId, priceStr]) => {
            const symbol = coinIdMapRef.current.get(coinId);
            if (symbol && priceStr) {
              const price = parseFloat(priceStr as string);
              if (!isNaN(price) && price > 0) {
                updatePrice(symbol, {
                  current_price: price,
                }, "CoinCap");
              }
            }
          });
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = (e) => {
        clearTimeout(connectTimeout);
        console.log(`[CoinCap] WebSocket error, will retry...`);
      };
      
      ws.onclose = () => {
        clearTimeout(connectTimeout);
        setConnectedExchanges(prev => prev.filter(e => e !== "CoinCap"));
        
        // Exponential backoff
        const delay = Math.min(3000 + Math.random() * 2000, 8000);
        if (reconnectTimeoutsRef.current.coincap) {
          clearTimeout(reconnectTimeoutsRef.current.coincap);
        }
        reconnectTimeoutsRef.current.coincap = window.setTimeout(() => {
          connectCoinCap();
        }, delay);
      };
      
      coincapWsRef.current = ws;
    } catch (err) {
      console.log(`[CoinCap] Connection failed, retrying...`);
      setTimeout(() => connectCoinCap(), 3000);
    }
  }, [updatePrice]);

  // Connect to Binance WebSocket - Most reliable free source
  const connectBinance = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;

    // Close existing connection
    if (binanceWsRef.current) {
      try { binanceWsRef.current.close(); } catch (e) {}
    }

    const cryptoList = cryptoListRef.current;
    
    // Build combined stream for all symbols (Binance supports up to 1024 streams)
    const streams = cryptoList.slice(0, 100).map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join("/");
    
    try {
      const ws = new WebSocket(`${EXCHANGES.binance.combinedUrl}${streams}`);
      
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`[Binance] Connection timeout, trying fallback...`);
          ws.close();
          // Try Binance.US as fallback
          connectBinanceUS();
        }
      }, 8000);
      
      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log(`[Binance] ✓ Connected successfully`);
        setConnectedExchanges(prev => 
          prev.includes("Binance") ? prev : [...prev, "Binance"]
        );
        setIsLive(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const ticker = message.data;
            const symbol = ticker.s?.replace("USDT", "");
            
            if (symbol && ticker.c) {
              updatePrice(symbol, {
                current_price: parseFloat(ticker.c),
                price_change_percentage_24h: parseFloat(ticker.P || 0),
                high_24h: parseFloat(ticker.h || 0),
                low_24h: parseFloat(ticker.l || 0),
                total_volume: parseFloat(ticker.q || 0),
              }, "Binance");
            }
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        clearTimeout(connectTimeout);
      };
      
      ws.onclose = () => {
        clearTimeout(connectTimeout);
        setConnectedExchanges(prev => prev.filter(e => e !== "Binance"));
        
        const delay = 3000 + Math.random() * 2000;
        if (reconnectTimeoutsRef.current.binance) {
          clearTimeout(reconnectTimeoutsRef.current.binance);
        }
        reconnectTimeoutsRef.current.binance = window.setTimeout(() => {
          connectBinance();
        }, delay);
      };
      
      binanceWsRef.current = ws;
    } catch (err) {
      console.log(`[Binance] Connection failed, trying fallback...`);
      connectBinanceUS();
    }
  }, [updatePrice]);

  // Binance.US fallback
  const connectBinanceUS = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;

    const cryptoList = cryptoListRef.current;
    const streams = cryptoList.slice(0, 50).map(c => `${c.symbol.toLowerCase()}usd@ticker`).join("/");
    
    try {
      const ws = new WebSocket(`${EXCHANGES.binanceUs.combinedUrl}${streams}`);
      
      ws.onopen = () => {
        console.log(`[BinanceUS] ✓ Connected as fallback`);
        setConnectedExchanges(prev => 
          prev.includes("BinanceUS") ? prev : [...prev, "BinanceUS"]
        );
        setIsLive(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data) {
            const ticker = message.data;
            const symbol = ticker.s?.replace("USD", "");
            
            if (symbol && ticker.c) {
              updatePrice(symbol, {
                current_price: parseFloat(ticker.c),
                price_change_percentage_24h: parseFloat(ticker.P || 0),
                high_24h: parseFloat(ticker.h || 0),
                low_24h: parseFloat(ticker.l || 0),
              }, "BinanceUS");
            }
          }
        } catch (e) {}
      };
      
      ws.onclose = () => {
        setConnectedExchanges(prev => prev.filter(e => e !== "BinanceUS"));
      };
    } catch (err) {}
  }, [updatePrice]);

  // Connect to Kraken WebSocket with improved retry
  const connectKraken = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (krakenWsRef.current) {
      try { krakenWsRef.current.close(); } catch (e) {}
    }

    try {
      const ws = new WebSocket(EXCHANGES.kraken.url);
      
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log(`[Kraken] Connected successfully`);
        setConnectedExchanges(prev => 
          prev.includes("Kraken") ? prev : [...prev, "Kraken"]
        );
        setIsLive(true);
        
        const pairs = cryptoListRef.current.slice(0, 20).map(c => {
          const symbol = c.symbol === "BTC" ? "XBT" : c.symbol;
          return `${symbol}/USD`;
        });
        
        ws.send(JSON.stringify({
          event: "subscribe",
          pair: pairs,
          subscription: { name: "ticker" },
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (Array.isArray(message) && message.length >= 4) {
            const ticker = message[1];
            const pair = message[3] as string;
            
            if (ticker && pair) {
              let symbol = pair.replace("/USD", "").replace("XBT", "BTC");
              
              const price = parseFloat(ticker.c?.[0] || 0);
              const baseVolume = parseFloat(ticker.v?.[1] || 0);
              updatePrice(symbol, {
                current_price: price,
                high_24h: parseFloat(ticker.h?.[1] || 0),
                low_24h: parseFloat(ticker.l?.[1] || 0),
                total_volume: baseVolume * price,
              }, "Kraken");
            }
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        clearTimeout(connectTimeout);
      };
      
      ws.onclose = () => {
        clearTimeout(connectTimeout);
        setConnectedExchanges(prev => prev.filter(e => e !== "Kraken"));
        
        const delay = Math.min(4000 + Math.random() * 2000, 10000);
        if (reconnectTimeoutsRef.current.kraken) {
          clearTimeout(reconnectTimeoutsRef.current.kraken);
        }
        reconnectTimeoutsRef.current.kraken = window.setTimeout(() => {
          connectKraken();
        }, delay);
      };
      
      krakenWsRef.current = ws;
    } catch (err) {
      setTimeout(() => connectKraken(), 4000);
    }
  }, [updatePrice]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Connect to reliable free WebSockets when crypto list is populated
  useEffect(() => {
    const checkAndConnect = () => {
      if (cryptoListRef.current.length > 0 && !exchangesConnectedRef.current) {
        exchangesConnectedRef.current = true;
        
        // Priority: Binance first (most reliable), then CoinCap, then Kraken
        console.log('[WebSocket] Starting connections to free live feeds...');
        connectBinance();
        setTimeout(() => connectCoinCap(), 500);
        setTimeout(() => connectKraken(), 1000);
      }
    };
    
    checkAndConnect();
    const timeoutId = setTimeout(checkAndConnect, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      Object.values(reconnectTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      
      if (binanceWsRef.current) binanceWsRef.current.close();
      if (coincapWsRef.current) coincapWsRef.current.close();
      if (krakenWsRef.current) krakenWsRef.current.close();
    };
  }, [connectBinance, connectCoinCap, connectKraken]);

  // Track live status
  useEffect(() => {
    setIsLive(connectedExchanges.length > 0);
  }, [connectedExchanges]);

  // No polling - rely on real-time WebSocket data for 24h updates
  // Initial fetch provides market cap and other static data

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
    connectedExchanges,
    isLive,
    getPriceBySymbol, 
    getPriceById, 
    refetch: fetchPrices 
  };
};

// Dynamic symbol to ID mapping based on current prices
export const symbolToId: Record<string, string> = {};
