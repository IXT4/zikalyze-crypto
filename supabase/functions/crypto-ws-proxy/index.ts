// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-ws-proxy — Kraken WebSocket Proxy for Real-Time Prices
// ═══════════════════════════════════════════════════════════════════════════════
// Proxies WebSocket connections to Kraken for live cryptocurrency price streaming.
// Uses Kraken's public WebSocket API v2 for ticker data.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Kraken WebSocket API v2
const KRAKEN_WS_URL = "wss://ws.kraken.com/v2";

// Symbol mapping from common symbols to Kraken pairs
const KRAKEN_PAIRS: Record<string, string> = {
  BTC: "XBT/USD",
  ETH: "ETH/USD",
  SOL: "SOL/USD",
  XRP: "XRP/USD",
  DOGE: "DOGE/USD",
  ADA: "ADA/USD",
  AVAX: "AVAX/USD",
  LINK: "LINK/USD",
  DOT: "DOT/USD",
  MATIC: "MATIC/USD",
  SHIB: "SHIB/USD",
  LTC: "LTC/USD",
  UNI: "UNI/USD",
  ATOM: "ATOM/USD",
  XLM: "XLM/USD",
  FIL: "FIL/USD",
  NEAR: "NEAR/USD",
  APT: "APT/USD",
  ARB: "ARB/USD",
  OP: "OP/USD",
  INJ: "INJ/USD",
  AAVE: "AAVE/USD",
  MKR: "MKR/USD",
  CRV: "CRV/USD",
  ALGO: "ALGO/USD",
  EOS: "EOS/USD",
  XTZ: "XTZ/USD",
  KAS: "KAS/USD",
  PEPE: "PEPE/USD",
  WIF: "WIF/USD",
  BONK: "BONK/USD",
  FLOKI: "FLOKI/USD",
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse symbol from query params
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase() || "BTC";
  const krakenPair = KRAKEN_PAIRS[symbol] || `${symbol}/USD`;

  // Return info for non-WebSocket requests
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(
      JSON.stringify({
        status: "active",
        source: "Kraken",
        symbol: symbol,
        pair: krakenPair,
        message: "WebSocket proxy for Kraken live price streaming",
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // Upgrade to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  let krakenSocket: WebSocket | null = null;
  let pingInterval: number | null = null;

  clientSocket.onopen = () => {
    console.log(`[WS-Proxy] Client connected for ${symbol}`);
    
    // Connect to Kraken
    krakenSocket = new WebSocket(KRAKEN_WS_URL);
    
    krakenSocket.onopen = () => {
      console.log(`[WS-Proxy] Connected to Kraken for ${krakenPair}`);
      
      // Subscribe to ticker for the pair using v2 format
      const subscribeMsg = {
        method: "subscribe",
        params: {
          channel: "ticker",
          symbol: [krakenPair],
        },
      };
      
      krakenSocket!.send(JSON.stringify(subscribeMsg));
      
      // Send connection confirmation to client
      clientSocket.send(JSON.stringify({
        type: "connected",
        source: "kraken",
        symbol: symbol,
        pair: krakenPair,
      }));
      
      // Keep connection alive with ping
      pingInterval = setInterval(() => {
        if (krakenSocket?.readyState === WebSocket.OPEN) {
          krakenSocket.send(JSON.stringify({ method: "ping" }));
        }
      }, 30000);
    };

    krakenSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle Kraken v2 ticker format
        if (data.channel === "ticker" && data.type === "update" && data.data && data.data.length > 0) {
          const tickerData = data.data[0];
          
          // Extract price data from Kraken v2 format
          const price = parseFloat(tickerData.last) || 0;
          const open24h = parseFloat(tickerData.open_24h) || price;
          const high24h = parseFloat(tickerData.high_24h) || 0;
          const low24h = parseFloat(tickerData.low_24h) || 0;
          const volume = parseFloat(tickerData.volume_24h) || 0;
          
          // Calculate 24h change percentage
          const change24h = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0;
          
          // Send formatted data to client
          clientSocket.send(JSON.stringify({
            type: "ticker",
            source: "kraken",
            symbol: symbol,
            pair: krakenPair,
            price: price,
            change24h: change24h,
            high24h: high24h,
            low24h: low24h,
            volume: volume,
            timestamp: Date.now(),
          }));
        }
        
        // Handle subscription confirmation
        if (data.method === "subscribe" && data.success === true) {
          console.log(`[WS-Proxy] Subscribed to ${krakenPair} ticker`);
        }
        
        // Handle initial snapshot
        if (data.channel === "ticker" && data.type === "snapshot" && data.data && data.data.length > 0) {
          const tickerData = data.data[0];
          
          const price = parseFloat(tickerData.last) || 0;
          const open24h = parseFloat(tickerData.open_24h) || price;
          const high24h = parseFloat(tickerData.high_24h) || 0;
          const low24h = parseFloat(tickerData.low_24h) || 0;
          const volume = parseFloat(tickerData.volume_24h) || 0;
          const change24h = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0;
          
          clientSocket.send(JSON.stringify({
            type: "ticker",
            source: "kraken",
            symbol: symbol,
            pair: krakenPair,
            price: price,
            change24h: change24h,
            high24h: high24h,
            low24h: low24h,
            volume: volume,
            timestamp: Date.now(),
          }));
        }
        
      } catch (e) {
        console.log(`[WS-Proxy] Parse error:`, e);
      }
    };

    krakenSocket.onerror = (error) => {
      console.log(`[WS-Proxy] Kraken error:`, error);
    };

    krakenSocket.onclose = () => {
      console.log(`[WS-Proxy] Kraken connection closed for ${krakenPair}`);
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    };
  };

  clientSocket.onclose = () => {
    console.log(`[WS-Proxy] Client disconnected for ${symbol}`);
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (krakenSocket) {
      krakenSocket.close();
      krakenSocket = null;
    }
  };

  clientSocket.onerror = (error) => {
    console.log(`[WS-Proxy] Client error:`, error);
  };

  return response;
});
