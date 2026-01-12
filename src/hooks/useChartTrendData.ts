// ═══════════════════════════════════════════════════════════════════════════════
// 📊 useChartTrendData — 100% Decentralized OHLC Data for AI Trend Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// Uses 100% decentralized oracle ticks (Pyth, DIA, Redstone, API3)
// No centralized API fallbacks — fully trustless data pipeline
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useDecentralizedOHLC, OHLCCandle } from './useDecentralizedOHLC';

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
  trend24h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
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
  lastUpdated: number;
  isLive: boolean;
  source: string;
}

// Convert OHLC candle to CandleData format
const convertCandle = (candle: OHLCCandle): CandleData => ({
  timestamp: candle.timestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
});

// EMA calculation
const calculateEMA = (closes: number[], period: number): number => {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  
  return ema;
};

// RSI calculation
const calculateRSI = (closes: number[], period: number = 14): number => {
  if (closes.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  const recentChanges = changes.slice(-period);
  
  let gains = 0;
  let losses = 0;
  
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

// Trend analysis
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

// Trend strength (0-100)
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

// Swing point detection
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
  
  let higherHighs = false;
  let lowerHighs = false;
  let higherLows = false;
  let lowerLows = false;
  
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

// Volume trend analysis
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

export function useChartTrendData(symbol: string): ChartTrendData | null {
  const [data, setData] = useState<ChartTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  
  // 🌐 100% DECENTRALIZED: OHLC from oracle ticks only
  const ohlc = useDecentralizedOHLC(symbol);
  
  // Get 1h candles for trend analysis
  const decentralizedCandles = ohlc.getCandles('1h');
  const hasDecentralizedData = decentralizedCandles.length >= 3;
  
  // Process candles and update data
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Use decentralized data only
    if (!hasDecentralizedData) {
      // Still building data from oracle ticks
      setData(null);
      setIsLoading(true);
      return;
    }
    
    const candles = decentralizedCandles.map(convertCandle);
    const source = `Oracle (${ohlc.primarySource})`;
    
    const closes = candles.map(c => c.close);
    const swings = detectSwingPoints(candles);
    
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
      isLive: ohlc.isLive,
      source,
    });
    
    setIsLoading(false);
  }, [decentralizedCandles, hasDecentralizedData, ohlc.isLive, ohlc.primarySource]);
  
  // Reset when symbol changes
  useEffect(() => {
    setIsLoading(true);
    setData(null);
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
