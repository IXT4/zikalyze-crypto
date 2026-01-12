// ═══════════════════════════════════════════════════════════════════════════════
// 📡 useGlobalPriceWebSocket — Fully Decentralized Client-Side Price Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Connects directly to Pyth Network's Hermes WebSocket (decentralized oracle)
// Falls back to DeFiLlama REST API (decentralized aggregator)
// No centralized edge functions - runs entirely in the browser
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

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

// Pyth Hermes WebSocket endpoint (decentralized oracle network)
const PYTH_HERMES_WSS = "wss://hermes.pyth.network/ws";
const PYTH_HERMES_REST = "https://hermes.pyth.network/api/latest_price_feeds";
const DEFILLAMA_API = "https://coins.llama.fi/prices/current";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 25000;
const FALLBACK_POLL_INTERVAL = 5000;

// Verified Pyth Network price feed IDs (decentralized oracle)
const PYTH_FEED_IDS: Record<string, string> = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BNB: "0x2f95862b045670cd22bee3114c39763a4a08a708c89fa42d2e6ecfc48e7ccee7",
  XRP: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  ADA: "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  TRX: "0x67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2c",
  LINK: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  DOT: "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97e8d4e0ce2a8f2a",
  MATIC: "0x5de33440f6c399aa75d5c11e39eaca4c39a0e7c0cfe6afa9b96cb46e5f41108c",
  LTC: "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  SHIB: "0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
  BCH: "0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3",
  ATOM: "0xb00b60f88b03a6a6259588d4429f8fcaba3bb11cad1b281129fc3d226e3b668a",
  UNI: "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  XLM: "0xb7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9c0085d973d5c8d068",
  ETC: "0x7f981f906d7cfe93f618804f1de89e0199ead306edc022d3230b3e8305f391b0",
  NEAR: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  ICP: "0xc9907d786c5821547777f525a94e3cb798f27d4cf0e9a7a83c3c2f4c50573e79",
  FIL: "0x150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  APT: "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  ARB: "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  OP: "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  AAVE: "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  SUI: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  SNX: "0x39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  CFX: "0x8879170230c9603342f3837cf9a8e76c61791198fb1271bb2552c9af7b33c933",
  DYDX: "0x6489800bb8974169adfe35f71e6e3e25f0f35db3e6d8b2f50b16f65e65f10cb5",
  COMP: "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  GMX: "0xb962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf",
  RPL: "0x24f94ac0fd8638e3fc41aab2e4df933e63f763351b640bf336a6ec70651c4503",
  CRV: "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  BAT: "0x8e860fb74e60e5736b455d82f60b3728049c348e94961add5f961b02fdee2535",
  ANKR: "0x89a58e1cab821118133d6831f5018fba5b354afb78b2d18f575b3cbf69a4f652",
  LUNC: "0xcc2362035ad57e560d2a4645d81b1c27c2eb70f0d681a45c49d09e0c5ff9d53d",
  LUNA: "0xe6ccd3f878cf338e6732bf59f60943e8ca2c28402fc4d9c258503b2edbe74a31",
  WLD: "0xd6835ad1f773f4bff18384eea799bfe29c2dcac2d0f1c5e9b9af7fa52a12f2e0",
  DAI: "0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd",
  INJ: "0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592",
  SEI: "0x53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb",
  TIA: "0x09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
  JUP: "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  PYTH: "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
};

