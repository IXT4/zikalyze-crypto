// ═══════════════════════════════════════════════════════════════════════════════
// 📡 useGlobalPriceWebSocket — Fully Decentralized Client-Side Price Streaming
// ═══════════════════════════════════════════════════════════════════════════════
// Primary: Binance WebSocket (fastest, real-time trades)
// Fallback 1: Pyth Network Hermes (decentralized oracle)
// Fallback 2: DeFiLlama REST API (decentralized aggregator)
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
  primarySource: "Binance" | "Pyth" | "DeFiLlama" | "none";
}

// Binance WebSocket endpoints
const BINANCE_WSS_BASE = "wss://stream.binance.com:9443/ws";

// Pyth Hermes endpoints (fallback)
const PYTH_HERMES_WSS = "wss://hermes.pyth.network/ws";
const PYTH_HERMES_REST = "https://hermes.pyth.network/api/latest_price_feeds";
const DEFILLAMA_API = "https://coins.llama.fi/prices/current";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 25000;
const FALLBACK_POLL_INTERVAL = 5000;

// Binance trading pairs (symbol -> Binance stream name)
const BINANCE_STREAMS: Record<string, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  BNB: "bnbusdt",
  SOL: "solusdt",
  XRP: "xrpusdt",
  ADA: "adausdt",
  DOGE: "dogeusdt",
  TRX: "trxusdt",
  AVAX: "avaxusdt",
  TON: "tonusdt",
  LINK: "linkusdt",
  DOT: "dotusdt",
  MATIC: "maticusdt",
  LTC: "ltcusdt",
  BCH: "bchusdt",
  SHIB: "shibusdt",
  DAI: "daiusdt",
  ATOM: "atomusdt",
  UNI: "uniusdt",
  XLM: "xlmusdt",
  ETC: "etcusdt",
  ICP: "icpusdt",
  NEAR: "nearusdt",
  FIL: "filusdt",
  APT: "aptusdt",
  HBAR: "hbarusdt",
  ARB: "arbusdt",
  VET: "vetusdt",
  OP: "opusdt",
  MKR: "mkrusdt",
  AAVE: "aaveusdt",
  GRT: "grtusdt",
  RNDR: "rndrusdt",
  INJ: "injusdt",
  ALGO: "algousdt",
  STX: "stxusdt",
  FTM: "ftmusdt",
  SUI: "suiusdt",
  THETA: "thetausdt",
  RUNE: "runeusdt",
  LDO: "ldousdt",
  SAND: "sandusdt",
  MANA: "manausdt",
  AXS: "axsusdt",
  FET: "fetusdt",
  EGLD: "egldusdt",
  FLOW: "flowusdt",
  EOS: "eosusdt",
  CHZ: "chzusdt",
  CAKE: "cakeusdt",
  XTZ: "xtzusdt",
  KAVA: "kavausdt",
  NEO: "neousdt",
  IOTA: "iotausdt",
  GALA: "galausdt",
  SNX: "snxusdt",
  ZEC: "zecusdt",
  CFX: "cfxusdt",
  MINA: "minausdt",
  WOO: "woousdt",
  ROSE: "roseusdt",
  ZIL: "zilusdt",
  DYDX: "dydxusdt",
  COMP: "compusdt",
  ENJ: "enjusdt",
  FXS: "fxsusdt",
  GMX: "gmxusdt",
  RPL: "rplusdt",
  CRV: "crvusdt",
  DASH: "dashusdt",
  ONE: "oneusdt",
  BAT: "batusdt",
  CELO: "celousdt",
  ZRX: "zrxusdt",
  OCEAN: "oceanusdt",
  AUDIO: "audiousdt",
  ANKR: "ankrusdt",
  ICX: "icxusdt",
  IOTX: "iotxusdt",
  STORJ: "storjusdt",
  SKL: "sklusdt",
  ONT: "ontusdt",
  GLMR: "glmrusdt",
  KDA: "kdausdt",
  RVN: "rvnusdt",
  SC: "scusdt",
  WAVES: "wavesusdt",
  AR: "arusdt",
  AGIX: "agixusdt",
  WLD: "wldusdt",
  PEPE: "pepeusdt",
  FLOKI: "flokiusdt",
  BONK: "bonkusdt",
  WIF: "wifusdt",
  ORDI: "ordiusdt",
  SEI: "seiusdt",
  TIA: "tiausdt",
  JUP: "jupusdt",
  PYTH: "pythusdt",
  JTO: "jtousdt",
  STRK: "strkusdt",
  BLUR: "blurusdt",
  IMX: "imxusdt",
  PENDLE: "pendleusdt",
  ENS: "ensusdt",
  LUNC: "luncusdt",
  LUNA: "lunausdt",
};

