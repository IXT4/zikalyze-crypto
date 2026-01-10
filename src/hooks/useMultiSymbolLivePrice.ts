import { useState, useEffect, useRef, useCallback } from "react";

interface SymbolPriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  lastUpdate: number;
}

interface MultiPriceState {
  prices: Record<string, SymbolPriceData>;
  isLive: boolean;
  isConnecting: boolean;
  source: string;
  connectedSymbols: string[];
}

// Supabase project URL for WebSocket proxy
const SUPABASE_PROJECT_ID = "eqtzrftndyninwasclfd";
const WS_PROXY_URL = `wss://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/crypto-ws-proxy`;

const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useMultiSymbolLivePrice = (
  symbols: string[],
  fallbackPrices?: Record<string, { price: number; change24h: number }>
) => {
  const [state, setState] = useState<MultiPriceState>({
    prices: {},
    isLive: false,
    isConnecting: true,
    source: 'initializing',
    connectedSymbols: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const currentSymbolsRef = useRef<string[]>([]);

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

  const connect = useCallback((symbolList: string[]) => {
    if (!isMountedRef.current || symbolList.length === 0) return;
    
    cleanup();
    currentSymbolsRef.current = symbolList;

    // Build WebSocket URL with multiple symbols
    const symbolsParam = symbolList.join(',');
    const wsUrl = `${WS_PROXY_URL}?symbols=${symbolsParam}`;

    console.log(`[MultiPrice] Connecting for ${symbolList.length} symbols`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`[MultiPrice] Connection timeout`);
          ws.close();
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        console.log(`[MultiPrice] Connected for ${symbolList.length} symbols`);
        reconnectAttemptsRef.current = 0;
        
        setState(prev => ({ 
          ...prev, 
          isLive: true, 
          isConnecting: false,
          source: 'Binance (Proxy)',
          connectedSymbols: symbolList,
        }));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle ticker updates
          if (data.type === 'ticker' && data.source === 'binance') {
            setState(prev => ({
              ...prev,
              prices: {
                ...prev.prices,
                [data.symbol]: {
                  price: data.price,
                  change24h: data.change24h,
                  high24h: data.high24h,
                  low24h: data.low24h,
                  volume: data.volume,
                  lastUpdate: Date.now(),
                },
              },
              isLive: true,
              isConnecting: false,
            }));
            return;
          }
          
          // Handle connection confirmation
          if (data.type === 'connected') {
            console.log(`[MultiPrice] Proxy confirmed ${data.streamCount} streams`);
            return;
          }
        } catch {
          // Silent parse error
        }
      };

      ws.onerror = (error) => {
        console.log(`[MultiPrice] WebSocket error:`, error);
      };

      ws.onclose = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        if (!isMountedRef.current) return;
        
        console.log(`[MultiPrice] Disconnected`);
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setState(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: true,
          }));
          
          const delay = RECONNECT_DELAY * Math.min(reconnectAttemptsRef.current + 1, 3);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) connect(currentSymbolsRef.current);
          }, delay);
        } else {
          // Max attempts reached
          setState(prev => ({ 
            ...prev, 
            isLive: false, 
            isConnecting: false,
            source: 'Cached',
          }));
          
          // Retry after longer delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              reconnectAttemptsRef.current = 0;
              connect(currentSymbolsRef.current);
            }
          }, 30000);
        }
      };
    } catch (e) {
      console.log(`[MultiPrice] Failed to create WebSocket:`, e);
      
      setState(prev => ({ 
        ...prev, 
        isLive: false, 
        isConnecting: true,
      }));
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) connect(currentSymbolsRef.current);
      }, RECONNECT_DELAY);
    }
  }, [cleanup]);

  // Subscribe to additional symbols dynamically
  const subscribe = useCallback((newSymbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: newSymbols,
      }));
      currentSymbolsRef.current = [...new Set([...currentSymbolsRef.current, ...newSymbols])];
    }
  }, []);

  // Unsubscribe from symbols
  const unsubscribe = useCallback((removeSymbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: removeSymbols,
      }));
      currentSymbolsRef.current = currentSymbolsRef.current.filter(
        s => !removeSymbols.includes(s)
      );
    }
  }, []);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string): SymbolPriceData | null => {
    return state.prices[symbol] || null;
  }, [state.prices]);

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;
    
    // Small delay before connecting
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current && symbols.length > 0) {
        connect(symbols);
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, [symbols.join(','), connect, cleanup]);

  // Apply fallback prices when not live
  useEffect(() => {
    if (!state.isLive && fallbackPrices) {
      setState(prev => {
        const updatedPrices = { ...prev.prices };
        for (const [symbol, data] of Object.entries(fallbackPrices)) {
          if (!updatedPrices[symbol] || !prev.isLive) {
            updatedPrices[symbol] = {
              ...updatedPrices[symbol],
              price: data.price,
              change24h: data.change24h,
              lastUpdate: Date.now(),
              high24h: updatedPrices[symbol]?.high24h || 0,
              low24h: updatedPrices[symbol]?.low24h || 0,
              volume: updatedPrices[symbol]?.volume || 0,
            };
          }
        }
        return { ...prev, prices: updatedPrices };
      });
    }
  }, [fallbackPrices, state.isLive]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    getPrice,
  };
};
