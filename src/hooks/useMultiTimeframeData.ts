// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useMultiTimeframeData — Decentralized Multi-Timeframe Analysis (15m, 1h, 4h, 1d)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses 100% decentralized oracle ticks (Pyth, DIA, Redstone, API3) as primary
// Falls back to CryptoCompare for historical bootstrap only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDecentralizedOHLC, OHLCCandle, CandleInterval } from './useDecentralizedOHLC';
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

// Timeframe to CandleInterval mapping
const TIMEFRAME_TO_INTERVAL: Record<Timeframe, CandleInterval> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

// Minimum candles needed per timeframe
const MIN_CANDLES: Record<Timeframe, number> = {
  '15m': 10,
  '1h': 10,
  '4h': 6,
  '1d': 5,
};

// CryptoCompare endpoints for bootstrap
const CRYPTOCOMPARE_ENDPOINTS: Record<Timeframe, { endpoint: string; limit: number }> = {
  '15m': { endpoint: 'histominute', limit: 240 },  // 4 hours of 1m data to aggregate
  '1h': { endpoint: 'histohour', limit: 24 },
  '4h': { endpoint: 'histohour', limit: 48 },      // 48 hours to aggregate into 4h
  '1d': { endpoint: 'histoday', limit: 30 },
};

// Convert OHLC candle to CandleData
const convertCandle = (candle: OHLCCandle): CandleData => ({
  timestamp: candle.timestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
});

// Technical analysis functions
const calculateEMA = (closes: number[], period: number): number => {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
};

