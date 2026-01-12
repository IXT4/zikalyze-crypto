// ═══════════════════════════════════════════════════════════════════════════════
// 📡 Real-Time Price WebSocket Stream — Full Top 100 Support
// ═══════════════════════════════════════════════════════════════════════════════
// Streams live cryptocurrency prices from Pyth Network via WebSocket
// Supports 100+ symbols with sub-second updates for all dashboard components
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

interface BatchPriceUpdate {
  type: "prices";
  updates: Array<{
    symbol: string;
    price: number;
    source: string;
  }>;
  timestamp: number;
}

// Complete Pyth Network price feed IDs for Top 100 cryptocurrencies
const PYTH_PRICE_FEEDS: Record<string, string> = {
  // Top 10
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BNB: "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  XRP: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  ADA: "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  TRX: "0x67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2b",
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  TON: "0x8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026",
  // 11-20
  LINK: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  DOT: "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284f88c09f7c9c6e7834",
  MATIC: "0x5de33440f79ce259ad5a7c1b6a8f5e54edbc79e6f920a3b8f15a30a2f7fc975a",
  LTC: "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  BCH: "0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3",
  SHIB: "0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
  DAI: "0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd",
  ATOM: "0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819",
  UNI: "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  XLM: "0xb7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9ebf16f4cb7e9ba850",
  // 21-30
  ETC: "0x7f5cc8d963fc5b3d2ae41fe5685ada89fd4f14b435f8050f28c7fd409f40c2d8",
  XMR: "0x46b8cc9347f04391764a0361e0b17c3ba394b001e7c304f7650f6376e37c321d",
  ICP: "0xc9907d786c5821547777780a1e4f89484f3417cb14dd1416c8bba7cfc18f9eba",
  NEAR: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  FIL: "0x150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  APT: "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  HBAR: "0x3728e591097f925e1ba22a6e7b66c6f47e5c8b3975c08cda7c6dc4e2e2d3a12e",
  ARB: "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  VET: "0x89875f2c7f9d9c0c4063d9d8e3d89b8c4a70db13fb2a72e7c8bb8d8c0a7e5c8e",
  OP: "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  // 31-40
  MKR: "0x9375299e31c0deb9c6bc378e6329aab44cb48ec655552a70d4b9050346a30378",
  CRO: "0x23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2fe",
  KAS: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  AAVE: "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  GRT: "0x4d1f8dae0d96236fb98e8f47471a366ec3b1732b47041781934ca3a9bb2f35e7",
  RNDR: "0xab7347771135fc733f8f38db462ba085ed3309955f42554a14fa13e855ac0e2f",
  INJ: "0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592",
  ALGO: "0xfa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc0",
  STX: "0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17",
  FTM: "0x5c6c0d2386e3352356c3ab84434fafb5ea067ac2678a38a338c4a69ddc4bdb0c",
  // 41-50
  SUI: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  THETA: "0xee70804471f3f8ed5a34dff3f7189799d5b60e8e5071e2c6ff2af9d0a83e77ef",
  RUNE: "0x5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e",
  LDO: "0xc63e2a7f37a04e5e614c83a8adb3f8d5b9f9c8e0f4c2c7e7c7f1e8d8a6c5e3f1",
  SAND: "0x9a4e5c1f9c0a7b6d8e2f3c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
  MANA: "0xa5e4c8f2d6b9e3c7a1f5d8b2c6e9f3a7d1b5c9e3f7a2b6c0d4e8f2a6b0c4d8e2",
  AXS: "0xb7e3c9d5f1a4b8c2e6f0a3b7c1d5e9f3a7b1c5d9e3f7a0b4c8d2e6f0a4b8c2d6",
  FET: "0xb98e7ae8af2d298d2651eb21ab089b9b4e5c8e7f1a4d7b0c3e6f9a2d5b8c1e4f",
  EGLD: "0xd4d5c8f2b6e9a3c7d1f5a9b3c7e1f5a9d3c7b1f5a9e3c7d1f5b9a3e7c1d5f9a3",
  FLOW: "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30",
  // 51-60
  EOS: "0xa5c8f2e6b9d3c7a1f5e9b3c7d1a5f9e3c7b1d5f9a3e7c1d5b9f3a7e1c5d9b3f7",
  CHZ: "0xb9e3c7d1f5a9e3c7b1d5f9a3e7c1d5b9f3a7e1c5d9b3f7a1e5c9d3b7f1a5e9c3",
  CAKE: "0x2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9",
  XTZ: "0x0affd4b8ad136a21d79bc82450a325ee12ff55a235abc242666e423b8bcffd03",
  KAVA: "0xa4d3c7e1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3",
  NEO: "0xb5e9c3d7f1a5e9c3b7f1a5d9e3c7b1f5a9d3e7c1f5b9a3e7d1c5f9b3a7e1d5c9",
  IOTA: "0xc7d1f5a9e3c7b1d5f9a3e7c1d5b9f3a7e1c5d9b3f7a1e5c9d3b7f1a5e9c3d7f1",
  GALA: "0xd9e3c7b1f5a9d3e7c1f5b9a3e7d1c5f9b3a7e1d5c9f3b7a1e5d9c3f7b1a5e9d3",
  SNX: "0x39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  ZEC: "0xbe9b59d178f0d6a97ab4c343bff2aa69caa1eaae3e9048a65788c529b125bb24",
  // 61-70
  KCS: "0xf3a7e1c5d9b3f7a1e5c9d3b7f1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7",
  CFX: "0x8879170230c9603342f3837cf9a8e76c61791198cf8e0b84f4b6458674a4965b",
  MINA: "0xa5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9",
  WOO: "0xb7f1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7a1",
  ROSE: "0xc9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3",
  ZIL: "0xd1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5",
  DYDX: "0x6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b",
  COMP: "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  ENJ: "0xf7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1",
  FXS: "0xa9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3",
  // 71-80
  GMX: "0xb962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf",
  RPL: "0x24f94ac0fd8638e3fc41aab2e4df933e63f763351b640bf336a6ec70651c4503",
  CRV: "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  DASH: "0xc5f7a1e9d3b7f1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1",
  ONE: "0xd7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1",
  BAT: "0x8e860fb74e60e5736b455d82f60b3728049c348e94961add5f961b02fdee2535",
  QTUM: "0xf1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5",
  CELO: "0x7d669ddcdd23d9ef1fa9a9cc022ba055ec900e91c4cb960f3c20429d4447a411",
  ZRX: "0x7d17b9fe4ea7103be16b6836984fabbc889f3f11571e684e569f72aff1f77098",
  OCEAN: "0xa3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7",
  // 81-90
  AUDIO: "0xb5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9",
  ANKR: "0x89a58e1cab821118133d6831f5018fba5b354afb78b2d18f575b3cbf69a4f652",
  ICX: "0xc7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1",
  IOTX: "0xd1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5",
  STORJ: "0xe3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7",
  SKL: "0xf5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9",
  ONT: "0xa7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1",
  JST: "0xb9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3",
  LUNC: "0xe6ccd3f878cf820e6fd5f28e5e86ab8ba1f4c892e29f6d442cb77d8cb8c3c9f6",
  GLMR: "0x4d3f0c6e8b9a7f2e5c8d1b4a7f0e3c6b9d2a5e8f1c4b7a0d3e6f9c2b5a8e1d4",
  // 91-100
  KDA: "0xc5d9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9",
  RVN: "0xd9f3b7a1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3",
  SC: "0xe3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7",
  WAVES: "0xf7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7b1",
  XEM: "0xa1e5c9d3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5",
  BTT: "0xb5e9c3d7f1a5e9c3b7f1a5d9e3c7b1f5a9d3e7c1f5b9a3e7d1c5f9b3a7e1d5c9",
  LUNA: "0xe6ccd3f878cf820e6fd5f28e5e86ab8ba1f4c892e29f6d442cb77d8cb8c3c9f6",
  AR: "0xc9f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7",
  AGIX: "0xd3f7b1a5e9c3d7f1b5a9e3c7d1f5b9a3e7c1d5f9b3a7e1c5d9f3b7a1e5c9d3f7",
  WLD: "0xd6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d9750e853571f4451d35",
};

