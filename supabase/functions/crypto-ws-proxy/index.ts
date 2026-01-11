// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-ws-proxy — Multi-Source WebSocket Proxy for Real-time Crypto Prices
// ═══════════════════════════════════════════════════════════════════════════════
// Supports Binance (primary) and Kraken v2 (fallback) for 24/7 reliable streaming
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

// Kraken symbol mapping (Kraken uses different symbols)
const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  BTC: 'XBT', DOGE: 'XDG',
};

const KRAKEN_REVERSE_MAP: Record<string, string> = {
  XBT: 'BTC', XDG: 'DOGE',
};

// Symbols that work well on Kraken
const KRAKEN_SUPPORTED = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC', 'UNI',
  'ATOM', 'LTC', 'BCH', 'NEAR', 'APT', 'FIL', 'ARB', 'OP', 'INJ', 'SUI',
  'TIA', 'SEI', 'PEPE', 'SHIB', 'XLM', 'ALGO', 'FTM', 'ETC', 'AAVE', 'MKR',
  'GRT', 'STX', 'MINA', 'FLOW', 'XTZ', 'EOS', 'KAVA', 'DOGE', 'TRX', 'HBAR',
  'VET', 'ICP', 'RUNE', 'SAND', 'MANA', 'AXS', 'ENJ', 'CHZ', 'BAT', 'CRV',
  'COMP', 'YFI', 'SNX', 'ZEC', 'DASH', 'XMR', 'RENDER', 'FET', 'TAO', 'KAS',
]);

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

  // Get symbols and source preference from URL query params
  const url = new URL(req.url);
  const symbolParam = url.searchParams.get("symbols") || url.searchParams.get("symbol") || "BTC";
  const preferredSource = url.searchParams.get("source") || "binance"; // binance or kraken
  const symbols = symbolParam.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
  
  console.log(`[crypto-ws-proxy] Request for ${symbols.length} symbols, source: ${preferredSource}`);

  // Upgrade the client connection
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  
  let binanceSocket: WebSocket | null = null;
  let krakenSocket: WebSocket | null = null;
  let isClientConnected = true;
  let binanceReconnectAttempts = 0;
  let krakenReconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const activeSymbols = new Set(symbols);

  // Connect to Binance
  const connectToBinance = () => {
    if (!isClientConnected || binanceReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    // Convert to Binance stream names
    const binanceSymbols = [...activeSymbols].filter(s => BINANCE_SYMBOLS[s]);
    if (binanceSymbols.length === 0) return;
    
    const streams = binanceSymbols.map(s => {
      const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
      return `${binanceSymbol}@ticker`;
    });

    const binanceUrl = streams.length === 1 
      ? `wss://stream.binance.com:9443/ws/${streams[0]}`
      : `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
    
    console.log(`[crypto-ws-proxy] Connecting to Binance for ${binanceSymbols.length} symbols`);
    
    try {
      binanceSocket = new WebSocket(binanceUrl);

      binanceSocket.onopen = () => {
        console.log(`[crypto-ws-proxy] Binance connected for ${binanceSymbols.length} symbols`);
        binanceReconnectAttempts = 0;
        
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'connected',
            source: 'binance',
            symbols: binanceSymbols,
            streamCount: streams.length
          }));
        }
      };

      binanceSocket.onmessage = (event) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          try {
            const rawData = JSON.parse(event.data);
            const data = rawData.data || rawData;
            
            let symbolName = '';
            if (rawData.stream) {
              const streamSymbol = rawData.stream.replace('@ticker', '').replace('usdt', '').toUpperCase();
              symbolName = BINANCE_TO_SYMBOL[streamSymbol] || streamSymbol;
            } else if (data.s) {
              symbolName = data.s.replace('USDT', '').toUpperCase();
              symbolName = BINANCE_TO_SYMBOL[symbolName] || symbolName;
            } else {
              symbolName = symbols[0];
            }
            
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
            console.log(`[crypto-ws-proxy] Binance parse error:`, e);
          }
        }
      };

      binanceSocket.onerror = (error) => {
        console.log(`[crypto-ws-proxy] Binance error:`, error);
      };

      binanceSocket.onclose = () => {
        console.log(`[crypto-ws-proxy] Binance disconnected`);
        
        if (isClientConnected && binanceReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          binanceReconnectAttempts++;
          console.log(`[crypto-ws-proxy] Binance reconnecting (attempt ${binanceReconnectAttempts})...`);
          setTimeout(connectToBinance, 1000 * binanceReconnectAttempts);
        }
      };
    } catch (e) {
      console.log(`[crypto-ws-proxy] Failed to connect to Binance:`, e);
      binanceReconnectAttempts++;
      
      if (binanceReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectToBinance, 1000 * binanceReconnectAttempts);
      }
    }
  };

  // Connect to Kraken v2 WebSocket API
  const connectToKraken = () => {
    if (!isClientConnected || krakenReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    // Filter to Kraken-supported symbols
    const krakenSymbols = [...activeSymbols].filter(s => KRAKEN_SUPPORTED.has(s));
    if (krakenSymbols.length === 0) return;

    console.log(`[crypto-ws-proxy] Connecting to Kraken v2 for ${krakenSymbols.length} symbols`);
    
    try {
      krakenSocket = new WebSocket("wss://ws.kraken.com/v2");

      krakenSocket.onopen = () => {
        console.log(`[crypto-ws-proxy] Kraken v2 connected`);
        krakenReconnectAttempts = 0;
        
        // Build Kraken symbol list
        const krakenPairs = krakenSymbols.map(s => {
          const krakenSymbol = KRAKEN_SYMBOL_MAP[s] || s;
          return `${krakenSymbol}/USD`;
        });
        
        // Subscribe using Kraken v2 format
        krakenSocket!.send(JSON.stringify({
          method: "subscribe",
          params: {
            channel: "ticker",
            symbol: krakenPairs,
            snapshot: true,
          },
        }));
        
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'connected',
            source: 'kraken',
            symbols: krakenSymbols,
            streamCount: krakenPairs.length
          }));
        }
      };

      krakenSocket.onmessage = (event) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          try {
            const message = JSON.parse(event.data);
            
            // Handle Kraken v2 ticker format
            if (message.channel === 'ticker' && message.data) {
              const tickerData = Array.isArray(message.data) ? message.data : [message.data];
              
              for (const ticker of tickerData) {
                if (ticker.symbol) {
                  let symbol = ticker.symbol.replace('/USD', '').replace('/USDT', '');
                  symbol = KRAKEN_REVERSE_MAP[symbol] || symbol;
                  
                  const price = parseFloat(ticker.last || 0);
                  if (price > 0) {
                    const transformed = {
                      type: 'ticker',
                      source: 'kraken',
                      symbol: symbol,
                      price: price,
                      change24h: parseFloat(ticker.change_pct || 0),
                      high24h: parseFloat(ticker.high || 0),
                      low24h: parseFloat(ticker.low || 0),
                      volume: parseFloat(ticker.volume || 0) * price,
                      timestamp: Date.now()
                    };
                    
                    clientSocket.send(JSON.stringify(transformed));
                  }
                }
              }
            }
          } catch (e) {
            console.log(`[crypto-ws-proxy] Kraken parse error:`, e);
          }
        }
      };

      krakenSocket.onerror = (error) => {
        console.log(`[crypto-ws-proxy] Kraken error:`, error);
      };

      krakenSocket.onclose = () => {
        console.log(`[crypto-ws-proxy] Kraken disconnected`);
        
        if (isClientConnected && krakenReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          krakenReconnectAttempts++;
          console.log(`[crypto-ws-proxy] Kraken reconnecting (attempt ${krakenReconnectAttempts})...`);
          setTimeout(connectToKraken, 1500 * krakenReconnectAttempts);
        }
      };
    } catch (e) {
      console.log(`[crypto-ws-proxy] Failed to connect to Kraken:`, e);
      krakenReconnectAttempts++;
      
      if (krakenReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectToKraken, 1500 * krakenReconnectAttempts);
      }
    }
  };

  // Client socket handlers
  clientSocket.onopen = () => {
    console.log(`[crypto-ws-proxy] Client connected for ${symbols.length} symbols`);
    
    // Connect to BOTH sources immediately for instant live streaming
    connectToBinance();
    connectToKraken();
  };

  clientSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ping') {
        clientSocket.send(JSON.stringify({ type: 'pong' }));
      }
      
      // Handle dynamic subscription changes
      if (data.type === 'subscribe' && data.symbols) {
        const newSymbols = data.symbols.map((s: string) => s.toUpperCase());
        newSymbols.forEach((s: string) => activeSymbols.add(s));
        
        // Subscribe on Binance
        if (binanceSocket?.readyState === WebSocket.OPEN) {
          const newStreams = newSymbols
            .filter((s: string) => BINANCE_SYMBOLS[s])
            .map((s: string) => {
              const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
              return `${binanceSymbol}@ticker`;
            });
          
          if (newStreams.length > 0) {
            binanceSocket.send(JSON.stringify({
              method: 'SUBSCRIBE',
              params: newStreams,
              id: Date.now()
            }));
          }
        }
        
        // Subscribe on Kraken
        if (krakenSocket?.readyState === WebSocket.OPEN) {
          const krakenPairs = newSymbols
            .filter((s: string) => KRAKEN_SUPPORTED.has(s))
            .map((s: string) => {
              const krakenSymbol = KRAKEN_SYMBOL_MAP[s] || s;
              return `${krakenSymbol}/USD`;
            });
          
          if (krakenPairs.length > 0) {
            krakenSocket.send(JSON.stringify({
              method: "subscribe",
              params: {
                channel: "ticker",
                symbol: krakenPairs,
              },
            }));
          }
        }
        
        console.log(`[crypto-ws-proxy] Added subscriptions: ${newSymbols.join(', ')}`);
      }
      
      if (data.type === 'unsubscribe' && data.symbols) {
        const removeSymbols = data.symbols.map((s: string) => s.toUpperCase());
        removeSymbols.forEach((s: string) => activeSymbols.delete(s));
        
        // Unsubscribe from Binance
        if (binanceSocket?.readyState === WebSocket.OPEN) {
          const removeStreams = removeSymbols
            .filter((s: string) => BINANCE_SYMBOLS[s])
            .map((s: string) => {
              const binanceSymbol = BINANCE_SYMBOLS[s] || `${s.toLowerCase()}usdt`;
              return `${binanceSymbol}@ticker`;
            });
          
          if (removeStreams.length > 0) {
            binanceSocket.send(JSON.stringify({
              method: 'UNSUBSCRIBE',
              params: removeStreams,
              id: Date.now()
            }));
          }
        }
        
        // Unsubscribe from Kraken
        if (krakenSocket?.readyState === WebSocket.OPEN) {
          const krakenPairs = removeSymbols
            .filter((s: string) => KRAKEN_SUPPORTED.has(s))
            .map((s: string) => {
              const krakenSymbol = KRAKEN_SYMBOL_MAP[s] || s;
              return `${krakenSymbol}/USD`;
            });
          
          if (krakenPairs.length > 0) {
            krakenSocket.send(JSON.stringify({
              method: "unsubscribe",
              params: {
                channel: "ticker",
                symbol: krakenPairs,
              },
            }));
          }
        }
        
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
    
    // Close all exchange connections
    if (binanceSocket && binanceSocket.readyState === WebSocket.OPEN) {
      binanceSocket.close();
    }
    if (krakenSocket && krakenSocket.readyState === WebSocket.OPEN) {
      krakenSocket.close();
    }
  };

  return response;
});
