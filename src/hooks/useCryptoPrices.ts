import { useState, useEffect, useCallback, useRef } from "react";

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

// Cache for CoinGecko data to handle rate limits
let cachedData: CryptoPrice[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 300000; // 5 minute cache

const FALLBACK_CRYPTOS: CryptoPrice[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 97500, price_change_percentage_24h: 2.5, high_24h: 98000, low_24h: 95000, total_volume: 45000000000, market_cap: 1920000000000, market_cap_rank: 1, circulating_supply: 19600000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 3450, price_change_percentage_24h: 1.8, high_24h: 3500, low_24h: 3380, total_volume: 18000000000, market_cap: 415000000000, market_cap_rank: 2, circulating_supply: 120000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", current_price: 695, price_change_percentage_24h: 0.5, high_24h: 705, low_24h: 685, total_volume: 1200000000, market_cap: 101000000000, market_cap_rank: 3, circulating_supply: 145000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 195, price_change_percentage_24h: 3.2, high_24h: 198, low_24h: 188, total_volume: 3500000000, market_cap: 92000000000, market_cap_rank: 4, circulating_supply: 470000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", current_price: 2.35, price_change_percentage_24h: -1.2, high_24h: 2.42, low_24h: 2.28, total_volume: 8500000000, market_cap: 134000000000, market_cap_rank: 5, circulating_supply: 57000000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "cardano", symbol: "ada", name: "Cardano", image: "https://assets.coingecko.com/coins/images/975/large/cardano.png", current_price: 1.05, price_change_percentage_24h: 2.1, high_24h: 1.08, low_24h: 1.01, total_volume: 950000000, market_cap: 37000000000, market_cap_rank: 6, circulating_supply: 35000000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", current_price: 0.38, price_change_percentage_24h: 4.5, high_24h: 0.39, low_24h: 0.36, total_volume: 2800000000, market_cap: 56000000000, market_cap_rank: 7, circulating_supply: 147000000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png", current_price: 42, price_change_percentage_24h: 1.9, high_24h: 43, low_24h: 40, total_volume: 650000000, market_cap: 17000000000, market_cap_rank: 8, circulating_supply: 405000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "chainlink", symbol: "link", name: "Chainlink", image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png", current_price: 23, price_change_percentage_24h: 0.8, high_24h: 24, low_24h: 22, total_volume: 580000000, market_cap: 14500000000, market_cap_rank: 9, circulating_supply: 630000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "polkadot", symbol: "dot", name: "Polkadot", image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png", current_price: 8.5, price_change_percentage_24h: -0.5, high_24h: 8.8, low_24h: 8.2, total_volume: 320000000, market_cap: 12500000000, market_cap_rank: 10, circulating_supply: 1470000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "sui", symbol: "sui", name: "Sui", image: "https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg", current_price: 4.2, price_change_percentage_24h: 5.2, high_24h: 4.35, low_24h: 3.95, total_volume: 1200000000, market_cap: 13000000000, market_cap_rank: 11, circulating_supply: 3100000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "toncoin", symbol: "ton", name: "Toncoin", image: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png", current_price: 5.8, price_change_percentage_24h: 1.5, high_24h: 5.95, low_24h: 5.65, total_volume: 280000000, market_cap: 14500000000, market_cap_rank: 12, circulating_supply: 2500000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "gomining", symbol: "gomining", name: "GoMining", image: "https://assets.coingecko.com/coins/images/21085/large/gomining.png", current_price: 0.85, price_change_percentage_24h: 3.8, high_24h: 0.88, low_24h: 0.81, total_volume: 15000000, market_cap: 180000000, market_cap_rank: 13, circulating_supply: 212000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "kaspa", symbol: "kas", name: "Kaspa", image: "https://assets.coingecko.com/coins/images/25751/large/kaspa-icon-exchanges.png", current_price: 0.12, price_change_percentage_24h: 2.3, high_24h: 0.125, low_24h: 0.115, total_volume: 85000000, market_cap: 2900000000, market_cap_rank: 14, circulating_supply: 24000000000, lastUpdate: Date.now(), source: "Fallback" },
  { id: "render-token", symbol: "render", name: "Render", image: "https://assets.coingecko.com/coins/images/11636/large/rndr.png", current_price: 8.5, price_change_percentage_24h: 4.1, high_24h: 8.75, low_24h: 8.1, total_volume: 320000000, market_cap: 4400000000, market_cap_rank: 15, circulating_supply: 520000000, lastUpdate: Date.now(), source: "Fallback" },
];

// Exchange WebSocket endpoints
const EXCHANGES = {
  binance: {
    url: "wss://stream.binance.com:9443/stream?streams=",
    name: "Binance",
  },
  bybit: {
    url: "wss://stream.bybit.com/v5/public/spot",
    name: "Bybit",
  },
  okx: {
    url: "wss://ws.okx.com:8443/ws/v5/public",
    name: "OKX",
  },
  coinbase: {
    url: "wss://ws-feed.exchange.coinbase.com",
    name: "Coinbase",
  },
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
  
  // WebSocket refs for each exchange
  const binanceWsRefs = useRef<WebSocket[]>([]);
  const bybitWsRef = useRef<WebSocket | null>(null);
  const okxWsRef = useRef<WebSocket | null>(null);
  const coinbaseWsRef = useRef<WebSocket | null>(null);
  const krakenWsRef = useRef<WebSocket | null>(null);
  
  const reconnectTimeoutsRef = useRef<Record<string, number>>({});
  const cryptoListRef = useRef<{ symbol: string; name: string; id: string }[]>([]);
  const pricesRef = useRef<Map<string, CryptoPrice>>(new Map());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  
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

  const fetchPrices = useCallback(async (retryCount = 0) => {
    // Check cache first
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      setPrices(cachedData);
      cachedData.forEach(p => pricesRef.current.set(p.symbol, p));
      cryptoListRef.current = cachedData.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id
      }));
      setLoading(false);
      return;
    }

    // Initialize with fallback data immediately so UI is responsive
    if (prices.length === 0) {
      const fallbackWithTimestamp = FALLBACK_CRYPTOS.map(c => ({ ...c, lastUpdate: Date.now() }));
      setPrices(fallbackWithTimestamp);
      fallbackWithTimestamp.forEach(p => pricesRef.current.set(p.symbol, p));
      cryptoListRef.current = fallbackWithTimestamp.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id
      }));
    }

    try {
      setLoading(true);
      
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Fetch top 150 from CoinGecko to ensure we get 100 after filtering stablecoins
      const response = await fetch(
        `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&sparkline=false`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        // Rate limited - use cache or fallback
        if (cachedData) {
          setPrices(cachedData);
        }
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch from CoinGecko");
      }
      
      const data: CoinGeckoCoin[] = await response.json();
      
      // Filter out stablecoins, restake assets, and USD-prefixed tokens
      const cleanData = data.filter(coin => 
        !STABLECOINS.includes(coin.symbol.toLowerCase()) && 
        !STABLECOINS.includes(coin.id.toLowerCase()) &&
        !isUsdPrefixed(coin.symbol)
      );
      
      // Sort by market cap descending to maintain accurate ranking
      const sortedData = cleanData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
      
      // Take top 100 by market cap
      const filteredData = sortedData.slice(0, 100);
      
      // Store the crypto list for WebSocket connections
      cryptoListRef.current = filteredData.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id
      }));
      
      const cryptoPrices: CryptoPrice[] = filteredData.map((coin, index) => ({
        id: coin.id,
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0,
        high_24h: coin.high_24h || 0,
        low_24h: coin.low_24h || 0,
        total_volume: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        market_cap_rank: coin.market_cap_rank || (index + 1),
        circulating_supply: coin.circulating_supply || 0,
        lastUpdate: Date.now(),
        source: "CoinGecko",
      }));
      
      // Update cache
      cachedData = cryptoPrices;
      cacheTimestamp = Date.now();
      
      // Initialize price map
      cryptoPrices.forEach(p => pricesRef.current.set(p.symbol, p));
      
      setPrices(cryptoPrices);
      setError(null);
    } catch (err) {
      // Silent error - we have fallback data
      if (cachedData) {
        setPrices(cachedData);
      }
    } finally {
      setLoading(false);
    }
  }, [prices.length]);

  // Connect to Binance WebSocket
  const connectBinance = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;

    // Close existing connections
    binanceWsRefs.current.forEach(ws => ws.close());
    binanceWsRefs.current = [];

    const cryptoList = cryptoListRef.current;
    
    // Split into chunks of 50 for Binance limits
    const chunks = [
      cryptoList.slice(0, 50),
      cryptoList.slice(50, 100),
    ].filter(chunk => chunk.length > 0);

    chunks.forEach((chunk, index) => {
      const streams = chunk.map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join("/");
      
      try {
        const ws = new WebSocket(`${EXCHANGES.binance.url}${streams}`);
        
        ws.onopen = () => {
          setConnectedExchanges(prev => 
            prev.includes("Binance") ? prev : [...prev, "Binance"]
          );
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.data) {
              const ticker = message.data;
              const symbol = ticker.s.replace("USDT", "");
              
              // Note: We don't update total_volume from WebSocket as it only provides
              // single exchange pair volume, not aggregated market volume
              updatePrice(symbol, {
                current_price: parseFloat(ticker.c),
                price_change_percentage_24h: parseFloat(ticker.P),
                high_24h: parseFloat(ticker.h),
                low_24h: parseFloat(ticker.l),
              }, "Binance");
            }
          } catch (e) {
            // Silent parse errors
          }
        };
        
        ws.onerror = () => {
          // Silent - will reconnect on close
        };
        
          ws.onclose = () => {
          setConnectedExchanges(prev => prev.filter(e => e !== "Binance"));
          
          // Reconnect after delay
          if (reconnectTimeoutsRef.current.binance) {
            clearTimeout(reconnectTimeoutsRef.current.binance);
          }
          reconnectTimeoutsRef.current.binance = window.setTimeout(() => {
            connectBinance();
          }, 2000);
        };
        
        binanceWsRefs.current.push(ws);
      } catch (err) {
        // Silent connection errors
      }
    });
  }, [updatePrice]);

  // Connect to Bybit WebSocket
  const connectBybit = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (bybitWsRef.current) {
      bybitWsRef.current.close();
    }

    try {
      const ws = new WebSocket(EXCHANGES.bybit.url);
      
      ws.onopen = () => {
        setConnectedExchanges(prev => 
          prev.includes("Bybit") ? prev : [...prev, "Bybit"]
        );
        
        // Subscribe to tickers for top cryptos
        const symbols = cryptoListRef.current.slice(0, 50).map(c => `tickers.${c.symbol}USDT`);
        ws.send(JSON.stringify({
          op: "subscribe",
          args: symbols,
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.topic && message.topic.startsWith("tickers.") && message.data) {
            const ticker = message.data;
            const symbol = ticker.symbol?.replace("USDT", "") || message.topic.replace("tickers.", "").replace("USDT", "");
            
            if (ticker.lastPrice) {
              // Note: We don't update total_volume from WebSocket as it only provides
              // single exchange pair volume, not aggregated market volume
              updatePrice(symbol, {
                current_price: parseFloat(ticker.lastPrice),
                price_change_percentage_24h: parseFloat(ticker.price24hPcnt || 0) * 100,
                high_24h: parseFloat(ticker.highPrice24h || 0),
                low_24h: parseFloat(ticker.lowPrice24h || 0),
              }, "Bybit");
            }
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        // Silent - will reconnect on close
      };
      
      ws.onclose = () => {
        setConnectedExchanges(prev => prev.filter(e => e !== "Bybit"));
        
        if (reconnectTimeoutsRef.current.bybit) {
          clearTimeout(reconnectTimeoutsRef.current.bybit);
        }
        reconnectTimeoutsRef.current.bybit = window.setTimeout(() => {
          connectBybit();
        }, 3000);
      };
      
      bybitWsRef.current = ws;
    } catch (err) {
      // Silent connection errors
    }
  }, [updatePrice]);

  // Connect to OKX WebSocket
  const connectOKX = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (okxWsRef.current) {
      okxWsRef.current.close();
    }

    try {
      const ws = new WebSocket(EXCHANGES.okx.url);
      
      ws.onopen = () => {
        setConnectedExchanges(prev => 
          prev.includes("OKX") ? prev : [...prev, "OKX"]
        );
        
        // Subscribe to tickers for top cryptos
        const args = cryptoListRef.current.slice(0, 50).map(c => ({
          channel: "tickers",
          instId: `${c.symbol}-USDT`,
        }));
        
        ws.send(JSON.stringify({
          op: "subscribe",
          args,
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data && Array.isArray(message.data)) {
            message.data.forEach((ticker: any) => {
              if (ticker.instId) {
                const symbol = ticker.instId.replace("-USDT", "");
                
                // Note: We don't update total_volume from WebSocket as it only provides
                // single exchange pair volume, not aggregated market volume
                updatePrice(symbol, {
                  current_price: parseFloat(ticker.last || 0),
                  price_change_percentage_24h: parseFloat(ticker.sodUtc8 || 0) 
                    ? ((parseFloat(ticker.last) - parseFloat(ticker.sodUtc8)) / parseFloat(ticker.sodUtc8)) * 100 
                    : 0,
                  high_24h: parseFloat(ticker.high24h || 0),
                  low_24h: parseFloat(ticker.low24h || 0),
                }, "OKX");
              }
            });
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        // Silent - will reconnect on close
      };
      
      ws.onclose = () => {
        setConnectedExchanges(prev => prev.filter(e => e !== "OKX"));
        
        if (reconnectTimeoutsRef.current.okx) {
          clearTimeout(reconnectTimeoutsRef.current.okx);
        }
        reconnectTimeoutsRef.current.okx = window.setTimeout(() => {
          connectOKX();
        }, 3000);
      };
      
      okxWsRef.current = ws;
    } catch (err) {
      // Silent connection errors
    }
  }, [updatePrice]);

  // Connect to Coinbase WebSocket
  const connectCoinbase = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (coinbaseWsRef.current) {
      coinbaseWsRef.current.close();
    }

    try {
      const ws = new WebSocket(EXCHANGES.coinbase.url);
      
      ws.onopen = () => {
        setConnectedExchanges(prev => 
          prev.includes("Coinbase") ? prev : [...prev, "Coinbase"]
        );
        
        // Subscribe to ticker for top cryptos
        const productIds = cryptoListRef.current.slice(0, 30).map(c => `${c.symbol}-USD`);
        
        ws.send(JSON.stringify({
          type: "subscribe",
          product_ids: productIds,
          channels: ["ticker"],
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ticker" && message.product_id) {
            const symbol = message.product_id.replace("-USD", "");
            
            // Note: We don't update total_volume from WebSocket as it only provides
            // single exchange pair volume, not aggregated market volume
            updatePrice(symbol, {
              current_price: parseFloat(message.price || 0),
              high_24h: parseFloat(message.high_24h || 0),
              low_24h: parseFloat(message.low_24h || 0),
            }, "Coinbase");
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        // Silent - will reconnect on close
      };
      
      ws.onclose = () => {
        setConnectedExchanges(prev => prev.filter(e => e !== "Coinbase"));
        
        if (reconnectTimeoutsRef.current.coinbase) {
          clearTimeout(reconnectTimeoutsRef.current.coinbase);
        }
        reconnectTimeoutsRef.current.coinbase = window.setTimeout(() => {
          connectCoinbase();
        }, 3000);
      };
      
      coinbaseWsRef.current = ws;
    } catch (err) {
      // Silent connection errors
    }
  }, [updatePrice]);

  // Connect to Kraken WebSocket  
  const connectKraken = useCallback(() => {
    if (cryptoListRef.current.length === 0) return;
    
    if (krakenWsRef.current) {
      krakenWsRef.current.close();
    }

    try {
      const ws = new WebSocket(EXCHANGES.kraken.url);
      
      ws.onopen = () => {
        setConnectedExchanges(prev => 
          prev.includes("Kraken") ? prev : [...prev, "Kraken"]
        );
        
        // Subscribe to ticker for top cryptos - Kraken uses XBT for BTC
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
              
              // Note: We don't update total_volume from WebSocket as it only provides
              // single exchange pair volume, not aggregated market volume
              updatePrice(symbol, {
                current_price: parseFloat(ticker.c?.[0] || 0),
                high_24h: parseFloat(ticker.h?.[1] || 0),
                low_24h: parseFloat(ticker.l?.[1] || 0),
              }, "Kraken");
            }
          }
        } catch (e) {
          // Silent parse errors
        }
      };
      
      ws.onerror = () => {
        // Silent - will reconnect on close
      };
      
      ws.onclose = () => {
        setConnectedExchanges(prev => prev.filter(e => e !== "Kraken"));
        
        if (reconnectTimeoutsRef.current.kraken) {
          clearTimeout(reconnectTimeoutsRef.current.kraken);
        }
        reconnectTimeoutsRef.current.kraken = window.setTimeout(() => {
          connectKraken();
        }, 3000);
      };
      
      krakenWsRef.current = ws;
    } catch (err) {
      // Silent connection errors
    }
  }, [updatePrice]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Connect to all exchanges when prices are loaded
  useEffect(() => {
    if (prices.length > 0) {
      // Stagger connections to avoid overwhelming
      connectBinance();
      setTimeout(() => connectBybit(), 500);
      setTimeout(() => connectOKX(), 1000);
      setTimeout(() => connectCoinbase(), 1500);
      setTimeout(() => connectKraken(), 2000);
    }
    
    return () => {
      // Cleanup all connections
      Object.values(reconnectTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      
      binanceWsRefs.current.forEach(ws => ws.close());
      if (bybitWsRef.current) bybitWsRef.current.close();
      if (okxWsRef.current) okxWsRef.current.close();
      if (coinbaseWsRef.current) coinbaseWsRef.current.close();
      if (krakenWsRef.current) krakenWsRef.current.close();
    };
  }, [prices.length, connectBinance, connectBybit, connectOKX, connectCoinbase, connectKraken]);

  // Track live status
  useEffect(() => {
    setIsLive(connectedExchanges.length > 0);
  }, [connectedExchanges]);

  // Periodic refresh from CoinGecko for market cap and other data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
    }, 60000); // Every 60 seconds
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

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
