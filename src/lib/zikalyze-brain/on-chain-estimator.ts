// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 ON-CHAIN METRICS ESTIMATOR v2.0 (Deterministic - No Random Values)
// ═══════════════════════════════════════════════════════════════════════════════
// All metrics are derived DETERMINISTICALLY from live price action
// NO random values — ensures consistent, reproducible analysis
// ═══════════════════════════════════════════════════════════════════════════════

import { OnChainMetrics, ETFFlowData } from './types';

// Deterministic hash function for consistent "randomness" based on inputs
function deterministicValue(seed: number, min: number, max: number): number {
  // Use sine wave to create deterministic variation from seed
  const normalized = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  return min + normalized * (max - min);
}

export function estimateOnChainMetrics(
  crypto: string,
  price: number,
  change: number
): OnChainMetrics {
  const symbol = crypto.toUpperCase();
  const isBTC = symbol === 'BTC';
  const isETH = symbol === 'ETH';
  
  // Seed for deterministic values (based on price and change)
  const seed = price * 0.001 + change * 10;
  
  // Clear thresholds for consistent categorization
  const isStrongBullish = change >= 5;
  const isBullish = change >= 2 && change < 5;
  const isStrongBearish = change <= -5;
  const isBearish = change <= -2 && change > -5;
  const isNeutral = change > -2 && change < 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCHANGE NET FLOW — Derived deterministically from price action
  // ═══════════════════════════════════════════════════════════════════════════
  let exchangeNetFlow: OnChainMetrics['exchangeNetFlow'];
  
  if (isStrongBullish) {
    // Strong rally = significant outflows (accumulation)
    const flowValue = -10000 - Math.abs(change) * 1000;
    exchangeNetFlow = { value: flowValue, trend: 'OUTFLOW', magnitude: 'SIGNIFICANT' };
  } else if (isBullish) {
    // Moderate rally = moderate outflows
    const flowValue = -4000 - Math.abs(change) * 800;
    exchangeNetFlow = { value: flowValue, trend: 'OUTFLOW', magnitude: 'MODERATE' };
  } else if (isStrongBearish) {
    // Strong dump = significant inflows (distribution)
    const flowValue = 8000 + Math.abs(change) * 800;
    exchangeNetFlow = { value: flowValue, trend: 'INFLOW', magnitude: 'SIGNIFICANT' };
  } else if (isBearish) {
    // Moderate dump = moderate inflows
    const flowValue = 3000 + Math.abs(change) * 500;
    exchangeNetFlow = { value: flowValue, trend: 'INFLOW', magnitude: 'MODERATE' };
  } else {
    // Neutral = balanced, low activity
    exchangeNetFlow = { value: change * 500, trend: 'NEUTRAL', magnitude: 'LOW' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHALE ACTIVITY — Consistent with price direction
  // ═══════════════════════════════════════════════════════════════════════════
  let whaleNetFlow: string;
  let whaleBuying: number;
  let whaleSelling: number;

  if (isStrongBullish) {
    whaleNetFlow = 'NET BUYING';
    whaleBuying = 72 + Math.abs(change);
    whaleSelling = 28 - Math.abs(change) * 0.5;
  } else if (isBullish) {
    whaleNetFlow = 'ACCUMULATING';
    whaleBuying = 58 + change * 2;
    whaleSelling = 35;
  } else if (isStrongBearish) {
    whaleNetFlow = 'NET SELLING';
    whaleBuying = 28 + Math.abs(change) * 0.3;
    whaleSelling = 65 + Math.abs(change);
  } else if (isBearish) {
    whaleNetFlow = 'DISTRIBUTING';
    whaleBuying = 38;
    whaleSelling = 55 + Math.abs(change);
  } else {
    whaleNetFlow = 'BALANCED';
    whaleBuying = 48 + change;
    whaleSelling = 48 - change;
  }

  // Clamp values to valid range
  whaleBuying = Math.max(15, Math.min(85, whaleBuying));
  whaleSelling = Math.max(15, Math.min(85, whaleSelling));

  const whaleActivity = {
    buying: Math.round(whaleBuying),
    selling: Math.round(whaleSelling),
    netFlow: whaleNetFlow
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LONG-TERM HOLDERS — Accumulation correlates with price strength
  // ═══════════════════════════════════════════════════════════════════════════
  const lthAccumulating = change > -3; // LTH accumulate unless severe dump
  const lthChange7d = change > 0 
    ? 0.5 + change * 0.3 // Positive change = accumulating
    : change * 0.2;       // Negative change = slight distribution
  
  const longTermHolders = {
    accumulating: lthAccumulating,
    change7d: Math.round(lthChange7d * 10) / 10,
    sentiment: lthAccumulating ? 'ACCUMULATING' : isStrongBearish ? 'DISTRIBUTING' : 'HOLDING'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHORT-TERM HOLDERS — React to momentum
  // ═══════════════════════════════════════════════════════════════════════════
  let sthBehavior: string;
  let sthProfitLoss: number;

  if (isStrongBullish) {
    sthBehavior = 'FOMO BUYING';
    sthProfitLoss = 15 + change * 1.5;
  } else if (isBullish) {
    sthBehavior = 'TAKING PROFITS';
    sthProfitLoss = 8 + change * 2;
  } else if (isStrongBearish) {
    sthBehavior = 'PANIC SELLING';
    sthProfitLoss = change * 1.5 - 5;
  } else if (isBearish) {
    sthBehavior = 'NERVOUS HOLDING';
    sthProfitLoss = change * 2;
  } else {
    sthBehavior = 'NEUTRAL';
    sthProfitLoss = change;
  }

  const shortTermHolders = {
    behavior: sthBehavior,
    profitLoss: Math.round(sthProfitLoss * 10) / 10
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE ADDRESSES — Correlates with volatility and interest
  // ═══════════════════════════════════════════════════════════════════════════
  const baseAddresses = isBTC ? 1000000 : isETH ? 500000 : 50000;
  const volatility = Math.abs(change);
  const addressChange = change > 0 
    ? 2 + volatility * 0.8  // Bullish = increasing activity
    : -1 - volatility * 0.4; // Bearish = decreasing activity
  
  const activeAddresses = {
    current: Math.round(baseAddresses * (1 + volatility * 0.01)),
    change24h: Math.round(addressChange * 10) / 10,
    trend: addressChange > 3 ? 'INCREASING' as const : 
           addressChange < -3 ? 'DECREASING' as const : 'STABLE' as const
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTION VOLUME — Follows price momentum
  // ═══════════════════════════════════════════════════════════════════════════
  const baseTxVolume = baseAddresses * 5;
  const volumeMultiplier = 1 + Math.abs(change) * 0.05;
  
  const transactionVolume = {
    value: Math.round(baseTxVolume * volumeMultiplier),
    change24h: Math.round(change * 0.8 * 10) / 10
  };

  return {
    exchangeNetFlow,
    whaleActivity,
    longTermHolders,
    shortTermHolders,
    activeAddresses,
    transactionVolume,
    source: 'derived-deterministic'
  };
}

export function estimateETFFlowData(price: number, change: number): ETFFlowData {
  // ═══════════════════════════════════════════════════════════════════════════
  // ETF FLOW ESTIMATION — Deterministic based on price action
  // ═══════════════════════════════════════════════════════════════════════════
  const momentum = Math.abs(change);
  
  // Flow direction matches price direction
  let btcFlow24h: number;
  let institutionalSentiment: string;
  
  if (change >= 5) {
    btcFlow24h = 200 + momentum * 40;
    institutionalSentiment = 'STRONGLY BULLISH';
  } else if (change >= 2) {
    btcFlow24h = 80 + momentum * 30;
    institutionalSentiment = 'BULLISH';
  } else if (change <= -5) {
    btcFlow24h = -150 - momentum * 30;
    institutionalSentiment = 'BEARISH';
  } else if (change <= -2) {
    btcFlow24h = -50 - momentum * 20;
    institutionalSentiment = 'CAUTIOUS';
  } else {
    btcFlow24h = change * 25;
    institutionalSentiment = change > 0 ? 'CAUTIOUSLY BULLISH' : 'NEUTRAL';
  }

  // Round for cleaner display
  btcFlow24h = Math.round(btcFlow24h);
  const btcFlow7d = Math.round(btcFlow24h * 4.5);
  const ethFlow24h = Math.round(btcFlow24h * 0.3);
  const ethFlow7d = Math.round(ethFlow24h * 4);

  // Determine trend
  let trend: ETFFlowData['trend'];
  if (btcFlow24h > 100) trend = 'ACCUMULATING';
  else if (btcFlow24h < -100) trend = 'DISTRIBUTING';
  else trend = 'NEUTRAL';

  // Top buyers/sellers based on direction (real ETF names)
  const topBuyers = btcFlow24h > 50 
    ? ['BlackRock iShares', 'Fidelity Wise Origin'] 
    : btcFlow24h > 0 
      ? ['Fidelity'] 
      : [];
  
  const topSellers = btcFlow24h < -50 
    ? ['Grayscale GBTC', 'ARK 21Shares'] 
    : btcFlow24h < 0 
      ? ['Grayscale GBTC'] 
      : [];

  return {
    btcNetFlow24h: btcFlow24h,
    btcNetFlow7d: btcFlow7d,
    ethNetFlow24h: ethFlow24h,
    ethNetFlow7d: ethFlow7d,
    trend,
    topBuyers,
    topSellers,
    institutionalSentiment,
    source: 'derived-deterministic'
  };
}