// DeFiLlama token mappings (decentralized aggregator)
const DEFILLAMA_TOKENS: Record<string, string> = {
  BTC: "coingecko:bitcoin",
  ETH: "coingecko:ethereum",
  BNB: "coingecko:binancecoin",
  SOL: "coingecko:solana",
  XRP: "coingecko:ripple",
  ADA: "coingecko:cardano",
  DOGE: "coingecko:dogecoin",
  TRX: "coingecko:tron",
  AVAX: "coingecko:avalanche-2",
  TON: "coingecko:the-open-network",
  LINK: "coingecko:chainlink",
  DOT: "coingecko:polkadot",
  MATIC: "coingecko:matic-network",
  LTC: "coingecko:litecoin",
  BCH: "coingecko:bitcoin-cash",
  SHIB: "coingecko:shiba-inu",
  DAI: "coingecko:dai",
  ATOM: "coingecko:cosmos",
  UNI: "coingecko:uniswap",
  XLM: "coingecko:stellar",
  ETC: "coingecko:ethereum-classic",
  XMR: "coingecko:monero",
  ICP: "coingecko:internet-computer",
  NEAR: "coingecko:near",
  FIL: "coingecko:filecoin",
  APT: "coingecko:aptos",
  HBAR: "coingecko:hedera-hashgraph",
  ARB: "coingecko:arbitrum",
  VET: "coingecko:vechain",
  OP: "coingecko:optimism",
  MKR: "coingecko:maker",
  CRO: "coingecko:crypto-com-chain",
  KAS: "coingecko:kaspa",
  AAVE: "coingecko:aave",
  GRT: "coingecko:the-graph",
  RNDR: "coingecko:render-token",
  INJ: "coingecko:injective-protocol",
  ALGO: "coingecko:algorand",
  STX: "coingecko:blockstack",
  FTM: "coingecko:fantom",
  SUI: "coingecko:sui",
  THETA: "coingecko:theta-token",
  RUNE: "coingecko:thorchain",
  LDO: "coingecko:lido-dao",
  SAND: "coingecko:the-sandbox",
  MANA: "coingecko:decentraland",
  AXS: "coingecko:axie-infinity",
  FET: "coingecko:fetch-ai",
  EGLD: "coingecko:elrond-erd-2",
  FLOW: "coingecko:flow",
  EOS: "coingecko:eos",
  CHZ: "coingecko:chiliz",
  CAKE: "coingecko:pancakeswap-token",
  XTZ: "coingecko:tezos",
  KAVA: "coingecko:kava",
  NEO: "coingecko:neo",
  IOTA: "coingecko:iota",
  GALA: "coingecko:gala",
  SNX: "coingecko:havven",
  ZEC: "coingecko:zcash",
  KCS: "coingecko:kucoin-shares",
  CFX: "coingecko:conflux-token",
  MINA: "coingecko:mina-protocol",
  WOO: "coingecko:woo-network",
  ROSE: "coingecko:oasis-network",
  ZIL: "coingecko:zilliqa",
  DYDX: "coingecko:dydx",
  COMP: "coingecko:compound-governance-token",
  ENJ: "coingecko:enjincoin",
  FXS: "coingecko:frax-share",
  GMX: "coingecko:gmx",
  RPL: "coingecko:rocket-pool",
  CRV: "coingecko:curve-dao-token",
  DASH: "coingecko:dash",
  ONE: "coingecko:harmony",
  BAT: "coingecko:basic-attention-token",
  QTUM: "coingecko:qtum",
  CELO: "coingecko:celo",
  ZRX: "coingecko:0x",
  OCEAN: "coingecko:ocean-protocol",
  AUDIO: "coingecko:audius",
  ANKR: "coingecko:ankr",
  ICX: "coingecko:icon",
  IOTX: "coingecko:iotex",
  STORJ: "coingecko:storj",
  SKL: "coingecko:skale",
  ONT: "coingecko:ontology",
  JST: "coingecko:just",
  LUNC: "coingecko:terra-luna",
  GLMR: "coingecko:moonbeam",
  KDA: "coingecko:kadena",
  RVN: "coingecko:ravencoin",
  SC: "coingecko:siacoin",
  WAVES: "coingecko:waves",
  XEM: "coingecko:nem",
  BTT: "coingecko:bittorrent",
  LUNA: "coingecko:terra-luna-2",
  AR: "coingecko:arweave",
  AGIX: "coingecko:singularitynet",
  WLD: "coingecko:worldcoin-wld",
  PEPE: "coingecko:pepe",
  FLOKI: "coingecko:floki",
  BONK: "coingecko:bonk",
  WIF: "coingecko:dogwifcoin",
  ORDI: "coingecko:ordinals",
  SEI: "coingecko:sei-network",
  TIA: "coingecko:celestia",
  JUP: "coingecko:jupiter-exchange-solana",
  PYTH: "coingecko:pyth-network",
  JTO: "coingecko:jito-governance-token",
  STRK: "coingecko:starknet",
  BLUR: "coingecko:blur",
  IMX: "coingecko:immutable-x",
  PENDLE: "coingecko:pendle",
  ENS: "coingecko:ethereum-name-service",
};

// Build reverse lookup for Pyth feed IDs
const feedIdToSymbol = new Map<string, string>();
Object.entries(PYTH_FEED_IDS).forEach(([symbol, feedId]) => {
  feedIdToSymbol.set(feedId.replace("0x", ""), symbol);
});

// Singleton state for shared connection
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
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
let tickWindow: number[] = [];
let subscribedSymbols: string[] = [];

function notifyListeners() {
  globalListeners.forEach(listener => listener(new Map(globalPrices)));
}