const calculateRSI = (closes: number[], period: number = 14): number => {
  if (closes.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  const recentChanges = changes.slice(-period);
  let gains = 0, losses = 0;
  for (const change of recentChanges) {
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const analyzeTrend = (candles: CandleData[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' => {
  if (candles.length < 3) return 'NEUTRAL';
  const closes = candles.map(c => c.close);
  const firstHalf = closes.slice(0, Math.floor(closes.length / 2));
  const secondHalf = closes.slice(Math.floor(closes.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change = (secondAvg - firstAvg) / firstAvg;
  if (change > 0.01) return 'BULLISH';
  if (change < -0.01) return 'BEARISH';
  return 'NEUTRAL';
};

const calculateTrendStrength = (candles: CandleData[]): number => {
  if (candles.length < 5) return 50;
  const closes = candles.map(c => c.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const change = Math.abs((last - first) / first) * 100;
  let consistency = 0;
  const direction = last > first ? 1 : -1;
  for (let i = 1; i < closes.length; i++) {
    const moveDir = closes[i] > closes[i - 1] ? 1 : -1;
    if (moveDir === direction) consistency++;
  }
  const consistencyRatio = consistency / (closes.length - 1);
  return Math.min(100, Math.round(change * 2 + consistencyRatio * 50));
};

const detectSwingPoints = (candles: CandleData[]) => {
  if (candles.length < 5) {
    return { higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false };
  }
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && 
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && 
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push(lows[i]);
    }
  }
  
  let higherHighs = false, lowerHighs = false, higherLows = false, lowerLows = false;
  
  if (swingHighs.length >= 2) {
    const lastTwo = swingHighs.slice(-2);
    higherHighs = lastTwo[1] > lastTwo[0];
    lowerHighs = lastTwo[1] < lastTwo[0];
  }
  if (swingLows.length >= 2) {
    const lastTwo = swingLows.slice(-2);
    higherLows = lastTwo[1] > lastTwo[0];
    lowerLows = lastTwo[1] < lastTwo[0];
  }
  
  return { higherHighs, higherLows, lowerHighs, lowerLows };
};

const analyzeVolumeTrend = (candles: CandleData[]): 'INCREASING' | 'DECREASING' | 'STABLE' => {
  if (candles.length < 6) return 'STABLE';
  const recentVol = candles.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
  const olderVol = candles.slice(0, 3).reduce((sum, c) => sum + c.volume, 0) / 3;
  if (recentVol > olderVol * 1.2) return 'INCREASING';
  if (recentVol < olderVol * 0.8) return 'DECREASING';
  return 'STABLE';
};

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

const findSupportResistance = (candles: CandleData[]): { support: number; resistance: number } => {
  if (candles.length < 3) return { support: 0, resistance: 0 };
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
};

// Group 1m candles into 15m
const groupInto15mCandles = (candles: CandleData[]): CandleData[] => {
  const grouped: CandleData[] = [];
  for (let i = 0; i < candles.length; i += 15) {
    const chunk = candles.slice(i, i + 15);
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

// Group 1h candles into 4h
const groupInto4hCandles = (candles: CandleData[]): CandleData[] => {
  const grouped: CandleData[] = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
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
    '15m': null, '1h': null, '4h': null, '1d': null,
    confluence: {
      overallBias: 'NEUTRAL',
      strength: 0,
      alignedTimeframes: 0,
      conflictingTimeframes: 0,
      recommendation: 'Building decentralized data...',
    },
    isLoading: true,
    lastUpdated: 0,
  });
  
  const mountedRef = useRef(true);
  const bootstrapAttemptedRef = useRef<Set<Timeframe>>(new Set());
  
  // 🌐 PRIMARY: Decentralized OHLC from oracle ticks
  const ohlc = useDecentralizedOHLC(symbol);
  
  // Bootstrap from CryptoCompare for a specific timeframe
  const fetchBootstrapData = useCallback(async (timeframe: Timeframe): Promise<CandleData[] | null> => {
    if (bootstrapAttemptedRef.current.has(timeframe)) return null;
    bootstrapAttemptedRef.current.add(timeframe);
    
    try {
      const config = CRYPTOCOMPARE_ENDPOINTS[timeframe];
      const response = await safeFetch(
        `https://min-api.cryptocompare.com/data/v2/${config.endpoint}?fsym=${symbol.toUpperCase()}&tsym=USD&limit=${config.limit}`,
        { timeoutMs: 12000, maxRetries: 2 }
      );
      
      if (!response?.ok) return null;
      
      const result = await response.json();
      if (result.Response !== 'Success' || !result.Data?.Data) return null;
      
      let candles: CandleData[] = result.Data.Data.map((point: any) => ({
        timestamp: point.time * 1000,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volumeto,
      }));
      
      // Aggregate for 15m and 4h
      if (timeframe === '15m') {
        candles = groupInto15mCandles(candles);
      } else if (timeframe === '4h') {
        candles = groupInto4hCandles(candles);
      }
      
      return candles.slice(-30);
    } catch {
      return null;
    }
  }, [symbol]);
  
  // Analyze a single timeframe
  const analyzeTimeframe = useCallback(async (
    timeframe: Timeframe,
    decentralizedCandles: OHLCCandle[]
  ): Promise<TimeframeAnalysis | null> => {
    let candles: CandleData[] = [];
    
    // Use decentralized data if available
    if (decentralizedCandles.length >= MIN_CANDLES[timeframe]) {
      candles = decentralizedCandles.map(convertCandle);
    } else if (!bootstrapAttemptedRef.current.has(timeframe)) {
      // Bootstrap from CryptoCompare
      const bootstrapCandles = await fetchBootstrapData(timeframe);
      if (bootstrapCandles && bootstrapCandles.length >= MIN_CANDLES[timeframe]) {
        candles = bootstrapCandles;
        console.log(`[MTF] ${timeframe} bootstrapped: ${candles.length} candles`);
      }
    }
    
    if (candles.length < MIN_CANDLES[timeframe]) return null;
    
    const closes = candles.map(c => c.close);
    const swings = detectSwingPoints(candles);
    const sr = findSupportResistance(candles);
    
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
      support: sr.support,
      resistance: sr.resistance,
      lastUpdated: Date.now(),
      isLive: ohlc.isLive,
    };
  }, [ohlc.isLive, fetchBootstrapData]);
  
  // Calculate confluence across timeframes
  const calculateConfluence = useCallback((analyses: (TimeframeAnalysis | null)[]) => {
    const validAnalyses = analyses.filter(Boolean) as TimeframeAnalysis[];
    
    if (validAnalyses.length === 0) {
      return {
        overallBias: 'NEUTRAL' as const,
        strength: 0,
        alignedTimeframes: 0,
        conflictingTimeframes: 0,
        recommendation: 'Building decentralized data...',
      };
    }
    
    let bullish = 0, bearish = 0, neutral = 0;
    
    for (const analysis of validAnalyses) {
      if (analysis.trend === 'BULLISH') bullish++;
      else if (analysis.trend === 'BEARISH') bearish++;
      else neutral++;
    }
    
    const total = validAnalyses.length;
    let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let recommendation = '';
    
    if (bullish > bearish && bullish > neutral) {
      overallBias = 'BULLISH';
      recommendation = bullish === total 
        ? '🚀 Strong bullish confluence - all timeframes aligned'
        : `📈 Bullish bias (${bullish}/${total} timeframes)`;
    } else if (bearish > bullish && bearish > neutral) {
      overallBias = 'BEARISH';
      recommendation = bearish === total
        ? '🔻 Strong bearish confluence - all timeframes aligned'
        : `📉 Bearish bias (${bearish}/${total} timeframes)`;
    } else {
      recommendation = '⚖️ Mixed signals - exercise caution';
    }
    
    const alignedTimeframes = Math.max(bullish, bearish, neutral);
    const conflictingTimeframes = total - alignedTimeframes;
    const strength = Math.round((alignedTimeframes / total) * 100);
    
    return { overallBias, strength, alignedTimeframes, conflictingTimeframes, recommendation };
  }, []);
  
  // Update analysis when OHLC data changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const updateAnalysis = async () => {
      const timeframes: Timeframe[] = ['15m', '1h', '4h', '1d'];
      
      const analyses = await Promise.all(
        timeframes.map(tf => 
          analyzeTimeframe(tf, ohlc.getCandles(TIMEFRAME_TO_INTERVAL[tf]))
        )
      );
      
      const confluence = calculateConfluence(analyses);
      
      setData({
        '15m': analyses[0],
        '1h': analyses[1],
        '4h': analyses[2],
        '1d': analyses[3],
        confluence,
        isLoading: false,
        lastUpdated: Date.now(),
      });
    };
    
    updateAnalysis();
  }, [ohlc.candles, ohlc.currentCandles, analyzeTimeframe, calculateConfluence, ohlc.getCandles]);
  
  // Reset bootstrap flags when symbol changes
  useEffect(() => {
    bootstrapAttemptedRef.current = new Set();
    setData(prev => ({ ...prev, isLoading: true }));
  }, [symbol]);
  
  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return data;
}
