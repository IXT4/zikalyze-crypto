// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-ws-proxy — Multi-Symbol WebSocket Proxy for Binance Real-time Prices
// ═══════════════════════════════════════════════════════════════════════════════
// Supports subscribing to multiple symbols in a single connection
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

// Reverse mapping for symbol lookup
const BINANCE_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(BINANCE_SYMBOLS).map(([k, v]) => [v.replace('usdt', '').toUpperCase(), k])
);

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

  // Get symbols from URL query params (comma-separated or single)
  const url = new URL(req.url);
  const symbolParam = url.searchParams.get("symbols") || url.searchParams.get("symbol") || "BTC";
  const symbols = symbolParam.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
  
  // Convert to Binance stream names
  const streams = symbols.map(s => {
    const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
    return `${binanceSymbol}@ticker`;
  });
  
  console.log(`[crypto-ws-proxy] Subscribing to ${symbols.length} symbols: ${symbols.join(', ')}`);

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

    // Use combined streams endpoint for multiple symbols
    const binanceUrl = streams.length === 1 
      ? `wss://stream.binance.com:9443/ws/${streams[0]}`
      : `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
    
    console.log(`[crypto-ws-proxy] Connecting to Binance: ${binanceUrl}`);
    
    try {
      binanceSocket = new WebSocket(binanceUrl);

      binanceSocket.onopen = () => {
        console.log(`[crypto-ws-proxy] Binance connected for ${symbols.length} symbols`);
        reconnectAttempts = 0;
        
        // Notify client of connection
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'connected',
            source: 'binance',
            symbols: symbols,
            streamCount: streams.length
          }));
        }
      };

      binanceSocket.onmessage = (event) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          try {
            const rawData = JSON.parse(event.data);
            
            // Handle combined stream format vs single stream format
            const data = rawData.data || rawData;
            
            // Extract symbol from stream name (e.g., "btcusdt@ticker" -> "BTC")
            let symbolName = '';
            if (rawData.stream) {
              // Combined stream format
              const streamSymbol = rawData.stream.replace('@ticker', '').replace('usdt', '').toUpperCase();
              symbolName = BINANCE_TO_SYMBOL[streamSymbol] || streamSymbol;
            } else if (data.s) {
              // Single stream format - extract from symbol field
              symbolName = data.s.replace('USDT', '').toUpperCase();
              symbolName = BINANCE_TO_SYMBOL[symbolName] || symbolName;
            } else {
              // Fallback to first symbol if single stream
              symbolName = symbols[0];
            }
            
            // Transform Binance ticker data to our format
            const transformed = {
              type: 'ticker',
              source: 'binance',
              symbol: symbolName,
              price: parseFloat(data.c),
              change24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume: parseFloat(data.q),
              timestamp: Date.now()
            };
            
            clientSocket.send(JSON.stringify(transformed));
          } catch (e) {
            console.log(`[crypto-ws-proxy] Parse error:`, e);
          }
        }
      };

      binanceSocket.onerror = (error) => {
        console.log(`[crypto-ws-proxy] Binance error:`, error);
      };

      binanceSocket.onclose = () => {
        console.log(`[crypto-ws-proxy] Binance disconnected`);
        
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
    console.log(`[crypto-ws-proxy] Client connected for ${symbols.length} symbols`);
    connectToBinance();
  };

  clientSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ping') {
        clientSocket.send(JSON.stringify({ type: 'pong' }));
      }
      
      // Handle dynamic subscription changes
      if (data.type === 'subscribe' && data.symbols && binanceSocket?.readyState === WebSocket.OPEN) {
        const newSymbols = data.symbols.map((s: string) => s.toUpperCase());
        const newStreams = newSymbols.map((s: string) => {
          const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
          return `${binanceSymbol}@ticker`;
        });
        
        // Send subscription message to Binance
        binanceSocket.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: newStreams,
          id: Date.now()
        }));
        
        console.log(`[crypto-ws-proxy] Added subscriptions: ${newSymbols.join(', ')}`);
      }
      
      if (data.type === 'unsubscribe' && data.symbols && binanceSocket?.readyState === WebSocket.OPEN) {
        const removeSymbols = data.symbols.map((s: string) => s.toUpperCase());
        const removeStreams = removeSymbols.map((s: string) => {
          const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
          return `${binanceSymbol}@ticker`;
        });
        
        // Send unsubscription message to Binance
        binanceSocket.send(JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: removeStreams,
          id: Date.now()
        }));
        
        console.log(`[crypto-ws-proxy] Removed subscriptions: ${removeSymbols.join(', ')}`);
      }
    } catch {
      // Ignore invalid messages
    }
  };

  clientSocket.onerror = (error) => {
    console.log(`[crypto-ws-proxy] Client error:`, error);
  };

  clientSocket.onclose = () => {
    console.log(`[crypto-ws-proxy] Client disconnected`);
    isClientConnected = false;
    
    // Close Binance connection
    if (binanceSocket && binanceSocket.readyState === WebSocket.OPEN) {
      binanceSocket.close();
    }
  };

  return response;
});
