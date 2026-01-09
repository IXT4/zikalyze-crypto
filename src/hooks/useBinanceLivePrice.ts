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

const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
const RECONNECT_DELAY = 2000;

export const useBinanceLivePrice = (symbol: string, fallbackPrice?: number) => {
  const [liveData, setLiveData] = useState<BinanceLivePrice>({
    price: fallbackPrice || 0,
    change24h: 0,
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

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const normalizedSymbol = symbol.toUpperCase();
    const pair = `${normalizedSymbol}USDT`;
    const streamUrl = `${BINANCE_WS_URL}/${pair.toLowerCase()}@ticker`;

    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log(`🔌 Connecting to Binance WebSocket for ${pair}...`);
      
      const ws = new WebSocket(streamUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.log(`✅ Binance WebSocket connected for ${pair}`);
        setLiveData(prev => ({ ...prev, isLive: true, source: "Binance Live" }));
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
              volume: parseFloat(data.q), // Quote volume in USD
              lastUpdate: Date.now(),
              isLive: true,
              source: "Binance Live",
            });
          }
        } catch (e) {
          // Silent parse error
        }
      };

      ws.onerror = (error) => {
        console.log(`⚠️ Binance WebSocket error for ${pair}`, error);
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        
        console.log(`🔌 Binance WebSocket closed for ${pair}, reconnecting...`);
        setLiveData(prev => ({ ...prev, isLive: false, source: "reconnecting" }));
        
        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, RECONNECT_DELAY);
      };
    } catch (error) {
      console.error("Failed to connect to Binance:", error);
      setLiveData(prev => ({ ...prev, isLive: false, source: "error" }));
    }
  }, [symbol]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Connect to WebSocket
    connect();

    return () => {
      isMountedRef.current = false;
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Update fallback price when prop changes (if not live)
  useEffect(() => {
    if (fallbackPrice && !liveData.isLive) {
      setLiveData(prev => ({ ...prev, price: fallbackPrice }));
    }
  }, [fallbackPrice, liveData.isLive]);

  return liveData;
};