// Pyth Network price feed IDs (fallback oracle)
const PYTH_FEED_IDS: Record<string, string> = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BNB: "0x2f95862b045670cd22bee3114c39763a4a08a708c89fa42d2e6ecfc48e7ccee7",
  XRP: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  ADA: "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  LINK: "0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  DOT: "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97e8d4e0ce2a8f2a",
  MATIC: "0x5de33440f6c399aa75d5c11e39eaca4c39a0e7c0cfe6afa9b96cb46e5f41108c",
  LTC: "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  UNI: "0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  ATOM: "0xb00b60f88b03a6a6259588d4429f8fcaba3bb11cad1b281129fc3d226e3b668a",
  NEAR: "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  APT: "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  ARB: "0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  OP: "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  SUI: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  INJ: "0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592",
  SEI: "0x53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb",
  TIA: "0x09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
  JUP: "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  PYTH: "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
};

// DeFiLlama token mappings (fallback aggregator)
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

// Build reverse lookups
const binanceStreamToSymbol = new Map<string, string>();
Object.entries(BINANCE_STREAMS).forEach(([symbol, stream]) => {
  binanceStreamToSymbol.set(stream, symbol);
});

const feedIdToSymbol = new Map<string, string>();
Object.entries(PYTH_FEED_IDS).forEach(([symbol, feedId]) => {
  feedIdToSymbol.set(feedId.replace("0x", ""), symbol);
});

// Singleton state for shared connection
let binanceSocket: WebSocket | null = null;
let pythSocket: WebSocket | null = null;
let globalListeners = new Set<(prices: Map<string, WebSocketPriceData>) => void>();
let globalPrices = new Map<string, WebSocketPriceData>();
let globalState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  lastUpdate: 0,
  ticksPerSecond: 0,
  subscribedCount: 0,
  primarySource: "none",
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

