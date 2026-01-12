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
  source: string;
}

// Supabase project URL for WebSocket proxy
const SUPABASE_PROJECT_ID = "eqtzrftndyninwasclfd";
const WS_PROXY_URL = `wss://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/crypto-ws-proxy`;

const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useKrakenLivePrice = (symbol: string, fallbackPrice?: number, fallbackChange?: number) => {
  const [liveData, setLiveData] = useState<LivePriceData>({
    price: fallbackPrice || 0,
    change24h: fallbackChange || 0,
    high24h: 0,
    low24h: 0,
    volume: 0,
    lastUpdate: Date.now(),
    isLive: false,
    isConnecting: true,
    source: 'initializing',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

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

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    cleanup();

    // Use Kraken via WebSocket proxy
    const wsUrl = `${WS_PROXY_URL}?symbol=${symbol.toUpperCase()}`;
    const sourceName = 'Kraken';

    console.log(`[KrakenLive] Connecting for ${symbol}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`[KrakenLive] Connection timeout for ${symbol}`);
          ws.close();
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        console.log(`[KrakenLive] Connected for ${symbol}`);
        reconnectAttemptsRef.current = 0;
        
        setLiveData(prev => ({ 
          ...prev, 
          isLive: true, 
          isConnecting: false,
          source: sourceName,
        }));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle Kraken ticker format from proxy
          if (data.type === 'ticker' && data.source === 'kraken') {
            setLiveData({
              price: data.price,
              change24h: data.change24h,
              high24h: data.high24h,
              low24h: data.low24h,
              volume: data.volume,
              lastUpdate: Date.now(),
              isLive: true,
              isConnecting: false,
              source: 'Kraken',
            });
            return;
          }
          
          // Handle connection confirmation
          if (data.type === 'connected') {
            console.log(`[KrakenLive] Confirmed connection for ${symbol} via ${data.source}`);
            return;
          }
        } catch {
          // Silent parse error
        }
      };

      ws.onerror = (error) => {
        console.log(`[KrakenLive] WebSocket error for ${symbol}:`, error);
      };

      ws.onclose = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        if (!isMountedRef.current) return;
        
        console.log(`[KrakenLive] Disconnected for ${symbol}`);
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: true,
          }));
          
          const delay = RECONNECT_DELAY * Math.min(reconnectAttemptsRef.current + 1, 3);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, delay);
        } else {
          // Max attempts reached - use fallback data
          setLiveData(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: false,
            price: fallbackPrice || prev.price,
            change24h: fallbackChange || prev.change24h,
            source: 'Cached',
          }));
          
          // Retry after longer delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              reconnectAttemptsRef.current = 0;
              connect();
            }
          }, 30000);
        }
      };
    } catch (e) {
      console.log(`[KrakenLive] Failed to create WebSocket:`, e);
      
      setLiveData(prev => ({ 
        ...prev, 
        isLive: false, 
        isConnecting: true,
      }));
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) connect();
      }, RECONNECT_DELAY);
    }
  }, [symbol, fallbackPrice, fallbackChange, cleanup]);

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;
    
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
  }, [symbol, connect, cleanup]);

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

// Keep backward compatibility export
export const useBinanceLivePrice = useKrakenLivePrice;
