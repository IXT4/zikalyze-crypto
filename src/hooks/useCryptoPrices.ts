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
const CACHE_DURATION = 60000; // 1 minute cache for fresher data

// Fallback prices are placeholders - will be replaced with live CoinGecko data
// These are only used for initial render before API data loads
const FALLBACK_CRYPTOS: CryptoPrice[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 1, circulating_supply: 19600000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 2, circulating_supply: 120000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 3, circulating_supply: 145000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 4, circulating_supply: 470000000, lastUpdate: Date.now(), source: "Loading" },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", current_price: 0, price_change_percentage_24h: 0, high_24h: 0, low_24h: 0, total_volume: 0, market_cap: 0, market_cap_rank: 5, circulating_supply: 57000000000, lastUpdate: Date.now(), source: "Loading" },
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
  }, []);

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
              
              // Volume from WebSocket is single-exchange - handled smartly by updatePrice
              updatePrice(symbol, {
                current_price: parseFloat(ticker.c),
                price_change_percentage_24h: parseFloat(ticker.P),
                high_24h: parseFloat(ticker.h),
                low_24h: parseFloat(ticker.l),
                total_volume: parseFloat(ticker.q), // Quote volume in USD
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
              // Volume from WebSocket is single-exchange - handled smartly by updatePrice
              updatePrice(symbol, {
                current_price: parseFloat(ticker.lastPrice),
                price_change_percentage_24h: parseFloat(ticker.price24hPcnt || 0) * 100,
                high_24h: parseFloat(ticker.highPrice24h || 0),
                low_24h: parseFloat(ticker.lowPrice24h || 0),
                total_volume: parseFloat(ticker.turnover24h || 0),
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
                
                // Volume from WebSocket is single-exchange - handled smartly by updatePrice
                updatePrice(symbol, {
                  current_price: parseFloat(ticker.last || 0),
                  price_change_percentage_24h: parseFloat(ticker.sodUtc8 || 0) 
                    ? ((parseFloat(ticker.last) - parseFloat(ticker.sodUtc8)) / parseFloat(ticker.sodUtc8)) * 100 
                    : 0,
                  high_24h: parseFloat(ticker.high24h || 0),
                  low_24h: parseFloat(ticker.low24h || 0),
                  total_volume: parseFloat(ticker.volCcy24h || 0),
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
            
            // Volume from WebSocket is single-exchange - handled smartly by updatePrice
            updatePrice(symbol, {
              current_price: parseFloat(message.price || 0),
              high_24h: parseFloat(message.high_24h || 0),
              low_24h: parseFloat(message.low_24h || 0),
              total_volume: parseFloat(message.volume_24h || 0) * parseFloat(message.price || 0), // Convert to USD
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
              
              // Volume from WebSocket is single-exchange - handled smartly by updatePrice
              // Kraken v[1] is 24h volume in base currency, multiply by price for USD
              const price = parseFloat(ticker.c?.[0] || 0);
              const baseVolume = parseFloat(ticker.v?.[1] || 0);
              updatePrice(symbol, {
                current_price: price,
                high_24h: parseFloat(ticker.h?.[1] || 0),
                low_24h: parseFloat(ticker.l?.[1] || 0),
                total_volume: baseVolume * price, // Convert to USD value
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

  // Connect to all exchanges when crypto list is populated (runs only once)
  useEffect(() => {
    // Check if we should connect (only when cryptoListRef has data)
    const checkAndConnect = () => {
      if (cryptoListRef.current.length > 0 && !exchangesConnectedRef.current) {
        exchangesConnectedRef.current = true;
        
        // Stagger connections to avoid overwhelming
        connectBinance();
        setTimeout(() => connectBybit(), 500);
        setTimeout(() => connectOKX(), 1000);
        setTimeout(() => connectCoinbase(), 1500);
        setTimeout(() => connectKraken(), 2000);
      }
    };
    
    // Check immediately and also after a small delay (in case fetch is still in progress)
    checkAndConnect();
    const timeoutId = setTimeout(checkAndConnect, 1000);
    
    return () => {
      clearTimeout(timeoutId);
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
  }, [connectBinance, connectBybit, connectOKX, connectCoinbase, connectKraken]);

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