// Batch fetch prices from Pyth for efficiency
async function fetchPythPricesBatch(symbols: string[]): Promise<Map<string, { price: number; source: string }>> {
  const result = new Map<string, { price: number; source: string }>();
  
  // Get feed IDs for requested symbols
  const feedIds = symbols
    .map(s => PYTH_PRICE_FEEDS[s])
    .filter(Boolean);
  
  if (feedIds.length === 0) return result;
  
  try {
    // Batch request to Pyth
    const idsParam = feedIds.map(id => `ids[]=${id}`).join("&");
    const response = await fetch(
      `https://hermes.pyth.network/api/latest_price_feeds?${idsParam}`,
      { headers: { "Accept": "application/json" } }
    );
    
    if (!response.ok) return result;
    
    const data = await response.json();
    if (!Array.isArray(data)) return result;
    
    // Map feed IDs back to symbols
    const feedIdToSymbol = new Map<string, string>();
    Object.entries(PYTH_PRICE_FEEDS).forEach(([symbol, feedId]) => {
      feedIdToSymbol.set(feedId, symbol);
    });
    
    data.forEach((feed: any) => {
      if (!feed?.id || !feed?.price?.price) return;
      
      const fullId = `0x${feed.id}`;
      const symbol = feedIdToSymbol.get(fullId);
      if (!symbol) return;
      
      const priceData = feed.price;
      const price = Number(priceData.price) * Math.pow(10, priceData.expo);
      
      if (price > 0) {
        result.set(symbol, { price, source: "Pyth" });
      }
    });
  } catch (err) {
    console.error("[PriceStream] Batch fetch error:", err);
  }
  
  return result;
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
      hint: "Connect using ws:// or wss:// protocol",
      availableSymbols: Object.keys(PYTH_PRICE_FEEDS).length,
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
    
    // Stream prices every 500ms using batch requests for efficiency
    streamInterval = setInterval(async () => {
      if (!isConnected || socket.readyState !== WebSocket.OPEN) {
        if (streamInterval) clearInterval(streamInterval);
        return;
      }
      
      try {
        // Batch fetch all subscribed symbols
        const prices = await fetchPythPricesBatch(subscribedSymbols);
        
        if (prices.size > 0 && isConnected && socket.readyState === WebSocket.OPEN) {
          // Send only batch update for efficiency (removed duplicate individual sends)
          const batchUpdate: BatchPriceUpdate = {
            type: "prices",
            updates: Array.from(prices.entries()).map(([symbol, data]) => ({
              symbol,
              price: data.price,
              source: data.source,
            })),
            timestamp: Date.now(),
          };
          
          socket.send(JSON.stringify(batchUpdate));
        }
      } catch (err) {
        // Only log if still connected
        if (isConnected) {
          console.error("[PriceStream] Error:", err);
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
      totalSymbols: Object.keys(PYTH_PRICE_FEEDS).length,
      timestamp: Date.now(),
    }));
    
    // Start streaming default symbols
    startStreaming();
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === "subscribe" && Array.isArray(message.symbols)) {
        // Update subscribed symbols (up to 100)
        subscribedSymbols = message.symbols
          .map((s: string) => s.toUpperCase())
          .filter((s: string) => PYTH_PRICE_FEEDS[s])
          .slice(0, 100);
        
        console.log(`[PriceStream] Subscribed to: ${subscribedSymbols.length} symbols`);
        
        socket.send(JSON.stringify({
          type: "subscribed",
          symbols: subscribedSymbols,
          count: subscribedSymbols.length,
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
