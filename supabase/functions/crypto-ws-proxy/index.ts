// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-ws-proxy — WebSocket Proxy for Binance Real-time Price Data
// ═══════════════════════════════════════════════════════════════════════════════
// Provides reliable WebSocket connection to Binance through server-side proxy
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Binance symbol mapping
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'btcusdt', ETH: 'ethusdt', SOL: 'solusdt', XRP: 'xrpusdt', DOGE: 'dogeusdt',
  BNB: 'bnbusdt', ADA: 'adausdt', AVAX: 'avaxusdt', DOT: 'dotusdt',
  MATIC: 'maticusdt', LINK: 'linkusdt', UNI: 'uniusdt', ATOM: 'atomusdt',
  LTC: 'ltcusdt', BCH: 'bchusdt', NEAR: 'nearusdt', APT: 'aptusdt',
  FIL: 'filusdt', ARB: 'arbusdt', OP: 'opusdt', INJ: 'injusdt',
  SUI: 'suiusdt', TIA: 'tiausdt', SEI: 'seiusdt', PEPE: 'pepeusdt', SHIB: 'shibusdt',
  TON: 'tonusdt', KAS: 'kasusdt', TAO: 'taousdt', RENDER: 'renderusdt',
  TRX: 'trxusdt', XLM: 'xlmusdt', HBAR: 'hbarusdt', VET: 'vetusdt',
  ALGO: 'algousdt', ICP: 'icpusdt', FTM: 'ftmusdt', ETC: 'etcusdt',
  AAVE: 'aaveusdt', MKR: 'mkrusdt', GRT: 'grtusdt', IMX: 'imxusdt',
  RUNE: 'runeusdt', STX: 'stxusdt', MINA: 'minausdt', FLOW: 'flowusdt',
  XTZ: 'xtzusdt', EOS: 'eosusdt', NEO: 'neousdt', THETA: 'thetausdt',
  EGLD: 'egldusdt', ROSE: 'roseusdt', ZEC: 'zecusdt', KAVA: 'kavausdt',
  CFX: 'cfxusdt', QNT: 'qntusdt', WLD: 'wldusdt', JUP: 'jupusdt',
  BONK: 'bonkusdt', WIF: 'wifusdt', FLOKI: 'flokiusdt', NOT: 'notusdt',
  ORDI: 'ordiusdt', BLUR: 'blurusdt', PENDLE: 'pendleusdt', STRK: 'strkusdt',
  XMR: 'xmrusdt', RNDR: 'rndrusdt', FET: 'fetusdt', IOTA: 'iotausdt',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a WebSocket upgrade request
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  // Get symbol from URL query params
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase() || "BTC";
  const binanceSymbol = BINANCE_SYMBOLS[symbol] || `${symbol.toLowerCase()}usdt`;
  
  console.log(`[crypto-ws-proxy] Connecting for ${symbol} (${binanceSymbol})`);

  // Upgrade the client connection
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  
  let binanceSocket: WebSocket | null = null;
  let isClientConnected = true;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;

  const connectToBinance = () => {
    if (!isClientConnected || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    const binanceUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@ticker`;
    console.log(`[crypto-ws-proxy] Connecting to Binance: ${binanceUrl}`);
    
    try {
      binanceSocket = new WebSocket(binanceUrl);

      binanceSocket.onopen = () => {
        console.log(`[crypto-ws-proxy] Binance connected for ${symbol}`);
        reconnectAttempts = 0;
        
        // Notify client of connection
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'connected',
            source: 'binance',
            symbol: symbol
          }));
        }
      };

      binanceSocket.onmessage = (event) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          try {
            const data = JSON.parse(event.data);
            
            // Transform Binance ticker data to our format
            const transformed = {
              type: 'ticker',
              source: 'binance',
              symbol: symbol,
              price: parseFloat(data.c),
              change24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume: parseFloat(data.q),
              timestamp: Date.now()
            };
            
            clientSocket.send(JSON.stringify(transformed));
          } catch (e) {
            // Forward raw data if parsing fails
            clientSocket.send(event.data);
          }
        }
      };

      binanceSocket.onerror = (error) => {
        console.log(`[crypto-ws-proxy] Binance error for ${symbol}:`, error);
      };

      binanceSocket.onclose = () => {
        console.log(`[crypto-ws-proxy] Binance disconnected for ${symbol}`);
        
        if (isClientConnected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`[crypto-ws-proxy] Reconnecting (attempt ${reconnectAttempts})...`);
          setTimeout(connectToBinance, 1000 * reconnectAttempts);
        }
      };
    } catch (e) {
      console.log(`[crypto-ws-proxy] Failed to connect to Binance:`, e);
      reconnectAttempts++;
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectToBinance, 1000 * reconnectAttempts);
      }
    }
  };

  // Client socket handlers
  clientSocket.onopen = () => {
    console.log(`[crypto-ws-proxy] Client connected for ${symbol}`);
    connectToBinance();
  };

  clientSocket.onmessage = (event) => {
    // Handle client messages (e.g., change symbol)
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') {
        clientSocket.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // Ignore invalid messages
    }
  };

  clientSocket.onerror = (error) => {
    console.log(`[crypto-ws-proxy] Client error:`, error);
  };

  clientSocket.onclose = () => {
    console.log(`[crypto-ws-proxy] Client disconnected for ${symbol}`);
    isClientConnected = false;
    
    // Close Binance connection
    if (binanceSocket && binanceSocket.readyState === WebSocket.OPEN) {
      binanceSocket.close();
    }
  };

  return response;
});
