// ═══════════════════════════════════════════════════════════════════════════════
// 💼 INSTITUTIONAL VS RETAIL ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

import { InstitutionalVsRetail, ETFFlowData, OnChainMetrics, IfThenScenario } from './types';

export function analyzeInstitutionalVsRetail(data: {
  etfFlow: ETFFlowData;
  onChain: OnChainMetrics;
  socialSentiment: number;
  fearGreed: number;
  price: number;
  change: number;
}): InstitutionalVsRetail {
  const { etfFlow, onChain, socialSentiment, fearGreed, change } = data;

  // Institutional signals (ETF flows, whale activity, exchange outflows)
  let instBullSignals = 0;
  let instBearSignals = 0;

  if (etfFlow.btcNetFlow24h > 100) instBullSignals += 2;
  else if (etfFlow.btcNetFlow24h < -100) instBearSignals += 2;

  if (onChain.exchangeNetFlow.trend === 'OUTFLOW') instBullSignals += 1;
  else if (onChain.exchangeNetFlow.trend === 'INFLOW') instBearSignals += 1;

  if (onChain.whaleActivity.netFlow === 'NET BUYING') instBullSignals += 2;
  else if (onChain.whaleActivity.netFlow === 'NET SELLING') instBearSignals += 2;

  if (onChain.longTermHolders.accumulating) instBullSignals += 1;
  else instBearSignals += 1;

  // Retail signals (social sentiment, Fear & Greed)
  let retailBullSignals = 0;
  let retailBearSignals = 0;

  if (socialSentiment > 65) retailBullSignals += 2;
  else if (socialSentiment < 40) retailBearSignals += 2;

  if (fearGreed > 60) retailBullSignals += 1;
  else if (fearGreed < 40) retailBearSignals += 1;

  if (change > 3) retailBullSignals += 1;
  else if (change < -3) retailBearSignals += 1;

  const institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    instBullSignals > instBearSignals + 1 ? 'BULLISH' :
    instBearSignals > instBullSignals + 1 ? 'BEARISH' : 'NEUTRAL';

  const retailBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    retailBullSignals > retailBearSignals + 1 ? 'BULLISH' :
    retailBearSignals > retailBullSignals + 1 ? 'BEARISH' : 'NEUTRAL';

  const institutionalConfidence = Math.min(85, 50 + Math.abs(instBullSignals - instBearSignals) * 12);
  const retailConfidence = Math.min(75, 45 + Math.abs(retailBullSignals - retailBearSignals) * 10);

  const divergence = institutionalBias !== retailBias && institutionalBias !== 'NEUTRAL' && retailBias !== 'NEUTRAL';

  let divergenceNote = '';
  if (divergence) {
    if (institutionalBias === 'BULLISH' && retailBias === 'BEARISH') {
      divergenceNote = 'Smart money accumulating while retail panics — historically bullish';
    } else if (institutionalBias === 'BEARISH' && retailBias === 'BULLISH') {
      divergenceNote = 'Institutions distributing to retail FOMO — caution advised';
    }
  } else if (institutionalBias === retailBias && institutionalBias !== 'NEUTRAL') {
    divergenceNote = `Aligned ${institutionalBias.toLowerCase()} sentiment across all participants — strong conviction`;
  }

  return {
    institutionalBias,
    institutionalConfidence,
    retailBias,
    retailConfidence,
    divergence,
    divergenceNote
  };
}

export function generateIfThenScenarios(data: {
  price: number;
  high: number;
  low: number;
  bias: string;
  keySupport: number;
  keyResistance: number;
}): IfThenScenario[] {
  const { price, bias, keySupport, keyResistance } = data;
  const scenarios: IfThenScenario[] = [];

  if (bias === 'LONG' || bias === 'NEUTRAL') {
    scenarios.push({
      condition: `IF price closes below $${keySupport.toFixed(2)}`,
      priceLevel: keySupport,
      outcome: 'Bull case INVALIDATED — structure broken',
      probability: 25,
      action: 'EXIT longs, reassess for short entry on retest'
    });

    scenarios.push({
      condition: `IF price sustains above $${(keyResistance * 1.01).toFixed(2)}`,
      priceLevel: keyResistance * 1.01,
      outcome: 'Bull breakout CONFIRMED — new support established',
      probability: 40,
      action: 'ADD to longs on successful retest of broken resistance'
    });
  }

  if (bias === 'SHORT' || bias === 'NEUTRAL') {
    scenarios.push({
      condition: `IF price closes above $${keyResistance.toFixed(2)}`,
      priceLevel: keyResistance,
      outcome: 'Bear case INVALIDATED — reclaim of structure',
      probability: 25,
      action: 'EXIT shorts, reassess for long entry on confirmation'
    });

    scenarios.push({
      condition: `IF price breaks below $${(keySupport * 0.99).toFixed(2)}`,
      priceLevel: keySupport * 0.99,
      outcome: 'Bear breakdown CONFIRMED — accelerated selling expected',
      probability: 35,
      action: 'ADD to shorts on failed bounce attempt'
    });
  }

  scenarios.push({
    condition: `IF price stays between $${keySupport.toFixed(2)} - $${keyResistance.toFixed(2)}`,
    priceLevel: price,
    outcome: 'CONSOLIDATION continues — wait for resolution',
    probability: 35,
    action: 'Trade range extremes only, wait for breakout with volume'
  });

  return scenarios;
}
