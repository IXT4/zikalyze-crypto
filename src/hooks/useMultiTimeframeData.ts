// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiTimeframeData — Multi-Timeframe Chart Analysis (15m, 1h, 4h, Daily)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses server-side edge function to bypass CORS and get reliable Binance data
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeFetch } from '@/lib/fetchWithRetry';

export type Timeframe = '15m' | '1h' | '4h' | '1d';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  candles: CandleData[];
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: number;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  ema9: number;
  ema21: number;
  rsi: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  priceVelocity: number;
  support: number;
  resistance: number;
  lastUpdated: number;
  isLive: boolean;
}

export interface MultiTimeframeData {
  '15m': TimeframeAnalysis | null;
  '1h': TimeframeAnalysis | null;
  '4h': TimeframeAnalysis | null;
  '1d': TimeframeAnalysis | null;
  confluence: {
    overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number;
    alignedTimeframes: number;
    conflictingTimeframes: number;
    recommendation: string;
  };
  isLoading: boolean;
  lastUpdated: number;
}

// Binance symbol mapping (PRIMARY - most reliable)
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

// Binance interval mapping
const BINANCE_INTERVALS: Record<Timeframe, string> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

// CoinCap interval mapping
const COINCAP_INTERVALS: Record<Timeframe, string> = {
  '15m': 'm15',
  '1h': 'h1',
  '4h': 'h1', // Will group into 4h
  '1d': 'd1',
};