// Fetch from Pyth REST API as fallback
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
        // Only update if no Binance price or Binance is stale
        const existing = globalPrices.get(symbol);
        if (!existing || existing.source !== "Binance" || Date.now() - existing.timestamp > 5000) {
          tickWindow.push(Date.now());
          updateTickRate();
          
          globalPrices.set(symbol, {
            symbol,
            price,
            source: "Pyth",
            timestamp: Date.now(),
          });
        }
      }
    });

    globalState = {
      ...globalState,
      lastUpdate: Date.now(),
      subscribedCount: globalPrices.size,
    };
    notifyListeners();
  } catch (err) {
    console.error("[PriceWS] Pyth REST error:", err);
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

    const keyToSymbol = new Map<string, string>();
    Object.entries(DEFILLAMA_TOKENS).forEach(([symbol, key]) => {
      keyToSymbol.set(key, symbol);
    });

    Object.entries(coins).forEach(([key, value]: [string, any]) => {
      const symbol = keyToSymbol.get(key);
      const price = Number(value?.price);
      
      if (!symbol || !Number.isFinite(price) || price <= 0) return;
      
      // Only update if we don't have a fresher source
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
  } catch {
    // Silently handle DeFiLlama errors - this is a fallback
  }
}

// Connect to Binance Combined Streams WebSocket (primary)
function connectBinance(symbols: string[]) {
  if (binanceSocket?.readyState === WebSocket.OPEN) return;
  if (binanceSocket?.readyState === WebSocket.CONNECTING) return;

  const streams = symbols
    .map(s => BINANCE_STREAMS[s])
    .filter(Boolean)
    .map(s => `${s}@trade`);

  if (streams.length === 0) {
    console.log("[PriceWS] No Binance streams available, using Pyth fallback");
    connectPyth();
    return;
  }

  // Binance combined stream URL
  const wsUrl = `${BINANCE_WSS_BASE}/${streams.slice(0, 100).join("/")}`;

  try {
    console.log(`[PriceWS] Connecting to Binance (${streams.length} streams)...`);
    binanceSocket = new WebSocket(wsUrl);

    binanceSocket.onopen = () => {
      console.log("[PriceWS] ✅ Connected to Binance WebSocket (primary)");
      reconnectAttempts = 0;

      globalState = {
        ...globalState,
        connected: true,
        connecting: false,
        error: null,
        primarySource: "Binance",
      };

      // Setup ping interval
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (binanceSocket?.readyState === WebSocket.OPEN) {
          // Binance uses pong frames automatically, but we can send a ping
          binanceSocket.send(JSON.stringify({ method: "ping" }));
        }
      }, PING_INTERVAL);

      // Fallback polling for symbols not on Binance
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = setInterval(() => {
        const nonBinanceSymbols = subscribedSymbols.filter(s => !BINANCE_STREAMS[s]);
        if (nonBinanceSymbols.length > 0) {
          fetchPythREST(nonBinanceSymbols);
          fetchDeFiLlama(nonBinanceSymbols);
        }
      }, FALLBACK_POLL_INTERVAL);

      notifyListeners();
    };

    binanceSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle trade events
        if (data.e === "trade" && data.s && data.p) {
          // Extract symbol from stream (e.g., "BTCUSDT" -> "BTC")
          const pair = data.s.toUpperCase();
          const symbol = pair.replace("USDT", "");
          const price = parseFloat(data.p);

          if (price > 0 && BINANCE_STREAMS[symbol]) {
            tickWindow.push(Date.now());
            updateTickRate();

            globalPrices.set(symbol, {
              symbol,
              price,
              source: "Binance",
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
      } catch (err) {
        // Ignore parse errors
      }
    };

    binanceSocket.onclose = (event) => {
      console.log("[PriceWS] Binance disconnected:", event.code, event.reason);

      globalState = {
        ...globalState,
        connected: false,
        connecting: false,
        primarySource: "none",
      };

      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      binanceSocket = null;

      // Attempt reconnection or fallback to Pyth
      if (globalListeners.size > 0) {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 15000);
          console.log(`[PriceWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

          // Use fallbacks while reconnecting
          fetchPythREST(subscribedSymbols);
          fetchDeFiLlama(subscribedSymbols);

          reconnectTimeout = setTimeout(() => connectBinance(subscribedSymbols), delay);
        } else {
          // Fall back to Pyth after max attempts
          console.log("[PriceWS] Falling back to Pyth WebSocket");
          connectPyth();
        }
      }

      notifyListeners();
    };

    binanceSocket.onerror = (error) => {
      console.warn("[PriceWS] Binance WebSocket error - switching to fallback");
      globalState = {
        ...globalState,
        error: null, // Don't show error to user, we have fallbacks
        connecting: false,
      };
      // Will trigger onclose which handles fallback
    };
  } catch (err) {
    console.warn("[PriceWS] Failed to create Binance WebSocket, using Pyth fallback");
    // Fall back to Pyth silently
    connectPyth();
  }
}

// Connect to Pyth Hermes WebSocket (fallback)
function connectPyth() {
  if (pythSocket?.readyState === WebSocket.OPEN) return;
  if (pythSocket?.readyState === WebSocket.CONNECTING) return;

  try {
    console.log("[PriceWS] Connecting to Pyth Hermes (fallback)...");
    pythSocket = new WebSocket(PYTH_HERMES_WSS);

    pythSocket.onopen = () => {
      console.log("[PriceWS] ✅ Connected to Pyth Hermes (fallback)");

      globalState = {
        ...globalState,
        connected: true,
        connecting: false,
        error: null,
        primarySource: "Pyth",
      };

      // Subscribe to Pyth feeds
      const feedIds = subscribedSymbols
        .map(s => PYTH_FEED_IDS[s])
        .filter(Boolean);

      if (feedIds.length > 0) {
        pythSocket?.send(JSON.stringify({
          type: "subscribe",
          ids: feedIds,
        }));
        console.log(`[PriceWS] Subscribed to ${feedIds.length} Pyth feeds`);
      }

      // Fallback polling for symbols not in Pyth
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = setInterval(() => {
        const nonPythSymbols = subscribedSymbols.filter(s => !PYTH_FEED_IDS[s]);
        if (nonPythSymbols.length > 0) {
          fetchDeFiLlama(nonPythSymbols);
        }
      }, FALLBACK_POLL_INTERVAL);

      notifyListeners();
    };

    pythSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

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
        // Ignore parse errors
      }
    };

    pythSocket.onclose = () => {
      console.log("[PriceWS] Pyth disconnected");
      pythSocket = null;
      
      // Try to reconnect to Binance
      if (globalListeners.size > 0) {
        reconnectAttempts = 0;
        setTimeout(() => connectBinance(subscribedSymbols), RECONNECT_DELAY);
      }
    };

    pythSocket.onerror = () => {
      console.warn("[PriceWS] Pyth WebSocket error - using REST fallback");
      globalState = {
        ...globalState,
        error: null, // Don't show error, we have REST fallback
      };
      // Trigger immediate REST fallback
      fetchPythREST(subscribedSymbols);
      fetchDeFiLlama(subscribedSymbols);
    };
  } catch (err) {
    console.warn("[PriceWS] Failed to create Pyth WebSocket, using REST fallback");
    // Use REST fallbacks only
    fetchPythREST(subscribedSymbols);
    fetchDeFiLlama(subscribedSymbols);
    
    // Set up polling fallback
    if (fallbackInterval) clearInterval(fallbackInterval);
    fallbackInterval = setInterval(() => {
      fetchPythREST(subscribedSymbols);
      fetchDeFiLlama(subscribedSymbols);
    }, FALLBACK_POLL_INTERVAL);
    
    globalState = {
      ...globalState,
      connected: true, // Mark as connected via REST
      connecting: false,
      primarySource: "DeFiLlama",
    };
    notifyListeners();
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
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
  if (binanceSocket) {
    binanceSocket.close();
    binanceSocket = null;
  }
  if (pythSocket) {
    pythSocket.close();
    pythSocket = null;
  }
  globalState = {
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: 0,
    ticksPerSecond: 0,
    subscribedCount: 0,
    primarySource: "none",
  };
}

function subscribe(symbols: string[]) {
  const normalized = symbols.map(s => s.toUpperCase()).filter(Boolean);
  const uniqueSymbols = [...new Set([...subscribedSymbols, ...normalized])].slice(0, 100);
  subscribedSymbols = uniqueSymbols;

  // Immediately fetch via REST for fast initial load
  fetchPythREST(subscribedSymbols);
  fetchDeFiLlama(subscribedSymbols);
}

function connect() {
  globalState = { ...globalState, connecting: true, error: null };
  notifyListeners();
  
  // Try Binance first, will fall back to Pyth if needed
  connectBinance(subscribedSymbols);
}

// Update tick rate every 250ms
setInterval(updateTickRate, 250);

export function useGlobalPriceWebSocket(symbols: string[] = []) {
  const [state, setState] = useState<WebSocketState>(globalState);
  const [prices, setPrices] = useState<Map<string, WebSocketPriceData>>(() => new Map(globalPrices));
  const symbolsRef = useRef<string[]>(symbols);
  const lastPricesHashRef = useRef<string>("");
  const lastStateHashRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Direct listener - no throttling for real-time accuracy
    const listener = (newPrices: Map<string, WebSocketPriceData>) => {
      if (!isMountedRef.current) return;
      
      // Only update if prices actually changed (hash comparison)
      const pricesHash = Array.from(newPrices.entries())
        .slice(0, 30)
        .map(([k, v]) => `${k}:${v.price.toFixed(4)}`)
        .join("|");
      
      if (pricesHash !== lastPricesHashRef.current) {
        lastPricesHashRef.current = pricesHash;
        setPrices(new Map(newPrices));
      }
      
      const stateHash = `${globalState.connected}:${globalState.primarySource}:${globalState.subscribedCount}`;
      if (stateHash !== lastStateHashRef.current) {
        lastStateHashRef.current = stateHash;
        setState({ ...globalState });
      }
    };

    globalListeners.add(listener);

    if (symbols.length > 0) {
      subscribe(symbols);
    }

    // Connect if not already connected
    const binanceOpen = binanceSocket?.readyState === WebSocket.OPEN;
    const pythOpen = pythSocket?.readyState === WebSocket.OPEN;
    const binanceConnecting = binanceSocket?.readyState === WebSocket.CONNECTING;
    const pythConnecting = pythSocket?.readyState === WebSocket.CONNECTING;

    if (!binanceOpen && !pythOpen && !binanceConnecting && !pythConnecting) {
      connect();
    }

    // Initial state sync - only once
    if (!initializedRef.current && globalPrices.size > 0) {
      initializedRef.current = true;
      setPrices(new Map(globalPrices));
      setState({ ...globalState });
    }

    return () => {
      isMountedRef.current = false;
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

  // Direct access to global prices - always fresh, no state delay
  const getPrice = useCallback((symbol: string): WebSocketPriceData | null => {
    return globalPrices.get(symbol.toUpperCase()) || null;
  }, []);

  const getAllPrices = useCallback((): WebSocketPriceData[] => {
    return Array.from(globalPrices.values());
  }, []);

  return {
    ...state,
    prices,
    getPrice,
    getAllPrices,
    subscribe: useCallback((newSymbols: string[]) => subscribe(newSymbols), []),
    reconnect: useCallback(() => connect(), []),
  };
}
