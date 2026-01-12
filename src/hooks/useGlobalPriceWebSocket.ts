// ═══════════════════════════════════════════════════════════════════════════════
// 📡 useGlobalPriceWebSocket — Shared WebSocket for All Dashboard Components
// ═══════════════════════════════════════════════════════════════════════════════
// Single WebSocket connection that streams prices to all components
// Supports batch updates for 100+ symbols with sub-second latency
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface WebSocketPriceData {
  symbol: string;
  price: number;
  source: string;
  timestamp: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: number;
  ticksPerSecond: number;
  subscribedCount: number;
}

const WEBSOCKET_URL = `wss://eqtzrftndyninwasclfd.functions.supabase.co/functions/v1/price-stream`;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 25000;

// Singleton pattern for shared WebSocket connection
let globalSocket: WebSocket | null = null;
let globalListeners = new Set<(prices: Map<string, WebSocketPriceData>) => void>();
let globalPrices = new Map<string, WebSocketPriceData>();
let globalState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  lastUpdate: 0,
  ticksPerSecond: 0,
  subscribedCount: 0,
};
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let tickWindow: number[] = [];
let subscribedSymbols: string[] = [];
let connectionInitiated = false; // Track if connection was ever started

function notifyListeners() {
  globalListeners.forEach(listener => listener(new Map(globalPrices)));
}

function updateTickRate() {
  const now = Date.now();
  tickWindow = tickWindow.filter(t => now - t < 1000);
  globalState = { ...globalState, ticksPerSecond: tickWindow.length };
}

