// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useChartTrendData — Real-time 24h Chart Data for AI Trend Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// Provides OHLCV candlestick data for accurate trend detection
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeFetch } from '@/lib/fetchWithRetry';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartTrendData {
  candles: CandleData[];
  // Derived trend metrics
  trend24h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: number; // 0-100
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  ema9: number;
  ema21: number;
  rsi: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  priceVelocity: number; // Rate of change
  lastUpdated: number;
  isLive: boolean;
  source: string;
}

// Binance symbol mapping (PRIMARY)
const BINANCE_SYMBOL_MAP: Record<string, string> = {
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
};

// CoinCap ID mapping (BROWSER-FRIENDLY - no CORS issues)
const COINCAP_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'xrp', DOGE: 'dogecoin',
  BNB: 'binance-coin', ADA: 'cardano', AVAX: 'avalanche', DOT: 'polkadot',
  MATIC: 'polygon', LINK: 'chainlink', UNI: 'uniswap', ATOM: 'cosmos',
  LTC: 'litecoin', BCH: 'bitcoin-cash', NEAR: 'near-protocol', APT: 'aptos',
  FIL: 'filecoin', ARB: 'arbitrum', OP: 'optimism', INJ: 'injective-protocol',
  SUI: 'sui', TIA: 'celestia', SEI: 'sei-network', PEPE: 'pepe', SHIB: 'shiba-inu',
  TON: 'the-open-network', KAS: 'kaspa', TAO: 'bittensor', RENDER: 'render-token',
  TRX: 'tron', XLM: 'stellar', HBAR: 'hedera-hashgraph', VET: 'vechain',
  ALGO: 'algorand', ICP: 'internet-computer', FTM: 'fantom', ETC: 'ethereum-classic',
  AAVE: 'aave', MKR: 'maker', GRT: 'the-graph', RUNE: 'thorchain',
  STX: 'stacks', MINA: 'mina', FLOW: 'flow', XTZ: 'tezos', EOS: 'eos',
  NEO: 'neo', THETA: 'theta', EGLD: 'elrond-erd-2', ROSE: 'oasis-network',
  ZEC: 'zcash', KAVA: 'kava', XMR: 'monero', SAND: 'the-sandbox',
  MANA: 'decentraland', ENJ: 'enjin-coin', CHZ: 'chiliz', BAT: 'basic-attention-token',
};

// Calculate EMA
const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
};

// Calculate RSI
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
};

// Detect swing highs/lows for trend structure
const detectSwingPoints = (candles: CandleData[]): { higherHighs: boolean; higherLows: boolean; lowerHighs: boolean; lowerLows: boolean } => {
  if (candles.length < 10) {
    return { higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false };
  }
  
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  // Find swing points (simplified - look at quarters of the data)
  const quarterLen = Math.floor(candles.length / 4);
  const recentHighs = highs.slice(-quarterLen * 2);
  const olderHighs = highs.slice(0, quarterLen * 2);
  const recentLows = lows.slice(-quarterLen * 2);
  const olderLows = lows.slice(0, quarterLen * 2);
  
  const recentMaxHigh = Math.max(...recentHighs);
  const olderMaxHigh = Math.max(...olderHighs);
  const recentMinLow = Math.min(...recentLows);
  const olderMinLow = Math.min(...olderLows);
  
  const higherHighs = recentMaxHigh > olderMaxHigh * 1.002;
  const higherLows = recentMinLow > olderMinLow * 1.002;
  const lowerHighs = recentMaxHigh < olderMaxHigh * 0.998;
  const lowerLows = recentMinLow < olderMinLow * 0.998;
  
  return { higherHighs, higherLows, lowerHighs, lowerLows };
};

// Analyze trend from candles
const analyzeTrend = (candles: CandleData[]): ChartTrendData['trend24h'] => {
  if (candles.length < 5) return 'NEUTRAL';
  
  const closes = candles.map(c => c.close);
  const firstPrice = closes[0];
  const lastPrice = closes[closes.length - 1];
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  
  const swings = detectSwingPoints(candles);
  
  // Strong trend detection
  if (changePercent >= 3 && ema9 > ema21 && swings.higherHighs) return 'BULLISH';
  if (changePercent <= -3 && ema9 < ema21 && swings.lowerLows) return 'BEARISH';
  
  // Moderate trend
  if (changePercent >= 1 && ema9 > ema21) return 'BULLISH';
  if (changePercent <= -1 && ema9 < ema21) return 'BEARISH';
  
  // Weak signals
  if (changePercent > 0.5) return 'BULLISH';
  if (changePercent < -0.5) return 'BEARISH';
  
  return 'NEUTRAL';
};

// Calculate trend strength (0-100)
const calculateTrendStrength = (candles: CandleData[]): number => {
  if (candles.length < 5) return 50;
  
  const closes = candles.map(c => c.close);
  const changePercent = Math.abs(((closes[closes.length - 1] - closes[0]) / closes[0]) * 100);
  
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const emaDiff = Math.abs((ema9 - ema21) / ema21) * 100;
  
  const swings = detectSwingPoints(candles);
  const swingScore = (swings.higherHighs ? 10 : 0) + (swings.higherLows ? 10 : 0) +
                     (swings.lowerHighs ? 10 : 0) + (swings.lowerLows ? 10 : 0);
  
  // Combine factors
  let strength = 50;
  strength += Math.min(25, changePercent * 5); // Up to +25 from price change
  strength += Math.min(15, emaDiff * 10);       // Up to +15 from EMA spread
  strength += swingScore * 0.5;                 // Up to +20 from swing structure
  
  return Math.min(98, Math.max(35, strength));
};

