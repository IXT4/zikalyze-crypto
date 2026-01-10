import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

// Supported exchanges in priority order (CoinCap first - free, all cryptos, no limits)
type Exchange = "coincap" | "binance" | "coinbase" | "kraken" | "coingecko";

// Map symbols to CoinCap IDs (free, all cryptos, no rate limits)
const COINCAP_ID_MAP: Record<string, string> = {
  // Top cryptos
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "xrp", DOGE: "dogecoin",
  BNB: "binance-coin", ADA: "cardano", AVAX: "avalanche", DOT: "polkadot",
  MATIC: "polygon", LINK: "chainlink", UNI: "uniswap", ATOM: "cosmos",
  LTC: "litecoin", BCH: "bitcoin-cash", NEAR: "near-protocol", APT: "aptos", FIL: "filecoin",
  ARB: "arbitrum", OP: "optimism", INJ: "injective-protocol", SUI: "sui",
  TIA: "celestia", SEI: "sei-network", PEPE: "pepe", SHIB: "shiba-inu",
  WIF: "dogwifhat", BONK: "bonk", FLOKI: "floki-inu", RENDER: "render-token",
  FET: "fetch", AAVE: "aave", MKR: "maker", GRT: "the-graph", IMX: "immutable-x",
  STX: "stacks", RUNE: "thorchain", SAND: "the-sandbox", MANA: "decentraland",
  AXS: "axie-infinity", GALA: "gala", APE: "apecoin", CRV: "curve-dao-token",
  SNX: "synthetix-network-token", COMP: "compound", LDO: "lido-dao",
  ENS: "ethereum-name-service", ALGO: "algorand", XLM: "stellar", VET: "vechain",
  ICP: "internet-computer", HBAR: "hedera", ETC: "ethereum-classic",
  FTM: "fantom", TRX: "tron", XMR: "monero", EOS: "eos", THETA: "theta-token",
  XTZ: "tezos", NEO: "neo", KAVA: "kava", ZEC: "zcash", DASH: "dash",
  EGLD: "multiversx-egld", FLOW: "flow", MINA: "mina-protocol", ROSE: "oasis-network",
  ONE: "harmony", ZIL: "zilliqa", ENJ: "enjin-coin", CHZ: "chiliz",
  BAT: "basic-attention-token", CAKE: "pancakeswap", SUSHI: "sushi",
  YFI: "yearn-finance", STETH: "lido-staked-ether", WBTC: "wrapped-bitcoin",
  TON: "toncoin", LEO: "unus-sed-leo", OKB: "okb", KCS: "kucoin-token",
  CRO: "cronos", WLD: "worldcoin", JUP: "jupiter", JTO: "jito-governance-token",
  KAS: "kaspa", TAO: "bittensor", PYTH: "pyth-network", TRB: "tellor", ORDI: "ordi",
  STG: "stargate-finance", BLUR: "blur", PENDLE: "pendle", DYDX: "dydx",
  TRUMP: "official-trump", POL: "polygon-ecosystem-token",
  HYPE: "hyperliquid", SXP: "swipe", FARTCOIN: "fartcoin", VIRTUAL: "virtual-protocol",
  ENA: "ethena", ONDO: "ondo-finance", OM: "mantra", BRETT: "brett",
  XDC: "xdc-network", JASMY: "jasmycoin", IOTA: "iota", QNT: "quant",
  AERO: "aerodrome-finance", CORE: "core-dao", MANTLE: "mantle",
  // New tokens and memecoins
  GMT: "stepn", STRK: "starknet", DYM: "dymension", ALT: "altlayer",
  PIXEL: "pixels", W: "wormhole", ETHFI: "ether-fi",
  BOME: "book-of-meme", SAGA: "saga-2", REZ: "renzo", BB: "bouncebit",
  NOT: "notcoin", IO: "io-net", ZK: "zksync", LISTA: "lista-dao",
  ZRO: "layerzero", BLAST: "blast", DOGS: "dogs", EIGEN: "eigenlayer",
  CATI: "catizen", SCR: "scroll", MOVE: "movement", ME: "magic-eden",
  VANA: "vana", USUAL: "usual", BIO: "bio-protocol", AIXBT: "aixbt",
  SPX: "spx6900", POPCAT: "popcat", MOG: "mog-coin", GIGA: "gigachad-2",
  MOODENG: "moo-deng", PNUT: "peanut-the-squirrel", ACT: "act-i-the-ai-prophecy",
  GOAT: "goatseus-maximus", CHILLGUY: "just-a-chill-guy", AI16Z: "ai16z",
  ARC: "arc", ZEREBRO: "zerebro", GRIFFAIN: "griffain", FWOG: "fwog",
  // Layer 1s and Layer 2s
  ZETA: "zetachain", BEAM: "beam", CELO: "celo",
  KLAY: "klaytn", OSMO: "osmosis", CANTO: "canto",
  // DeFi tokens
  BAL: "balancer", INCH: "1inch", GMX: "gmx",
  RPL: "rocket-pool", FXS: "frax-share", CVX: "convex-finance",
  // Gaming and Metaverse
  RONIN: "ronin", MAGIC: "magic", ILV: "illuvium", 
  PRIME: "echelon-prime", GODS: "gods-unchained",
  // AI tokens
  AGIX: "singularitynet", OCEAN: "ocean-protocol",
  RNDR: "render-token", ARKM: "arkham", AKT: "akash-network", AIOZ: "aioz-network",
  // Infrastructure
  AR: "arweave", STORJ: "storj", LPT: "livepeer",
  API3: "api3", BAND: "band-protocol", UMA: "uma", REQ: "request-network",
  // Privacy coins
  SCRT: "secret", NYM: "nym",
};

