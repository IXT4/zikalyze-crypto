import { useState, useEffect, useRef, useCallback } from "react";

interface BinanceLivePrice {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  lastUpdate: number;
  isLive: boolean;
  source: string;
}

// Multiple WebSocket endpoints for redundancy
const WS_ENDPOINTS = [
  "wss://stream.binance.com:9443/ws",
  "wss://stream.binance.com:443/ws",
  "wss://fstream.binance.com/ws",
];

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export const useBinanceLivePrice = (symbol: string, fallbackPrice?: number, fallbackChange?: number) => {
  const [liveData, setLiveData] = useState<BinanceLivePrice>({
    price: fallbackPrice || 0,
    change24h: fallbackChange || 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    lastUpdate: Date.now(),
    isLive: false,
    source: "initializing",
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const currentEndpointIndexRef = useRef(0);
  const hasConnectedOnceRef = useRef(false);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Clean up existing connection silently
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

    const normalizedSymbol = symbol.toUpperCase();
    const pair = `${normalizedSymbol}USDT`;
    
    // Cycle through endpoints on reconnect attempts
    const endpointIndex = currentEndpointIndexRef.current % WS_ENDPOINTS.length;
    const baseUrl = WS_ENDPOINTS[endpointIndex];
    const streamUrl = `${baseUrl}/${pair.toLowerCase()}@ticker`;

    try {
      const ws = new WebSocket(streamUrl);
      wsRef.current = ws;

      // Connection timeout - if not connected within 10s, try next endpoint
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        clearTimeout(connectionTimeout);
        
        // Reset reconnect state on successful connection
        reconnectAttemptsRef.current = 0;
        hasConnectedOnceRef.current = true;
        
        console.log(`✅ Live price feed connected for ${pair}`);
        setLiveData(prev => ({ ...prev, isLive: true, source: "Live Feed" }));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Binance ticker format
          // c: last price, P: 24h change %, h: high, l: low, q: quote volume
          if (data.c) {
            setLiveData({
              price: parseFloat(data.c),
              change24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume: parseFloat(data.q),
              lastUpdate: Date.now(),
              isLive: true,
              source: "Live Feed",
            });
          }
        } catch {
          // Silent parse error
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        // Error handled in onclose
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        if (!isMountedRef.current) return;
        
        reconnectAttemptsRef.current++;
        
        // Check if we should keep trying
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            MAX_RECONNECT_DELAY
          );
          
          // Try next endpoint on failures
          if (reconnectAttemptsRef.current >= 2) {
            currentEndpointIndexRef.current++;
          }
          
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            source: `reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})` 
          }));
          
          // Reconnect after delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          // Max attempts reached - use fallback data
          console.log(`📡 Using cached data for ${pair} (WebSocket unavailable)`);
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            source: "cached",
            price: fallbackPrice || prev.price,
            change24h: fallbackChange || prev.change24h,
          }));
          
          // Try again after a longer delay (1 minute)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              reconnectAttemptsRef.current = 0;
              currentEndpointIndexRef.current = 0;
              connect();
            }
          }, 60000);
        }
      };
    } catch {
      // Failed to create WebSocket - use fallback
      setLiveData(prev => ({ 
        ...prev, 
        isLive: false, 
        source: "cached",
        price: fallbackPrice || prev.price,
      }));
    }
  }, [symbol, fallbackPrice, fallbackChange]);

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;
    currentEndpointIndexRef.current = 0;
    
    // Small delay before connecting to avoid race conditions
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 500);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          wsRef.current.close();
        } catch {
          // Ignore cleanup errors
        }
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

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
