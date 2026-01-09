import { useState, useEffect, useRef, useCallback } from "react";

interface LivePriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  lastUpdate: number;
  isLive: boolean;
  isConnecting: boolean;
}

// Multi-exchange WebSocket configuration
const EXCHANGES = {
  binance: {
    name: "Binance",
    endpoints: [
      "wss://stream.binance.com:9443/ws",
      "wss://stream.binance.com:443/ws",
    ],
    getStreamUrl: (symbol: string, endpoint: string) => 
      `${endpoint}/${symbol.toLowerCase()}usdt@ticker`,
    parseMessage: (data: any) => {
      if (data.c) {
        return {
          price: parseFloat(data.c),
          change24h: parseFloat(data.P),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          volume: parseFloat(data.q),
        };
      }
      return null;
    },
  },
  coinbase: {
    name: "Coinbase",
    endpoints: ["wss://ws-feed.exchange.coinbase.com"],
    getStreamUrl: (_symbol: string, endpoint: string) => endpoint,
    getSubscribeMessage: (symbol: string) => ({
      type: "subscribe",
      product_ids: [`${symbol.toUpperCase()}-USD`],
      channels: ["ticker"],
    }),
    parseMessage: (data: any, symbol: string) => {
      if (data.type === "ticker" && data.product_id === `${symbol.toUpperCase()}-USD`) {
        const price = parseFloat(data.price);
        const open24h = parseFloat(data.open_24h);
        const change24h = open24h ? ((price - open24h) / open24h) * 100 : 0;
        return {
          price,
          change24h,
          high24h: parseFloat(data.high_24h) || 0,
          low24h: parseFloat(data.low_24h) || 0,
          volume: parseFloat(data.volume_24h) * price || 0,
        };
      }
      return null;
    },
  },
  kraken: {
    name: "Kraken",
    endpoints: ["wss://ws.kraken.com"],
    getStreamUrl: (_symbol: string, endpoint: string) => endpoint,
    getSubscribeMessage: (symbol: string) => {
      // Kraken uses XBT for Bitcoin
      const krakenSymbol = symbol.toUpperCase() === "BTC" ? "XBT" : symbol.toUpperCase();
      return {
        event: "subscribe",
        pair: [`${krakenSymbol}/USD`],
        subscription: { name: "ticker" },
      };
    },
    parseMessage: (data: any, symbol: string) => {
      // Kraken ticker format: [channelID, tickerData, channelName, pair]
      if (Array.isArray(data) && data.length >= 4 && data[2] === "ticker") {
        const ticker = data[1];
        if (ticker && ticker.c) {
          const price = parseFloat(ticker.c[0]);
          const open = parseFloat(ticker.o[1]); // Today's opening price
          const change24h = open ? ((price - open) / open) * 100 : 0;
          return {
            price,
            change24h,
            high24h: parseFloat(ticker.h[1]) || 0,
            low24h: parseFloat(ticker.l[1]) || 0,
            volume: parseFloat(ticker.v[1]) * price || 0,
          };
        }
      }
      return null;
    },
  },
};

type ExchangeKey = keyof typeof EXCHANGES;
const EXCHANGE_ORDER: ExchangeKey[] = ["binance", "coinbase", "kraken"];

const MAX_ATTEMPTS_PER_EXCHANGE = 3;
const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 1500;
const FALLBACK_RETRY_DELAY = 30000;