// Map symbols to CoinGecko IDs for fallback
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", DOGE: "dogecoin",
  BNB: "binancecoin", ADA: "cardano", AVAX: "avalanche-2", DOT: "polkadot",
  MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap", ATOM: "cosmos",
  LTC: "litecoin", BCH: "bitcoin-cash", NEAR: "near", APT: "aptos", FIL: "filecoin",
  ARB: "arbitrum", OP: "optimism", INJ: "injective-protocol", SUI: "sui",
  TIA: "celestia", SEI: "sei-network", PEPE: "pepe", SHIB: "shiba-inu",
  WIF: "dogwifcoin", BONK: "bonk", FLOKI: "floki", RENDER: "render-token",
  FET: "fetch-ai", AAVE: "aave", MKR: "maker", GRT: "the-graph", IMX: "immutable-x",
  STX: "blockstack", RUNE: "thorchain", SAND: "the-sandbox", MANA: "decentraland",
  AXS: "axie-infinity", GALA: "gala", APE: "apecoin", CRV: "curve-dao-token",
  SNX: "synthetix-network-token", COMP: "compound-governance-token", LDO: "lido-dao",
  ENS: "ethereum-name-service", ALGO: "algorand", XLM: "stellar", VET: "vechain",
  ICP: "internet-computer", HBAR: "hedera-hashgraph", ETC: "ethereum-classic",
  FTM: "fantom", TRX: "tron", XMR: "monero", EOS: "eos", THETA: "theta-token",
  XTZ: "tezos", NEO: "neo", KAVA: "kava", ZEC: "zcash", DASH: "dash",
  EGLD: "elrond-erd-2", FLOW: "flow", MINA: "mina-protocol", ROSE: "oasis-network",
  ONE: "harmony", ZIL: "zilliqa", ENJ: "enjincoin", CHZ: "chiliz",
  BAT: "basic-attention-token", CAKE: "pancakeswap-token", SUSHI: "sushi",
  YFI: "yearn-finance", STETH: "staked-ether", WBTC: "wrapped-bitcoin",
  TON: "the-open-network", LEO: "leo-token", OKB: "okb", KCS: "kucoin-shares",
  CRO: "crypto-com-chain", GOMINING: "gomining", GOMI: "gomining",
  WLD: "worldcoin", JUP: "jupiter", JTO: "jito-governance-token", KAS: "kaspa",
  TAO: "bittensor", PYTH: "pyth-network", TRB: "tellor", ORDI: "ordi",
  STG: "stargate-finance", BLUR: "blur", PENDLE: "pendle", DYDX: "dydx-chain",
};