// Volume trend analysis
const analyzeVolumeTrend = (candles: CandleData[]): ChartTrendData['volumeTrend'] => {
  if (candles.length < 6) return 'STABLE';
  
  const recentVol = candles.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
  const olderVol = candles.slice(0, 3).reduce((sum, c) => sum + c.volume, 0) / 3;
  
  if (recentVol > olderVol * 1.2) return 'INCREASING';
  if (recentVol < olderVol * 0.8) return 'DECREASING';
  return 'STABLE';
};

// Price velocity (rate of change)
const calculatePriceVelocity = (candles: CandleData[]): number => {
  if (candles.length < 2) return 0;
  
  const closes = candles.map(c => c.close);
  const recent = closes.slice(-5);
  if (recent.length < 2) return 0;
  
  // Average rate of change per candle
  let totalChange = 0;
  for (let i = 1; i < recent.length; i++) {
    totalChange += ((recent[i] - recent[i - 1]) / recent[i - 1]) * 100;
  }
  
  return totalChange / (recent.length - 1);
};

export function useChartTrendData(symbol: string): ChartTrendData | null {
  const [data, setData] = useState<ChartTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Fetch from Edge Function (PRIMARY - bypasses CORS, uses Binance/Bybit/OKX)
  const fetchFromEdgeFunction = useCallback(async (): Promise<CandleData[] | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-candles', {
        body: { symbol, interval: '1h', limit: 24 }
      });
      
      if (error) {
        console.log(`[ChartTrend] Edge function error for ${symbol}:`, error);
        return null;
      }
      
      if (data?.candles && Array.isArray(data.candles) && data.candles.length >= 5) {
        console.log(`[ChartTrend] ${symbol} loaded from ${data.source}: ${data.candles.length} candles`);
        return data.candles;
      }
      
      return null;
    } catch (e) {
      console.log(`[ChartTrend] Edge function failed for ${symbol}:`, e);
      return null;
    }
  }, [symbol]);
  
  // Fetch from CoinCap (BROWSER-FRIENDLY - no CORS issues)
  const fetchFromCoinCap = useCallback(async (): Promise<CandleData[] | null> => {
    const coinCapId = COINCAP_ID_MAP[symbol.toUpperCase()];
    if (!coinCapId) return null;
    
    try {
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000; // 24 hours ago
      
      const response = await safeFetch(
        `https://api.coincap.io/v2/assets/${coinCapId}/history?interval=h1&start=${start}&end=${end}`,
        { timeoutMs: 12000, maxRetries: 3 }
      );
      
      if (!response?.ok) return null;
      
      const result = await response.json();
      if (!result.data || result.data.length < 5) return null;
      
      // Convert to candle format (CoinCap provides price points, simulate OHLC)
      const candles: CandleData[] = result.data.map((point: any, index: number, arr: any[]) => {
        const price = parseFloat(point.priceUsd);
        const prevPrice = index > 0 ? parseFloat(arr[index - 1].priceUsd) : price;
        const volatilityFactor = 0.002;
        
        return {
          timestamp: new Date(point.time).getTime(),
          open: prevPrice,
          high: Math.max(price, prevPrice) * (1 + volatilityFactor),
          low: Math.min(price, prevPrice) * (1 - volatilityFactor),
          close: price,
          volume: parseFloat(point.circulatingSupply || '0') * price * 0.005,
        };
      });
      
      return candles;
    } catch {
      return null;
    }
  }, [symbol]);
  
  const fetchData = useCallback(async () => {
    let candles: CandleData[] | null = null;
    let source = 'unknown';
    
    // 1. Try Edge Function first (bypasses CORS, uses Binance/Bybit/OKX)
    candles = await fetchFromEdgeFunction();
    if (candles && candles.length >= 5) {
      source = 'Server 24h';
    }
    
    // 2. Fallback to CoinCap (browser-friendly, no CORS)
    if (!candles || candles.length < 5) {
      candles = await fetchFromCoinCap();
      if (candles && candles.length >= 5) {
        source = 'CoinCap 24h';
        console.log(`[ChartTrend] ${symbol} loaded from CoinCap fallback: ${candles.length} candles`);
      }
    }
    
    // 3. No data available
    if (!candles || candles.length < 5) {
      console.log(`[ChartTrend] No data available for ${symbol}`);
      setIsLoading(false);
      return;
    }
    
    const closes = candles.map(c => c.close);
    const swings = detectSwingPoints(candles);
    
    if (!mountedRef.current) return;
    
    setData({
      candles,
      trend24h: analyzeTrend(candles),
      trendStrength: calculateTrendStrength(candles),
      higherHighs: swings.higherHighs,
      higherLows: swings.higherLows,
      lowerHighs: swings.lowerHighs,
      lowerLows: swings.lowerLows,
      ema9: calculateEMA(closes, 9),
      ema21: calculateEMA(closes, 21),
      rsi: calculateRSI(closes, 14),
      volumeTrend: analyzeVolumeTrend(candles),
      priceVelocity: calculatePriceVelocity(candles),
      lastUpdated: Date.now(),
      isLive: true,
      source
    });
    
    setIsLoading(false);
  }, [symbol, fetchFromEdgeFunction, fetchFromCoinCap]);
  
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    
    // Initial fetch
    fetchData();
    
    // Refresh every 60 seconds for trend updates
    refreshIntervalRef.current = window.setInterval(fetchData, 60000);
    
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [symbol, fetchData]);
  
  return data;
}

export default useChartTrendData;
