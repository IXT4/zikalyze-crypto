// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiTimeframeData — Multi-Timeframe Chart Analysis (15m, 1h, 4h, Daily)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Kraken symbol mapping (FALLBACK - more reliable than CoinCap)
const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', XRP: 'XRPUSD', DOGE: 'DOGEUSD',
  ADA: 'ADAUSD', DOT: 'DOTUSD', LINK: 'LINKUSD', UNI: 'UNIUSD', ATOM: 'ATOMUSD',
  LTC: 'LTCUSD', BCH: 'BCHUSD', AVAX: 'AVAXUSD', MATIC: 'MATICUSD',
  ALGO: 'ALGOUSD', XLM: 'XLMUSD', ETC: 'ETCUSD', FIL: 'FILUSD',
  AAVE: 'AAVEUSD', MKR: 'MKRUSD', GRT: 'GRTUSD', SNX: 'SNXUSD',
  COMP: 'COMPUSD', BAT: 'BATUSD', ZEC: 'ZECUSD', DASH: 'DASHUSD',
  XMR: 'XMRUSD', EOS: 'EOSUSD', XTZ: 'XTZUSD', TRX: 'TRXUSD',
  MANA: 'MANAUSD', SAND: 'SANDUSD', ENJ: 'ENJUSD', CHZ: 'CHZUSD',
  CRV: 'CRVUSD', SHIB: 'SHIBUSD', PEPE: 'PEPEUSD', APE: 'APEUSD',
};

// Binance interval mapping
const BINANCE_INTERVALS: Record<Timeframe, string> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

// Kraken interval mapping
const KRAKEN_INTERVALS: Record<Timeframe, number> = {
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
};

// Timeframe configs
const TIMEFRAME_CONFIG: Record<Timeframe, { candleCount: number }> = {
  '15m': { candleCount: 48 }, // 12 hours
  '1h': { candleCount: 24 }, // 24 hours
  '4h': { candleCount: 24 }, // 4 days
  '1d': { candleCount: 30 }, // 30 days
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
  
  // Fetch from Binance API (PRIMARY - most reliable)
  const fetchFromBinance = useCallback(async (
    symbol: string,
    timeframe: Timeframe
  ): Promise<CandleData[] | null> => {
    try {
      const binanceSymbol = BINANCE_SYMBOL_MAP[symbol.toUpperCase()];
      if (!binanceSymbol) return null;
      
      const interval = BINANCE_INTERVALS[timeframe];
      const config = TIMEFRAME_CONFIG[timeframe];
      const limit = config.candleCount;
      
      // Try Binance.com first, then Binance.US
      const endpoints = [
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
        `https://api.binance.us/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
      ];
      
      for (const url of endpoints) {
        const response = await safeFetch(url, { timeoutMs: 8000, maxRetries: 2 });
        
        if (response?.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length >= 5) {
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
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Fetch from Kraken API (FALLBACK - more reliable than CoinCap)
  const fetchFromKraken = useCallback(async (
    symbol: string,
    timeframe: Timeframe
  ): Promise<CandleData[] | null> => {
    try {
      const krakenSymbol = KRAKEN_SYMBOL_MAP[symbol.toUpperCase()];
      if (!krakenSymbol) return null;
      
      const interval = KRAKEN_INTERVALS[timeframe];
      const config = TIMEFRAME_CONFIG[timeframe];
      
      const response = await safeFetch(
        `https://api.kraken.com/0/public/OHLC?pair=${krakenSymbol}&interval=${interval}`,
        { timeoutMs: 10000, maxRetries: 2 }
      );
      
      if (!response?.ok) return null;
      
      const result = await response.json();
      if (result.error && result.error.length > 0) return null;
      
      // Kraken returns data in format: { result: { PAIR: [[time, open, high, low, close, vwap, volume, count], ...] } }
      const pairs = Object.keys(result.result).filter(k => k !== 'last');
      if (pairs.length === 0) return null;
      
      const ohlcData = result.result[pairs[0]];
      if (!Array.isArray(ohlcData) || ohlcData.length < 5) return null;
      
      // Take last N candles based on config
      const candles: CandleData[] = ohlcData.slice(-config.candleCount).map((k: any[]) => ({
        timestamp: k[0] * 1000, // Kraken uses seconds
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[6]),
      }));
      
      return candles;
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
      let source = 'unknown';
      
      // 1. Try Binance first (most reliable)
      candles = await fetchFromBinance(symbol, timeframe);
      if (candles && candles.length >= 5) {
        source = 'binance';
        console.log(`[MTF] ${timeframe} loaded from Binance: ${candles.length} candles`);
      }
      
      // 2. Fallback to Kraken (more reliable than CoinCap)
      if (!candles || candles.length < 5) {
        candles = await fetchFromKraken(symbol, timeframe);
        if (candles && candles.length >= 5) {
          source = 'kraken';
          console.log(`[MTF] ${timeframe} loaded from Kraken: ${candles.length} candles`);
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
  }, [fetchFromBinance, fetchFromKraken]);

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