const COINBASE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", XRP: "XRP-USD", DOGE: "DOGE-USD",
  ADA: "ADA-USD", AVAX: "AVAX-USD", DOT: "DOT-USD", MATIC: "MATIC-USD",
  LINK: "LINK-USD", UNI: "UNI-USD", ATOM: "ATOM-USD", LTC: "LTC-USD",
  BCH: "BCH-USD", NEAR: "NEAR-USD", APT: "APT-USD", FIL: "FIL-USD",
  ARB: "ARB-USD", OP: "OP-USD", INJ: "INJ-USD", SUI: "SUI-USD", SHIB: "SHIB-USD",
  AAVE: "AAVE-USD", MKR: "MKR-USD", GRT: "GRT-USD", IMX: "IMX-USD",
  SAND: "SAND-USD", MANA: "MANA-USD", AXS: "AXS-USD", GALA: "GALA-USD",
  APE: "APE-USD", CRV: "CRV-USD", SNX: "SNX-USD", COMP: "COMP-USD",
  LDO: "LDO-USD", ENS: "ENS-USD", ALGO: "ALGO-USD", XLM: "XLM-USD",
  ICP: "ICP-USD", HBAR: "HBAR-USD", ETC: "ETC-USD", EOS: "EOS-USD",
  XTZ: "XTZ-USD", ZEC: "ZEC-USD", DASH: "DASH-USD", FLOW: "FLOW-USD",
  ENJ: "ENJ-USD", CHZ: "CHZ-USD", BAT: "BAT-USD", SUSHI: "SUSHI-USD", YFI: "YFI-USD",
};

