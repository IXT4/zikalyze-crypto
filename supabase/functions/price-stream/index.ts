// ═══════════════════════════════════════════════════════════════════════════════
// 📡 Real-Time Price WebSocket Stream
// ═══════════════════════════════════════════════════════════════════════════════
// Streams live cryptocurrency prices from decentralized oracles via WebSocket
// Supports multiple symbols with sub-second updates
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface PriceUpdate {
  type: "price";
  symbol: string;
  price: number;
  change24h: number;
  source: string;
  timestamp: number;
}

interface SubscribeMessage {
  type: "subscribe";
  symbols: string[];
}

interface PingMessage {
  type: "ping";
}

// Pyth Network price feed IDs for top cryptocurrencies
const PYTH_PRICE_FEEDS: Record<string, string> = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BNB: "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  XRP: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  ADA: "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  DOT: "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284f88c09f7c9c6e7834",
  LINK: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  MATIC: "0x5de33440f79ce259ad5a7c1b6a8f5e54edbc79e6f920a3b8f15a30a2f7fc975a",
  UNI: "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  ATOM: "0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819",
  LTC: "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  FIL: "0x150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  NEAR: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  APT: "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  ARB: "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  OP: "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  INJ: "0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592",
};

// Fetch price from Pyth Network
async function fetchPythPrice(symbol: string): Promise<{ price: number; source: string } | null> {
  const feedId = PYTH_PRICE_FEEDS[symbol];
  if (!feedId) return null;

  try {
    const response = await fetch(
      `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${feedId}`,
      { headers: { "Accept": "application/json" } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data?.[0]?.price?.price) return null;
    
    const priceData = data[0].price;
    const price = Number(priceData.price) * Math.pow(10, priceData.expo);
    
    return { price, source: "Pyth" };
  } catch {
    return null;
  }
}

// Fetch price from DIA Oracle
async function fetchDIAPrice(symbol: string): Promise<{ price: number; source: string } | null> {
  try {
    const response = await fetch(
      `https://api.diadata.org/v1/assetQuotation/Bitcoin/0x0000000000000000000000000000000000000000`,
      { headers: { "Accept": "application/json" } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data?.Price) return null;
    
    return { price: data.Price, source: "DIA" };
  } catch {
    return null;
  }
}

// Fetch price with fallback
async function fetchPrice(symbol: string): Promise<{ price: number; source: string } | null> {
  // Try Pyth first
  const pythPrice = await fetchPythPrice(symbol);
  if (pythPrice) return pythPrice;
  
  // Fallback to DIA for BTC
  if (symbol === "BTC") {
    const diaPrice = await fetchDIAPrice(symbol);
    if (diaPrice) return diaPrice;
  }
  
  return null;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Check for WebSocket upgrade
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ 
      error: "Expected WebSocket connection",
      hint: "Connect using ws:// or wss:// protocol"
    }), { 
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let subscribedSymbols: string[] = ["BTC", "ETH", "SOL"];
  let streamInterval: number | null = null;
  let isConnected = true;
  
  const startStreaming = () => {
    if (streamInterval) {
      clearInterval(streamInterval);
    }
    
    // Stream prices every 500ms for real-time feel
    streamInterval = setInterval(async () => {
      if (!isConnected) {
        if (streamInterval) clearInterval(streamInterval);
        return;
      }
      
      for (const symbol of subscribedSymbols) {
        try {
          const priceData = await fetchPrice(symbol);
          
          if (priceData && isConnected) {
            const update: PriceUpdate = {
              type: "price",
              symbol,
              price: priceData.price,
              change24h: 0, // Would need historical data for this
              source: priceData.source,
              timestamp: Date.now(),
            };
            
            socket.send(JSON.stringify(update));
          }
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
        }
      }
    }, 500);
  };
  
  socket.onopen = () => {
    console.log("[PriceStream] Client connected");
    
    // Send initial connection confirmation
    socket.send(JSON.stringify({
      type: "connected",
      message: "Price stream connected",
      availableSymbols: Object.keys(PYTH_PRICE_FEEDS),
      timestamp: Date.now(),
    }));
    
    // Start streaming default symbols
    startStreaming();
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === "subscribe" && Array.isArray(message.symbols)) {
        // Update subscribed symbols
        subscribedSymbols = message.symbols
          .map((s: string) => s.toUpperCase())
          .filter((s: string) => PYTH_PRICE_FEEDS[s]);
        
        console.log(`[PriceStream] Subscribed to: ${subscribedSymbols.join(", ")}`);
        
        socket.send(JSON.stringify({
          type: "subscribed",
          symbols: subscribedSymbols,
          timestamp: Date.now(),
        }));
        
        // Restart streaming with new symbols
        startStreaming();
      } else if (message.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("[PriceStream] Error parsing message:", err);
    }
  };

  socket.onclose = () => {
    console.log("[PriceStream] Client disconnected");
    isConnected = false;
    if (streamInterval) {
      clearInterval(streamInterval);
    }
  };

  socket.onerror = (error) => {
    console.error("[PriceStream] WebSocket error:", error);
    isConnected = false;
  };

  return response;
});