function connect() {
  if (globalSocket?.readyState === WebSocket.OPEN) return;
  if (globalSocket?.readyState === WebSocket.CONNECTING) return;
  
  // Mark that connection was initiated
  connectionInitiated = true;
  
  // Clear any pending reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  globalState = { ...globalState, connecting: true, error: null };
  
  // Notify all listeners of connecting state
  globalListeners.forEach(listener => listener(new Map(globalPrices)));
  
  try {
    globalSocket = new WebSocket(WEBSOCKET_URL);
    
    globalSocket.onopen = () => {
      console.log("[GlobalWS] Connected to price stream");
      reconnectAttempts = 0;
      
      globalState = { 
        ...globalState, 
        connected: true, 
        connecting: false,
        error: null 
      };
      
      // Subscribe to all symbols if we have any
      if (subscribedSymbols.length > 0 && globalSocket?.readyState === WebSocket.OPEN) {
        globalSocket.send(JSON.stringify({
          type: "subscribe",
          symbols: subscribedSymbols,
        }));
      }
      
      // Clear any existing ping interval
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      
      // Start ping interval
      pingInterval = setInterval(() => {
        if (globalSocket?.readyState === WebSocket.OPEN) {
          globalSocket.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);
    };
    
    globalSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "price") {
          tickWindow.push(Date.now());
          updateTickRate();
          
          const update: WebSocketPriceData = {
            symbol: data.symbol,
            price: data.price,
            source: data.source || "WebSocket",
            timestamp: data.timestamp || Date.now(),
          };
          
          globalPrices.set(data.symbol, update);
          globalState = { ...globalState, lastUpdate: Date.now() };
          notifyListeners();
          
        } else if (data.type === "prices" && Array.isArray(data.updates)) {
          // Batch update
          tickWindow.push(Date.now());
          updateTickRate();
          
          data.updates.forEach((update: any) => {
            const priceData: WebSocketPriceData = {
              symbol: update.symbol,
              price: update.price,
              source: update.source || "WebSocket",
              timestamp: data.timestamp || Date.now(),
            };
            globalPrices.set(update.symbol, priceData);
          });
          
          globalState = { 
            ...globalState, 
            lastUpdate: Date.now(),
            subscribedCount: globalPrices.size,
          };
          notifyListeners();
          
        } else if (data.type === "connected") {
          console.log("[GlobalWS] Server confirmed connection:", data.totalSymbols, "symbols available");
        } else if (data.type === "subscribed") {
          console.log("[GlobalWS] Subscribed to:", data.count, "symbols");
          globalState = { ...globalState, subscribedCount: data.count };
        }
      } catch (err) {
        console.error("[GlobalWS] Error parsing message:", err);
      }
    };
    
    globalSocket.onclose = (event) => {
      console.log("[GlobalWS] Disconnected:", event.code, event.reason);
      
      globalState = { 
        ...globalState, 
        connected: false, 
        connecting: false 
      };
      
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Clear the socket reference
      globalSocket = null;
      
      // Attempt reconnection if we still have listeners
      if (globalListeners.size > 0 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 15000);
        console.log(`[GlobalWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      }
    };
    
    globalSocket.onerror = () => {
      // Error is already logged by the browser, avoid duplicate logging
      globalState = { 
        ...globalState, 
        error: "WebSocket connection error",
        connecting: false 
      };
    };
  } catch (err) {
    console.error("[GlobalWS] Failed to create WebSocket:", err);
    globalState = { 
      ...globalState, 
      error: "Failed to connect",
      connecting: false 
    };
  }
}

function disconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (globalSocket) {
    globalSocket.close();
    globalSocket = null;
  }
  globalState = {
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: 0,
    ticksPerSecond: 0,
    subscribedCount: 0,
  };
}

function subscribe(symbols: string[]) {
  // Normalize, dedupe, and cap to server limit (100)
  const normalized = symbols.map((s) => s.toUpperCase()).filter(Boolean);
  const uniqueSymbols = [...new Set([...subscribedSymbols, ...normalized])].slice(0, 100);
  subscribedSymbols = uniqueSymbols;

  if (globalSocket?.readyState === WebSocket.OPEN) {
    globalSocket.send(
      JSON.stringify({
        type: "subscribe",
        symbols: subscribedSymbols,
      })
    );
  }
}

// Compute tick rate every 250ms
setInterval(updateTickRate, 250);

export function useGlobalPriceWebSocket(symbols: string[] = []) {
  const [state, setState] = useState<WebSocketState>(globalState);
  const [prices, setPrices] = useState<Map<string, WebSocketPriceData>>(new Map(globalPrices));
  const symbolsRef = useRef<string[]>(symbols);
  
  // Update symbols ref
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);
  
  // Register listener and connect
  useEffect(() => {
    const listener = (newPrices: Map<string, WebSocketPriceData>) => {
      setPrices(newPrices);
      setState({ ...globalState });
    };
    
    globalListeners.add(listener);
    
    // Subscribe to requested symbols
    if (symbols.length > 0) {
      subscribe(symbols);
    }
    
    // ALWAYS attempt to connect on mount - critical for fresh page loads
    // This ensures WebSocket starts even on direct URL navigation
    if (!globalSocket || globalSocket.readyState === WebSocket.CLOSED || globalSocket.readyState === WebSocket.CLOSING) {
      connect();
    } else if (globalSocket.readyState === WebSocket.OPEN && symbols.length > 0) {
      // Already connected, just subscribe to symbols
      subscribe(symbols);
    }
    
    // Initial state sync
    setPrices(new Map(globalPrices));
    setState({ ...globalState });
    
    // Fast state sync every 200ms for CoinMarketCap-like responsiveness
    const syncInterval = setInterval(() => {
      setPrices(new Map(globalPrices));
      setState({ ...globalState });
    }, 200);
    
    return () => {
      clearInterval(syncInterval);
      globalListeners.delete(listener);
      
      // Disconnect if no more listeners
      if (globalListeners.size === 0) {
        disconnect();
      }
    };
  }, []);
  
  // Subscribe to new symbols when they change
  useEffect(() => {
    if (symbols.length > 0) {
      subscribe(symbols);
    }
  }, [symbols.join(",")]);
  
  const getPrice = useCallback((symbol: string): WebSocketPriceData | null => {
    return prices.get(symbol.toUpperCase()) || null;
  }, [prices]);
  
  const getAllPrices = useCallback((): WebSocketPriceData[] => {
    return Array.from(prices.values());
  }, [prices]);
  
  return {
    ...state,
    prices,
    getPrice,
    getAllPrices,
    subscribe: useCallback((newSymbols: string[]) => subscribe(newSymbols), []),
    reconnect: useCallback(() => connect(), []),
  };
}
