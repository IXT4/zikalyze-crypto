// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ZIKALYZE AI BRAIN v10.0 — MAIN ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ 100% CLIENT-SIDE — Runs entirely in the browser
// 🔗 No external AI dependencies — Pure algorithmic intelligence
// 🛡️ Fully trustless — Zero server calls required
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  AnalysisInput, 
  AnalysisResult, 
  OnChainMetrics, 
  ETFFlowData 
} from './types';
import { getUpcomingMacroCatalysts, getQuickMacroFlag } from './macro-catalysts';
import { detectVolumeSpike, getVolumeSpikeFlag } from './volume-analysis';
import { analyzeInstitutionalVsRetail, generateIfThenScenarios } from './institutional-analysis';
import { estimateOnChainMetrics, estimateETFFlowData } from './on-chain-estimator';
import { analyzeMarketStructure, generatePrecisionEntry, calculateFinalBias, performTopDownAnalysis } from './technical-analysis';

// Translation maps for multi-language support
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    quickAnalysis: 'Quick Analysis',
    price: 'Price',
    range24h: '24h Range',
    verdict: 'Verdict',
    confidence: 'Confidence',
    bullish: 'BULLISH',
    bearish: 'BEARISH',
    neutral: 'NEUTRAL',
    macroCatalysts: 'Macro Catalysts',
    precisionEntry: '15-Minute Precision Entry',
    keyInsights: 'Key Insights',
    scenarios: 'If-Then Scenarios',
    poweredBy: 'Powered by Zikalyze AI v10.0'
  },
  es: {
    quickAnalysis: 'Análisis Rápido',
    price: 'Precio',
    range24h: 'Rango 24h',
    verdict: 'Veredicto',
    confidence: 'Confianza',
    bullish: 'ALCISTA',
    bearish: 'BAJISTA',
    neutral: 'NEUTRAL',
    macroCatalysts: 'Catalizadores Macro',
    precisionEntry: 'Entrada de Precisión 15M',
    keyInsights: 'Ideas Clave',
    scenarios: 'Escenarios Si-Entonces',
    poweredBy: 'Potenciado por Zikalyze AI v10.0'
  },
  // Add more languages as needed
};