const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  BTC: "XBT/USD", ETH: "ETH/USD", SOL: "SOL/USD", XRP: "XRP/USD", DOGE: "DOGE/USD",
  ADA: "ADA/USD", AVAX: "AVAX/USD", DOT: "DOT/USD", MATIC: "MATIC/USD",
  LINK: "LINK/USD", UNI: "UNI/USD", ATOM: "ATOM/USD", LTC: "LTC/USD",
  BCH: "BCH/USD", NEAR: "NEAR/USD", APT: "APT/USD", FIL: "FIL/USD", SHIB: "SHIB/USD",
  AAVE: "AAVE/USD", MKR: "MKR/USD", GRT: "GRT/USD", SAND: "SAND/USD",
  MANA: "MANA/USD", AXS: "AXS/USD", GALA: "GALA/USD", APE: "APE/USD",
  CRV: "CRV/USD", SNX: "SNX/USD", COMP: "COMP/USD", LDO: "LDO/USD",
  ENS: "ENS/USD", ALGO: "ALGO/USD", XLM: "XLM/USD", ETC: "ETC/USD",
  EOS: "EOS/USD", XTZ: "XTZ/USD", ZEC: "ZEC/USD", DASH: "DASH/USD",
  FLOW: "FLOW/USD", ENJ: "ENJ/USD", BAT: "BAT/USD", SUSHI: "SUSHI/USD",
  YFI: "YFI/USD", TRX: "TRX/USD", XMR: "XMR/USD",
};

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC", ETH: "ETH", SOL: "SOL", XRP: "XRP", DOGE: "DOGE", BNB: "BNB",
  ADA: "ADA", AVAX: "AVAX", DOT: "DOT", MATIC: "MATIC", LINK: "LINK", UNI: "UNI",
  ATOM: "ATOM", LTC: "LTC", BCH: "BCH", NEAR: "NEAR", APT: "APT", FIL: "FIL",
  ARB: "ARB", OP: "OP", INJ: "INJ", SUI: "SUI", TIA: "TIA", SEI: "SEI",
  PEPE: "PEPE", SHIB: "SHIB", WIF: "WIF", BONK: "BONK", FLOKI: "FLOKI",
  RENDER: "RENDER", FET: "FET", AAVE: "AAVE", MKR: "MKR", GRT: "GRT", IMX: "IMX",
  STX: "STX", RUNE: "RUNE", SAND: "SAND", MANA: "MANA", AXS: "AXS", GALA: "GALA",
  APE: "APE", CRV: "CRV", SNX: "SNX", COMP: "COMP", LDO: "LDO", ENS: "ENS",
  ALGO: "ALGO", XLM: "XLM", VET: "VET", ICP: "ICP", HBAR: "HBAR", ETC: "ETC",
  FTM: "FTM", TRX: "TRX", XMR: "XMR", EOS: "EOS", THETA: "THETA", XTZ: "XTZ",
  NEO: "NEO", KAVA: "KAVA", ZEC: "ZEC", DASH: "DASH", EGLD: "EGLD", FLOW: "FLOW",
  MINA: "MINA", ROSE: "ROSE", ONE: "ONE", ZIL: "ZIL", ENJ: "ENJ", CHZ: "CHZ",
  BAT: "BAT", CAKE: "CAKE", SUSHI: "SUSHI", YFI: "YFI", DYDX: "DYDX", GMT: "GMT",
  BLUR: "BLUR", MASK: "MASK", WLD: "WLD", JTO: "JTO", PYTH: "PYTH", JUP: "JUP",
  STRK: "STRK", DYM: "DYM", ALT: "ALT", PIXEL: "PIXEL", ORDI: "ORDI",
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Retry wrapper for fetch functions
const fetchWithRetry = async <T>(
  fetchFn: () => Promise<T | null>,
  retries = 2,
  delayMs = 1000
): Promise<T | null> => {
  for (let i = 0; i <= retries; i++) {
    const result = await fetchFn();
    if (result !== null) return result;
    if (i < retries) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
};

// Cache with TTL
interface CacheEntry {
  data: ChartDataPoint[];
  priceChange: number;
  timestamp: number;
  exchange: Exchange;
}

const dataCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

// Backoff state
const backoffState = new Map<string, { attempts: number; nextRetry: number }>();
const BASE_BACKOFF = 1000;
const MAX_BACKOFF = 30 * 1000;

const getBackoffKey = (symbol: string, exchange: Exchange) => `${symbol}-${exchange}`;
const getBackoffDelay = (attempts: number) => Math.min(BASE_BACKOFF * Math.pow(2, attempts), MAX_BACKOFF);

const canRetry = (key: string): boolean => {
  const state = backoffState.get(key);
  return !state || Date.now() >= state.nextRetry;
};

const recordFailure = (key: string) => {
  const state = backoffState.get(key) || { attempts: 0, nextRetry: 0 };
  state.attempts += 1;
  state.nextRetry = Date.now() + getBackoffDelay(state.attempts);
  backoffState.set(key, state);
};

const recordSuccess = (key: string) => backoffState.delete(key);

const getCachedData = (symbol: string): CacheEntry | null => dataCache.get(symbol.toUpperCase()) || null;
const isCacheValid = (symbol: string): boolean => {
  const cached = dataCache.get(symbol.toUpperCase());
  return cached ? Date.now() - cached.timestamp < CACHE_TTL : false;
};
const setCacheData = (symbol: string, data: ChartDataPoint[], priceChange: number, exchange: Exchange) => {
  dataCache.set(symbol.toUpperCase(), { data, priceChange, timestamp: Date.now(), exchange });
};

// Get exchange symbol
const getExchangeSymbol = (sym: string, exchange: Exchange, coinGeckoId?: string): string | null => {
  const upperSym = sym.toUpperCase();
  switch (exchange) {
    case "coincap": return COINCAP_ID_MAP[upperSym] || upperSym.toLowerCase();
    case "binance": return BINANCE_SYMBOL_MAP[upperSym] || null;
    case "coinbase": return COINBASE_SYMBOL_MAP[upperSym] || null;
    case "kraken": return KRAKEN_SYMBOL_MAP[upperSym] || null;
    case "coingecko": return coinGeckoId || COINGECKO_ID_MAP[upperSym] || null;
    default: return null;
  }
};

// Fetch functions (pure, no hooks)

// CoinCap - free, supports all cryptos, no rate limits
const fetchCoinCapData = async (symbol: string, coinCapId: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "coincap");
  if (!canRetry(backoffKey)) {
    console.log(`[CoinCap] ${symbol} in backoff, skipping`);
    return null;
  }
  try {
    // First get current price and 24h volume
    console.log(`[CoinCap] Fetching ${symbol} with ID: ${coinCapId}`);
    const assetResponse = await fetchWithTimeout(`https://api.coincap.io/v2/assets/${coinCapId}`);
    if (!assetResponse.ok) { 
      console.log(`[CoinCap] ${symbol} asset fetch failed: ${assetResponse.status}`);
      recordFailure(backoffKey); 
      return null; 
    }
    const assetData = await assetResponse.json();
    if (!assetData.data) { 
      console.log(`[CoinCap] ${symbol} no asset data`);
      recordFailure(backoffKey); 
      return null; 
    }

    const volume24h = parseFloat(assetData.data.volumeUsd24Hr) || 0;

    // Get historical data for chart (last 20 minutes)
    const end = Date.now();
    const start = end - 20 * 60 * 1000;
    const historyResponse = await fetchWithTimeout(
      `https://api.coincap.io/v2/assets/${coinCapId}/history?interval=m1&start=${start}&end=${end}`
    );
    if (!historyResponse.ok) { 
      console.log(`[CoinCap] ${symbol} history fetch failed: ${historyResponse.status}`);
      recordFailure(backoffKey); 
      return null; 
    }
    const historyData = await historyResponse.json();
    if (!historyData.data || historyData.data.length === 0) { 
      console.log(`[CoinCap] ${symbol} no history data`);
      recordFailure(backoffKey); 
      return null; 
    }

    recordSuccess(backoffKey);
    console.log(`[CoinCap] ${symbol} success! Got ${historyData.data.length} data points`);
    const points = historyData.data.slice(-20);
    const volumePerPoint = volume24h / (24 * 60); // Distribute 24h volume across minutes

    return points.map((point: any, index: number) => {
      const price = parseFloat(point.priceUsd);
      const prevPrice = index > 0 ? parseFloat(points[index - 1].priceUsd) : price;
      return {
        time: formatTime(new Date(point.time)),
        price,
        volume: volumePerPoint,
        positive: price >= prevPrice,
      };
    });
  } catch (err) { 
    console.log(`[CoinCap] ${symbol} error:`, err);
    recordFailure(backoffKey); 
    return null; 
  }
};