export const useBinanceLivePrice = (symbol: string, fallbackPrice?: number, fallbackChange?: number) => {
  const [liveData, setLiveData] = useState<LivePriceData>({
    price: fallbackPrice || 0,
    change24h: fallbackChange || 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    lastUpdate: Date.now(),
    isLive: false,
    isConnecting: true,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Exchange rotation state
  const currentExchangeIndexRef = useRef(0);
  const currentEndpointIndexRef = useRef(0);
  const attemptsOnCurrentExchangeRef = useRef(0);
  const hasConnectedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      } catch {
        // Ignore cleanup errors
      }
      wsRef.current = null;
    }
  }, []);

  const moveToNextExchange = useCallback(() => {
    attemptsOnCurrentExchangeRef.current = 0;
    currentEndpointIndexRef.current = 0;
    currentExchangeIndexRef.current++;
    
    if (currentExchangeIndexRef.current >= EXCHANGE_ORDER.length) {
      // All exchanges exhausted - reset and try again later
      currentExchangeIndexRef.current = 0;
      return false;
    }
    return true;
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    cleanup();

    const exchangeKey = EXCHANGE_ORDER[currentExchangeIndexRef.current];
    const exchange = EXCHANGES[exchangeKey];
    const endpointIndex = currentEndpointIndexRef.current % exchange.endpoints.length;
    const endpoint = exchange.endpoints[endpointIndex];
    
    const streamUrl = exchange.getStreamUrl(symbol, endpoint);

    try {
      const ws = new WebSocket(streamUrl);
      wsRef.current = ws;

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Send subscribe message if needed (Coinbase, Kraken)
        if ('getSubscribeMessage' in exchange) {
          const subscribeMsg = exchange.getSubscribeMessage(symbol);
          ws.send(JSON.stringify(subscribeMsg));
        }

        // Reset state on successful connection
        attemptsOnCurrentExchangeRef.current = 0;
        hasConnectedRef.current = true;
        
        setLiveData(prev => ({ 
          ...prev, 
          isLive: true, 
          isConnecting: false,
        }));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          const parsed = exchange.parseMessage(data, symbol);
          
          if (parsed) {
            setLiveData({
              price: parsed.price,
              change24h: parsed.change24h,
              high24h: parsed.high24h,
              low24h: parsed.low24h,
              volume: parsed.volume,
              lastUpdate: Date.now(),
              isLive: true,
              isConnecting: false,
            });
          }
        } catch {
          // Silent parse error
        }
      };

      ws.onerror = () => {
        // Error handled in onclose
      };

      ws.onclose = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        if (!isMountedRef.current) return;
        
        attemptsOnCurrentExchangeRef.current++;
        
        // Try next endpoint on same exchange
        if (attemptsOnCurrentExchangeRef.current < MAX_ATTEMPTS_PER_EXCHANGE) {
          currentEndpointIndexRef.current++;
          
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: true,
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, RECONNECT_DELAY);
          return;
        }
        
        // Move to next exchange
        if (moveToNextExchange()) {
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: true,
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, RECONNECT_DELAY);
        } else {
          // All exchanges exhausted - use cached data
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: false,
            price: fallbackPrice || prev.price,
            change24h: fallbackChange || prev.change24h,
          }));
          
          // Retry from first exchange after delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              currentExchangeIndexRef.current = 0;
              currentEndpointIndexRef.current = 0;
              attemptsOnCurrentExchangeRef.current = 0;
              connect();
            }
          }, FALLBACK_RETRY_DELAY);
        }
      };
    } catch {
      // Failed to create WebSocket - silently retry
      setLiveData(prev => ({ 
        ...prev, 
        isLive: false, 
        isConnecting: true,
      }));
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) connect();
      }, RECONNECT_DELAY);
    }
  }, [symbol, fallbackPrice, fallbackChange, cleanup, moveToNextExchange]);

  useEffect(() => {
    isMountedRef.current = true;
    currentExchangeIndexRef.current = 0;
    currentEndpointIndexRef.current = 0;
    attemptsOnCurrentExchangeRef.current = 0;
    hasConnectedRef.current = false;
    
    // Small delay before connecting
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, [connect, cleanup]);

  // Update with fallback data when props change and not live
  useEffect(() => {
    if (!liveData.isLive) {
      setLiveData(prev => ({ 
        ...prev, 
        price: fallbackPrice || prev.price,
        change24h: fallbackChange || prev.change24h,
      }));
    }
  }, [fallbackPrice, fallbackChange, liveData.isLive]);

  return liveData;
};
