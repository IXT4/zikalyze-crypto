import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

// Supported live exchanges in priority order
type Exchange = "binance" | "okx" | "bybit" | "mexc" | "gateio" | "coinbase" | "kraken";

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
  FET: "FET-USD", RENDER: "RNDR-USD", TIA: "TIA-USD", SEI: "SEI-USD",
  BONK: "BONK-USD", PEPE: "PEPE-USD", WIF: "WIF-USD", JUP: "JUP-USD",
  PYTH: "PYTH-USD", STX: "STX-USD", RUNE: "RUNE-USD", FTM: "FTM-USD",
  VET: "VET-USD", THETA: "THETA-USD", NEO: "NEO-USD", KAVA: "KAVA-USD",
  EGLD: "EGLD-USD", MINA: "MINA-USD", ROSE: "ROSE-USD", ZIL: "ZIL-USD",
  FLOKI: "FLOKI-USD", WLD: "WLD-USD", BLUR: "BLUR-USD", MASK: "MASK-USD",
  DYDX: "DYDX-USD", GMT: "GMT-USD", CAKE: "CAKE-USD", TRX: "TRX-USD",
  XMR: "XMR-USD", BNB: "BNB-USD", TON: "TON-USD",
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
  YFI: "YFI/USD", TRX: "TRX/USD", XMR: "XMR/USD", FET: "FET/USD",
  PEPE: "PEPE/USD", BONK: "BONK/USD", WIF: "WIF/USD", FTM: "FTM/USD",
  THETA: "THETA/USD", KAVA: "KAVA/USD", EGLD: "EGLD/USD", MINA: "MINA/USD",
  ROSE: "ROSE/USD", ZIL: "ZIL/USD", FLOKI: "FLOKI/USD", WLD: "WLD/USD",
  BLUR: "BLUR/USD", DYDX: "DYDX/USD", GMT: "GMT/USD", MASK: "MASK/USD",
  TIA: "TIA/USD", SEI: "SEI/USD", STX: "STX/USD", RUNE: "RUNE/USD",
  JUP: "JUP/USD", PYTH: "PYTH/USD", RENDER: "RNDR/USD", INJ: "INJ/USD",
  SUI: "SUI/USD", ARB: "ARB/USD", OP: "OP/USD", ICP: "ICP/USD", HBAR: "HBAR/USD",
  VET: "VET/USD", NEO: "NEO/USD", IMX: "IMX/USD", CHZ: "CHZ/USD",
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
  STRK: "STRK", DYM: "DYM", ALT: "ALT", PIXEL: "PIXEL", ORDI: "ORDI", TON: "TON",
};

// Normalize symbol - remove underscores, special chars
const normalizeSymbol = (sym: string): string => {
  return sym.toUpperCase().replace(/[_\-\/]/g, "").replace(/USD[TC]?$/i, "");
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
const BASE_BACKOFF = 3000;
const MAX_BACKOFF = 2 * 60 * 1000;

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

// Get exchange symbol - try mapping first, then fallback to normalized symbol
const getExchangeSymbol = (sym: string, exchange: Exchange): string | null => {
  const upperSym = sym.toUpperCase();
  const normalized = normalizeSymbol(sym);
  switch (exchange) {
    case "binance": 
      return BINANCE_SYMBOL_MAP[upperSym] || BINANCE_SYMBOL_MAP[normalized] || normalized;
    case "okx":
      return `${normalized}-USDT`;
    case "bybit":
      return `${normalized}USDT`;
    case "mexc":
      return `${normalized}USDT`;
    case "gateio":
      return `${normalized}_USDT`;
    case "coinbase": 
      return COINBASE_SYMBOL_MAP[upperSym] || COINBASE_SYMBOL_MAP[normalized] || `${normalized}-USD`;
    case "kraken": 
      return KRAKEN_SYMBOL_MAP[upperSym] || KRAKEN_SYMBOL_MAP[normalized] || `${normalized}/USD`;
    default: return null;
  }
};

// Fetch functions
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

const fetchOkxData = async (symbol: string, okxSymbol: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "okx");
  if (!canRetry(backoffKey)) return null;
  try {
    const response = await fetchWithTimeout(
      `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=1m&limit=20`
    );
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (data.code !== "0" || !Array.isArray(data.data) || data.data.length === 0) { 
      recordFailure(backoffKey); return null; 
    }
    recordSuccess(backoffKey);
    return data.data.reverse().map((candle: string[]) => ({
      time: formatTime(new Date(parseInt(candle[0]))),
      price: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      positive: parseFloat(candle[4]) >= parseFloat(candle[1]),
    }));
  } catch { recordFailure(backoffKey); return null; }
};

