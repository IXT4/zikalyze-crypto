// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TECHNICAL ANALYSIS ENGINE — Pattern Recognition & Bias Calculation
// ═══════════════════════════════════════════════════════════════════════════════

import { MarketStructure, PrecisionEntry } from './types';

// Analyze market structure from price data
export function analyzeMarketStructure(
  price: number,
  high24h: number,
  low24h: number,
  change: number
): MarketStructure {
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;
  
  const isStrongBullish = change > 5;
  const isStrongBearish = change < -5;
  const isBullish = change > 2;
  const isBearish = change < -2;

  // Determine trend
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  let strength: number;

  if (isStrongBullish) {
    trend = 'BULLISH';
    strength = 75 + Math.min(20, Math.abs(change) * 2);
  } else if (isStrongBearish) {
    trend = 'BEARISH';
    strength = 75 + Math.min(20, Math.abs(change) * 2);
  } else if (isBullish) {
    trend = 'BULLISH';
    strength = 55 + Math.abs(change) * 5;
  } else if (isBearish) {
    trend = 'BEARISH';
    strength = 55 + Math.abs(change) * 5;
  } else {
    trend = 'RANGING';
    strength = 40 + Math.random() * 20;
  }

  // Infer structure from price position and change
  const higherHighs = pricePosition > 70 && change > 0;
  const higherLows = pricePosition > 30 && change > -1;
  const lowerHighs = pricePosition < 70 && change < 1;
  const lowerLows = pricePosition < 30 && change < 0;

  // Determine BOS/CHoCH
  let lastBOS: 'BULLISH' | 'BEARISH' | null = null;
  let lastCHoCH: 'BULLISH' | 'BEARISH' | null = null;

  if (isStrongBullish && pricePosition > 80) {
    lastBOS = 'BULLISH';
  } else if (isStrongBearish && pricePosition < 20) {
    lastBOS = 'BEARISH';
  }

  // CHoCH detection (trend reversal signal)
  if (change > 3 && pricePosition < 40) {
    lastCHoCH = 'BULLISH'; // Price was low but reversing up
  } else if (change < -3 && pricePosition > 60) {
    lastCHoCH = 'BEARISH'; // Price was high but reversing down
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

// Generate precision entry signals
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
  
  const nearSupport = pricePosition < 25;
  const nearResistance = pricePosition > 75;
  const midRange = pricePosition >= 40 && pricePosition <= 60;

  const support = low24h + range * 0.1;
  const resistance = high24h - range * 0.1;

  let timing: PrecisionEntry['timing'] = 'AVOID';
  let zone = '';
  let trigger = '';
  let confirmation = '';
  let invalidation = '';
  let structureStatus = 'Analyzing...';
  let movementPhase = 'Unknown';

  if (bias === 'LONG') {
    if (nearSupport && change > -2) {
      timing = 'NOW';
      zone = `Support zone ($${support.toFixed(2)})`;
      trigger = 'BUY — Price at support with potential reversal';
      confirmation = 'Bullish candle close + volume increase';
      invalidation = `Close below $${(support * 0.995).toFixed(2)}`;
      structureStatus = 'Testing support';
      movementPhase = 'Potential reversal';
    } else if (midRange && change > 1) {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${support.toFixed(2)} - $${(support + range * 0.3).toFixed(2)}`;
      trigger = 'WAIT — Look for pullback to support';
      confirmation = 'Higher low formation + bullish engulfing';
      invalidation = `Break below $${support.toFixed(2)}`;
      structureStatus = 'Trending up';
      movementPhase = 'Impulse move';
    } else if (nearResistance) {
      timing = 'WAIT_BREAKOUT';
      zone = `Above $${resistance.toFixed(2)}`;
      trigger = 'WAIT — For breakout confirmation above resistance';
      confirmation = 'Close above resistance + volume expansion';
      invalidation = `Rejection at $${resistance.toFixed(2)}`;
      structureStatus = 'Testing resistance';
      movementPhase = 'Breakout attempt';
    } else {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${support.toFixed(2)}`;
      trigger = 'WAIT — Better entry at support';
      confirmation = 'Bullish reversal pattern';
      invalidation = `Break below $${support.toFixed(2)}`;
      structureStatus = 'Consolidating';
      movementPhase = 'Correction phase';
    }
  } else if (bias === 'SHORT') {
    if (nearResistance && change < 2) {
      timing = 'NOW';
      zone = `Resistance zone ($${resistance.toFixed(2)})`;
      trigger = 'SELL — Price at resistance with rejection';
      confirmation = 'Bearish candle close + volume spike';
      invalidation = `Close above $${(resistance * 1.005).toFixed(2)}`;
      structureStatus = 'Testing resistance';
      movementPhase = 'Potential reversal';
    } else if (midRange && change < -1) {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${(resistance - range * 0.3).toFixed(2)} - $${resistance.toFixed(2)}`;
      trigger = 'WAIT — Look for bounce to resistance';
      confirmation = 'Lower high formation + bearish engulfing';
      invalidation = `Break above $${resistance.toFixed(2)}`;
      structureStatus = 'Trending down';
      movementPhase = 'Impulse move';
    } else {
      timing = 'WAIT_PULLBACK';
      zone = `Target: $${resistance.toFixed(2)}`;
      trigger = 'WAIT — Better entry at resistance';
      confirmation = 'Bearish reversal pattern';
      invalidation = `Break above $${resistance.toFixed(2)}`;
      structureStatus = 'Consolidating';
      movementPhase = 'Correction phase';
    }
  } else {
    timing = 'AVOID';
    zone = `$${support.toFixed(2)} - $${resistance.toFixed(2)}`;
    trigger = 'NO TRADE — Wait for directional bias';
    confirmation = 'Clear breakout or breakdown';
    invalidation = 'N/A';
    structureStatus = 'Range-bound';
    movementPhase = 'Consolidation';
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

// Calculate final bias from multiple signals
export function calculateFinalBias(data: {
  priceChange: number;
  pricePosition: number; // 0-100 within 24h range
  volumeStrength: string;
  fearGreed: number;
  institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  onChainTrend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL';
}): { bias: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; insights: string[] } {
  const { priceChange, pricePosition, fearGreed, institutionalBias, onChainTrend } = data;
  const insights: string[] = [];

  let bullishPoints = 0;
  let bearishPoints = 0;

  // Price momentum (weight: 3)
  if (priceChange > 3) { bullishPoints += 3; insights.push('Strong bullish momentum'); }
  else if (priceChange > 1) { bullishPoints += 2; }
  else if (priceChange < -3) { bearishPoints += 3; insights.push('Strong bearish momentum'); }
  else if (priceChange < -1) { bearishPoints += 2; }

  // Price position (weight: 2)
  if (pricePosition < 30 && priceChange > -1) { bullishPoints += 2; insights.push('Price at discount zone'); }
  else if (pricePosition > 70 && priceChange < 1) { bearishPoints += 2; insights.push('Price at premium zone'); }

  // Fear & Greed contrarian (weight: 2)
  if (fearGreed < 25 && priceChange > -2) { 
    bullishPoints += 2; 
    insights.push('Extreme fear — contrarian bullish'); 
  } else if (fearGreed > 75 && priceChange < 2) { 
    bearishPoints += 2; 
    insights.push('Extreme greed — contrarian bearish'); 
  }

  // Institutional bias (weight: 2)
  if (institutionalBias === 'BULLISH') { bullishPoints += 2; insights.push('Institutional buying detected'); }
  else if (institutionalBias === 'BEARISH') { bearishPoints += 2; insights.push('Institutional selling detected'); }

  // On-chain (weight: 2)
  if (onChainTrend === 'OUTFLOW') { bullishPoints += 2; insights.push('Exchange outflows — accumulation'); }
  else if (onChainTrend === 'INFLOW') { bearishPoints += 2; insights.push('Exchange inflows — distribution'); }

  // Determine bias
  const totalPoints = bullishPoints + bearishPoints;
  const netBias = bullishPoints - bearishPoints;

  let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  let confidence: number;

  if (netBias >= 3) {
    bias = 'LONG';
    confidence = Math.min(78, 55 + netBias * 4);
  } else if (netBias <= -3) {
    bias = 'SHORT';
    confidence = Math.min(78, 55 + Math.abs(netBias) * 4);
  } else {
    bias = 'NEUTRAL';
    confidence = 50 + Math.abs(netBias) * 3;
  }

  return { bias, confidence, insights };
}
