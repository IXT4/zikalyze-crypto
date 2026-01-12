// ═══════════════════════════════════════════════════════════════════════════════
// 📡 usePriceWebSocket — Real-Time WebSocket Price Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Connects to the price-stream edge function for sub-second price updates
// Supports automatic reconnection and symbol subscription
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface WebSocketPriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  source: string;
  timestamp: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: number;
  ticksPerSecond: number;
}

const WEBSOCKET_URL = `wss://eqtzrftndyninwasclfd.functions.supabase.co/functions/v1/price-stream`;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000;

export function usePriceWebSocket(symbols: string[] = ["BTC", "ETH", "SOL"]) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: 0,
    ticksPerSecond: 0,
  });
  
  const [prices, setPrices] = useState<Map<string, WebSocketPriceUpdate>>(new Map());
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const tickCountRef = useRef(0);
  const tickWindowRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const subscribedSymbolsRef = useRef<string[]>(symbols);
  
  // Calculate ticks per second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      tickWindowRef.current = tickWindowRef.current.filter(t => now - t < 1000);
      setState(prev => ({ ...prev, ticksPerSecond: tickWindowRef.current.length }));
    }, 250);
    
    return () => clearInterval(interval);
  }, []);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
    if (!mountedRef.current) return;
    
    // Clear any pending reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("[WS] Connected to price stream");
        reconnectAttempts.current = 0;
        
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false,
          error: null 
        }));
        
        // Subscribe to symbols
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "subscribe",
            symbols: subscribedSymbolsRef.current,
          }));
        }
        
        // Clear existing ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        
        // Start ping interval
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "price") {
            tickWindowRef.current.push(Date.now());
            tickCountRef.current++;
            
            const update: WebSocketPriceUpdate = {
              symbol: data.symbol,
              price: data.price,
              change24h: data.change24h || 0,
              source: data.source,
              timestamp: data.timestamp,
            };
            
            setPrices(prev => {
              const next = new Map(prev);
              next.set(data.symbol, update);
              return next;
            });
            
            setState(prev => ({ ...prev, lastUpdate: Date.now() }));
          } else if (data.type === "connected") {
            console.log("[WS] Server confirmed connection:", data.availableSymbols?.length, "symbols available");
          } else if (data.type === "subscribed") {
            console.log("[WS] Subscribed to:", data.symbols);
          }
        } catch (err) {
          console.error("[WS] Error parsing message:", err);
        }
      };
      
      ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code, event.reason);
        
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false 
        }));
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        // Clear socket reference
        wsRef.current = null;
        
        // Attempt reconnection
        if (mountedRef.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current - 1), 15000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      ws.onerror = () => {
        // Error is already logged by browser
        setState(prev => ({ 
          ...prev, 
          error: "WebSocket connection error",
          connecting: false 
        }));
      };
    } catch (err) {
      console.error("[WS] Failed to create WebSocket:", err);
      setState(prev => ({ 
        ...prev, 
        error: "Failed to connect",
        connecting: false 
      }));
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);
  
  const subscribe = useCallback((newSymbols: string[]) => {
    subscribedSymbolsRef.current = newSymbols;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        symbols: newSymbols,
      }));
    }
  }, []);
  
  const getPrice = useCallback((symbol: string): WebSocketPriceUpdate | null => {
    return prices.get(symbol.toUpperCase()) || null;
  }, [prices]);
  
  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Update subscriptions when symbols change
  useEffect(() => {
    if (symbols.length > 0) {
      subscribe(symbols);
    }
  }, [symbols.join(","), subscribe]);
  
  return {
    ...state,
    prices,
    getPrice,
    subscribe,
    reconnect: connect,
    disconnect,
    totalTicks: tickCountRef.current,
  };
}
