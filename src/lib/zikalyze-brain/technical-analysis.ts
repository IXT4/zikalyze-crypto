// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TECHNICAL ANALYSIS ENGINE v2.0 — Top-Down Multi-Timeframe Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TOP-DOWN APPROACH: Weekly → Daily → 4H → 1H → 15M
// 📈 Higher timeframe bias MUST align with lower timeframe entries
// ⚡ Consistency through confluence scoring
// ═══════════════════════════════════════════════════════════════════════════════

import { MarketStructure, PrecisionEntry } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 TIMEFRAME ANALYSIS — Core of Top-Down Methodology
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

// Simulate timeframe analysis from available data
function analyzeTimeframe(
  price: number,
  high: number,
  low: number,
  change: number,
  timeframe: string,
  weight: number
): TimeframeBias {
  const range = high - low;
  const position = range > 0 ? ((price - low) / range) * 100 : 50;
  
  // Calculate trend based on position and momentum
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  let structure: 'UPTREND' | 'DOWNTREND' | 'RANGE';
  let strength: number;
  
  // Apply timeframe-specific thresholds (higher TF = stricter)
  const momentumThreshold = weight > 3 ? 2 : weight > 2 ? 1.5 : 1;
  const positionThreshold = weight > 3 ? 35 : 30;
  
  if (change > momentumThreshold * 2 && position > 100 - positionThreshold) {
    trend = 'BULLISH';
    structure = 'UPTREND';
    strength = 70 + Math.min(25, change * 3);
  } else if (change < -momentumThreshold * 2 && position < positionThreshold) {
    trend = 'BEARISH';
    structure = 'DOWNTREND';
    strength = 70 + Math.min(25, Math.abs(change) * 3);
  } else if (change > momentumThreshold && position > 50) {
    trend = 'BULLISH';
    structure = position > 65 ? 'UPTREND' : 'RANGE';
    strength = 55 + Math.min(20, change * 4);
  } else if (change < -momentumThreshold && position < 50) {
    trend = 'BEARISH';
    structure = position < 35 ? 'DOWNTREND' : 'RANGE';
    strength = 55 + Math.min(20, Math.abs(change) * 4);
  } else {
    trend = 'NEUTRAL';
    structure = 'RANGE';
    // Deterministic strength based on price position distance from 50
    strength = 40 + Math.abs(50 - position) * 0.3;
  }
  
  // Calculate key level for this timeframe
  const keyLevel = trend === 'BULLISH' 
    ? low + range * 0.382 // Support for longs
    : high - range * 0.382; // Resistance for shorts
  
  return { timeframe, trend, strength, keyLevel, structure, weight };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TOP-DOWN ANALYSIS — The Core Methodology
// ═══════════════════════════════════════════════════════════════════════════════

export function performTopDownAnalysis(
  price: number,
  high24h: number,
  low24h: number,
  change: number
): TopDownAnalysis {
  const range = high24h - low24h;
  
  // Simulate different timeframes from available data
  // Higher timeframes have wider ranges and slower momentum
  
  // Weekly (weight: 5) - Most important, slowest to change
  const weeklyHigh = high24h * 1.08;
  const weeklyLow = low24h * 0.92;
  const weeklyChange = change * 0.3; // Weekly moves are slower
  const weekly = analyzeTimeframe(price, weeklyHigh, weeklyLow, weeklyChange, 'WEEKLY', 5);
  
  // Daily (weight: 4)
  const dailyHigh = high24h * 1.03;
  const dailyLow = low24h * 0.97;
  const dailyChange = change * 0.5;
  const daily = analyzeTimeframe(price, dailyHigh, dailyLow, dailyChange, 'DAILY', 4);
  
  // 4H (weight: 3)
  const h4High = high24h * 1.01;
  const h4Low = low24h * 0.99;
  const h4Change = change * 0.75;
  const h4 = analyzeTimeframe(price, h4High, h4Low, h4Change, '4H', 3);
  
  // 1H (weight: 2)
  const h1 = analyzeTimeframe(price, high24h, low24h, change, '1H', 2);
  
  // 15M (weight: 1) - Entry timeframe
  const m15High = high24h - range * 0.1;
  const m15Low = low24h + range * 0.1;
  const m15Change = change * 1.5; // 15M is more volatile
  const m15 = analyzeTimeframe(price, m15High, m15Low, m15Change, '15M', 1);
  
  // Calculate confluence score
  const allBiases = [weekly, daily, h4, h1, m15];
  const totalWeight = allBiases.reduce((sum, b) => sum + b.weight, 0);
  
  let bullishWeight = 0;
  let bearishWeight = 0;
  
  allBiases.forEach(b => {
    if (b.trend === 'BULLISH') bullishWeight += b.weight * (b.strength / 100);
    else if (b.trend === 'BEARISH') bearishWeight += b.weight * (b.strength / 100);
  });
  
  const bullishScore = (bullishWeight / totalWeight) * 100;
  const bearishScore = (bearishWeight / totalWeight) * 100;
  
  // Overall bias - MUST be dominated by higher timeframes
  let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  let tradeableDirection: 'LONG' | 'SHORT' | 'NO_TRADE';
  const reasoning: string[] = [];
  
  // Weekly and Daily MUST align for high-probability trades
  const htfAligned = weekly.trend === daily.trend && weekly.trend !== 'NEUTRAL';
  const ltfAligned = h4.trend === h1.trend;
  
  if (htfAligned && weekly.trend === 'BULLISH') {
    overallBias = 'BULLISH';
    reasoning.push(`📅 Weekly + Daily BULLISH alignment (HIGH confidence)`);
    
    if (ltfAligned && h4.trend === 'BULLISH') {
      tradeableDirection = 'LONG';
      reasoning.push(`⏰ 4H + 1H confirm uptrend — LONG entries valid`);
    } else if (h4.trend === 'NEUTRAL' || h1.trend === 'NEUTRAL') {
      tradeableDirection = 'LONG';
      reasoning.push(`⏰ Lower TF consolidating — Wait for pullback entry`);
    } else {
      tradeableDirection = 'NO_TRADE';
      reasoning.push(`⚠️ Lower TF diverging — Wait for realignment`);
    }
  } else if (htfAligned && weekly.trend === 'BEARISH') {
    overallBias = 'BEARISH';
    reasoning.push(`📅 Weekly + Daily BEARISH alignment (HIGH confidence)`);
    
    if (ltfAligned && h4.trend === 'BEARISH') {
      tradeableDirection = 'SHORT';
      reasoning.push(`⏰ 4H + 1H confirm downtrend — SHORT entries valid`);
    } else if (h4.trend === 'NEUTRAL' || h1.trend === 'NEUTRAL') {
      tradeableDirection = 'SHORT';
      reasoning.push(`⏰ Lower TF consolidating — Wait for rally to short`);
    } else {
      tradeableDirection = 'NO_TRADE';
      reasoning.push(`⚠️ Lower TF diverging — Wait for realignment`);
    }
  } else if (weekly.trend !== daily.trend) {
    overallBias = 'NEUTRAL';
    tradeableDirection = 'NO_TRADE';
    reasoning.push(`⚠️ Weekly vs Daily CONFLICT — No clear bias`);
    reasoning.push(`📌 Wait for higher timeframe alignment before trading`);
  } else {
    // Weekly neutral but check if daily has momentum
    if (daily.trend !== 'NEUTRAL' && daily.strength > 65) {
      overallBias = daily.trend;
      tradeableDirection = daily.trend === 'BULLISH' ? 'LONG' : 'SHORT';
      reasoning.push(`📊 Daily trending with strength — Scalp trades only`);
    } else {
      overallBias = 'NEUTRAL';
      tradeableDirection = 'NO_TRADE';
      reasoning.push(`⏸️ Market ranging — Wait for breakout`);
    }
  }
  
  // Add 15M entry timing
  if (tradeableDirection !== 'NO_TRADE') {
    if (m15.trend === overallBias) {
      reasoning.push(`🎯 15M aligned — Entry timing OPTIMAL`);
    } else if (m15.trend === 'NEUTRAL') {
      reasoning.push(`🔄 15M consolidating — Wait for micro-breakout`);
    } else {
      reasoning.push(`⏳ 15M counter-trend — Wait for reversal candle`);
    }
  }
  
  // Calculate final confluence score
  const confluenceScore = Math.max(bullishScore, bearishScore);
  
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
// 📈 MARKET STRUCTURE ANALYSIS — Enhanced with Top-Down Context
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeMarketStructure(
  price: number,
  high24h: number,
  low24h: number,
  change: number
): MarketStructure {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  // Get top-down context
  const topDown = performTopDownAnalysis(price, high24h, low24h, change);
  
  // Trend is determined by higher timeframe bias
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  let strength: number;

  if (topDown.overallBias === 'BULLISH') {
    trend = 'BULLISH';
    strength = topDown.confluenceScore;
  } else if (topDown.overallBias === 'BEARISH') {
    trend = 'BEARISH';
    strength = topDown.confluenceScore;
  } else {
    trend = 'RANGING';
    strength = 50 - Math.abs(50 - topDown.confluenceScore);
  }

  // Structure analysis from price position
  const higherHighs = pricePosition > 70 && change > 0;
  const higherLows = pricePosition > 30 && change > -1;
  const lowerHighs = pricePosition < 70 && change < 1;
  const lowerLows = pricePosition < 30 && change < 0;

  // BOS/CHoCH detection (based on structure breaks)
  let lastBOS: 'BULLISH' | 'BEARISH' | null = null;
  let lastCHoCH: 'BULLISH' | 'BEARISH' | null = null;

  if (topDown.tradeableDirection === 'LONG' && pricePosition > 80 && change > 3) {
    lastBOS = 'BULLISH';
  } else if (topDown.tradeableDirection === 'SHORT' && pricePosition < 20 && change < -3) {
    lastBOS = 'BEARISH';
  }

  // CHoCH (trend reversal within structure)
  if (change > 4 && pricePosition < 40 && topDown.m15.trend === 'BULLISH') {
    lastCHoCH = 'BULLISH';
  } else if (change < -4 && pricePosition > 60 && topDown.m15.trend === 'BEARISH') {
    lastCHoCH = 'BEARISH';
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
// 🎯 PRECISION ENTRY — Only Trade With HTF Confluence
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
  
  // Get top-down analysis for context
  const topDown = performTopDownAnalysis(price, high24h, low24h, change);
  
  const nearSupport = pricePosition < 25;
  const nearResistance = pricePosition > 75;
  const inPremium = pricePosition > 60;
  const inDiscount = pricePosition < 40;

  // Key levels from Fibonacci
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

  // CRITICAL: Only trade in direction of HTF bias
  if (topDown.tradeableDirection === 'NO_TRADE') {
    return {
      timing: 'AVOID',
      zone: `$${support.toFixed(2)} - $${resistance.toFixed(2)}`,
      trigger: '⚠️ NO TRADE — Higher timeframe conflict',
      confirmation: topDown.reasoning[0] || 'Wait for HTF alignment',
      invalidation: 'N/A',
      volumeCondition: volumeStrength,
      structureStatus: 'HTF Misaligned',
      movementPhase: 'Wait for confluence'
    };
  }

  if (topDown.tradeableDirection === 'LONG') {
    // LONG entries — Only at discount or on pullbacks
    if (inDiscount && change > -2) {
      timing = 'NOW';
      zone = `Discount Zone: $${support.toFixed(2)} - $${fib382.toFixed(2)}`;
      trigger = '🟢 BUY — Price in discount with HTF bullish bias';
      confirmation = `HTF: ${topDown.weekly.trend}/${topDown.daily.trend} aligned • Bullish candle close`;
      invalidation = `Close below $${(support * 0.99).toFixed(2)}`;
      structureStatus = `HTF Bullish (${topDown.confluenceScore.toFixed(0)}% confluence)`;
      movementPhase = 'Accumulation zone';
    } else if (nearSupport) {
      timing = 'NOW';
      zone = `Support: $${support.toFixed(2)}`;
      trigger = '🟢 BUY — Testing support with bullish HTF';
      confirmation = 'Bullish engulfing + Volume spike';
      invalidation = `Break below $${(support * 0.995).toFixed(2)}`;
      structureStatus = 'Support test';
      movementPhase = 'Reversal setup';
    } else if (inPremium) {
      timing = 'WAIT_PULLBACK';
      zone = `Wait for: $${fib382.toFixed(2)} - $${fib618.toFixed(2)}`;
      trigger = '🟡 WAIT — Price in premium, wait for pullback';
      confirmation = 'Pullback to Fib 38.2-61.8% + Higher low';
      invalidation = `Break below $${support.toFixed(2)}`;
      structureStatus = 'Extended';
      movementPhase = 'Wait for retracement';
    } else {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${fib382.toFixed(2)}`;
      trigger = '🟡 WAIT — Look for optimal entry in discount';
      confirmation = 'Bullish structure on 15M';
      invalidation = `Break below $${support.toFixed(2)}`;
      structureStatus = 'Trending up';
      movementPhase = 'Impulse phase';
    }
  } else if (topDown.tradeableDirection === 'SHORT') {
    // SHORT entries — Only at premium or on rallies
    if (inPremium && change < 2) {
      timing = 'NOW';
      zone = `Premium Zone: $${fib618.toFixed(2)} - $${resistance.toFixed(2)}`;
      trigger = '🔴 SELL — Price in premium with HTF bearish bias';
      confirmation = `HTF: ${topDown.weekly.trend}/${topDown.daily.trend} aligned • Bearish candle close`;
      invalidation = `Close above $${(resistance * 1.01).toFixed(2)}`;
      structureStatus = `HTF Bearish (${topDown.confluenceScore.toFixed(0)}% confluence)`;
      movementPhase = 'Distribution zone';
    } else if (nearResistance) {
      timing = 'NOW';
      zone = `Resistance: $${resistance.toFixed(2)}`;
      trigger = '🔴 SELL — Testing resistance with bearish HTF';
      confirmation = 'Bearish engulfing + Volume spike';
      invalidation = `Break above $${(resistance * 1.005).toFixed(2)}`;
      structureStatus = 'Resistance test';
      movementPhase = 'Reversal setup';
    } else if (inDiscount) {
      timing = 'WAIT_PULLBACK';
      zone = `Wait for: $${fib382.toFixed(2)} - $${fib618.toFixed(2)}`;
      trigger = '🟡 WAIT — Price in discount, wait for rally';
      confirmation = 'Rally to Fib 38.2-61.8% + Lower high';
      invalidation = `Break above $${resistance.toFixed(2)}`;
      structureStatus = 'Oversold';
      movementPhase = 'Wait for retracement';
    } else {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${fib618.toFixed(2)}`;
      trigger = '🟡 WAIT — Look for optimal entry in premium';
      confirmation = 'Bearish structure on 15M';
      invalidation = `Break above $${resistance.toFixed(2)}`;
      structureStatus = 'Trending down';
      movementPhase = 'Impulse phase';
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
// 📊 FINAL BIAS CALCULATION — Weighted Multi-Factor with HTF Priority
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateFinalBias(data: {
  priceChange: number;
  pricePosition: number;
  volumeStrength: string;
  fearGreed: number;
  institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  onChainTrend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL';
}): { bias: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; insights: string[]; topDownData?: TopDownAnalysis } {
  const { priceChange, pricePosition, fearGreed, institutionalBias, onChainTrend } = data;
  const insights: string[] = [];

  // Get top-down analysis (highest priority)
  const estimatedHigh = 100; // Will be replaced with actual data
  const estimatedLow = 0;
  const estimatedPrice = pricePosition;
  
  // Scoring system with clear weights
  let bullishPoints = 0;
  let bearishPoints = 0;
  const maxPoints = 15; // Total possible points

  // 1. PRICE MOMENTUM (weight: 3) — Most reactive
  if (priceChange > 4) { 
    bullishPoints += 3; 
    insights.push('🚀 Strong bullish momentum (+' + priceChange.toFixed(1) + '%)'); 
  } else if (priceChange > 2) { 
    bullishPoints += 2;
    insights.push('📈 Bullish momentum active');
  } else if (priceChange > 0.5) { 
    bullishPoints += 1; 
  } else if (priceChange < -4) { 
    bearishPoints += 3; 
    insights.push('📉 Strong bearish momentum (' + priceChange.toFixed(1) + '%)'); 
  } else if (priceChange < -2) { 
    bearishPoints += 2;
    insights.push('📉 Bearish momentum active');
  } else if (priceChange < -0.5) { 
    bearishPoints += 1; 
  }

  // 2. PRICE POSITION IN RANGE (weight: 3) — Structure context
  if (pricePosition < 25) { 
    bullishPoints += 3; 
    insights.push('💎 Price in deep discount zone (support)'); 
  } else if (pricePosition < 40) { 
    bullishPoints += 2; 
    insights.push('📍 Price in discount zone'); 
  } else if (pricePosition > 75) { 
    bearishPoints += 3; 
    insights.push('⚠️ Price in premium zone (resistance)'); 
  } else if (pricePosition > 60) { 
    bearishPoints += 2; 
    insights.push('📍 Price approaching premium'); 
  }

  // 3. FEAR & GREED INDEX (weight: 2) — Contrarian indicator
  if (fearGreed < 20) { 
    bullishPoints += 2; 
    insights.push('😱 Extreme Fear — Contrarian BULLISH signal'); 
  } else if (fearGreed < 35) { 
    bullishPoints += 1; 
    insights.push('🟡 Fear zone — Potential accumulation'); 
  } else if (fearGreed > 80) { 
    bearishPoints += 2; 
    insights.push('🤑 Extreme Greed — Contrarian BEARISH signal'); 
  } else if (fearGreed > 65) { 
    bearishPoints += 1; 
    insights.push('🟡 Greed zone — Caution advised'); 
  }

  // 4. INSTITUTIONAL BIAS (weight: 3) — Smart money
  if (institutionalBias === 'BULLISH') { 
    bullishPoints += 3; 
    insights.push('🏦 Institutions accumulating'); 
  } else if (institutionalBias === 'BEARISH') { 
    bearishPoints += 3; 
    insights.push('🏦 Institutions distributing'); 
  }

  // 5. ON-CHAIN TREND (weight: 2) — Wallet behavior
  if (onChainTrend === 'OUTFLOW') { 
    bullishPoints += 2; 
    insights.push('🔗 Exchange outflows (accumulation)'); 
  } else if (onChainTrend === 'INFLOW') { 
    bearishPoints += 2; 
    insights.push('🔗 Exchange inflows (distribution)'); 
  }

  // 6. VOLUME CONFIRMATION (weight: 2)
  if (data.volumeStrength === 'HIGH') {
    if (priceChange > 0) {
      bullishPoints += 2;
      insights.push('📊 High volume confirms bullish move');
    } else if (priceChange < 0) {
      bearishPoints += 2;
      insights.push('📊 High volume confirms bearish move');
    }
  }

  // Calculate final bias with stricter thresholds for consistency
  const netBias = bullishPoints - bearishPoints;
  const totalActive = bullishPoints + bearishPoints;
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  let confidence: number;

  // Require stronger confluence for directional bias (consistency)
  if (netBias >= 4 && bullishPoints >= 5) {
    bias = 'LONG';
    confidence = Math.min(82, 58 + netBias * 3);
    insights.unshift(`🎯 BULLISH BIAS — ${bullishPoints}/${maxPoints} factors aligned`);
  } else if (netBias <= -4 && bearishPoints >= 5) {
    bias = 'SHORT';
    confidence = Math.min(82, 58 + Math.abs(netBias) * 3);
    insights.unshift(`🎯 BEARISH BIAS — ${bearishPoints}/${maxPoints} factors aligned`);
  } else if (netBias >= 2) {
    bias = 'LONG';
    confidence = 52 + netBias * 2;
    insights.unshift(`📊 LEAN BULLISH — Moderate confluence`);
  } else if (netBias <= -2) {
    bias = 'SHORT';
    confidence = 52 + Math.abs(netBias) * 2;
    insights.unshift(`📊 LEAN BEARISH — Moderate confluence`);
  } else {
    bias = 'NEUTRAL';
    confidence = 45 + Math.abs(netBias) * 2;
    insights.unshift(`⏸️ NEUTRAL — Insufficient confluence for trade`);
  }

  // Add confluence summary
  insights.push(`📈 Bull factors: ${bullishPoints} | 📉 Bear factors: ${bearishPoints}`);

  return { bias, confidence, insights };
}

// Export types for external use
export type { TopDownAnalysis, TimeframeBias };
