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

  // Calculate final bias
  const { bias, confidence, insights } = calculateFinalBias({
    priceChange: change,
    pricePosition,
    volumeStrength: volumeSpike.isSpike ? 'HIGH' : volume > avgVolume ? 'MODERATE' : 'LOW',
    fearGreed,
    institutionalBias: institutionalVsRetail.institutionalBias,
    onChainTrend: onChainMetrics.exchangeNetFlow.trend
  });

  // Top-down multi-timeframe analysis (NEW)
  const topDownAnalysis = performTopDownAnalysis(price, high24h, low24h, change);

  // Market structure analysis
  const structure = analyzeMarketStructure(price, high24h, low24h, change);

  // Generate precision entry
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

  // Build success probability bar (higher when HTF aligned)
  const htfBonus = topDownAnalysis.tradeableDirection !== 'NO_TRADE' ? 8 : 0;
  const successProb = Math.min(88, 50 + (confidence - 50) * 0.5 + (precisionEntry.timing === 'NOW' ? 10 : 0) + htfBonus);
  const filledBlocks = Math.round(successProb / 10);
  const probBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

  // Build HTF alignment status
  const htfStatus = `W:${topDownAnalysis.weekly.trend.charAt(0)} D:${topDownAnalysis.daily.trend.charAt(0)} 4H:${topDownAnalysis.h4.trend.charAt(0)} 1H:${topDownAnalysis.h1.trend.charAt(0)} 15M:${topDownAnalysis.m15.trend.charAt(0)}`;

  // Build final analysis text with TOP-DOWN section
  const analysis = `📊 ${crypto.toUpperCase()} ${t.quickAnalysis}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 ${t.price}: $${price.toLocaleString()} ${trendEmoji} ${Math.abs(change).toFixed(2)}%
📈 ${t.range24h}: $${low24h.toLocaleString()} - $${high24h.toLocaleString()}
${volumeSpike.isSpike ? `📊 Volume: ${volumeSpike.magnitude} SPIKE (+${volumeSpike.percentageAboveAvg.toFixed(0)}% vs avg)` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔭 TOP-DOWN ANALYSIS (HTF → LTF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 WEEKLY:  ${topDownAnalysis.weekly.trend} (${topDownAnalysis.weekly.strength.toFixed(0)}%)
📆 DAILY:   ${topDownAnalysis.daily.trend} (${topDownAnalysis.daily.strength.toFixed(0)}%)
⏰ 4H:      ${topDownAnalysis.h4.trend} (${topDownAnalysis.h4.strength.toFixed(0)}%)
🕐 1H:      ${topDownAnalysis.h1.trend} (${topDownAnalysis.h1.strength.toFixed(0)}%)
⏱️ 15M:     ${topDownAnalysis.m15.trend} (${topDownAnalysis.m15.strength.toFixed(0)}%)

📊 Confluence: ${topDownAnalysis.confluenceScore.toFixed(0)}% | Direction: ${topDownAnalysis.tradeableDirection}
${htfStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ${t.verdict}: ${bias === 'LONG' ? `🟢 ${t.bullish}` : bias === 'SHORT' ? `🔴 ${t.bearish}` : `⚪ ${t.neutral}`}
📊 ${t.confidence}: ${confidence}%

${macroFlag ? `\n${macroFlag}\n` : ''}
${volumeSpikeFlag ? `${volumeSpikeFlag}\n` : ''}

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