const fetchBybitData = async (symbol: string, bybitSymbol: string): Promise<ChartDataPoint[] | null> => {
  const backoffKey = getBackoffKey(symbol, "bybit");
  if (!canRetry(backoffKey)) return null;
  try {
    const response = await fetchWithTimeout(
      `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=1&limit=20`
    );
    if (!response.ok) { recordFailure(backoffKey); return null; }
    const data = await response.json();
    if (data.retCode !== 0 || !data.result?.list || data.result.list.length === 0) { 
      recordFailure(backoffKey); return null; 
    }
    recordSuccess(backoffKey);
    return data.result.list.reverse().map((candle: string[]) => ({
      time: formatTime(new Date(parseInt(candle[0]))),
      price: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      positive: parseFloat(candle[4]) >= parseFloat(candle[1]),
    }));
  } catch { recordFailure(backoffKey); return null; }
};

// MEXC and Gate.io use WebSocket-only - no REST fetch needed
// They will be handled directly via WebSocket connection

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

// Parse WebSocket messages
const parseWebSocketMessage = (exchange: Exchange, data: any): { price: number; volume: number; time: Date } | null => {
  try {
    switch (exchange) {
      case "binance":
        if (data.k) return { price: parseFloat(data.k.c), volume: parseFloat(data.k.v), time: new Date(data.k.T) };
        break;
      case "okx":
        if (data.data?.[0]) {
          const d = data.data[0];
          return { price: parseFloat(d.last || d.c), volume: parseFloat(d.vol24h || d.v || "0"), time: new Date(parseInt(d.ts)) };
        }
        break;
      case "bybit":
        if (data.data) {
          const d = data.data;
          return { price: parseFloat(d.lastPrice), volume: parseFloat(d.volume24h || "0"), time: new Date(parseInt(d.ts)) };
        }
        break;
      case "mexc":
        // New MEXC kline format: publicspotkline with closingprice, volume, etc.
        if (data.publicspotkline) {
          const k = data.publicspotkline;
          return { 
            price: parseFloat(k.closingprice), 
            volume: parseFloat(k.volume || "0"), 
            time: new Date(data.createtime || Date.now())
          };
        }
        // Deals/trades data fallback
        if (data.d?.deals?.[0]) {
          const d = data.d.deals[0];
          return { price: parseFloat(d.p), volume: parseFloat(d.v || "0"), time: new Date(d.t) };
        }
        break;
      case "gateio":
        // Candlestick data: [timestamp, volume, close, high, low, open]
        if (data.channel === "spot.candlesticks" && data.result) {
          const r = data.result;
          return { price: parseFloat(r.c), volume: parseFloat(r.v || r.a || "0"), time: new Date(parseInt(r.t) * 1000) };
        }
        // Ticker data
        if (data.channel === "spot.tickers" && data.result) {
          return { price: parseFloat(data.result.last), volume: parseFloat(data.result.base_volume || "0"), time: new Date(parseInt(data.time) * 1000) };
        }
        if (data.result?.last) {
          return { price: parseFloat(data.result.last), volume: parseFloat(data.result.base_volume || "0"), time: new Date() };
        }
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

export const useRealtimeChartData = (symbol: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
      setIsLoading(false);
      setIsLive(true);
      lastPriceRef.current = cached.data[0]?.price || null;
    } else {
      setChartData([]);
      lastPriceRef.current = null;
      setPriceChange(0);
      setIsLoading(true);
      setIsLive(false);
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
        case "okx":
          wsUrl = "wss://ws.okx.com:8443/ws/v5/public";
          subscribeMessage = JSON.stringify({ op: "subscribe", args: [{ channel: "tickers", instId: exchangeSymbol }] });
          break;
        case "bybit":
          wsUrl = "wss://stream.bybit.com/v5/public/spot";
          subscribeMessage = JSON.stringify({ op: "subscribe", args: [`tickers.${exchangeSymbol}`] });
          break;
        case "mexc":
          wsUrl = "wss://wbs-api.mexc.com/ws";
          subscribeMessage = JSON.stringify({ method: "SUBSCRIPTION", params: [`spot@public.kline.v3.api.pb@${exchangeSymbol}@Min1`] });
          break;
        case "gateio":
          wsUrl = "wss://api.gateio.ws/ws/v4/";
          subscribeMessage = JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: "spot.candlesticks", event: "subscribe", payload: ["1m", exchangeSymbol] });
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
          setIsLive(true);
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

        ws.onerror = () => setIsLive(false);

        ws.onclose = () => {
          setIsLive(false);
          if (mountedRef.current && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket(exchange, exchangeSymbol);
            }, 5000);
          }
        };

        wsRef.current = ws;
      } catch {}
    };

    // Try WebSocket-only connection with timeout for MEXC/Gate.io
    const tryWebSocketConnection = (exchange: Exchange, exchangeSymbol: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!mountedRef.current) { resolve(false); return; }

        let wsUrl: string;
        let subscribeMessage: string;

        switch (exchange) {
          case "mexc":
            wsUrl = "wss://wbs-api.mexc.com/ws";
            subscribeMessage = JSON.stringify({ method: "SUBSCRIPTION", params: [`spot@public.kline.v3.api.pb@${exchangeSymbol}@Min1`] });
            break;
          case "gateio":
            wsUrl = "wss://api.gateio.ws/ws/v4/";
            subscribeMessage = JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: "spot.candlesticks", event: "subscribe", payload: ["1m", exchangeSymbol] });
            break;
          default:
            resolve(false);
            return;
        }

        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        const ws = new WebSocket(wsUrl);
        let gotData = false;

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); clearTimeout(timeout); resolve(false); return; }
          ws.send(subscribeMessage);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            const parsed = parseWebSocketMessage(exchange, data);
            if (parsed && !gotData) {
              gotData = true;
              clearTimeout(timeout);
              setIsLoading(false);
              setIsLive(true);
              lastPriceRef.current = parsed.price;
              
              const timeStr = formatTime(parsed.time);
              setChartData([{
                time: timeStr,
                price: parsed.price,
                volume: parsed.volume,
                positive: true,
              }]);
              
              wsRef.current = ws;
              
              // Continue receiving messages
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
                setIsLive(false);
                if (mountedRef.current && !reconnectTimeoutRef.current) {
                  reconnectTimeoutRef.current = window.setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    tryWebSocketConnection(exchange, exchangeSymbol);
                  }, 5000);
                }
              };
              
              resolve(true);
            }
          } catch {}
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        ws.onclose = () => {
          if (!gotData) {
            clearTimeout(timeout);
            resolve(false);
          }
        };
      });
    };

    const loadData = async () => {
      // Priority 1: Try MEXC WebSocket first (broadest crypto coverage)
      const mexcSymbol = getExchangeSymbol(symbol, "mexc");
      if (mexcSymbol && mountedRef.current) {
        const success = await tryWebSocketConnection("mexc", mexcSymbol);
        if (success) return;
      }

      // Priority 2: Try Gate.io WebSocket (also broad coverage)
      const gateioSymbol = getExchangeSymbol(symbol, "gateio");
      if (gateioSymbol && mountedRef.current) {
        const success = await tryWebSocketConnection("gateio", gateioSymbol);
        if (success) return;
      }

      // Priority 3: REST-based exchanges as fallback
      const restExchanges: Exchange[] = ["binance", "okx", "bybit", "coinbase", "kraken"];

      for (const exchange of restExchanges) {
        if (!mountedRef.current) return;

        const exchangeSymbol = getExchangeSymbol(symbol, exchange);
        if (!exchangeSymbol) continue;

        let data: ChartDataPoint[] | null = null;

        switch (exchange) {
          case "binance": data = await fetchBinanceData(symbol, exchangeSymbol); break;
          case "okx": data = await fetchOkxData(symbol, exchangeSymbol); break;
          case "bybit": data = await fetchBybitData(symbol, exchangeSymbol); break;
          case "coinbase": data = await fetchCoinbaseData(symbol, exchangeSymbol); break;
          case "kraken": data = await fetchKrakenData(symbol, exchangeSymbol); break;
        }

        if (data && data.length > 0 && mountedRef.current) {
          const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
          setChartData(data);
          setPriceChange(change);
          setIsLoading(false);
          setCacheData(symbol, data, change, exchange);
          lastPriceRef.current = data[0]?.price || null;
          connectWebSocket(exchange, exchangeSymbol);
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
  }, [symbol, cleanup]);

  return { chartData, priceChange, isLoading, isSupported, error, isLive };
};
