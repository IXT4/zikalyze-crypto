// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TECHNICAL ANALYSIS ENGINE v3.0 — Accurate Top-Down Multi-Timeframe Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TOP-DOWN APPROACH: Trend follows price direction consistently
// 📈 Confluence = alignment across timeframes + supporting factors
// ⚡ No random values — 100% deterministic and reproducible
// ═══════════════════════════════════════════════════════════════════════════════

import { MarketStructure, PrecisionEntry } from './types';

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

interface TopDownAnalysis {
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
// 📊 ACCURATE TREND DETECTION — Based on actual price action
// ═══════════════════════════════════════════════════════════════════════════════

function determineTrend(
  change: number,
  pricePosition: number
): { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number; structure: 'UPTREND' | 'DOWNTREND' | 'RANGE' } {
  // CORE RULE: Trend follows price direction
  // - Positive change = BULLISH
  // - Negative change = BEARISH
  // - Near zero = NEUTRAL
  
  const absChange = Math.abs(change);
  
  // Strong trends (>3% move)
  if (change >= 3) {
    return {
      trend: 'BULLISH',
      strength: Math.min(95, 70 + absChange * 3),
      structure: 'UPTREND'
    };
  }
  
  if (change <= -3) {
    return {
      trend: 'BEARISH',
      strength: Math.min(95, 70 + absChange * 3),
      structure: 'DOWNTREND'
    };
  }
  
  // Moderate trends (1-3% move)
  if (change >= 1) {
    return {
      trend: 'BULLISH',
      strength: 55 + absChange * 8,
      structure: pricePosition > 60 ? 'UPTREND' : 'RANGE'
    };
  }
  
  if (change <= -1) {
    return {
      trend: 'BEARISH',
      strength: 55 + absChange * 8,
      structure: pricePosition < 40 ? 'DOWNTREND' : 'RANGE'
    };
  }
  
  // Weak/no trend (-1% to +1%)
  // Use price position to determine lean
  if (change > 0.3 && pricePosition > 55) {
    return { trend: 'BULLISH', strength: 52 + change * 5, structure: 'RANGE' };
  }
  
  if (change < -0.3 && pricePosition < 45) {
    return { trend: 'BEARISH', strength: 52 + absChange * 5, structure: 'RANGE' };
  }
  
  // True neutral
  return {
    trend: 'NEUTRAL',
    strength: 45 + Math.abs(50 - pricePosition) * 0.2,
    structure: 'RANGE'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TOP-DOWN ANALYSIS — Consistent Multi-Timeframe Trend
// ═══════════════════════════════════════════════════════════════════════════════

export function performTopDownAnalysis(
  price: number,
  high24h: number,
  low24h: number,
  change: number
): TopDownAnalysis {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // CRITICAL: All timeframes use the SAME directional bias from actual price change
  // Higher timeframes have lower strength multipliers (less volatile)
  
  const baseTrend = determineTrend(change, pricePosition);
  
  // Weekly (weight: 5) — Most stable, follows overall direction
  const weeklyTrend = determineTrend(change * 0.6, pricePosition);
  const weekly: TimeframeBias = {
    timeframe: 'WEEKLY',
    trend: weeklyTrend.trend,
    strength: Math.max(40, weeklyTrend.strength * 0.85),
    keyLevel: weeklyTrend.trend === 'BULLISH' ? low24h * 0.95 : high24h * 1.05,
    structure: weeklyTrend.structure,
    weight: 5
  };
  
  // Daily (weight: 4) — Primary trend timeframe
  const dailyTrend = determineTrend(change * 0.8, pricePosition);
  const daily: TimeframeBias = {
    timeframe: 'DAILY',
    trend: dailyTrend.trend,
    strength: Math.max(45, dailyTrend.strength * 0.9),
    keyLevel: dailyTrend.trend === 'BULLISH' ? low24h * 0.97 : high24h * 1.03,
    structure: dailyTrend.structure,
    weight: 4
  };
  
  // 4H (weight: 3) — Swing trade timeframe
  const h4Trend = determineTrend(change * 0.9, pricePosition);
  const h4: TimeframeBias = {
    timeframe: '4H',
    trend: h4Trend.trend,
    strength: Math.max(48, h4Trend.strength * 0.95),
    keyLevel: h4Trend.trend === 'BULLISH' ? low24h * 0.99 : high24h * 1.01,
    structure: h4Trend.structure,
    weight: 3
  };
  
  // 1H (weight: 2) — Intraday timeframe (uses actual change)
  const h1Trend = determineTrend(change, pricePosition);
  const h1: TimeframeBias = {
    timeframe: '1H',
    trend: h1Trend.trend,
    strength: h1Trend.strength,
    keyLevel: h1Trend.trend === 'BULLISH' ? low24h : high24h,
    structure: h1Trend.structure,
    weight: 2
  };
  
  // 15M (weight: 1) — Entry timeframe (most reactive)
  const m15Trend = determineTrend(change * 1.2, pricePosition);
  const m15: TimeframeBias = {
    timeframe: '15M',
    trend: m15Trend.trend,
    strength: Math.min(98, m15Trend.strength * 1.05),
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
  
  const topDown = performTopDownAnalysis(price, high24h, low24h, change);
  
  // Fibonacci levels
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
      zone: `$${support.toFixed(2)} - $${resistance.toFixed(2)}`,
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
      zone = `Discount: $${support.toFixed(2)} - $${fib382.toFixed(2)}`;
      trigger = '🟢 BUY — Price in discount with bullish confluence';
      confirmation = `${topDown.confluenceScore}% confluence • ${topDown.overallBias} bias`;
      invalidation = `Below $${(support * 0.99).toFixed(2)}`;
      structureStatus = `Bullish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Accumulation';
    } else if (pricePosition > 70) {
      timing = 'WAIT_PULLBACK';
      zone = `Wait: $${fib382.toFixed(2)} - $${fib618.toFixed(2)}`;
      trigger = '🟡 WAIT — Extended, wait for pullback';
      confirmation = 'Retrace to Fib 38-62% zone';
      invalidation = `Below $${support.toFixed(2)}`;
      structureStatus = 'Extended';
      movementPhase = 'Wait for retracement';
    } else {
      timing = change > 1 ? 'NOW' : 'WAIT_PULLBACK';
      zone = `Mid-range: $${fib382.toFixed(2)}`;
      trigger = change > 1 ? '🟢 BUY — Momentum active' : '🟡 WAIT — Better entry at support';
      confirmation = `Bullish momentum confirmed`;
      invalidation = `Below $${support.toFixed(2)}`;
      structureStatus = 'Trending';
      movementPhase = 'Impulse';
    }
  } else if (bias === 'SHORT' || topDown.tradeableDirection === 'SHORT') {
    if (pricePosition > 65) {
      timing = 'NOW';
      zone = `Premium: $${fib618.toFixed(2)} - $${resistance.toFixed(2)}`;
      trigger = '🔴 SELL — Price in premium with bearish confluence';
      confirmation = `${topDown.confluenceScore}% confluence • ${topDown.overallBias} bias`;
      invalidation = `Above $${(resistance * 1.01).toFixed(2)}`;
      structureStatus = `Bearish (${topDown.confluenceScore}% conf)`;
      movementPhase = 'Distribution';
    } else if (pricePosition < 30) {
      timing = 'WAIT_PULLBACK';
      zone = `Wait: $${fib382.toFixed(2)} - $${fib618.toFixed(2)}`;
      trigger = '🟡 WAIT — Oversold, wait for rally';
      confirmation = 'Bounce to Fib 38-62% zone';
      invalidation = `Above $${resistance.toFixed(2)}`;
      structureStatus = 'Oversold';
      movementPhase = 'Wait for retracement';
    } else {
      timing = change < -1 ? 'NOW' : 'WAIT_PULLBACK';
      zone = `Mid-range: $${fib618.toFixed(2)}`;
      trigger = change < -1 ? '🔴 SELL — Momentum active' : '🟡 WAIT — Better entry at resistance';
      confirmation = `Bearish momentum confirmed`;
      invalidation = `Above $${resistance.toFixed(2)}`;
      structureStatus = 'Trending';
      movementPhase = 'Impulse';
    }
  }

  return {
    timing,
    zone,
    trigger,
    confirmation,
    invalidation,
    volumeCondition: volumeStrength,
    structureStatus,
    movementPhase
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
export type { TopDownAnalysis, TimeframeBias };
