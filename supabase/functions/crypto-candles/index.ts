// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-candles — Server-side Binance OHLCV Data Fetcher
// ═══════════════════════════════════════════════════════════════════════════════
// Bypasses CORS by fetching Binance data server-side
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Binance symbol mapping
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT', DOGE: 'DOGEUSDT',
  BNB: 'BNBUSDT', ADA: 'ADAUSDT', AVAX: 'AVAXUSDT', DOT: 'DOTUSDT',
  MATIC: 'MATICUSDT', LINK: 'LINKUSDT', UNI: 'UNIUSDT', ATOM: 'ATOMUSDT',
  LTC: 'LTCUSDT', BCH: 'BCHUSDT', NEAR: 'NEARUSDT', APT: 'APTUSDT',
  FIL: 'FILUSDT', ARB: 'ARBUSDT', OP: 'OPUSDT', INJ: 'INJUSDT',
  SUI: 'SUIUSDT', TIA: 'TIAUSDT', SEI: 'SEIUSDT', PEPE: 'PEPEUSDT', SHIB: 'SHIBUSDT',
  TON: 'TONUSDT', KAS: 'KASUSDT', TAO: 'TAOUSDT', RENDER: 'RENDERUSDT',
  TRX: 'TRXUSDT', XLM: 'XLMUSDT', HBAR: 'HBARUSDT', VET: 'VETUSDT',
  ALGO: 'ALGOUSDT', ICP: 'ICPUSDT', FTM: 'FTMUSDT', ETC: 'ETCUSDT',
  AAVE: 'AAVEUSDT', MKR: 'MKRUSDT', GRT: 'GRTUSDT', IMX: 'IMXUSDT',
  RUNE: 'RUNEUSDT', STX: 'STXUSDT', MINA: 'MINAUSDT', FLOW: 'FLOWUSDT',
  XTZ: 'XTZUSDT', EOS: 'EOSUSDT', NEO: 'NEOUSDT', THETA: 'THETAUSDT',
  EGLD: 'EGLDUSDT', ROSE: 'ROSEUSDT', ZEC: 'ZECUSDT', KAVA: 'KAVAUSDT',
  CFX: 'CFXUSDT', QNT: 'QNTUSDT', WLD: 'WLDUSDT', JUP: 'JUPUSDT',
  BONK: 'BONKUSDT', WIF: 'WIFUSDT', FLOKI: 'FLOKIUSDT', NOT: 'NOTUSDT',
  ORDI: 'ORDIUSDT', BLUR: 'BLURUSDT', PENDLE: 'PENDLEUSDT', STRK: 'STRKUSDT',
};

// Valid intervals
const VALID_INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchFromBinance(symbol: string, interval: string, limit: number): Promise<CandleData[] | null> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`;
  
  // Try multiple Binance endpoints
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Zikalyze/1.0' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((k: any[]) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
        }
      }
    } catch (e) {
      console.log(`Binance endpoint failed: ${url}`, e);
      continue;
    }
  }
  
  return null;
}

async function fetchFromBybit(symbol: string, interval: string, limit: number): Promise<CandleData[] | null> {
  // Bybit interval mapping
  const bybitIntervals: Record<string, string> = {
    '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
    '1d': 'D', '1w': 'W', '1M': 'M',
  };
  
  const bybitInterval = bybitIntervals[interval] || '60';
  const bybitSymbol = `${symbol.toUpperCase()}USDT`;
  
  try {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${bybitInterval}&limit=${limit}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const result = await response.json();
      if (result.retCode === 0 && result.result?.list?.length > 0) {
        // Bybit returns newest first, reverse to get oldest first
        return result.result.list.reverse().map((k: string[]) => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      }
    }
  } catch (e) {
    console.log('Bybit failed:', e);
  }
  
  return null;
}

async function fetchFromOKX(symbol: string, interval: string, limit: number): Promise<CandleData[] | null> {
  // OKX interval mapping
  const okxIntervals: Record<string, string> = {
    '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '12h': '12H',
    '1d': '1D', '1w': '1W', '1M': '1M',
  };
  
  const okxInterval = okxIntervals[interval] || '1H';
  const okxSymbol = `${symbol.toUpperCase()}-USDT`;
  
  try {
    const url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${okxInterval}&limit=${limit}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const result = await response.json();
      if (result.code === '0' && result.data?.length > 0) {
        // OKX returns newest first, reverse to get oldest first
        return result.data.reverse().map((k: string[]) => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      }
    }
  } catch (e) {
    console.log('OKX failed:', e);
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, interval = '1h', limit = 24 } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!VALID_INTERVALS.includes(interval)) {
      return new Response(
        JSON.stringify({ error: `Invalid interval. Valid: ${VALID_INTERVALS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const clampedLimit = Math.min(Math.max(1, limit), 500);
    
    console.log(`[crypto-candles] Fetching ${symbol} ${interval} x${clampedLimit}`);
    
    // Try sources in order: Binance → Bybit → OKX
    let candles: CandleData[] | null = null;
    let source = 'none';
    
    // 1. Binance (primary)
    candles = await fetchFromBinance(symbol, interval, clampedLimit);
    if (candles && candles.length >= 5) {
      source = 'binance';
      console.log(`[crypto-candles] ${symbol} loaded from Binance: ${candles.length} candles`);
    }
    
    // 2. Bybit (fallback)
    if (!candles || candles.length < 5) {
      candles = await fetchFromBybit(symbol, interval, clampedLimit);
      if (candles && candles.length >= 5) {
        source = 'bybit';
        console.log(`[crypto-candles] ${symbol} loaded from Bybit: ${candles.length} candles`);
      }
    }
    
    // 3. OKX (fallback)
    if (!candles || candles.length < 5) {
      candles = await fetchFromOKX(symbol, interval, clampedLimit);
      if (candles && candles.length >= 5) {
        source = 'okx';
        console.log(`[crypto-candles] ${symbol} loaded from OKX: ${candles.length} candles`);
      }
    }
    
    if (!candles || candles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data available from any source', symbol, interval }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        symbol: symbol.toUpperCase(),
        interval,
        source,
        count: candles.length,
        candles,
        timestamp: Date.now(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[crypto-candles] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