const fetchBinanceData = async (symbol: string, binanceSymbol: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "binance");
  if (!canRetry(backoffKey)) return null;
  try {
    const response = await fetchWithTimeout(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}USDT&interval=1m&limit=20`
    );
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) { recordFailure(backoffKey); return null; }
    recordSuccess(backoffKey);
    return data.map((kline: any[]) => ({
      time: formatTime(new Date(kline[6])),
      price: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      positive: parseFloat(kline[4]) >= parseFloat(kline[1]),
    }));
  } catch { recordFailure(backoffKey); return null; }
};

const fetchCoinbaseData = async (symbol: string, coinbaseSymbol: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "coinbase");
  if (!canRetry(backoffKey)) return null;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 20 * 60 * 1000);
    const response = await fetchWithTimeout(
      `https://api.exchange.coinbase.com/products/${coinbaseSymbol}/candles?granularity=60&start=${start.toISOString()}&end=${end.toISOString()}`
    );
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) { recordFailure(backoffKey); return null; }
    recordSuccess(backoffKey);
    return data.reverse().slice(-20).map((candle: number[]) => ({
      time: formatTime(new Date(candle[0] * 1000)),
      price: candle[4],
      volume: candle[5],
      positive: candle[4] >= candle[3],
    }));
  } catch { recordFailure(backoffKey); return null; }
};

const fetchKrakenData = async (symbol: string, krakenSymbol: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "kraken");
  if (!canRetry(backoffKey)) return null;
  try {
    const pair = krakenSymbol.replace("/", "");
    const response = await fetchWithTimeout(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1`);
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (data.error?.length > 0) { recordFailure(backoffKey); return null; }
    const resultKey = Object.keys(data.result).find(k => k !== "last");
    if (!resultKey || !Array.isArray(data.result[resultKey])) { recordFailure(backoffKey); return null; }
    recordSuccess(backoffKey);
    const ohlc = data.result[resultKey].slice(-20);
    return ohlc.map((candle: any[]) => ({
      time: formatTime(new Date(candle[0] * 1000)),
      price: parseFloat(candle[4]),
      volume: parseFloat(candle[6]),
      positive: parseFloat(candle[4]) >= parseFloat(candle[1]),
    }));
  } catch { recordFailure(backoffKey); return null; }
};

const fetchCoinGeckoData = async (symbol: string, cgId: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "coingecko");
  if (!canRetry(backoffKey)) return null;
  try {
    const response = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=1`
    );
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (!data.prices || data.prices.length === 0) { recordFailure(backoffKey); return null; }
    recordSuccess(backoffKey);
    const recentPrices = data.prices.slice(-20);
    const recentVolumes = data.total_volumes?.slice(-20) || [];
    return recentPrices.map((pricePoint: [number, number], index: number) => {
      const [timestamp, price] = pricePoint;
      const prevPrice = index > 0 ? recentPrices[index - 1][1] : price;
      return {
        time: formatTime(new Date(timestamp)),
        price,
        volume: recentVolumes[index]?.[1] || 0,
        positive: price >= prevPrice,
      };
    });
  } catch { recordFailure(backoffKey); return null; }
};

