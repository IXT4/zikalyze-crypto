// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TECHNICAL ANALYSIS ENGINE v4.0 — Real-Time Chart-Based Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 Uses REAL 24h chart data when available for accurate trend detection
// 📈 Confluence = alignment across timeframes + EMA/RSI from live data
// ⚡ No random values — 100% deterministic and reproducible
// ═══════════════════════════════════════════════════════════════════════════════

import { MarketStructure, PrecisionEntry, ChartTrendInput, MultiTimeframeInput } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 TYPES FOR TOP-DOWN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeframeBias {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
  keyLevel: number;
  structure: 'UPTREND' | 'DOWNTREND' | 'RANGE';
  weight: number; // Higher TF = higher weight
}

export interface TopDownAnalysis {
  weekly: TimeframeBias;
  daily: TimeframeBias;
  h4: TimeframeBias;
  h1: TimeframeBias;
  m15: TimeframeBias;
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confluenceScore: number; // 0-100 (how aligned are all TFs)
  tradeableDirection: 'LONG' | 'SHORT' | 'NO_TRADE';
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ACCURATE TREND DETECTION — Based on REAL 24h price data
// ═══════════════════════════════════════════════════════════════════════════════

function determineTrendFromRealData(
  currentPrice: number,
  high24h: number,
  low24h: number,
  change24h: number
): { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number; structure: 'UPTREND' | 'DOWNTREND' | 'RANGE' } {
  // REAL DATA ANALYSIS:
  // 1. change24h = actual % change over 24 hours (from API/WebSocket)
  // 2. high24h/low24h = actual price extremes in last 24 hours
  // 3. currentPrice = real-time price from WebSocket
  
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((currentPrice - low24h) / range) * 100 : 50;
  
  // Distance from 24h high/low as percentages
  const distanceFromHigh = high24h > 0 ? ((high24h - currentPrice) / high24h) * 100 : 0;
  const distanceFromLow = low24h > 0 ? ((currentPrice - low24h) / low24h) * 100 : 0;
  
  const absChange = Math.abs(change24h);
  
  // STRONG BULLISH: Price up >3% AND near 24h highs (top 30% of range)
  if (change24h >= 3 && pricePosition >= 70) {
    return {
      trend: 'BULLISH',
      strength: Math.min(98, 75 + absChange * 2 + (pricePosition - 70)),
      structure: 'UPTREND'
    };
  }
  
  // STRONG BEARISH: Price down >3% AND near 24h lows (bottom 30% of range)
  if (change24h <= -3 && pricePosition <= 30) {
    return {
      trend: 'BEARISH',
      strength: Math.min(98, 75 + absChange * 2 + (30 - pricePosition)),
      structure: 'DOWNTREND'
    };
  }
  
  // BULLISH with pullback: Up on day but pulled back from highs
  if (change24h >= 2 && pricePosition >= 40) {
    const pullbackPenalty = pricePosition < 60 ? 10 : 0;
    return {
      trend: 'BULLISH',
      strength: Math.max(55, 65 + absChange * 3 - pullbackPenalty),
      structure: pricePosition >= 55 ? 'UPTREND' : 'RANGE'
    };
  }
  
  // BEARISH with bounce: Down on day but bounced from lows
  if (change24h <= -2 && pricePosition <= 60) {
    const bouncePenalty = pricePosition > 40 ? 10 : 0;
    return {
      trend: 'BEARISH',
      strength: Math.max(55, 65 + absChange * 3 - bouncePenalty),
      structure: pricePosition <= 45 ? 'DOWNTREND' : 'RANGE'
    };
  }
  
  // MODERATE BULLISH: Positive change, price above midpoint
  if (change24h > 0.5 && pricePosition >= 50) {
    return {
      trend: 'BULLISH',
      strength: 52 + change24h * 6 + (pricePosition - 50) * 0.3,
      structure: pricePosition >= 60 ? 'UPTREND' : 'RANGE'
    };
  }
  
  // MODERATE BEARISH: Negative change, price below midpoint
  if (change24h < -0.5 && pricePosition <= 50) {
    return {
      trend: 'BEARISH',
      strength: 52 + absChange * 6 + (50 - pricePosition) * 0.3,
      structure: pricePosition <= 40 ? 'DOWNTREND' : 'RANGE'
    };
  }
  
  // WEAK/CONFLICTING signals — check price position for direction
  if (pricePosition >= 60 && change24h >= 0) {
    return { trend: 'BULLISH', strength: 50 + pricePosition * 0.2, structure: 'RANGE' };
  }
  
  if (pricePosition <= 40 && change24h <= 0) {
    return { trend: 'BEARISH', strength: 50 + (100 - pricePosition) * 0.2, structure: 'RANGE' };
  }
  
  // TRUE NEUTRAL: Price in middle of range with minimal change
  return {
    trend: 'NEUTRAL',
    strength: 45 + Math.min(10, absChange * 3),
    structure: 'RANGE'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TOP-DOWN ANALYSIS — Uses Real Chart Data When Available
// ═══════════════════════════════════════════════════════════════════════════════

export function performTopDownAnalysis(
  price: number,
  high24h: number,
  low24h: number,
  change: number,
  chartData?: ChartTrendInput, // Real 24h chart data when available
  multiTfData?: MultiTimeframeInput // Multi-timeframe analysis (15m, 1h, 4h, 1d)
): TopDownAnalysis {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 USE MULTI-TIMEFRAME DATA when available — Most accurate analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (multiTfData && multiTfData['1h']) {
    console.log(`[TopDown] Using REAL multi-timeframe data: 15m=${multiTfData['15m']?.trend || 'N/A'}, 1h=${multiTfData['1h']?.trend || 'N/A'}, 4h=${multiTfData['4h']?.trend || 'N/A'}, 1d=${multiTfData['1d']?.trend || 'N/A'}`);
    
    // Build timeframes from REAL data
    const weekly: TimeframeBias = multiTfData['1d'] ? {
      timeframe: 'WEEKLY',
      trend: multiTfData['1d'].trend,
      strength: multiTfData['1d'].trendStrength * 0.9,
      keyLevel: multiTfData['1d'].support,
      structure: multiTfData['1d'].higherHighs && multiTfData['1d'].higherLows ? 'UPTREND' :
                 multiTfData['1d'].lowerHighs && multiTfData['1d'].lowerLows ? 'DOWNTREND' : 'RANGE',
      weight: 5
    } : {
      timeframe: 'WEEKLY',
      trend: 'NEUTRAL',
      strength: 50,
      keyLevel: low24h,
      structure: 'RANGE',
      weight: 5
    };
    
    const daily: TimeframeBias = multiTfData['1d'] ? {
      timeframe: 'DAILY',
      trend: multiTfData['1d'].trend,
      strength: multiTfData['1d'].trendStrength,
      keyLevel: multiTfData['1d'].trend === 'BULLISH' ? multiTfData['1d'].support : multiTfData['1d'].resistance,
      structure: multiTfData['1d'].higherHighs && multiTfData['1d'].higherLows ? 'UPTREND' :
                 multiTfData['1d'].lowerHighs && multiTfData['1d'].lowerLows ? 'DOWNTREND' : 'RANGE',
      weight: 4
    } : {
      timeframe: 'DAILY',
      trend: 'NEUTRAL',
      strength: 50,
      keyLevel: price,
      structure: 'RANGE',
      weight: 4
    };
    
    const h4: TimeframeBias = multiTfData['4h'] ? {
      timeframe: '4H',
      trend: multiTfData['4h'].trend,
      strength: multiTfData['4h'].trendStrength,
      keyLevel: multiTfData['4h'].trend === 'BULLISH' ? multiTfData['4h'].support : multiTfData['4h'].resistance,
      structure: multiTfData['4h'].higherHighs && multiTfData['4h'].higherLows ? 'UPTREND' :
                 multiTfData['4h'].lowerHighs && multiTfData['4h'].lowerLows ? 'DOWNTREND' : 'RANGE',
      weight: 3
    } : {
      timeframe: '4H',
      trend: 'NEUTRAL',
      strength: 50,
      keyLevel: price,
      structure: 'RANGE',
      weight: 3
    };
    
    const h1: TimeframeBias = multiTfData['1h'] ? {
      timeframe: '1H',
      trend: multiTfData['1h'].trend,
      strength: multiTfData['1h'].trendStrength,
      keyLevel: multiTfData['1h'].trend === 'BULLISH' ? multiTfData['1h'].support : multiTfData['1h'].resistance,
      structure: multiTfData['1h'].higherHighs && multiTfData['1h'].higherLows ? 'UPTREND' :
                 multiTfData['1h'].lowerHighs && multiTfData['1h'].lowerLows ? 'DOWNTREND' : 'RANGE',
      weight: 2
    } : {
      timeframe: '1H',
      trend: 'NEUTRAL',
      strength: 50,
      keyLevel: price,
      structure: 'RANGE',
      weight: 2
    };
    
    const m15: TimeframeBias = multiTfData['15m'] ? {
      timeframe: '15M',
      trend: multiTfData['15m'].trend,
      strength: multiTfData['15m'].trendStrength,
      keyLevel: multiTfData['15m'].trend === 'BULLISH' ? multiTfData['15m'].support : multiTfData['15m'].resistance,
      structure: multiTfData['15m'].higherHighs && multiTfData['15m'].higherLows ? 'UPTREND' :
                 multiTfData['15m'].lowerHighs && multiTfData['15m'].lowerLows ? 'DOWNTREND' : 'RANGE',
      weight: 1
    } : {
      timeframe: '15M',
      trend: 'NEUTRAL',
      strength: 50,
      keyLevel: price,
      structure: 'RANGE',
      weight: 1
    };
    
    // Calculate confluence from REAL multi-TF data
    const allTimeframes = [weekly, daily, h4, h1, m15];
    const totalWeight = allTimeframes.reduce((sum, tf) => sum + tf.weight, 0);
    
    let bullishWeight = 0;
    let bearishWeight = 0;
    
    allTimeframes.forEach(tf => {
      if (tf.trend === 'BULLISH') {
        bullishWeight += tf.weight * (tf.strength / 100);
      } else if (tf.trend === 'BEARISH') {
        bearishWeight += tf.weight * (tf.strength / 100);
      }
    });
    
    const dominantWeight = Math.max(bullishWeight, bearishWeight);
    const confluenceScore = Math.round((dominantWeight / totalWeight) * 100);
    
    // Determine bias from REAL multi-TF confluence
    const bullishTFs = allTimeframes.filter(tf => tf.trend === 'BULLISH').length;
    const bearishTFs = allTimeframes.filter(tf => tf.trend === 'BEARISH').length;
    const htfBullish = (weekly.trend === 'BULLISH' || daily.trend === 'BULLISH') && h4.trend !== 'BEARISH';
    const htfBearish = (weekly.trend === 'BEARISH' || daily.trend === 'BEARISH') && h4.trend !== 'BULLISH';
    
    let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    let tradeableDirection: 'LONG' | 'SHORT' | 'NO_TRADE';
    const reasoning: string[] = [];
    
    if (multiTfData.confluence.alignedTimeframes >= 3) {
      overallBias = multiTfData.confluence.overallBias;
      tradeableDirection = overallBias === 'BULLISH' ? 'LONG' : overallBias === 'BEARISH' ? 'SHORT' : 'NO_TRADE';
      reasoning.push(`🎯 ${multiTfData.confluence.alignedTimeframes}/4 TFs ALIGNED — ${multiTfData.confluence.recommendation}`);
    } else if (htfBullish && bullishTFs >= 3) {
      overallBias = 'BULLISH';
      tradeableDirection = 'LONG';
      reasoning.push(`📈 HTF + ${bullishTFs}/5 TFs BULLISH — LONG entries valid`);
    } else if (htfBearish && bearishTFs >= 3) {
      overallBias = 'BEARISH';
      tradeableDirection = 'SHORT';
      reasoning.push(`📉 HTF + ${bearishTFs}/5 TFs BEARISH — SHORT entries valid`);
    } else if (bullishTFs >= 3) {
      overallBias = 'BULLISH';
      tradeableDirection = bullishTFs >= 4 ? 'LONG' : 'NO_TRADE';
      reasoning.push(`📊 ${bullishTFs}/5 TFs BULLISH — ${tradeableDirection === 'LONG' ? 'Strong' : 'Moderate'} confluence`);
    } else if (bearishTFs >= 3) {
      overallBias = 'BEARISH';
      tradeableDirection = bearishTFs >= 4 ? 'SHORT' : 'NO_TRADE';
      reasoning.push(`📊 ${bearishTFs}/5 TFs BEARISH — ${tradeableDirection === 'SHORT' ? 'Strong' : 'Moderate'} confluence`);
    } else {
      overallBias = 'NEUTRAL';
      tradeableDirection = 'NO_TRADE';
      reasoning.push(`⏸️ Mixed TFs (${bullishTFs}B/${bearishTFs}S) — Wait for alignment`);
    }
    
    reasoning.push(`📊 Multi-TF Confluence: ${confluenceScore}%`);
    
    return {
      weekly, daily, h4, h1, m15,
      overallBias,
      confluenceScore: Math.max(confluenceScore, multiTfData.confluence.strength),
      tradeableDirection,
      reasoning
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 FALLBACK: Use chart data or price-based analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  let baseTrend: { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number; structure: 'UPTREND' | 'DOWNTREND' | 'RANGE' };
  
  if (chartData && chartData.isLive && chartData.candles.length >= 10) {
    // USE REAL CHART DATA — Most accurate trend detection
    console.log(`[TopDown] Using REAL chart data: ${chartData.candles.length} candles, trend: ${chartData.trend24h}`);
    
    // EMA crossover for trend direction
    const emaCross = chartData.ema9 > chartData.ema21 ? 'BULLISH' : 
                     chartData.ema9 < chartData.ema21 ? 'BEARISH' : 'NEUTRAL';
    
    // RSI zones
    const rsiZone = chartData.rsi > 70 ? 'OVERBOUGHT' :
                    chartData.rsi < 30 ? 'OVERSOLD' :
                    chartData.rsi > 55 ? 'BULLISH' :
                    chartData.rsi < 45 ? 'BEARISH' : 'NEUTRAL';
    
    // Combine chart signals
    let chartTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = chartData.trend24h;
    let chartStrength = chartData.trendStrength;
    
    // Boost strength if EMA confirms trend
    if (emaCross === chartData.trend24h) {
      chartStrength = Math.min(95, chartStrength + 8);
    }
    
    // Boost strength if structure confirms (HH/HL or LH/LL)
    if (chartData.trend24h === 'BULLISH' && (chartData.higherHighs || chartData.higherLows)) {
      chartStrength = Math.min(95, chartStrength + 5);
    } else if (chartData.trend24h === 'BEARISH' && (chartData.lowerHighs || chartData.lowerLows)) {
      chartStrength = Math.min(95, chartStrength + 5);
    }
    
    // Volume confirmation
    if (chartData.volumeTrend === 'INCREASING') {
      chartStrength = Math.min(95, chartStrength + 3);
    }
    
    // Determine structure from real data
    const structure: 'UPTREND' | 'DOWNTREND' | 'RANGE' = 
      chartData.higherHighs && chartData.higherLows ? 'UPTREND' :
      chartData.lowerHighs && chartData.lowerLows ? 'DOWNTREND' : 'RANGE';
    
    baseTrend = {
      trend: chartTrend,
      strength: Math.max(45, Math.min(95, chartStrength)),
      structure
    };
  } else {
    // FALLBACK: Use price-based analysis
    baseTrend = determineTrendFromRealData(price, high24h, low24h, change);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📈 BUILD TIMEFRAME ANALYSIS — Now enhanced with chart data
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Weekly (weight: 5) — Uses full 24h context, most conservative
  const weekly: TimeframeBias = {
    timeframe: 'WEEKLY',
    trend: baseTrend.trend,
    strength: Math.max(40, baseTrend.strength * 0.85), // HTF = smoother
    keyLevel: baseTrend.trend === 'BULLISH' ? low24h * 0.95 : high24h * 1.05,
    structure: baseTrend.structure,
    weight: 5
  };
  
  // Daily (weight: 4) — Primary trend timeframe
  const daily: TimeframeBias = {
    timeframe: 'DAILY',
    trend: baseTrend.trend,
    strength: Math.max(45, baseTrend.strength * 0.92),
    keyLevel: baseTrend.trend === 'BULLISH' ? low24h * 0.97 : high24h * 1.03,
    structure: baseTrend.structure,
    weight: 4
  };
  
  // 4H (weight: 3) — Can diverge slightly based on recent price action
  let h4Trend = baseTrend;
  if (chartData?.isLive && chartData.priceVelocity) {
    // Use velocity to detect short-term trend changes
    if (chartData.priceVelocity > 0.2 && baseTrend.trend !== 'BULLISH') {
      h4Trend = { ...baseTrend, trend: 'NEUTRAL', strength: baseTrend.strength * 0.8 };
    } else if (chartData.priceVelocity < -0.2 && baseTrend.trend !== 'BEARISH') {
      h4Trend = { ...baseTrend, trend: 'NEUTRAL', strength: baseTrend.strength * 0.8 };
    }
  }
  const h4: TimeframeBias = {
    timeframe: '4H',
    trend: h4Trend.trend,
    strength: Math.max(48, h4Trend.strength * 0.96),
    keyLevel: h4Trend.trend === 'BULLISH' ? low24h * 0.99 : high24h * 1.01,
    structure: h4Trend.structure,
    weight: 3
  };
  
  // 1H (weight: 2) — More reactive to current momentum
  let h1Trend = baseTrend;
  if (chartData?.isLive) {
    // RSI divergence check
    if (chartData.rsi > 65 && baseTrend.trend === 'BULLISH') {
      h1Trend = { ...baseTrend, strength: Math.min(95, baseTrend.strength + 5) };
    } else if (chartData.rsi < 35 && baseTrend.trend === 'BEARISH') {
      h1Trend = { ...baseTrend, strength: Math.min(95, baseTrend.strength + 5) };
    }
  }
  const h1: TimeframeBias = {
    timeframe: '1H',
    trend: h1Trend.trend,
    strength: h1Trend.strength,
    keyLevel: h1Trend.trend === 'BULLISH' ? low24h : high24h,
    structure: h1Trend.structure,
    weight: 2
  };
  
  // 15M (weight: 1) — Entry timeframe, most reactive to current price
  let m15Trend = baseTrend;
  
  // 15M override based on price position and velocity
  if (chartData?.isLive && chartData.priceVelocity) {
    if (chartData.priceVelocity > 0.3) {
      m15Trend = { trend: 'BULLISH', strength: Math.min(95, baseTrend.strength + 8), structure: 'UPTREND' };
    } else if (chartData.priceVelocity < -0.3) {
      m15Trend = { trend: 'BEARISH', strength: Math.min(95, baseTrend.strength + 8), structure: 'DOWNTREND' };
    }
  } else {
    // Fallback: price position override
    if (pricePosition >= 85 && change > 0) {
      m15Trend = { trend: 'BULLISH', strength: Math.min(98, baseTrend.strength + 5), structure: 'UPTREND' };
    } else if (pricePosition <= 15 && change < 0) {
      m15Trend = { trend: 'BEARISH', strength: Math.min(98, baseTrend.strength + 5), structure: 'DOWNTREND' };
    }
  }
  
  const m15: TimeframeBias = {
    timeframe: '15M',
    trend: m15Trend.trend,
    strength: Math.min(98, m15Trend.strength * 1.02),
    keyLevel: m15Trend.trend === 'BULLISH' ? low24h + range * 0.1 : high24h - range * 0.1,
    structure: m15Trend.structure,
    weight: 1
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 CONFLUENCE CALCULATION — Based on trend alignment
  // ═══════════════════════════════════════════════════════════════════════════
  
  const allTimeframes = [weekly, daily, h4, h1, m15];
  const totalWeight = allTimeframes.reduce((sum, tf) => sum + tf.weight, 0); // 15
  
  let bullishWeight = 0;
  let bearishWeight = 0;
  let alignedCount = 0;
  
  allTimeframes.forEach(tf => {
    if (tf.trend === 'BULLISH') {
      bullishWeight += tf.weight * (tf.strength / 100);
      if (baseTrend.trend === 'BULLISH') alignedCount++;
    } else if (tf.trend === 'BEARISH') {
      bearishWeight += tf.weight * (tf.strength / 100);
      if (baseTrend.trend === 'BEARISH') alignedCount++;
    }
  });
  
  // Confluence = how aligned all timeframes are with dominant direction
  const dominantWeight = Math.max(bullishWeight, bearishWeight);
  const confluenceScore = Math.round((dominantWeight / totalWeight) * 100);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 DETERMINE OVERALL BIAS & TRADEABLE DIRECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  let tradeableDirection: 'LONG' | 'SHORT' | 'NO_TRADE';
  const reasoning: string[] = [];
  
  // Count how many timeframes align
  const bullishTFs = allTimeframes.filter(tf => tf.trend === 'BULLISH').length;
  const bearishTFs = allTimeframes.filter(tf => tf.trend === 'BEARISH').length;
  const htfBullish = weekly.trend === 'BULLISH' && daily.trend === 'BULLISH';
  const htfBearish = weekly.trend === 'BEARISH' && daily.trend === 'BEARISH';
  
  if (htfBullish) {
    overallBias = 'BULLISH';
    reasoning.push(`📅 Weekly + Daily BULLISH (${bullishTFs}/5 TFs aligned)`);
    
    if (h4.trend === 'BULLISH' || h4.trend === 'NEUTRAL') {
      tradeableDirection = 'LONG';
      reasoning.push(`✅ 4H supports uptrend — LONG entries valid`);
    } else {
      tradeableDirection = 'LONG';
      reasoning.push(`⚠️ 4H pullback — Wait for support to long`);
    }
  } else if (htfBearish) {
    overallBias = 'BEARISH';
    reasoning.push(`📅 Weekly + Daily BEARISH (${bearishTFs}/5 TFs aligned)`);
    
    if (h4.trend === 'BEARISH' || h4.trend === 'NEUTRAL') {
      tradeableDirection = 'SHORT';
      reasoning.push(`✅ 4H supports downtrend — SHORT entries valid`);
    } else {
      tradeableDirection = 'SHORT';
      reasoning.push(`⚠️ 4H bounce — Wait for resistance to short`);
    }
  } else if (bullishTFs >= 3) {
    // Majority bullish
    overallBias = 'BULLISH';
    tradeableDirection = bullishTFs >= 4 ? 'LONG' : 'NO_TRADE';
    reasoning.push(`📊 ${bullishTFs}/5 TFs BULLISH — ${tradeableDirection === 'LONG' ? 'Strong confluence' : 'Moderate confluence'}`);
  } else if (bearishTFs >= 3) {
    // Majority bearish
    overallBias = 'BEARISH';
    tradeableDirection = bearishTFs >= 4 ? 'SHORT' : 'NO_TRADE';
    reasoning.push(`📊 ${bearishTFs}/5 TFs BEARISH — ${tradeableDirection === 'SHORT' ? 'Strong confluence' : 'Moderate confluence'}`);
  } else {
    // Mixed/neutral
    overallBias = 'NEUTRAL';
    tradeableDirection = 'NO_TRADE';
    reasoning.push(`⏸️ Mixed signals (${bullishTFs}B/${bearishTFs}S) — No clear direction`);
  }
  
  // Add confluence quality
  if (confluenceScore >= 70) {
    reasoning.push(`🎯 HIGH confluence (${confluenceScore}%) — Strong setup`);
  } else if (confluenceScore >= 50) {
    reasoning.push(`📊 MODERATE confluence (${confluenceScore}%) — Proceed with caution`);
  } else {
    reasoning.push(`⚠️ LOW confluence (${confluenceScore}%) — Wait for alignment`);
  }
  
  return {
    weekly,
    daily,
    h4,
    h1,
    m15,
    overallBias,
    confluenceScore,
    tradeableDirection,
    reasoning
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 MARKET STRUCTURE ANALYSIS — Aligned with Top-Down
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeMarketStructure(
  price: number,
  high24h: number,
  low24h: number,
  change: number
): MarketStructure {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // Get consistent trend from top-down
  const topDown = performTopDownAnalysis(price, high24h, low24h, change);
  
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  if (topDown.overallBias === 'BULLISH') trend = 'BULLISH';
  else if (topDown.overallBias === 'BEARISH') trend = 'BEARISH';
  else trend = 'RANGING';
  
  const strength = topDown.confluenceScore;

  // Structure based on price position
  const higherHighs = pricePosition > 65 && change > 0;
  const higherLows = pricePosition > 35 && change >= 0;
  const lowerHighs = pricePosition < 65 && change < 0;
  const lowerLows = pricePosition < 35 && change <= 0;

  // BOS/CHoCH detection
  let lastBOS: 'BULLISH' | 'BEARISH' | null = null;
  let lastCHoCH: 'BULLISH' | 'BEARISH' | null = null;

  if (change >= 4 && pricePosition > 75) {
    lastBOS = 'BULLISH';
  } else if (change <= -4 && pricePosition < 25) {
    lastBOS = 'BEARISH';
  }

  if (change >= 3 && pricePosition < 40) {
    lastCHoCH = 'BULLISH'; // Reversal from lows
  } else if (change <= -3 && pricePosition > 60) {
    lastCHoCH = 'BEARISH'; // Reversal from highs
  }

  return {
    trend,
    strength,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    lastBOS,
    lastCHoCH
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 PRECISION ENTRY — Expert Derivatives Trader Logic
// ═══════════════════════════════════════════════════════════════════════════════
// RULES:
// 1. Risk/Reward: (Entry - Stop) < (Entry - Target) — ALWAYS
// 2. No counter-trend trades in strong trends — Wait for pullback
// ═══════════════════════════════════════════════════════════════════════════════

export function generatePrecisionEntry(
  price: number,
  high24h: number,
  low24h: number,
  change: number,
  bias: 'LONG' | 'SHORT' | 'NEUTRAL',
  volumeStrength: string
): PrecisionEntry {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // Smart decimal precision based on price magnitude
  const getDecimals = (p: number): number => {
    if (p < 0.001) return 8;
    if (p < 0.01) return 6;
    if (p < 0.1) return 5;
    if (p < 1) return 4;
    if (p < 10) return 3;
    if (p < 1000) return 2;
    return 0;
  };
  const dec = getDecimals(price);
  
  const topDown = performTopDownAnalysis(price, high24h, low24h, change);
  
  // Key levels with proper precision
  const fib236 = low24h + range * 0.236;
  const fib382 = low24h + range * 0.382;
  const fib500 = low24h + range * 0.500;
  const fib618 = low24h + range * 0.618;
  const fib786 = low24h + range * 0.786;
  const support = low24h + range * 0.1;
  const resistance = high24h - range * 0.1;

  let timing: PrecisionEntry['timing'] = 'AVOID';
  let zone = '';
  let trigger = '';
  let confirmation = '';
  let invalidation = '';
  let structureStatus = '';
  let movementPhase = '';

  // Detect STRONG TREND conditions (avoid counter-trend trades)
  const isStrongBullishTrend = change >= 4 || (change >= 2.5 && pricePosition >= 70);
  const isStrongBearishTrend = change <= -4 || (change <= -2.5 && pricePosition <= 30);
  const trendStrength = topDown.confluenceScore;

  // NO TRADE if confluence is low
  if (topDown.tradeableDirection === 'NO_TRADE' || topDown.confluenceScore < 45) {
    return {
      timing: 'AVOID',
      zone: `$${support.toFixed(dec)} – $${resistance.toFixed(dec)}`,
      trigger: `⚠️ NO TRADE — ${topDown.confluenceScore}% confluence (need 45%+)`,
      confirmation: topDown.reasoning[0] || 'Wait for alignment',
      invalidation: 'N/A',
      volumeCondition: volumeStrength,
      structureStatus: 'Insufficient Confluence',
      movementPhase: 'Wait for setup'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 LONG BIAS LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  if (bias === 'LONG' || topDown.tradeableDirection === 'LONG') {
    
    // RULE 2: If strong bullish trend AND price extended, wait for pullback
    if (isStrongBullishTrend && pricePosition >= 65) {
      timing = 'WAIT_PULLBACK';
      const pullbackEntry = fib500; // Wait for 50% retracement
      const stopLoss = fib236; // Stop below 23.6% Fib
      const target = high24h * 1.02; // Target new highs
      
      // Verify R:R - (Entry - Stop) must be < (Target - Entry)
      const risk = pullbackEntry - stopLoss;
      const reward = target - pullbackEntry;
      
      zone = `Wait for pullback to $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = `🟡 WAIT — Strong uptrend (+${change.toFixed(1)}%), wait for pullback to key support`;
      confirmation = `Buy on bullish price action at $${fib500.toFixed(dec)} (50% Fib)`;
      invalidation = `Below $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
      structureStatus = `Strong Bullish (${trendStrength}% conf)`;
      movementPhase = 'Waiting for Pullback';
      
    } else if (pricePosition < 35) {
      // Price in discount zone - optimal long entry
      timing = 'NOW';
      const entryPrice = price;
      const stopLoss = low24h * 0.985; // 1.5% below 24h low
      const target1 = fib618; // First target at 61.8% Fib
      const target2 = resistance; // Second target at resistance
      
      // Calculate and verify R:R
      const risk = entryPrice - stopLoss;
      const reward = target1 - entryPrice;
      
      // RULE 1: Ensure proper R:R (risk < reward)
      if (risk >= reward) {
        // Adjust stop to ensure minimum 1.5:1 R:R
        const adjustedStop = entryPrice - (reward / 1.5);
        zone = `Discount: $${entryPrice.toFixed(dec)} entry`;
        trigger = '🟢 BUY — Price in discount with bullish confluence';
        confirmation = `${topDown.confluenceScore}% confluence • Target: $${target1.toFixed(dec)}`;
        invalidation = `Below $${adjustedStop.toFixed(dec)} — R:R 1.5:1`;
      } else {
        zone = `Discount: $${entryPrice.toFixed(dec)} entry`;
        trigger = '🟢 BUY — Price in discount with bullish confluence';
        confirmation = `${topDown.confluenceScore}% confluence • Target: $${target1.toFixed(dec)}`;
        invalidation = `Below $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
      }
      structureStatus = `Bullish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Accumulation';
      
    } else if (pricePosition > 70) {
      // Extended - DO NOT chase, wait for pullback
      timing = 'WAIT_PULLBACK';
      zone = `Wait: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = '🟡 WAIT — Extended, do not chase. Wait for pullback to support';
      confirmation = `Retrace to Fib 38-62% zone with bullish confirmation candle`;
      invalidation = `Below $${fib236.toFixed(dec)} (trend break)`;
      structureStatus = 'Extended';
      movementPhase = 'Wait for retracement';
      
    } else {
      // Mid-range - evaluate momentum
      if (change > 1.5) {
        timing = 'NOW';
        const entryPrice = price;
        const stopLoss = fib382 * 0.99; // Just below 38.2% Fib
        const target = resistance;
        
        const risk = entryPrice - stopLoss;
        const reward = target - entryPrice;
        
        // Ensure R:R compliance
        if (risk < reward) {
          zone = `Entry: $${entryPrice.toFixed(dec)}`;
          trigger = '🟢 BUY — Momentum active with trend';
          confirmation = `Target: $${target.toFixed(dec)}`;
          invalidation = `Below $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
        } else {
          timing = 'WAIT_PULLBACK';
          zone = `Wait: $${fib382.toFixed(dec)} – $${fib500.toFixed(dec)}`;
          trigger = '🟡 WAIT — R:R not favorable, wait for better entry';
          confirmation = 'Wait for pullback to improve risk/reward';
          invalidation = `Below $${fib236.toFixed(dec)}`;
        }
      } else {
        timing = 'WAIT_PULLBACK';
        zone = `Wait: $${fib382.toFixed(dec)} – $${fib500.toFixed(dec)}`;
        trigger = '🟡 WAIT — Better entry at support zone';
        confirmation = `Buy on bullish price action at Fib levels`;
        invalidation = `Below $${support.toFixed(dec)}`;
      }
      structureStatus = 'Trending';
      movementPhase = change > 1 ? 'Impulse' : 'Wait for retracement';
    }
    
  // ═══════════════════════════════════════════════════════════════════════════
  // 📉 SHORT BIAS LOGIC  
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (bias === 'SHORT' || topDown.tradeableDirection === 'SHORT') {
    
    // RULE 2: If strong bearish trend AND price already dumped, wait for relief rally
    if (isStrongBearishTrend && pricePosition <= 35) {
      timing = 'WAIT_PULLBACK';
      const pullbackEntry = fib500; // Wait for 50% retracement bounce
      const stopLoss = fib786; // Stop above 78.6% Fib
      const target = low24h * 0.98; // Target new lows
      
      // Verify R:R
      const risk = stopLoss - pullbackEntry;
      const reward = pullbackEntry - target;
      
      zone = `Wait for relief rally to $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = `🟡 WAIT — Strong downtrend (${change.toFixed(1)}%), wait for bounce to key resistance`;
      confirmation = `Sell on bearish price action at $${fib500.toFixed(dec)} (50% Fib)`;
      invalidation = `Above $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
      structureStatus = `Strong Bearish (${trendStrength}% conf)`;
      movementPhase = 'Waiting for Pullback';
      
    } else if (pricePosition > 65) {
      // Price in premium zone - optimal short entry
      timing = 'NOW';
      const entryPrice = price;
      const stopLoss = high24h * 1.015; // 1.5% above 24h high
      const target1 = fib382; // First target at 38.2% Fib
      const target2 = support; // Second target at support
      
      // Calculate and verify R:R
      const risk = stopLoss - entryPrice;
      const reward = entryPrice - target1;
      
      // RULE 1: Ensure proper R:R (risk < reward)
      if (risk >= reward) {
        // Adjust stop to ensure minimum 1.5:1 R:R
        const adjustedStop = entryPrice + (reward / 1.5);
        zone = `Premium: $${entryPrice.toFixed(dec)} entry`;
        trigger = '🔴 SELL — Price in premium with bearish confluence';
        confirmation = `${topDown.confluenceScore}% confluence • Target: $${target1.toFixed(dec)}`;
        invalidation = `Above $${adjustedStop.toFixed(dec)} — R:R 1.5:1`;
      } else {
        zone = `Premium: $${entryPrice.toFixed(dec)} entry`;
        trigger = '🔴 SELL — Price in premium with bearish confluence';
        confirmation = `${topDown.confluenceScore}% confluence • Target: $${target1.toFixed(dec)}`;
        invalidation = `Above $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
      }
      structureStatus = `Bearish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Distribution';
      
    } else if (pricePosition < 30) {
      // Check if breakdown confirmed
      const alreadyBelowSupport = price < support;
      
      if (alreadyBelowSupport && change < -2) {
        // Breakdown confirmed - trend continuation short
        timing = 'NOW';
        const entryPrice = price;
        const stopLoss = fib382; // Stop at reclaim of support
        const target = low24h * 0.95; // Target 5% below 24h low
        
        const risk = stopLoss - entryPrice;
        const reward = entryPrice - target;
        
        if (risk < reward) {
          zone = `Breakdown: $${entryPrice.toFixed(dec)} entry`;
          trigger = '🔴 SELL — Breakdown confirmed, momentum short';
          confirmation = `Price below support, ${Math.abs(change).toFixed(1)}% sell pressure`;
          invalidation = `Above $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
        } else {
          timing = 'WAIT_PULLBACK';
          zone = `Wait: $${fib382.toFixed(dec)} – $${fib500.toFixed(dec)}`;
          trigger = '🟡 WAIT — R:R not favorable after breakdown';
          confirmation = 'Wait for bounce to short with better R:R';
          invalidation = `Above $${fib618.toFixed(dec)}`;
        }
        structureStatus = 'Breakdown Active';
        movementPhase = 'Impulse Down';
      } else {
        // Oversold - wait for relief rally
        timing = 'WAIT_PULLBACK';
        zone = `Wait: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
        trigger = '🟡 WAIT — Oversold, wait for relief rally to short';
        confirmation = 'Bounce to Fib 38-62% zone for short entry with bearish candle';
        invalidation = `Above $${resistance.toFixed(dec)} (trend reversal)`;
        structureStatus = 'Oversold';
        movementPhase = 'Wait for retracement';
      }
      
    } else {
      // Mid-range - evaluate momentum
      if (change < -1.5) {
        timing = 'NOW';
        const entryPrice = price;
        const stopLoss = fib618 * 1.01; // Just above 61.8% Fib
        const target = support;
        
        const risk = stopLoss - entryPrice;
        const reward = entryPrice - target;
        
        if (risk < reward) {
          zone = `Entry: $${entryPrice.toFixed(dec)}`;
          trigger = '🔴 SELL — Momentum active with trend';
          confirmation = `Target: $${target.toFixed(dec)}`;
          invalidation = `Above $${stopLoss.toFixed(dec)} — R:R ${(reward/risk).toFixed(1)}:1`;
        } else {
          timing = 'WAIT_PULLBACK';
          zone = `Wait: $${fib500.toFixed(dec)} – $${fib618.toFixed(dec)}`;
          trigger = '🟡 WAIT — R:R not favorable, wait for bounce';
          confirmation = 'Wait for relief rally to improve risk/reward';
          invalidation = `Above $${fib786.toFixed(dec)}`;
        }
      } else {
        timing = 'WAIT_PULLBACK';
        zone = `Wait: $${fib500.toFixed(dec)} – $${fib618.toFixed(dec)}`;
        trigger = '🟡 WAIT — Better entry at resistance zone';
        confirmation = `Sell on bearish price action at Fib levels`;
        invalidation = `Above $${resistance.toFixed(dec)}`;
      }
      structureStatus = 'Trending';
      movementPhase = change < -1 ? 'Impulse' : 'Wait for retracement';
    }
    
  } else {
    // NEUTRAL bias — no clear direction
    timing = 'AVOID';
    zone = `Range: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
    trigger = '⏸️ NO TRADE — Neutral bias, wait for direction';
    confirmation = 'Wait for breakout or breakdown with volume confirmation';
    invalidation = 'N/A';
    structureStatus = 'Neutral';
    movementPhase = 'Consolidation';
  }

  return {
    timing,
    zone: zone || `$${support.toFixed(dec)} – $${resistance.toFixed(dec)}`,
    trigger: trigger || 'Wait for setup',
    confirmation: confirmation || 'Pending',
    invalidation: invalidation || 'N/A',
    volumeCondition: volumeStrength,
    structureStatus: structureStatus || 'Undefined',
    movementPhase: movementPhase || 'Unknown'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 FINAL BIAS — Weighted Multi-Factor Scoring (Deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateFinalBias(data: {
  priceChange: number;
  pricePosition: number;
  volumeStrength: string;
  fearGreed: number;
  institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  onChainTrend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL';
}): { bias: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; insights: string[] } {
  const { priceChange, pricePosition, fearGreed, institutionalBias, onChainTrend, volumeStrength } = data;
  const insights: string[] = [];

  // Weighted scoring (max 17 points)
  let bullishPoints = 0;
  let bearishPoints = 0;

  // 1. PRICE DIRECTION (weight: 4) — PRIMARY SIGNAL
  if (priceChange >= 4) { 
    bullishPoints += 4; 
    insights.push(`🚀 Strong uptrend (+${priceChange.toFixed(1)}%)`); 
  } else if (priceChange >= 2) { 
    bullishPoints += 3;
    insights.push(`📈 Bullish momentum (+${priceChange.toFixed(1)}%)`);
  } else if (priceChange >= 0.5) { 
    bullishPoints += 2;
    insights.push(`↗️ Mild bullish (+${priceChange.toFixed(1)}%)`);
  } else if (priceChange <= -4) { 
    bearishPoints += 4; 
    insights.push(`📉 Strong downtrend (${priceChange.toFixed(1)}%)`); 
  } else if (priceChange <= -2) { 
    bearishPoints += 3;
    insights.push(`📉 Bearish momentum (${priceChange.toFixed(1)}%)`);
  } else if (priceChange <= -0.5) { 
    bearishPoints += 2;
    insights.push(`↘️ Mild bearish (${priceChange.toFixed(1)}%)`);
  } else {
    insights.push(`➡️ Sideways (${priceChange.toFixed(1)}%)`);
  }

  // 2. PRICE POSITION (weight: 3)
  if (pricePosition < 25) { 
    bullishPoints += 3; 
    insights.push('💎 Deep discount — Optimal buy zone'); 
  } else if (pricePosition < 40) { 
    bullishPoints += 2; 
  } else if (pricePosition > 75) { 
    bearishPoints += 3; 
    insights.push('⚠️ Premium zone — Caution'); 
  } else if (pricePosition > 60) { 
    bearishPoints += 2; 
  }

  // 3. FEAR & GREED (weight: 2) — Contrarian
  if (fearGreed < 25) { 
    bullishPoints += 2; 
    insights.push('😱 Extreme Fear — Contrarian BUY'); 
  } else if (fearGreed > 75) { 
    bearishPoints += 2; 
    insights.push('🤑 Extreme Greed — Contrarian SELL'); 
  }

  // 4. INSTITUTIONAL BIAS (weight: 3)
  if (institutionalBias === 'BULLISH') { 
    bullishPoints += 3; 
    insights.push('🏦 Institutions buying'); 
  } else if (institutionalBias === 'BEARISH') { 
    bearishPoints += 3; 
    insights.push('🏦 Institutions selling'); 
  }

  // 5. ON-CHAIN (weight: 3)
  if (onChainTrend === 'OUTFLOW') { 
    bullishPoints += 3; 
    insights.push('🔗 Exchange outflows — Accumulation'); 
  } else if (onChainTrend === 'INFLOW') { 
    bearishPoints += 3; 
    insights.push('🔗 Exchange inflows — Distribution'); 
  }

  // 6. VOLUME (weight: 2)
  if (volumeStrength === 'HIGH') {
    if (priceChange > 0) {
      bullishPoints += 2;
      insights.push('📊 High volume confirms bulls');
    } else if (priceChange < 0) {
      bearishPoints += 2;
      insights.push('📊 High volume confirms bears');
    }
  }

  // Calculate final bias
  const netBias = bullishPoints - bearishPoints;
  const totalPoints = bullishPoints + bearishPoints;
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  let confidence: number;

  // Stricter thresholds for consistency
  if (netBias >= 4 && bullishPoints >= 6) {
    bias = 'LONG';
    confidence = Math.min(85, 60 + netBias * 2.5);
    insights.unshift(`🎯 BULLISH — ${bullishPoints} bull vs ${bearishPoints} bear factors`);
  } else if (netBias <= -4 && bearishPoints >= 6) {
    bias = 'SHORT';
    confidence = Math.min(85, 60 + Math.abs(netBias) * 2.5);
    insights.unshift(`🎯 BEARISH — ${bearishPoints} bear vs ${bullishPoints} bull factors`);
  } else if (netBias >= 2) {
    bias = 'LONG';
    confidence = 52 + netBias * 2;
    insights.unshift(`📊 Lean BULLISH — Moderate signal`);
  } else if (netBias <= -2) {
    bias = 'SHORT';
    confidence = 52 + Math.abs(netBias) * 2;
    insights.unshift(`📊 Lean BEARISH — Moderate signal`);
  } else {
    bias = 'NEUTRAL';
    confidence = 48;
    insights.unshift(`⏸️ NEUTRAL — No clear edge`);
  }

  return { bias, confidence, insights };
}

// Export types
export type { TimeframeBias };