function updateTickRate() {
  const now = Date.now();
  tickWindow = tickWindow.filter(t => now - t < 1000);
  globalState = { ...globalState, ticksPerSecond: tickWindow.length };
}

// Fetch from Pyth REST API as initial load / fallback
async function fetchPythREST(symbols: string[]): Promise<void> {
  const feedIds = symbols
    .map(s => PYTH_FEED_IDS[s])
    .filter(Boolean);

  if (feedIds.length === 0) return;

  try {
    const idsParam = feedIds.map(id => `ids[]=${id}`).join("&");
    const response = await fetch(`${PYTH_HERMES_REST}?${idsParam}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!Array.isArray(data)) return;

    data.forEach((feed: any) => {
      if (!feed?.id || !feed?.price?.price) return;

      const symbol = feedIdToSymbol.get(feed.id);
      if (!symbol) return;

      const priceData = feed.price;
      const price = Number(priceData.price) * Math.pow(10, priceData.expo);

      if (price > 0) {
        tickWindow.push(Date.now());
        updateTickRate();
        
        globalPrices.set(symbol, {
          symbol,
          price,
          source: "Pyth",
          timestamp: Date.now(),
        });
      }
    });

    globalState = {
      ...globalState,
      lastUpdate: Date.now(),
      subscribedCount: globalPrices.size,
    };
    notifyListeners();
  } catch (err) {
    console.error("[DecentralizedWS] Pyth REST error:", err);
  }
}

// Fetch from DeFiLlama as fallback
async function fetchDeFiLlama(symbols: string[]): Promise<void> {
  const llamaKeys = symbols
    .map(s => DEFILLAMA_TOKENS[s])
    .filter(Boolean);

  if (llamaKeys.length === 0) return;

  try {
    const keysParam = llamaKeys.join(",");
    const response = await fetch(`${DEFILLAMA_API}/${keysParam}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return;

    const data = await response.json();
    const coins = data?.coins;
    if (!coins) return;

    // Build reverse map
    const keyToSymbol = new Map<string, string>();
    Object.entries(DEFILLAMA_TOKENS).forEach(([symbol, key]) => {
      keyToSymbol.set(key, symbol);
    });

    Object.entries(coins).forEach(([key, value]: [string, any]) => {
      const symbol = keyToSymbol.get(key);
      const price = Number(value?.price);
      
      if (!symbol || !Number.isFinite(price) || price <= 0) return;
      
      // Only update if we don't have a Pyth price or it's stale (>30s)
      const existing = globalPrices.get(symbol);
      if (!existing || Date.now() - existing.timestamp > 30000) {
        tickWindow.push(Date.now());
        updateTickRate();
        
        globalPrices.set(symbol, {
          symbol,
          price,
          source: "DeFiLlama",
          timestamp: Date.now(),
        });
      }
    });

    globalState = {
      ...globalState,
      lastUpdate: Date.now(),
      subscribedCount: globalPrices.size,
    };
    notifyListeners();
  } catch (err) {
    console.error("[DecentralizedWS] DeFiLlama error:", err);
  }
}

// Connect to Pyth Hermes WebSocket
function connect() {
  if (globalSocket?.readyState === WebSocket.OPEN) return;
  if (globalSocket?.readyState === WebSocket.CONNECTING) return;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  globalState = { ...globalState, connecting: true, error: null };
  globalListeners.forEach(listener => listener(new Map(globalPrices)));

  try {
    console.log("[DecentralizedWS] Connecting to Pyth Hermes...");
    globalSocket = new WebSocket(PYTH_HERMES_WSS);

    globalSocket.onopen = () => {
      console.log("[DecentralizedWS] Connected to Pyth Hermes (decentralized)");
      reconnectAttempts = 0;

      globalState = {
        ...globalState,
        connected: true,
        connecting: false,
        error: null,
      };

      // Subscribe to price feeds
      if (subscribedSymbols.length > 0) {
        subscribeToFeeds(subscribedSymbols);
      }

      // Clear existing intervals
      if (pingInterval) clearInterval(pingInterval);
      if (fallbackInterval) clearInterval(fallbackInterval);

      // Ping to keep connection alive
      pingInterval = setInterval(() => {
        if (globalSocket?.readyState === WebSocket.OPEN) {
          globalSocket.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);

      // Fallback polling for symbols not in Pyth
      fallbackInterval = setInterval(() => {
        const nonPythSymbols = subscribedSymbols.filter(s => !PYTH_FEED_IDS[s]);
        if (nonPythSymbols.length > 0) {
          fetchDeFiLlama(nonPythSymbols);
        }
      }, FALLBACK_POLL_INTERVAL);

      notifyListeners();
    };

    globalSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle price feed updates
        if (data.type === "price_update" && data.price_feed) {
          const feed = data.price_feed;
          const symbol = feedIdToSymbol.get(feed.id);
          
          if (symbol && feed.price) {
            const price = Number(feed.price.price) * Math.pow(10, feed.price.expo);
            
            if (price > 0) {
              tickWindow.push(Date.now());
              updateTickRate();

              globalPrices.set(symbol, {
                symbol,
                price,
                source: "Pyth",
                timestamp: Date.now(),
              });

              globalState = {
                ...globalState,
                lastUpdate: Date.now(),
                subscribedCount: globalPrices.size,
              };
              notifyListeners();
            }
          }
        }
      } catch (err) {
        // Ignore parse errors for pong messages
      }
    };

    globalSocket.onclose = (event) => {
      console.log("[DecentralizedWS] Disconnected:", event.code, event.reason);

      globalState = {
        ...globalState,
        connected: false,
        connecting: false,
      };

      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      globalSocket = null;

      // Attempt reconnection
      if (globalListeners.size > 0 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 15000);
        console.log(`[DecentralizedWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

        // Use REST fallback while reconnecting
        fetchPythREST(subscribedSymbols);
        fetchDeFiLlama(subscribedSymbols.filter(s => !PYTH_FEED_IDS[s]));

        reconnectTimeout = setTimeout(() => connect(), delay);
      }

      notifyListeners();
    };

    globalSocket.onerror = () => {
      globalState = {
        ...globalState,
        error: "WebSocket connection error",
        connecting: false,
      };
    };
  } catch (err) {
    console.error("[DecentralizedWS] Failed to create WebSocket:", err);
    globalState = {
      ...globalState,
      error: "Failed to connect",
      connecting: false,
    };
    
    // Use REST fallback
    fetchPythREST(subscribedSymbols);
    fetchDeFiLlama(subscribedSymbols);
  }
}

function subscribeToFeeds(symbols: string[]) {
  if (globalSocket?.readyState !== WebSocket.OPEN) return;

  const feedIds = symbols
    .map(s => PYTH_FEED_IDS[s])
    .filter(Boolean);

  if (feedIds.length === 0) return;

  // Pyth Hermes subscription format
  const subscribeMsg = {
    type: "subscribe",
    ids: feedIds,
  };

  globalSocket.send(JSON.stringify(subscribeMsg));
  console.log(`[DecentralizedWS] Subscribed to ${feedIds.length} Pyth feeds`);
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
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
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
  const normalized = symbols.map(s => s.toUpperCase()).filter(Boolean);
  const uniqueSymbols = [...new Set([...subscribedSymbols, ...normalized])].slice(0, 100);
  subscribedSymbols = uniqueSymbols;

  if (globalSocket?.readyState === WebSocket.OPEN) {
    subscribeToFeeds(subscribedSymbols);
  }

  // Immediately fetch via REST for fast initial load
  fetchPythREST(subscribedSymbols);
  fetchDeFiLlama(subscribedSymbols.filter(s => !PYTH_FEED_IDS[s]));
}

// Update tick rate every 250ms
setInterval(updateTickRate, 250);

export function useGlobalPriceWebSocket(symbols: string[] = []) {
  const [state, setState] = useState<WebSocketState>(globalState);
  const [prices, setPrices] = useState<Map<string, WebSocketPriceData>>(new Map(globalPrices));
  const symbolsRef = useRef<string[]>(symbols);

  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  useEffect(() => {
    const listener = (newPrices: Map<string, WebSocketPriceData>) => {
      setPrices(newPrices);
      setState({ ...globalState });
    };

    globalListeners.add(listener);

    if (symbols.length > 0) {
      subscribe(symbols);
    }

    // Connect if not already connected
    if (!globalSocket || globalSocket.readyState === WebSocket.CLOSED || globalSocket.readyState === WebSocket.CLOSING) {
      connect();
    } else if (globalSocket.readyState === WebSocket.OPEN && symbols.length > 0) {
      subscribe(symbols);
    }

    // Initial state sync
    setPrices(new Map(globalPrices));
    setState({ ...globalState });

    // Fast sync interval
    const syncInterval = setInterval(() => {
      setPrices(new Map(globalPrices));
      setState({ ...globalState });
    }, 100);

    return () => {
      clearInterval(syncInterval);
      globalListeners.delete(listener);

      if (globalListeners.size === 0) {
        disconnect();
      }
    };
  }, []);

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