// Timeframe configs
const TIMEFRAME_CONFIG: Record<Timeframe, { duration: number; candleCount: number }> = {
  '15m': { duration: 12 * 60 * 60 * 1000, candleCount: 48 }, // 12 hours
  '1h': { duration: 24 * 60 * 60 * 1000, candleCount: 24 }, // 24 hours
  '4h': { duration: 4 * 24 * 60 * 60 * 1000, candleCount: 24 }, // 4 days
  '1d': { duration: 30 * 24 * 60 * 60 * 1000, candleCount: 30 }, // 30 days
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

// Detect swing structure
const detectSwingPoints = (candles: CandleData[]): { higherHighs: boolean; higherLows: boolean; lowerHighs: boolean; lowerLows: boolean } => {
  if (candles.length < 10) {
    return { higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false };
  }
  
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const quarterLen = Math.floor(candles.length / 4);
  const recentHighs = highs.slice(-quarterLen * 2);
  const olderHighs = highs.slice(0, quarterLen * 2);
  const recentLows = lows.slice(-quarterLen * 2);
  const olderLows = lows.slice(0, quarterLen * 2);
  
  const recentMaxHigh = Math.max(...recentHighs);
  const olderMaxHigh = Math.max(...olderHighs);
  const recentMinLow = Math.min(...recentLows);
  const olderMinLow = Math.min(...olderLows);
  
  return {
    higherHighs: recentMaxHigh > olderMaxHigh * 1.002,
    higherLows: recentMinLow > olderMinLow * 1.002,
    lowerHighs: recentMaxHigh < olderMaxHigh * 0.998,
    lowerLows: recentMinLow < olderMinLow * 0.998,
  };
};

// Analyze trend
const analyzeTrend = (candles: CandleData[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' => {
  if (candles.length < 5) return 'NEUTRAL';
  
  const closes = candles.map(c => c.close);
  const firstPrice = closes[0];
  const lastPrice = closes[closes.length - 1];
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const swings = detectSwingPoints(candles);
  
  if (changePercent >= 3 && ema9 > ema21 && swings.higherHighs) return 'BULLISH';
  if (changePercent <= -3 && ema9 < ema21 && swings.lowerLows) return 'BEARISH';
  if (changePercent >= 1 && ema9 > ema21) return 'BULLISH';
  if (changePercent <= -1 && ema9 < ema21) return 'BEARISH';
  if (changePercent > 0.5) return 'BULLISH';
  if (changePercent < -0.5) return 'BEARISH';
  
  return 'NEUTRAL';
};

// Calculate trend strength
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
  
  let strength = 50;
  strength += Math.min(25, changePercent * 5);
  strength += Math.min(15, emaDiff * 10);
  strength += swingScore * 0.5;
  
  return Math.min(98, Math.max(35, strength));
};

// Volume trend
const analyzeVolumeTrend = (candles: CandleData[]): 'INCREASING' | 'DECREASING' | 'STABLE' => {
  if (candles.length < 6) return 'STABLE';
  
  const recentVol = candles.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
  const olderVol = candles.slice(0, 3).reduce((sum, c) => sum + c.volume, 0) / 3;
  
  if (recentVol > olderVol * 1.2) return 'INCREASING';
  if (recentVol < olderVol * 0.8) return 'DECREASING';
  return 'STABLE';
};

// Price velocity
const calculatePriceVelocity = (candles: CandleData[]): number => {
  if (candles.length < 2) return 0;
  
  const closes = candles.map(c => c.close);
  const recent = closes.slice(-5);
  if (recent.length < 2) return 0;
  
  let totalChange = 0;
  for (let i = 1; i < recent.length; i++) {
    totalChange += ((recent[i] - recent[i - 1]) / recent[i - 1]) * 100;
  }
  
  return totalChange / (recent.length - 1);
};

// Find support/resistance
const findSupportResistance = (candles: CandleData[]): { support: number; resistance: number } => {
  if (candles.length === 0) return { support: 0, resistance: 0 };
  
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
};

// Group hourly candles into 4h
const groupInto4hCandles = (hourlyCandles: CandleData[]): CandleData[] => {
  const grouped: CandleData[] = [];
  
  for (let i = 0; i < hourlyCandles.length; i += 4) {
    const chunk = hourlyCandles.slice(i, i + 4);
    if (chunk.length === 0) continue;
    
    grouped.push({
      timestamp: chunk[0].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  
  return grouped;
};

export function useMultiTimeframeData(symbol: string): MultiTimeframeData {
  const [data, setData] = useState<MultiTimeframeData>({
    '15m': null,
    '1h': null,
    '4h': null,
    '1d': null,
    confluence: {
      overallBias: 'NEUTRAL',
      strength: 50,
      alignedTimeframes: 0,
      conflictingTimeframes: 0,
      recommendation: 'Gathering data...',
    },
    isLoading: true,
    lastUpdated: 0,
  });
  
  const mountedRef = useRef(true);
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Fetch from Edge Function (PRIMARY - bypasses CORS, uses Binance/Bybit/OKX)
  const fetchFromEdgeFunction = useCallback(async (
    symbol: string,
    timeframe: Timeframe
  ): Promise<CandleData[] | null> => {
    try {
      const config = TIMEFRAME_CONFIG[timeframe];
      const interval = BINANCE_INTERVALS[timeframe];
      
      const { data, error } = await supabase.functions.invoke('crypto-candles', {
        body: { symbol, interval, limit: config.candleCount }
      });
      
      if (error) {
        console.log(`[MTF] Edge function error for ${symbol}:`, error);
        return null;
      }
      
      if (data?.candles && Array.isArray(data.candles) && data.candles.length >= 5) {
        console.log(`[MTF] ${timeframe} loaded from ${data.source}: ${data.candles.length} candles`);
        return data.candles;
      }
      
      return null;
    } catch (e) {
      console.log(`[MTF] Edge function failed for ${symbol}:`, e);
      return null;
    }
  }, []);

  // Fetch from CoinCap API (BROWSER-FRIENDLY - no CORS issues)
  const fetchFromCoinCap = useCallback(async (
    symbol: string,
    timeframe: Timeframe
  ): Promise<CandleData[] | null> => {
    try {
      const coinCapId = COINCAP_ID_MAP[symbol.toUpperCase()];
      if (!coinCapId) return null;
      
      const config = TIMEFRAME_CONFIG[timeframe];
      const end = Date.now();
      const start = end - config.duration;
      const interval = COINCAP_INTERVALS[timeframe];
      
      const response = await safeFetch(
        `https://api.coincap.io/v2/assets/${coinCapId}/history?interval=${interval}&start=${start}&end=${end}`,
        { timeoutMs: 12000, maxRetries: 3 }
      );
      
      if (!response?.ok) return null;
      
      const result = await response.json();
      if (!result.data || !Array.isArray(result.data) || result.data.length < 5) return null;
      
      // Convert CoinCap price points to OHLC candles
      let candles: CandleData[] = result.data.map((point: any, index: number, arr: any[]) => {
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
      
      // Group into 4h candles if needed
      if (timeframe === '4h') {
        candles = groupInto4hCandles(candles);
      }
      
      return candles.slice(-config.candleCount);
    } catch {
      return null;
    }
  }, []);

  // Main fetch function with fallback chain
  const fetchTimeframe = useCallback(async (
    symbol: string,
    timeframe: Timeframe
  ): Promise<TimeframeAnalysis | null> => {
    try {
      let candles: CandleData[] | null = null;
      
      // 1. Try Edge Function first (bypasses CORS, uses Binance/Bybit/OKX)
      candles = await fetchFromEdgeFunction(symbol, timeframe);
      
      // 2. Fallback to CoinCap (browser-friendly, no CORS)
      if (!candles || candles.length < 5) {
        candles = await fetchFromCoinCap(symbol, timeframe);
        if (candles && candles.length >= 5) {
          console.log(`[MTF] ${timeframe} loaded from CoinCap fallback: ${candles.length} candles`);
        }
      }
      
      // 3. No data available
      if (!candles || candles.length < 5) {
        console.log(`[MTF] ${timeframe} no data available for ${symbol}`);
        return null;
      }
      
      const closes = candles.map(c => c.close);
      const swings = detectSwingPoints(candles);
      const { support, resistance } = findSupportResistance(candles);
      
      return {
        timeframe,
        candles,
        trend: analyzeTrend(candles),
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
        support,
        resistance,
        lastUpdated: Date.now(),
        isLive: true,
      };
    } catch (e) {
      console.log(`[MTF] ${timeframe} fetch error for ${symbol}:`, e);
      return null;
    }
  }, [fetchFromEdgeFunction, fetchFromCoinCap]);

  const calculateConfluence = (analyses: Record<Timeframe, TimeframeAnalysis | null>) => {
    const valid = Object.values(analyses).filter(a => a !== null) as TimeframeAnalysis[];
    
    if (valid.length === 0) {
      return {
        overallBias: 'NEUTRAL' as const,
        strength: 50,
        alignedTimeframes: 0,
        conflictingTimeframes: 0,
        recommendation: 'No chart data available - using price-based analysis',
      };
    }
    
    if (valid.length < 2) {
      return {
        overallBias: valid[0]?.trend || 'NEUTRAL' as const,
        strength: Math.round(valid[0]?.trendStrength || 50),
        alignedTimeframes: 1,
        conflictingTimeframes: 0,
        recommendation: 'Limited data - analysis based on ' + (valid[0]?.timeframe || 'partial') + ' only',
      };
    }
    
    // Weight higher timeframes more
    const weights: Record<Timeframe, number> = { '1d': 4, '4h': 3, '1h': 2, '15m': 1 };
    
    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;
    
    valid.forEach(a => {
      const weight = weights[a.timeframe];
      totalWeight += weight;
      
      if (a.trend === 'BULLISH') bullishScore += weight * (a.trendStrength / 100);
      else if (a.trend === 'BEARISH') bearishScore += weight * (a.trendStrength / 100);
    });
    
    const netScore = (bullishScore - bearishScore) / totalWeight;
    const strength = Math.abs(netScore) * 100;
    
    const bullish = valid.filter(a => a.trend === 'BULLISH').length;
    const bearish = valid.filter(a => a.trend === 'BEARISH').length;
    const aligned = Math.max(bullish, bearish);
    const conflicting = Math.min(bullish, bearish);
    
    let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (netScore > 0.2) overallBias = 'BULLISH';
    else if (netScore < -0.2) overallBias = 'BEARISH';
    else overallBias = 'NEUTRAL';
    
    let recommendation = '';
    if (aligned === valid.length && valid.length >= 3) {
      recommendation = `Strong ${overallBias.toLowerCase()} confluence across ${aligned} timeframes`;
    } else if (conflicting >= 2) {
      recommendation = `Mixed signals: ${bullish} bullish, ${bearish} bearish timeframes`;
    } else if (overallBias === 'NEUTRAL') {
      recommendation = 'No clear directional bias - wait for alignment';
    } else {
      recommendation = `Moderate ${overallBias.toLowerCase()} bias - confirm on lower TFs`;
    }
    
    return {
      overallBias,
      strength: Math.min(95, Math.max(30, strength)),
      alignedTimeframes: aligned,
      conflictingTimeframes: conflicting,
      recommendation,
    };
  };
  
  const fetchAllTimeframes = useCallback(async () => {
    const upperSymbol = symbol.toUpperCase();
    
    // Fetch all timeframes in parallel using the new multi-source fetcher
    const [tf15m, tf1h, tf4h, tf1d] = await Promise.all([
      fetchTimeframe(upperSymbol, '15m'),
      fetchTimeframe(upperSymbol, '1h'),
      fetchTimeframe(upperSymbol, '4h'),
      fetchTimeframe(upperSymbol, '1d'),
    ]);
    
    if (!mountedRef.current) return;
    
    const analyses = { '15m': tf15m, '1h': tf1h, '4h': tf4h, '1d': tf1d };
    const confluence = calculateConfluence(analyses);
    
    setData({
      ...analyses,
      confluence,
      isLoading: false,
      lastUpdated: Date.now(),
    });
    
    const successCount = [tf15m, tf1h, tf4h, tf1d].filter(Boolean).length;
    console.log(`[MTF] ${symbol} loaded ${successCount}/4 timeframes: 15m=${tf15m?.trend || 'N/A'}, 1h=${tf1h?.trend || 'N/A'}, 4h=${tf4h?.trend || 'N/A'}, 1d=${tf1d?.trend || 'N/A'}`);
  }, [symbol, fetchTimeframe]);
  
  useEffect(() => {
    mountedRef.current = true;
    setData(prev => ({ ...prev, isLoading: true }));
    
    fetchAllTimeframes();
    
    // Refresh every 2 minutes
    refreshIntervalRef.current = window.setInterval(fetchAllTimeframes, 120000);
    
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [symbol, fetchAllTimeframes]);
  
  return data;
}

export default useMultiTimeframeData;
