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

  // Get macro catalysts
  const macroCatalysts = getUpcomingMacroCatalysts();
  const macroFlag = getQuickMacroFlag();

  // Detect volume spikes
  const avgVolume = volume * 0.85; // Estimate average
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

  // Institutional vs Retail analysis
  const institutionalVsRetail = analyzeInstitutionalVsRetail({
    etfFlow: etfFlowData,
    onChain: onChainMetrics,
    socialSentiment,
    fearGreed,
    price,
    change
  });

  // Top-down multi-timeframe analysis FIRST (determines tradeable direction)
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

  // CRITICAL: Final bias MUST align with top-down direction for consistency
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = rawBias;
  let confidence = rawConfidence;
  
  // Override bias if top-down analysis conflicts
  if (topDownAnalysis.tradeableDirection === 'NO_TRADE') {
    bias = 'NEUTRAL';
    confidence = Math.min(confidence, 55);
  } else if (topDownAnalysis.tradeableDirection === 'LONG' && rawBias === 'SHORT') {
    // HTF says long but factors say short — go neutral
    bias = 'NEUTRAL';
    confidence = 50;
  } else if (topDownAnalysis.tradeableDirection === 'SHORT' && rawBias === 'LONG') {
    // HTF says short but factors say long — go neutral  
    bias = 'NEUTRAL';
    confidence = 50;
  } else if (topDownAnalysis.tradeableDirection === 'LONG' && rawBias === 'NEUTRAL') {
    // HTF bullish, factors neutral — lean long
    bias = 'LONG';
    confidence = Math.max(55, rawConfidence);
  } else if (topDownAnalysis.tradeableDirection === 'SHORT' && rawBias === 'NEUTRAL') {
    // HTF bearish, factors neutral — lean short
    bias = 'SHORT';
    confidence = Math.max(55, rawConfidence);
  }

  // Market structure analysis
  const structure = analyzeMarketStructure(price, high24h, low24h, change);

  // Generate precision entry with ALIGNED bias
  const precisionEntry = generatePrecisionEntry(
    price,
    high24h,
    low24h,
    change,
    bias,
    volumeSpike.isSpike ? 'HIGH' : 'MODERATE'
  );

  // Generate if-then scenarios
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

  // Add additional insights with top-down context first
  const allInsights = [...insights];

  // Add top-down reasoning
  topDownAnalysis.reasoning.forEach(r => allInsights.push(r));

  if (volumeSpike.isSpike) {
    allInsights.unshift(`📊 ${volumeSpike.description}`);
  }

  if (onChainMetrics.exchangeNetFlow.trend === 'OUTFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
    allInsights.push(`🔗 Exchange outflows (${onChainMetrics.exchangeNetFlow.magnitude}) — bullish on-chain`);
  } else if (onChainMetrics.exchangeNetFlow.trend === 'INFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
    allInsights.push(`🔗 Exchange inflows (${onChainMetrics.exchangeNetFlow.magnitude}) — sell pressure`);
  }

  if (onChainMetrics.longTermHolders.accumulating) {
    allInsights.push(`💎 Long-term holders accumulating (+${onChainMetrics.longTermHolders.change7d.toFixed(1)}% 7d)`);
  }

  if (etfFlowData.btcNetFlow24h !== 0) {
    const flowDirection = etfFlowData.btcNetFlow24h > 0 ? '+' : '';
    allInsights.push(`💼 ETF flows: ${flowDirection}$${etfFlowData.btcNetFlow24h.toFixed(0)}M (24h) — ${etfFlowData.institutionalSentiment}`);
  }

  if (institutionalVsRetail.divergence) {
    allInsights.push(`⚡ ${institutionalVsRetail.divergenceNote}`);
  }

  // Build success probability based on confluence (deterministic)
  const confluenceBonus = Math.round(topDownAnalysis.confluenceScore * 0.3);
  const timingBonus = precisionEntry.timing === 'NOW' ? 12 : precisionEntry.timing === 'WAIT_PULLBACK' ? 5 : 0;
  const biasBonus = bias !== 'NEUTRAL' ? 8 : 0;
  const successProb = Math.min(90, 40 + confluenceBonus + timingBonus + biasBonus);
  const filledBlocks = Math.round(successProb / 10);
  const probBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

  // Build HTF alignment visual
  const getTrendIcon = (trend: string) => trend === 'BULLISH' ? '🟢' : trend === 'BEARISH' ? '🔴' : '⚪';
  const htfVisual = `${getTrendIcon(topDownAnalysis.weekly.trend)}W ${getTrendIcon(topDownAnalysis.daily.trend)}D ${getTrendIcon(topDownAnalysis.h4.trend)}4H ${getTrendIcon(topDownAnalysis.h1.trend)}1H ${getTrendIcon(topDownAnalysis.m15.trend)}15M`;

  // Build final analysis text
  const analysis = `📊 ${crypto.toUpperCase()} ${t.quickAnalysis}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 ${t.price}: $${price.toLocaleString()} ${trendEmoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
📈 ${t.range24h}: $${low24h.toLocaleString()} - $${high24h.toLocaleString()}
${volumeSpike.isSpike ? `📊 Volume: ${volumeSpike.magnitude} SPIKE (+${volumeSpike.percentageAboveAvg.toFixed(0)}% vs avg)\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔭 TOP-DOWN MULTI-TIMEFRAME ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${htfVisual}