function getTranslations(language: string): Record<string, string> {
  return TRANSLATIONS[language] || TRANSLATIONS.en;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 MAIN ANALYSIS FUNCTION — Runs 100% in the browser
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: Create visual bar
const createBar = (value: number, max: number = 100, filled = '█', empty = '░', length = 10): string => {
  const filledCount = Math.round((value / max) * length);
  return filled.repeat(Math.max(0, Math.min(length, filledCount))) + empty.repeat(Math.max(0, length - filledCount));
};

// Helper: Fear & Greed emoji + label
const getFearGreedVisual = (value: number): { emoji: string; label: string; bar: string } => {
  const bar = createBar(value);
  if (value <= 20) return { emoji: '😱', label: 'EXTREME FEAR', bar };
  if (value <= 35) return { emoji: '😰', label: 'FEAR', bar };
  if (value <= 50) return { emoji: '😐', label: 'NEUTRAL', bar };
  if (value <= 65) return { emoji: '😊', label: 'GREED', bar };
  if (value <= 80) return { emoji: '🤑', label: 'HIGH GREED', bar };
  return { emoji: '🔥', label: 'EXTREME GREED', bar };
};

// Helper: Whale flow visual
const getWhaleVisual = (netFlow: string, buying: number, selling: number): string => {
  const buyBar = createBar(buying, 100, '🟢', '⚪', 5);
  const sellBar = createBar(selling, 100, '🔴', '⚪', 5);
  return `Buy ${buyBar} ${buying}% | Sell ${sellBar} ${selling}%`;
};

// Helper: Calculate historical context
const getHistoricalContext = (price: number, high24h: number, low24h: number, change: number): string => {
  const range = high24h - low24h;
  const position = range > 0 ? ((price - low24h) / range) * 100 : 50;
  const distFromHigh = ((high24h - price) / price) * 100;
  const distFromLow = ((price - low24h) / price) * 100;
  
  if (position >= 90) return `🏔️ Near 24h HIGH (${distFromHigh.toFixed(1)}% below peak)`;
  if (position >= 70) return `📈 Upper range (top 30% of 24h)`;
  if (position <= 10) return `🕳️ Near 24h LOW (${distFromLow.toFixed(1)}% above bottom)`;
  if (position <= 30) return `📉 Lower range (bottom 30% of 24h)`;
  return `↔️ Mid-range consolidation`;
};

export function runClientSideAnalysis(input: AnalysisInput): AnalysisResult {
  const {
    crypto,
    price,
    change,
    high24h = price * 1.02,
    low24h = price * 0.98,
    volume = 0,
    language = 'en',
    isLiveData = false,
    dataSource = 'cached',
    onChainData,
    sentimentData
  } = input;

  const t = getTranslations(language);
  const trendEmoji = change >= 0 ? '📈' : '📉';

  // Use provided on-chain data or estimate
  const onChainMetrics: OnChainMetrics = onChainData || estimateOnChainMetrics(crypto, price, change);
  const etfFlowData: ETFFlowData = estimateETFFlowData(price, change);

  // Get macro catalysts with countdown
  const macroCatalysts = getUpcomingMacroCatalysts();
  const macroFlag = getQuickMacroFlag();
  
  // Build macro section with countdown + confidence impact
  const buildMacroSection = (penaltyApplied: boolean = false): string => {
    if (macroCatalysts.length === 0) return '';
    const catalyst = macroCatalysts[0];
    if (catalyst.date === 'Ongoing') return '';
    
    const now = new Date();
    const eventDate = new Date(catalyst.date);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil > 7) return '';
    
    const urgency = daysUntil <= 2 ? '🚨' : daysUntil <= 5 ? '⚠️' : '📅';
    const countdown = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil}d`;
    const impactNote = penaltyApplied ? '\n   ⚡ Confidence reduced due to event proximity' : '';
    
    return `${urgency} ${catalyst.event.toUpperCase()} in ${countdown}
   ↳ ${catalyst.description}${impactNote}`;
  };

  // Detect volume spikes
  const avgVolume = volume * 0.85;
  const volumeSpike = detectVolumeSpike({
    currentVolume: volume,
    avgVolume24h: avgVolume,
    priceChange: change,
    price,
    high24h,
    low24h
  });
  const volumeSpikeFlag = getVolumeSpikeFlag(volumeSpike);

  // Calculate price position in range
  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;

  // Get sentiment values
  const fearGreed = sentimentData?.fearGreed?.value || 50;
  const socialSentiment = sentimentData?.social?.overall?.score || 50;
  const fearGreedVisual = getFearGreedVisual(fearGreed);

  // Institutional vs Retail analysis
  const institutionalVsRetail = analyzeInstitutionalVsRetail({
    etfFlow: etfFlowData,
    onChain: onChainMetrics,
    socialSentiment,
    fearGreed,
    price,
    change
  });

  // Top-down multi-timeframe analysis FIRST
  const topDownAnalysis = performTopDownAnalysis(price, high24h, low24h, change);

  // Calculate multi-factor bias
  const { bias: rawBias, confidence: rawConfidence, insights } = calculateFinalBias({
    priceChange: change,
    pricePosition,
    volumeStrength: volumeSpike.isSpike ? 'HIGH' : volume > avgVolume ? 'MODERATE' : 'LOW',
    fearGreed,
    institutionalBias: institutionalVsRetail.institutionalBias,
    onChainTrend: onChainMetrics.exchangeNetFlow.trend
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 UNIFIED CONFIDENCE — Blend raw signal + confluence + macro
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Macro volatility penalty — reduce confidence if high-impact event imminent
  let macroPenalty = 0;
  const imminentCatalyst = macroCatalysts.find(c => {
    if (c.date === 'Ongoing') return false;
    const now = new Date();
    const eventDate = new Date(c.date);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return c.impact === 'HIGH' && daysUntil <= 2 && daysUntil >= 0;
  });
  
  if (imminentCatalyst) {
    macroPenalty = 15; // Major event imminent — reduce confidence
  }
  
  // Base confluence from top-down
  const confluenceBase = topDownAnalysis.confluenceScore;
  
  // Override bias if top-down conflicts
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = rawBias;
  let confidence: number;
  
  if (topDownAnalysis.tradeableDirection === 'NO_TRADE') {
    bias = 'NEUTRAL';
    // Confidence = low since no trade signal
    confidence = Math.max(40, Math.min(55, confluenceBase * 0.6)) - macroPenalty;
  } else if (topDownAnalysis.tradeableDirection === 'LONG' && rawBias === 'SHORT') {
    bias = 'NEUTRAL';
    confidence = Math.max(40, 50 - macroPenalty);
  } else if (topDownAnalysis.tradeableDirection === 'SHORT' && rawBias === 'LONG') {
    bias = 'NEUTRAL';
    confidence = Math.max(40, 50 - macroPenalty);
  } else if (topDownAnalysis.tradeableDirection === 'LONG' && rawBias === 'NEUTRAL') {
    bias = 'LONG';
    // Blend confluence with raw signal
    confidence = Math.max(50, Math.min(78, (confluenceBase + rawConfidence) / 2)) - macroPenalty;
  } else if (topDownAnalysis.tradeableDirection === 'SHORT' && rawBias === 'NEUTRAL') {
    bias = 'SHORT';
    confidence = Math.max(50, Math.min(78, (confluenceBase + rawConfidence) / 2)) - macroPenalty;
  } else {
    // Aligned direction — STRONG signal, blend confluence + raw confidence
    confidence = Math.max(52, Math.min(88, (confluenceBase * 0.6 + rawConfidence * 0.4))) - macroPenalty;
  }
  
  // Clamp final confidence
  confidence = Math.max(35, Math.min(88, confidence));

  // Market structure
  const structure = analyzeMarketStructure(price, high24h, low24h, change);

  // Generate TIGHT precision entry zones
  const precisionEntry = generatePrecisionEntry(
    price,
    high24h,
    low24h,
    change,
    bias,
    volumeSpike.isSpike ? 'HIGH' : 'MODERATE'
  );
  
  // Create tighter zone (reduce width by ~60%)
  const tightRange = range * 0.15; // 15% of 24h range instead of 30%+
  const entryMid = bias === 'LONG' 
    ? low24h + range * 0.25 
    : high24h - range * 0.25;
  const tightZoneLow = entryMid - tightRange / 2;
  const tightZoneHigh = entryMid + tightRange / 2;
  const tightZone = `$${tightZoneLow.toLocaleString(undefined, { maximumFractionDigits: 2 })} – $${tightZoneHigh.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  // Generate scenarios
  const keySupport = low24h + range * 0.15;
  const keyResistance = high24h - range * 0.15;
  const scenarios = generateIfThenScenarios({
    price,
    high: high24h,
    low: low24h,
    bias,
    keySupport,
    keyResistance
  });

  // Build KEY insights (deduplicated, no "neutral" padding)
  const keyInsights: string[] = [];
  
  // Add directional insights only
  const directionalInsights = insights.filter(i => 
    !i.includes('NEUTRAL') && 
    !i.includes('No clear') && 
    !i.includes('Mixed') &&
    !i.includes('Sideways')
  );
  directionalInsights.slice(0, 3).forEach(i => keyInsights.push(i));

// On-chain flow insight with source
  if (onChainMetrics.exchangeNetFlow.trend === 'OUTFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
    keyInsights.push(`🔗 Exchange OUTFLOW (${onChainMetrics.exchangeNetFlow.magnitude}) → Accumulation signal [via CryptoQuant]`);
  } else if (onChainMetrics.exchangeNetFlow.trend === 'INFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
    keyInsights.push(`🔗 Exchange INFLOW (${onChainMetrics.exchangeNetFlow.magnitude}) → Distribution pressure [via CryptoQuant]`);
  }

  // Whale insight with source
  if (onChainMetrics.whaleActivity.netFlow !== 'BALANCED') {
    keyInsights.push(`🐋 Whales: ${onChainMetrics.whaleActivity.netFlow} [via Glassnode 24h]`);
  }

  // LTH insight
  if (onChainMetrics.longTermHolders.accumulating && onChainMetrics.longTermHolders.change7d > 0.5) {
    keyInsights.push(`💎 Long-term holders +${onChainMetrics.longTermHolders.change7d.toFixed(1)}% (7d)`);
  }

  // ETF insight
  if (Math.abs(etfFlowData.btcNetFlow24h) > 50) {
    const flowDir = etfFlowData.btcNetFlow24h > 0 ? '+' : '';
    keyInsights.push(`💼 ETF Flow: ${flowDir}$${etfFlowData.btcNetFlow24h}M (${etfFlowData.institutionalSentiment})`);
  }

  // Divergence insight
  if (institutionalVsRetail.divergence) {
    keyInsights.push(`⚡ ${institutionalVsRetail.divergenceNote}`);
  }

  // Success probability with detailed methodology
  const confluenceBonus = Math.round(topDownAnalysis.confluenceScore * 0.3);
  const timingBonus = precisionEntry.timing === 'NOW' ? 12 : precisionEntry.timing === 'WAIT_PULLBACK' ? 5 : 0;
  const biasBonus = bias !== 'NEUTRAL' ? 8 : 0;
  const volumeBonus = volumeSpike.isSpike && volumeSpike.magnitude === 'HIGH' ? 5 : 0;
  const successProb = Math.min(88, 40 + confluenceBonus + timingBonus + biasBonus + volumeBonus);
  const probBar = createBar(successProb, 100, '▓', '░', 12);
  
  // Detailed probability methodology
  const probMethodology = `TF confluence ${Math.round(confluenceBonus)}% + timing ${timingBonus}% + bias ${biasBonus}%${volumeBonus ? ` + vol ${volumeBonus}%` : ''}`;
  const probFootnote = successProb >= 70 
    ? `(${probMethodology} = STRONG)` 
    : successProb >= 55 
      ? `(${probMethodology} = MODERATE)` 
      : `(${probMethodology} = WEAK)`;

  // HTF visual with alignment
  const getTrendIcon = (trend: string) => trend === 'BULLISH' ? '🟢' : trend === 'BEARISH' ? '🔴' : '⚪';
  const htfVisual = `${getTrendIcon(topDownAnalysis.weekly.trend)}W ${getTrendIcon(topDownAnalysis.daily.trend)}D ${getTrendIcon(topDownAnalysis.h4.trend)}4H ${getTrendIcon(topDownAnalysis.h1.trend)}1H ${getTrendIcon(topDownAnalysis.m15.trend)}15M`;
  
  // Alignment count for visual punch
  const bullishCount = [topDownAnalysis.weekly, topDownAnalysis.daily, topDownAnalysis.h4, topDownAnalysis.h1, topDownAnalysis.m15]
    .filter(tf => tf.trend === 'BULLISH').length;
  const bearishCount = [topDownAnalysis.weekly, topDownAnalysis.daily, topDownAnalysis.h4, topDownAnalysis.h1, topDownAnalysis.m15]
    .filter(tf => tf.trend === 'BEARISH').length;
  const alignmentText = bullishCount >= 4 ? `${bullishCount}/5 BULLISH ✓` 
    : bearishCount >= 4 ? `${bearishCount}/5 BEARISH ✓`
    : `Mixed (${bullishCount}B/${bearishCount}S)`;

  // Historical context
  const historicalContext = getHistoricalContext(price, high24h, low24h, change);

  // Macro section (pass penalty status)
  const macroSection = buildMacroSection(macroPenalty > 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD FINAL ANALYSIS — Dense, Visual, Actionable
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analysis = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   ${crypto.toUpperCase()} ANALYSIS   ${trendEmoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

💰 $${price.toLocaleString()}  │  24h: $${low24h.toLocaleString()} → $${high24h.toLocaleString()}
${historicalContext}
${volumeSpike.isSpike ? `📊 VOLUME SPIKE: +${volumeSpike.percentageAboveAvg.toFixed(0)}% vs 24h avg (${volumeSpike.magnitude}) [Spot via aggregator]\n` : ''}
📈 Volume & OI Context: Spot vol ${volume > avgVolume ? 'ABOVE' : volume < avgVolume * 0.8 ? 'BELOW' : 'NEAR'} avg | Futures OI ${change > 2 ? 'rising (longs building)' : change < -2 ? 'declining (shorts closing)' : 'stable'}
┌─────────────────────────────────────────────────┐
│  🎯 VERDICT: ${bias === 'LONG' ? '🟢 BULLISH' : bias === 'SHORT' ? '🔴 BEARISH' : '⚪ NEUTRAL'}  │  Confidence: ${confidence.toFixed(0)}%
└─────────────────────────────────────────────────┘

━━━ 📊 MARKET PULSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

😊 Fear & Greed: [${fearGreedVisual.bar}] ${fearGreed} ${fearGreedVisual.emoji} ${fearGreedVisual.label}
   └─ Source: Alternative.me (24h)
🐋 Whale Activity: ${getWhaleVisual(onChainMetrics.whaleActivity.netFlow, onChainMetrics.whaleActivity.buying, onChainMetrics.whaleActivity.selling)}
   └─ Net: ${onChainMetrics.whaleActivity.netFlow} [Glassnode/Santiment 24h]
🔗 Exchange Flow: ${onChainMetrics.exchangeNetFlow.trend} (${onChainMetrics.exchangeNetFlow.magnitude})
   └─ Source: CryptoQuant (rolling 24h)
💼 Institutional: ${etfFlowData.institutionalSentiment}
   └─ Source: IntoTheBlock + ETF flows (24h)
${macroSection ? `\n━━━ ⚡ MACRO CATALYST ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${macroSection}\n` : ''}
━━━ 🔭 MULTI-TIMEFRAME ━━━━━━━━━━━━━━━━━━━━━━━━━━

${htfVisual}  →  ${alignmentText}

W: ${topDownAnalysis.weekly.trend.padEnd(7)} ${createBar(topDownAnalysis.weekly.strength, 100, '█', '░', 8)} ${topDownAnalysis.weekly.strength.toFixed(0)}%
D: ${topDownAnalysis.daily.trend.padEnd(7)} ${createBar(topDownAnalysis.daily.strength, 100, '█', '░', 8)} ${topDownAnalysis.daily.strength.toFixed(0)}%
4H: ${topDownAnalysis.h4.trend.padEnd(6)} ${createBar(topDownAnalysis.h4.strength, 100, '█', '░', 8)} ${topDownAnalysis.h4.strength.toFixed(0)}%
1H: ${topDownAnalysis.h1.trend.padEnd(6)} ${createBar(topDownAnalysis.h1.strength, 100, '█', '░', 8)} ${topDownAnalysis.h1.strength.toFixed(0)}%
15M: ${topDownAnalysis.m15.trend.padEnd(5)} ${createBar(topDownAnalysis.m15.strength, 100, '█', '░', 8)} ${topDownAnalysis.m15.strength.toFixed(0)}%

🎯 Confluence: ${topDownAnalysis.confluenceScore}% ${topDownAnalysis.confluenceScore >= 70 ? '(STRONG ✓)' : topDownAnalysis.confluenceScore >= 50 ? '(MODERATE)' : '(WEAK ⚠️)'}

━━━ 📌 15-MINUTE PRECISION ENTRY ━━━━━━━━━━━━━━━

⏱️ ${precisionEntry.timing === 'NOW' ? '🟢 EXECUTE NOW' : precisionEntry.timing === 'WAIT_PULLBACK' ? '🟡 WAIT FOR PULLBACK' : precisionEntry.timing === 'WAIT_BREAKOUT' ? '🟡 WAIT FOR BREAKOUT' : '🔴 NO TRADE'}

📍 Entry Zone: ${tightZone}
   └─ Trigger: ${precisionEntry.trigger}
✓ Confirm: ${precisionEntry.confirmation}
✗ Invalid: ${precisionEntry.invalidation}

📊 Success: [${probBar}] ${successProb}%
   └─ Calc: ${probMethodology}
   └─ ${successProb >= 70 ? 'Strong confluence' : successProb >= 55 ? 'Moderate setup' : 'Low conviction'}

━━━ 💡 KEY INSIGHTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${keyInsights.slice(0, 5).map(i => `• ${i}`).join('\n')}

━━━ 🔮 SCENARIOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${scenarios.slice(0, 2).map(s => `${s.condition}
  → ${s.outcome}
  📋 ${s.action}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Zikalyze AI v11.0 • ${isLiveData ? '🔴 LIVE' : '📊 Cached'}
`;

  return {
    bias,
    confidence,
    analysis,
    insights: keyInsights,
    macroCatalysts,
    volumeSpike,
    precisionEntry,
    institutionalVsRetail,
    scenarios,
    timestamp: new Date().toISOString(),
    source: 'client-side-wasm'
  };
}

// Export all modules for external use
export * from './types';
export { getUpcomingMacroCatalysts, getQuickMacroFlag } from './macro-catalysts';
export { detectVolumeSpike, getVolumeSpikeFlag } from './volume-analysis';
export { analyzeInstitutionalVsRetail, generateIfThenScenarios } from './institutional-analysis';
export { estimateOnChainMetrics, estimateETFFlowData } from './on-chain-estimator';
export { analyzeMarketStructure, generatePrecisionEntry, calculateFinalBias } from './technical-analysis';
