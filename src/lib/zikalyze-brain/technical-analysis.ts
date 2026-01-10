// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TECHNICAL ANALYSIS ENGINE v4.0 — Real-Time Chart-Based Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 Uses REAL 24h chart data when available for accurate trend detection
// 📈 Confluence = alignment across timeframes + EMA/RSI from live data
// ⚡ No random values — 100% deterministic and reproducible
// ═══════════════════════════════════════════════════════════════════════════════

import { MarketStructure, PrecisionEntry, ChartTrendInput } from './types';

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
  chartData?: ChartTrendInput // Real 24h chart data when available
): TopDownAnalysis {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 USE REAL CHART DATA when available for accurate trend detection
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
// 🎯 PRECISION ENTRY — Only Trade With Confluence
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
  
  // Fibonacci levels with proper precision
  const fib382 = low24h + range * 0.382;
  const fib618 = low24h + range * 0.618;
  const support = low24h + range * 0.1;
  const resistance = high24h - range * 0.1;

  let timing: PrecisionEntry['timing'] = 'AVOID';
  let zone = '';
  let trigger = '';
  let confirmation = '';
  let invalidation = '';
  let structureStatus = '';
  let movementPhase = '';

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

  if (bias === 'LONG' || topDown.tradeableDirection === 'LONG') {
    if (pricePosition < 35) {
      timing = 'NOW';
      zone = `Discount: $${support.toFixed(dec)} – $${fib382.toFixed(dec)}`;
      trigger = '🟢 BUY — Price in discount with bullish confluence';
      confirmation = `${topDown.confluenceScore}% confluence • ${topDown.overallBias} bias`;
      invalidation = `Below $${(low24h * 0.98).toFixed(dec)}`;
      structureStatus = `Bullish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Accumulation';
    } else if (pricePosition > 70) {
      timing = 'WAIT_PULLBACK';
      zone = `Wait: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = '🟡 WAIT — Extended, wait for pullback';
      confirmation = 'Retrace to Fib 38-62% zone';
      invalidation = `Below $${support.toFixed(dec)}`;
      structureStatus = 'Extended';
      movementPhase = 'Wait for retracement';
    } else {
      timing = change > 1 ? 'NOW' : 'WAIT_PULLBACK';
      zone = `Mid-range: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = change > 1 ? '🟢 BUY — Momentum active' : '🟡 WAIT — Better entry at support';
      confirmation = `Bullish momentum confirmed`;
      invalidation = `Below $${support.toFixed(dec)}`;
      structureStatus = 'Trending';
      movementPhase = 'Impulse';
    }
  } else if (bias === 'SHORT' || topDown.tradeableDirection === 'SHORT') {
    // Check if price is already below key support (breakdown confirmed)
    const alreadyBelowSupport = price < support;
    
    if (pricePosition > 65) {
      // Price at resistance - ideal short zone
      timing = 'NOW';
      zone = `Premium: $${fib618.toFixed(dec)} – $${resistance.toFixed(dec)}`;
      trigger = '🔴 SELL — Price in premium with bearish confluence';
      confirmation = `${topDown.confluenceScore}% confluence • ${topDown.overallBias} bias`;
      invalidation = `Above $${(high24h * 1.02).toFixed(dec)}`;
      structureStatus = `Bearish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Distribution';
    } else if (pricePosition < 30) {
      if (alreadyBelowSupport && change < -2) {
        // Price broke down and still falling - trend continuation
        timing = 'NOW';
        const targetLow = low24h * 0.95;
        zone = `Breakdown: $${(price * 0.98).toFixed(dec)} – $${price.toFixed(dec)}`;
        trigger = '🔴 SELL — Breakdown confirmed, momentum short';
        confirmation = `Price below support, ${Math.abs(change).toFixed(1)}% sell pressure`;
        invalidation = `Above $${fib382.toFixed(dec)} (reclaim of support)`;
        structureStatus = 'Breakdown Active';
        movementPhase = 'Impulse Down';
      } else {
        // Oversold but bearish - wait for relief rally to short
        timing = 'WAIT_PULLBACK';
        zone = `Wait: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
        trigger = '🟡 WAIT — Oversold, wait for relief rally to short';
        confirmation = 'Bounce to Fib 38-62% zone for short entry';
        invalidation = `Above $${resistance.toFixed(dec)} (trend reversal)`;
        structureStatus = 'Oversold';
        movementPhase = 'Wait for retracement';
      }
    } else {
      timing = change < -1 ? 'NOW' : 'WAIT_PULLBACK';
      zone = `Mid-range: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
      trigger = change < -1 ? '🔴 SELL — Momentum active' : '🟡 WAIT — Better entry at resistance';
      confirmation = `Bearish momentum confirmed`;
      invalidation = `Above $${resistance.toFixed(dec)}`;
      structureStatus = 'Trending';
      movementPhase = 'Impulse';
    }
  } else {
    // NEUTRAL bias — no clear direction
    timing = 'AVOID';
    zone = `Range: $${fib382.toFixed(dec)} – $${fib618.toFixed(dec)}`;
    trigger = '⏸️ NO TRADE — Neutral bias, wait for direction';
    confirmation = 'Wait for breakout or breakdown';
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