// Parse WebSocket messages
const parseWebSocketMessage = (exchange: Exchange, data: any): { price: number; volume: number; time: Date } | null => {
  try {
    switch (exchange) {
      case "binance":
        if (data.k) return { price: parseFloat(data.k.c), volume: parseFloat(data.k.v), time: new Date(data.k.T) };
        break;
      case "coinbase":
        if (data.type === "ticker" && data.price)
          return { price: parseFloat(data.price), volume: parseFloat(data.volume_24h || "0"), time: new Date(data.time || Date.now()) };
        break;
      case "kraken":
        if (Array.isArray(data) && data.length >= 2 && typeof data[1] === "object") {
          const ticker = data[1];
          if (ticker.c && Array.isArray(ticker.c))
            return { price: parseFloat(ticker.c[0]), volume: parseFloat(ticker.v?.[1] || "0"), time: new Date() };
        }
        break;
    }
  } catch {}
  return null;
};

export const useRealtimeChartData = (symbol: string, coinGeckoId?: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<Exchange | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // Check cache first
    const cached = getCachedData(symbol);
    if (cached && isCacheValid(symbol)) {
      setChartData(cached.data);
      setPriceChange(cached.priceChange);
      setDataSource(cached.exchange);
      setIsLoading(false);
      // Use first price point as reference for change calculation
      lastPriceRef.current = cached.data[0]?.price || null;
    } else {
      setChartData([]);
      lastPriceRef.current = null;
      setPriceChange(0);
      setIsLoading(true);
    }
    
    setIsSupported(true);
    setError(null);
    cleanup();

    const connectWebSocket = (exchange: Exchange, exchangeSymbol: string) => {
      if (!mountedRef.current) return;
      
      let wsUrl: string;
      let subscribeMessage: string | null = null;

      switch (exchange) {
        case "binance":
          wsUrl = `wss://stream.binance.com:9443/ws/${exchangeSymbol.toLowerCase()}usdt@kline_1m`;
          break;
        case "coinbase":
          wsUrl = "wss://ws-feed.exchange.coinbase.com";
          subscribeMessage = JSON.stringify({ type: "subscribe", product_ids: [exchangeSymbol], channels: ["ticker"] });
          break;
        case "kraken":
          wsUrl = "wss://ws.kraken.com";
          subscribeMessage = JSON.stringify({ event: "subscribe", pair: [exchangeSymbol], subscription: { name: "ticker" } });
          break;
        default:
          return;
      }

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          if (subscribeMessage) ws.send(subscribeMessage);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            const parsed = parseWebSocketMessage(exchange, data);
            if (parsed) {
              const timeStr = formatTime(parsed.time);
              if (lastPriceRef.current === null) lastPriceRef.current = parsed.price;
              const change = ((parsed.price - lastPriceRef.current) / lastPriceRef.current) * 100;
              setPriceChange(change);
              setChartData((prev) => {
                const newPoint: ChartDataPoint = {
                  time: timeStr,
                  price: parsed.price,
                  volume: parsed.volume,
                  positive: parsed.price >= (prev[prev.length - 1]?.price || parsed.price),
                };
                const existingIndex = prev.findIndex(p => p.time === timeStr);
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = newPoint;
                  return updated;
                }
                const updated = [...prev, newPoint];
                if (updated.length > 20) {
                  updated.shift();
                  lastPriceRef.current = updated[0]?.price || null;
                }
                return updated;
              });
            }
          } catch {}
        };

        ws.onclose = () => {
          if (mountedRef.current && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket(exchange, exchangeSymbol);
            }, 500);
          }
        };

        wsRef.current = ws;
      } catch {}
    };

    // CoinCap WebSocket for real-time price updates
    const setupCoinCapWebSocket = (coinCapId: string) => {
      try {
        const ws = new WebSocket(`wss://ws.coincap.io/prices?assets=${coinCapId}`);
        
        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            const price = parseFloat(data[coinCapId]);
            if (price && !isNaN(price)) {
              const timeStr = formatTime(new Date());
              if (lastPriceRef.current === null) lastPriceRef.current = price;
              const change = ((price - lastPriceRef.current) / lastPriceRef.current) * 100;
              setPriceChange(change);
              setChartData((prev) => {
                const newPoint: ChartDataPoint = {
                  time: timeStr,
                  price,
                  volume: prev[prev.length - 1]?.volume || 0,
                  positive: price >= (prev[prev.length - 1]?.price || price),
                };
                const existingIndex = prev.findIndex(p => p.time === timeStr);
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = newPoint;
                  return updated;
                }
                const updated = [...prev, newPoint];
                if (updated.length > 20) {
                  updated.shift();
                  lastPriceRef.current = updated[0]?.price || null;
                }
                return updated;
              });
            }
          } catch {}
        };

        ws.onclose = () => {
          if (mountedRef.current && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              setupCoinCapWebSocket(coinCapId);
            }, 2000);
          }
        };

        wsRef.current = ws;
      } catch {}
    };

    const setupCoinGeckoRefresh = (cgId: string) => {
      refreshIntervalRef.current = window.setInterval(async () => {
        if (!mountedRef.current) return;
        const data = await fetchCoinGeckoData(symbol, cgId);
        if (data && data.length > 0 && mountedRef.current) {
          const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
          setChartData(data);
          setPriceChange(change);
          setCacheData(symbol, data, change, "coingecko");
        }
      }, 60000);
    };

    const loadData = async () => {
      // CoinCap first (free, all cryptos, no limits), then fallback to others
      const exchanges: Exchange[] = ["coincap", "binance", "coinbase", "kraken", "coingecko"];

      for (const exchange of exchanges) {
        if (!mountedRef.current) return;

        const exchangeSymbol = getExchangeSymbol(symbol, exchange, coinGeckoId);
        if (!exchangeSymbol) continue;

        let data: ChartDataPoint[] | null = null;

        switch (exchange) {
          case "coincap":
            data = await fetchWithRetry(() => fetchCoinCapData(symbol, exchangeSymbol));
            break;
          case "binance": 
            data = await fetchWithRetry(() => fetchBinanceData(symbol, exchangeSymbol)); 
            break;
          case "coinbase": 
            data = await fetchWithRetry(() => fetchCoinbaseData(symbol, exchangeSymbol)); 
            break;
          case "kraken": 
            data = await fetchWithRetry(() => fetchKrakenData(symbol, exchangeSymbol)); 
            break;
          case "coingecko": 
            data = await fetchWithRetry(() => fetchCoinGeckoData(symbol, exchangeSymbol)); 
            break;
        }

        if (data && data.length > 0 && mountedRef.current) {
          const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
          setChartData(data);
          setPriceChange(change);
          setDataSource(exchange);
          setIsLoading(false);
          setCacheData(symbol, data, change, exchange);
          lastPriceRef.current = data[0]?.price || null;

          // Set up live updates - WebSocket for supported exchanges, polling for CoinCap/CoinGecko
          if (exchange === "coincap") {
            // CoinCap WebSocket for live updates
            setupCoinCapWebSocket(exchangeSymbol);
          } else if (exchange !== "coingecko") {
            connectWebSocket(exchange, exchangeSymbol);
          } else {
            setupCoinGeckoRefresh(exchangeSymbol);
          }
          return;
        }
      }

      if (mountedRef.current) {
        setIsSupported(false);
        setError("Data not available for this asset");
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [symbol, coinGeckoId, cleanup]);

  return { chartData, priceChange, isLoading, isSupported, error, dataSource };
};