📅 WEEKLY:  ${topDownAnalysis.weekly.trend.padEnd(8)} | Strength: ${topDownAnalysis.weekly.strength.toFixed(0)}%
📆 DAILY:   ${topDownAnalysis.daily.trend.padEnd(8)} | Strength: ${topDownAnalysis.daily.strength.toFixed(0)}%
⏰ 4H:      ${topDownAnalysis.h4.trend.padEnd(8)} | Strength: ${topDownAnalysis.h4.strength.toFixed(0)}%
🕐 1H:      ${topDownAnalysis.h1.trend.padEnd(8)} | Strength: ${topDownAnalysis.h1.strength.toFixed(0)}%
⏱️ 15M:     ${topDownAnalysis.m15.trend.padEnd(8)} | Strength: ${topDownAnalysis.m15.strength.toFixed(0)}%

🎯 CONFLUENCE: ${topDownAnalysis.confluenceScore}% ${topDownAnalysis.confluenceScore >= 70 ? '(STRONG)' : topDownAnalysis.confluenceScore >= 50 ? '(MODERATE)' : '(WEAK)'}
📍 DIRECTION: ${topDownAnalysis.tradeableDirection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ${t.verdict}: ${bias === 'LONG' ? `🟢 ${t.bullish}` : bias === 'SHORT' ? `🔴 ${t.bearish}` : `⚪ ${t.neutral}`}
📊 ${t.confidence}: ${confidence.toFixed(0)}%

${macroFlag ? `${macroFlag}\n` : ''}${volumeSpikeFlag ? `${volumeSpikeFlag}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ${t.precisionEntry}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ Timing: ${precisionEntry.timing === 'NOW' ? '🟢 EXECUTE NOW' : precisionEntry.timing === 'WAIT_PULLBACK' ? '🟡 WAIT FOR PULLBACK' : precisionEntry.timing === 'WAIT_BREAKOUT' ? '🟡 WAIT FOR BREAKOUT' : '🔴 AVOID'}

📍 Zone: ${precisionEntry.zone}
🎯 Trigger: ${precisionEntry.trigger}
✓ Confirmation: ${precisionEntry.confirmation}
✗ Invalidation: ${precisionEntry.invalidation}

📊 Success Probability: [${probBar}] ${successProb.toFixed(0)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${t.keyInsights}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${allInsights.map(i => `• ${i}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔮 ${t.scenarios}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${scenarios.slice(0, 3).map(s => `${s.condition}
   → ${s.outcome}
   📋 Action: ${s.action}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 ${t.poweredBy}
`;

  return {
    bias,
    confidence,
    analysis,
    insights: allInsights,
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
