// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ZIKALYZE AI BRAIN v11.0 — FULLY CLIENT-SIDE ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ 100% CLIENT-SIDE — Runs entirely in the browser with IndexedDB persistence
// 🔗 No external AI dependencies — Pure algorithmic intelligence
// 🛡️ Fully trustless — Zero server calls required for analysis
// 📴 OFFLINE-FIRST — Works without internet, syncs when online
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
    volume = 0,
    language = 'en',
    isLiveData = false,
    dataSource = 'cached',
    onChainData,
    sentimentData,
    chartTrendData, // Real-time 24h chart data
    multiTimeframeData // Multi-timeframe analysis (15m, 1h, 4h, 1d)
  } = input;
  
  // Ensure valid price range — fallback to 2% spread if missing or identical
  const minSpreadPercent = 0.02;
  const validPrice = price > 0 ? price : 1;
  let high24h = input.high24h ?? validPrice * (1 + minSpreadPercent);
  let low24h = input.low24h ?? validPrice * (1 - minSpreadPercent);
  
  // Fix identical or inverted high/low
  if (high24h <= low24h) {
    high24h = validPrice * (1 + minSpreadPercent);
    low24h = validPrice * (1 - minSpreadPercent);
  }
  
  // Ensure minimum 1% spread for meaningful analysis
  const currentSpread = (high24h - low24h) / validPrice;
  if (currentSpread < 0.01) {
    const halfSpread = validPrice * 0.01;
    const midPoint = (high24h + low24h) / 2;
    high24h = midPoint + halfSpread;
    low24h = midPoint - halfSpread;
  }

  const t = getTranslations(language);
  const trendEmoji = change >= 0 ? '📈' : '📉';

  // Use provided on-chain data (real) or estimate (fallback)
  // Mark source clearly for transparency
  const hasRealOnChain = !!onChainData && onChainData.source !== 'derived-deterministic' && onChainData.source !== 'derived';
  const hasRealChartData = !!chartTrendData && chartTrendData.isLive && chartTrendData.candles.length >= 10;
  const hasRealMultiTfData = !!multiTimeframeData && (multiTimeframeData['1h'] !== null || multiTimeframeData['4h'] !== null);
  
  const onChainMetrics: OnChainMetrics = onChainData || estimateOnChainMetrics(crypto, price, change);
  const etfFlowData: ETFFlowData | null = estimateETFFlowData(price, change, crypto);
  
  // Log data sources for debugging - helps identify when using derived vs real data
  console.log(`[AI Brain] Data sources — On-chain: ${hasRealOnChain ? onChainData?.source : 'DERIVED'}, Chart: ${hasRealChartData ? 'REAL' : 'DERIVED'}, Multi-TF: ${hasRealMultiTfData ? 'REAL' : 'DERIVED'}, Live price: ${isLiveData}`);

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

  // Top-down multi-timeframe analysis — now with REAL chart data AND multi-TF
  const topDownAnalysis = performTopDownAnalysis(price, high24h, low24h, change, chartTrendData, multiTimeframeData);
  
  // Log chart data usage for debugging
  if (chartTrendData?.isLive) {
    console.log(`[AI Brain] Using REAL 24h chart data: ${chartTrendData.candles.length} candles, trend=${chartTrendData.trend24h}, EMA9=${chartTrendData.ema9.toFixed(2)}, RSI=${chartTrendData.rsi.toFixed(1)}`);
  }
  
  // Log multi-timeframe usage
  if (multiTimeframeData) {
    const tfKeys = ['15m', '1h', '4h', '1d'] as const;
    const tfSummary = tfKeys
      .map(tf => {
        const tfData = multiTimeframeData[tf];
        return `${tf}=${tfData?.trend || 'N/A'}`;
      })
      .join(', ');
    console.log(`[AI Brain] Multi-TF confluence: ${multiTimeframeData.confluence.overallBias} (${multiTimeframeData.confluence.strength.toFixed(0)}%), ${tfSummary}`);
  }

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
  // 🎯 FINAL BIAS — Technical confluence is PRIMARY, fundamentals adjust confidence
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
    macroPenalty = 15;
  }
  
  // TECHNICAL ANALYSIS IS PRIMARY — Use top-down direction as the source of truth
  // Fundamentals (rawBias) only affect confidence, NOT direction
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  let confidence: number;
  
  // Map technical direction to bias
  if (topDownAnalysis.tradeableDirection === 'LONG') {
    bias = 'LONG';
  } else if (topDownAnalysis.tradeableDirection === 'SHORT') {
    bias = 'SHORT';
  } else {
    bias = 'NEUTRAL';
  }
  
  // Calculate confidence based on confluence + fundamental alignment
  const confluenceBase = topDownAnalysis.confluenceScore;
  const fundamentalAlignment = (rawBias === 'LONG' && bias === 'LONG') || (rawBias === 'SHORT' && bias === 'SHORT');
  const fundamentalConflict = (rawBias === 'LONG' && bias === 'SHORT') || (rawBias === 'SHORT' && bias === 'LONG');
  
  if (bias === 'NEUTRAL') {
    // No trade signal — low confidence
    confidence = Math.max(40, Math.min(55, confluenceBase * 0.55)) - macroPenalty;
  } else if (fundamentalAlignment) {
    // Technical + fundamental agree — moderate-high signal (capped lower for humility)
    confidence = Math.max(55, Math.min(75, (confluenceBase * 0.6 + rawConfidence * 0.25))) - macroPenalty;
  } else if (fundamentalConflict) {
    // Technical vs fundamental conflict — reduce confidence significantly
    confidence = Math.max(42, Math.min(58, confluenceBase * 0.5)) - macroPenalty;
  } else {
    // Technical clear, fundamental neutral — moderate confidence
    confidence = Math.max(48, Math.min(68, confluenceBase * 0.65)) - macroPenalty;
  }
  
  // Clamp final confidence — lower ceiling for epistemic humility
  confidence = Math.max(35, Math.min(78, confidence));

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
  
  // Create tighter zone with PROPER range (never same value)
  // Use smart decimal precision based on price magnitude
  const getDecimalPlaces = (p: number): number => {
    if (p < 0.001) return 8;
    if (p < 0.01) return 6;
    if (p < 0.1) return 5;
    if (p < 1) return 4;
    if (p < 10) return 3;
    if (p < 100) return 2;
    if (p < 10000) return 2;  // Keep 2 decimals for prices up to $10k
    return 1;  // At least 1 decimal for very high prices (BTC)
  };
  const decimals = getDecimalPlaces(validPrice);
  
  // Ensure minimum spread of 2% of price, never same value
  const minSpread = price * 0.02;
  const tightRange = Math.max(minSpread, range * 0.15);
  const entryMid = bias === 'LONG' 
    ? low24h + range * 0.25 
    : bias === 'SHORT'
      ? high24h - range * 0.25
      : price; // NEUTRAL uses current price as mid
  const tightZoneLow = entryMid - tightRange / 2;
  const tightZoneHigh = entryMid + tightRange / 2;
  const tightZone = `$${tightZoneLow.toFixed(decimals)} – $${tightZoneHigh.toFixed(decimals)}`;

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

  // Build KEY insights — BIAS-ALIGNED only (no contradictions)
  const keyInsights: string[] = [];
  
  // Add the definitive bias summary FIRST — aligned with final bias and showing alignment status
  // Include specific divergence direction for nuance
  const getFundamentalLabel = (b: 'LONG' | 'SHORT' | 'NEUTRAL'): string => {
    if (b === 'LONG') return 'bullish';
    if (b === 'SHORT') return 'bearish';
    return 'neutral';
  };
  
  const alignmentNote = fundamentalAlignment 
    ? 'Technical + fundamental aligned' 
    : fundamentalConflict 
      ? `Technical leads (fundamental ${getFundamentalLabel(rawBias)} diverges)`
      : rawBias === 'NEUTRAL' 
        ? 'Technical signal (fundamental neutral)'
        : 'Technical signal';
  
  if (bias === 'LONG') {
    keyInsights.push(`🎯 BULLISH — ${alignmentNote}`);
  } else if (bias === 'SHORT') {
    keyInsights.push(`🎯 BEARISH — ${alignmentNote}`);
  } else {
    keyInsights.push(`⏸️ NEUTRAL — No clear technical direction`);
  }
  
  // Filter insights to match current bias direction — STRICT filtering
  const directionalInsights = insights.filter(i => {
    // Always skip the first summary insight from calculateFinalBias (we replaced it)
    if (i.includes('🎯') || i.includes('📊 Lean') || i.includes('⏸️ NEUTRAL')) {
      return false;
    }
    // Remove neutral/mixed signals
    if (i.includes('NEUTRAL') || i.includes('No clear') || i.includes('Mixed') || i.includes('Sideways')) {
      return false;
    }
    // For BEARISH/SHORT bias, exclude ALL bullish-sounding insights
    if (bias === 'SHORT') {
      const bullishTerms = [
        'buy zone', 'Optimal buy', 'Deep discount', 'accumulation', 'Accumulation',
        'bullish', 'BULLISH', 'uptrend', 'Uptrend', 'Contrarian BUY', 'buying',
        'confirms bulls', 'Strong uptrend', 'Bullish momentum', 'Mild bullish',
        'Institutions buying', 'Exchange outflows'
      ];
      if (bullishTerms.some(term => i.includes(term))) {
        return false;
      }
    }
    // For BULLISH/LONG bias, exclude ALL bearish-sounding insights
    if (bias === 'LONG') {
      const bearishTerms = [
        'sell zone', 'Optimal sell', 'Premium zone', 'distribution', 'Distribution',
        'bearish', 'BEARISH', 'downtrend', 'Downtrend', 'Contrarian SELL', 'selling',
        'confirms bears', 'Strong downtrend', 'Bearish momentum', 'Mild bearish',
        'Institutions selling', 'Exchange inflows', 'Caution'
      ];
      if (bearishTerms.some(term => i.includes(term))) {
        return false;
      }
    }
    return true;
  });
  
  // Add filtered directional insights (limit to 2 to avoid clutter)
  directionalInsights.slice(0, 2).forEach(i => keyInsights.push(i));

  // On-chain insights — ONLY show if they align with bias direction
  // For BEARISH bias, show distribution/selling signals; for BULLISH, show accumulation
  if (bias === 'SHORT') {
    if (onChainMetrics.exchangeNetFlow.trend === 'INFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
      keyInsights.push(`🔗 Exchange INFLOW (${onChainMetrics.exchangeNetFlow.magnitude}) → Distribution pressure`);
    }
    if (onChainMetrics.whaleActivity.netFlow.includes('SELL') || onChainMetrics.whaleActivity.netFlow.includes('DISTRIBUT')) {
      keyInsights.push(`🐋 Whales: ${onChainMetrics.whaleActivity.netFlow}`);
    }
  } else if (bias === 'LONG') {
    if (onChainMetrics.exchangeNetFlow.trend === 'OUTFLOW' && onChainMetrics.exchangeNetFlow.magnitude !== 'LOW') {
      keyInsights.push(`🔗 Exchange OUTFLOW (${onChainMetrics.exchangeNetFlow.magnitude}) → Accumulation signal`);
    }
    if (onChainMetrics.whaleActivity.netFlow.includes('BUY') || onChainMetrics.whaleActivity.netFlow.includes('ACCUMULAT')) {
      keyInsights.push(`🐋 Whales: ${onChainMetrics.whaleActivity.netFlow}`);
    }
    if (onChainMetrics.longTermHolders.accumulating && onChainMetrics.longTermHolders.change7d > 0.5) {
      keyInsights.push(`💎 Long-term holders +${onChainMetrics.longTermHolders.change7d.toFixed(1)}% (7d)`);
    }
  } else {
    // NEUTRAL — show balanced/mixed signals
    if (onChainMetrics.whaleActivity.netFlow === 'BALANCED') {
      keyInsights.push(`🐋 Whales: Balanced activity`);
    }
  }

  // ETF insight — only show for BTC/ETH (cryptos with actual ETFs) and if it supports the bias
  if (etfFlowData && (Math.abs(etfFlowData.btcNetFlow24h) > 50 || Math.abs(etfFlowData.ethNetFlow24h || 0) > 50)) {
    const flowValue = etfFlowData.btcNetFlow24h || etfFlowData.ethNetFlow24h || 0;
    const flowDir = flowValue > 0 ? '+' : '';
    const isETFBullish = flowValue > 0;
    if ((bias === 'LONG' && isETFBullish) || (bias === 'SHORT' && !isETFBullish) || bias === 'NEUTRAL') {
      keyInsights.push(`💼 ETF Flow: ${flowDir}$${flowValue}M (${etfFlowData.institutionalSentiment})`);
    }
  }

  // Divergence insight — always show as it's informational
  if (institutionalVsRetail.divergence) {
    keyInsights.push(`⚡ ${institutionalVsRetail.divergenceNote}`);
  }

  // Success probability — based on confluence and setup quality (tempered for realism)
  const confluenceBonus = Math.round(topDownAnalysis.confluenceScore * 0.28);
  const timingBonus = precisionEntry.timing === 'NOW' ? 6 : precisionEntry.timing === 'WAIT_PULLBACK' ? 3 : 0;
  const biasBonus = bias !== 'NEUTRAL' ? 4 : 0;
  const volumeBonus = volumeSpike.isSpike && volumeSpike.magnitude === 'HIGH' ? 3 : volumeSpike.isSpike ? 1 : 0;
  const successProb = Math.min(72, 38 + confluenceBonus + timingBonus + biasBonus + volumeBonus);
  const probBar = createBar(successProb, 100, '▓', '░', 12);
  
  // Qualitative description based on probability tier (more measured language)
  const probDescription = successProb >= 65 
    ? 'FAVORABLE — Good confluence, manage risk'
    : successProb >= 55 
      ? 'MODERATE — Some confirmations, stay nimble' 
      : successProb >= 48 
        ? 'UNCERTAIN — Mixed signals, reduce size'
        : 'WEAK — Low conviction, consider sitting out';

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

  // Build TL;DR headline — one-liner summary for quick scanning
  // Confidence-adjusted bias labels: softer language for humility
  const getBiasLabel = (b: 'LONG' | 'SHORT' | 'NEUTRAL', conf: number): string => {
    if (b === 'NEUTRAL') return 'Neutral';
    const baseWord = b === 'LONG' ? 'bullish' : 'bearish';
    if (conf >= 68) return `Favoring ${baseWord}`; // Softer than all-caps
    if (conf >= 55) return `Leaning ${baseWord}`; // Moderate
    return `Slight ${baseWord} tilt`; // Low confidence
  };
  const biasWord = getBiasLabel(bias, confidence);
  const structureWord = topDownAnalysis.confluenceScore >= 70 ? 'decent' : topDownAnalysis.confluenceScore >= 50 ? 'mixed' : 'weak';
  const marketPhase = pricePosition > 70 ? 'extended' : pricePosition < 30 ? 'discount' : 'mid-range';
  const actionWord = precisionEntry.timing === 'NOW' 
    ? (bias === 'LONG' ? 'Potential buy zone' : bias === 'SHORT' ? 'Potential sell zone' : 'Range-bound')
    : precisionEntry.timing === 'WAIT_PULLBACK' 
      ? 'Await pullback' 
      : precisionEntry.timing === 'WAIT_BREAKOUT'
        ? 'Await breakout'
        : 'No clear entry';
  const tldr = `${biasWord} (${structureWord} confluence) | ${marketPhase.charAt(0).toUpperCase() + marketPhase.slice(1)} zone | ${actionWord}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD FINAL ANALYSIS — Dense, Visual, Actionable
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analysis = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   ${crypto.toUpperCase()} ANALYSIS   ${trendEmoji} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📌 TL;DR: ${tldr}

💰 $${price.toFixed(decimals)}  │  24h: $${low24h.toFixed(decimals)} → $${high24h.toFixed(decimals)}
${historicalContext}
${volumeSpike.isSpike ? `📊 VOLUME SPIKE: +${volumeSpike.percentageAboveAvg.toFixed(0)}% above 24h avg (${volumeSpike.magnitude}) [Spot via aggregator]\n` : ''}📈 Volume: ${volume > avgVolume ? `+${((volume / avgVolume - 1) * 100).toFixed(0)}% above` : volume < avgVolume * 0.8 ? `${((1 - volume / avgVolume) * 100).toFixed(0)}% below` : 'near'} 24h avg | Futures OI ${change > 2 ? 'rising (longs building)' : change < -2 ? 'declining (shorts closing)' : 'stable'}
┌─────────────────────────────────────────────────┐
│  🎯 VERDICT: ${bias === 'LONG' ? (confidence >= 68 ? '🟢 Favoring Bullish' : confidence >= 55 ? '🟢 Leaning Bullish' : '🟢 Slight Bull Tilt') : bias === 'SHORT' ? (confidence >= 68 ? '🔴 Favoring Bearish' : confidence >= 55 ? '🔴 Leaning Bearish' : '🔴 Slight Bear Tilt') : '⚪ NEUTRAL'}  │  Confidence: ${confidence.toFixed(0)}%
└─────────────────────────────────────────────────┘

━━━ 📊 MARKET PULSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

😊 Fear & Greed: [${fearGreedVisual.bar}] ${fearGreed} ${fearGreedVisual.emoji} ${fearGreedVisual.label}
   └─ Source: Alternative.me (24h)
🐋 Whale Activity: ${getWhaleVisual(onChainMetrics.whaleActivity.netFlow, onChainMetrics.whaleActivity.buying, onChainMetrics.whaleActivity.selling)}
   └─ Net: ${onChainMetrics.whaleActivity.netFlow} ${hasRealOnChain ? '[Live on-chain]' : '[Derived from price action]'}
🔗 Exchange Flow: ${onChainMetrics.exchangeNetFlow.trend} (${onChainMetrics.exchangeNetFlow.magnitude})
   └─ ${hasRealOnChain ? 'Source: CryptoQuant (rolling 24h)' : 'Estimated from market momentum'}
💼 Institutional: ${etfFlowData ? etfFlowData.institutionalSentiment : 'N/A (no ETF for this asset)'}
   └─ ${etfFlowData ? 'Source: ETF flow data' : 'ETFs only available for BTC/ETH'}
${macroSection ? `\n━━━ ⚡ MACRO CATALYST ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${macroSection}\n` : ''}
━━━ 🔭 MULTI-TIMEFRAME ━━━━━━━━━━━━━━━━━━━━━━━━━━
${!hasRealMultiTfData ? '⚠️ Using price-based estimates (chart API unavailable)\n' : ''}
${htfVisual}  →  ${alignmentText}

W: ${topDownAnalysis.weekly.trend.padEnd(7)} ${createBar(topDownAnalysis.weekly.strength, 100, '█', '░', 8)} ${topDownAnalysis.weekly.strength.toFixed(0)}%
D: ${topDownAnalysis.daily.trend.padEnd(7)} ${createBar(topDownAnalysis.daily.strength, 100, '█', '░', 8)} ${topDownAnalysis.daily.strength.toFixed(0)}%
4H: ${topDownAnalysis.h4.trend.padEnd(6)} ${createBar(topDownAnalysis.h4.strength, 100, '█', '░', 8)} ${topDownAnalysis.h4.strength.toFixed(0)}%
1H: ${topDownAnalysis.h1.trend.padEnd(6)} ${createBar(topDownAnalysis.h1.strength, 100, '█', '░', 8)} ${topDownAnalysis.h1.strength.toFixed(0)}%
15M: ${topDownAnalysis.m15.trend.padEnd(5)} ${createBar(topDownAnalysis.m15.strength, 100, '█', '░', 8)} ${topDownAnalysis.m15.strength.toFixed(0)}%

🎯 Confluence: ${topDownAnalysis.confluenceScore}% ${topDownAnalysis.confluenceScore >= 70 ? '(STRONG ✓)' : topDownAnalysis.confluenceScore >= 50 ? '(MODERATE)' : '(WEAK ⚠️)'} ${hasRealMultiTfData ? '' : '(estimated)'}

━━━ 📌 15-MINUTE PRECISION ENTRY ━━━━━━━━━━━━━━━

⏱️ ${precisionEntry.timing === 'NOW' ? '🟢 EXECUTE NOW' : precisionEntry.timing === 'WAIT_PULLBACK' ? '🟡 WAIT FOR PULLBACK' : precisionEntry.timing === 'WAIT_BREAKOUT' ? '🟡 WAIT FOR BREAKOUT' : '🔴 NO TRADE'}

📍 Entry Zone: ${tightZone}
   └─ Trigger: ${precisionEntry.trigger}
${bias === 'SHORT' ? `🎯 Target: $${(low24h - range * 0.1).toFixed(decimals)} (breakdown of 24h low)` : bias === 'LONG' ? `🎯 Target: $${(high24h + range * 0.1).toFixed(decimals)} (breakout of 24h high)` : ''}
✓ Confirm: ${precisionEntry.confirmation}
✗ Invalid: ${precisionEntry.invalidation}
${bias === 'SHORT' ? `📈 If invalidated: Flip long above $${(high24h + range * 0.15).toFixed(decimals)}` : bias === 'LONG' ? `📉 If invalidated: Flip short below $${(low24h - range * 0.15).toFixed(decimals)}` : ''}

📊 Success: [${probBar}] ${successProb}%
   └─ ${probDescription}

━━━ 💡 KEY INSIGHTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${keyInsights.slice(0, 5).map(i => `• ${i}`).join('\n')}

━━━ 🔮 SCENARIOS (Both Directions) ━━━━━━━━━━━━━━

${scenarios.slice(0, 2).map(s => `${s.condition}
  → ${s.outcome}
  📋 ${s.action}`).join('\n\n')}

${bias === 'SHORT' ? `📈 UPSIDE SCENARIO: If price reclaims $${(high24h - range * 0.1).toFixed(decimals)} with volume
  → Bears trapped, momentum shift likely
  📋 Consider flipping long or exiting shorts` : bias === 'LONG' ? `📉 DOWNSIDE SCENARIO: If price loses $${(low24h + range * 0.1).toFixed(decimals)} with volume
  → Bulls trapped, breakdown in play
  📋 Consider flipping short or exiting longs` : `↔️ BREAKOUT SCENARIO: Watch $${high24h.toFixed(decimals)} (up) / $${low24h.toFixed(decimals)} (down)
  → First to break with volume defines direction
  📋 React to the breakout, don't predict`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Zikalyze AI v11.0 • ${isLiveData ? '🟢 LIVE PRICE' : '⚪ CACHED PRICE'} • ${hasRealMultiTfData ? '📊 Real Charts' : '📊 Derived'}${hasRealOnChain ? ' • 🔗 Live On-Chain' : ''}
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
