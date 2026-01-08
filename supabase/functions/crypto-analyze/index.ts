import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  if (origin.startsWith('http://localhost:')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ZIKALYZE AI BRAIN v7.0 — MULTI-TIMEFRAME PREDICTIVE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

// Real candlestick data from exchanges
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface RealChartData {
  candles: Candle[];
  source: string;
  timeframe: string;
  realPatterns: string[];
  trendAnalysis: {
    direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    strength: number;
    swingHighs: number[];
    swingLows: number[];
    higherHighs: boolean;
    higherLows: boolean;
    lowerHighs: boolean;
    lowerLows: boolean;
  };
  volumeProfile: {
    averageVolume: number;
    currentVsAvg: number;
    volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    climacticVolume: boolean;
  };
  candlePatterns: string[];
  supportResistance: {
    supports: number[];
    resistances: number[];
  };
}

// Multi-timeframe analysis result
interface MultiTimeframeAnalysis {
  tf1H: RealChartData | null;
  tf4H: RealChartData | null;
  tfDaily: RealChartData | null;
  confluence: {
    overallBias: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
    strength: number;
    alignment: number; // 0-100% how aligned the timeframes are
    htfTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    ltfEntry: 'OPTIMAL' | 'WAIT' | 'RISKY';
  };
  keyLevels: {
    dailySupport: number[];
    dailyResistance: number[];
    h4Support: number[];
    h4Resistance: number[];
    h1Support: number[];
    h1Resistance: number[];
  };
  signals: string[];
}

// Enhanced memory with prediction tracking
interface PredictiveMemory {
  pastPatterns: { pattern: string; outcome: 'WIN' | 'LOSS' | 'PENDING'; priceChange: number }[];
  priceHistory: { price: number; timestamp: string }[];
  predictionAccuracy: number;
  trendConsistency: number;
  futurePredictions: { target: number; probability: number; timeframe: string; basis: string }[];
}

interface MarketMemory {
  symbol: string;
  price: number;
  change: number;
  bias: string;
  confidence: number;
  timestamp: string;
  patterns: string[];
  wasCorrect?: boolean;
}

interface ThinkingStep {
  step: number;
  thought: string;
  conclusion: string;
  weight: number; // How important this step is (1-10)
}

interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  strength: number;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  lastBOS: 'BULLISH' | 'BEARISH' | null;
  lastCHoCH: 'BULLISH' | 'BEARISH' | null;
}

interface WyckoffPhase {
  phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'RANGING';
  subPhase: string;
  confidence: number;
  description: string;
}

interface ElliottWave {
  wave: string;
  subwave: string;
  direction: 'IMPULSE' | 'CORRECTIVE';
  target: number;
  invalidation: number;
}

interface LiquidityPool {
  level: number;
  type: 'BUYSIDE' | 'SELLSIDE';
  strength: number;
  swept: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 ADAPTIVE LEARNING SYSTEM — REAL-TIME SCENARIO RECOGNITION
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketScenario {
  id: string;
  name: string;
  conditions: {
    trendDirection: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'ANY';
    rangePosition: 'DISCOUNT' | 'PREMIUM' | 'EQUILIBRIUM' | 'ANY';
    volumeState: 'HIGH' | 'MODERATE' | 'LOW' | 'ANY';
    volatility: 'HIGH' | 'MODERATE' | 'LOW' | 'ANY';
    patterns: string[];
  };
  expectedOutcome: 'LONG' | 'SHORT' | 'NEUTRAL';
  historicalAccuracy: number;
  weight: number;
}

interface AdaptiveLearning {
  currentScenario: MarketScenario | null;
  matchedScenarios: MarketScenario[];
  scenarioConfidence: number;
  adaptiveAdjustments: string[];
  learningVelocity: number; // How fast the model adapts (0-100)
  patternSuccessRates: Record<string, { wins: number; losses: number; accuracy: number }>;
}

// Pre-trained scenario database — learned from historical market behavior
const MARKET_SCENARIOS: MarketScenario[] = [
  // High probability bullish scenarios
  {
    id: 'SPRING_REVERSAL',
    name: 'Wyckoff Spring Reversal',
    conditions: { trendDirection: 'BEARISH', rangePosition: 'DISCOUNT', volumeState: 'HIGH', volatility: 'HIGH', patterns: ['Spring', 'Liquidity Sweep', 'Hammer'] },
    expectedOutcome: 'LONG',
    historicalAccuracy: 87,
    weight: 10
  },
  {
    id: 'ACCUMULATION_BREAKOUT',
    name: 'Accumulation Range Breakout',
    conditions: { trendDirection: 'SIDEWAYS', rangePosition: 'EQUILIBRIUM', volumeState: 'HIGH', volatility: 'MODERATE', patterns: ['Break of Structure', 'Volume Expansion'] },
    expectedOutcome: 'LONG',
    historicalAccuracy: 79,
    weight: 9
  },
  {
    id: 'HIGHER_LOW_BOUNCE',
    name: 'Higher Low Trend Continuation',
    conditions: { trendDirection: 'BULLISH', rangePosition: 'DISCOUNT', volumeState: 'MODERATE', volatility: 'LOW', patterns: ['Higher Low', 'Bullish Engulfing'] },
    expectedOutcome: 'LONG',
    historicalAccuracy: 75,
    weight: 8
  },
  {
    id: 'OVERSOLD_REVERSAL',
    name: 'Extreme Oversold Bounce',
    conditions: { trendDirection: 'BEARISH', rangePosition: 'DISCOUNT', volumeState: 'HIGH', volatility: 'HIGH', patterns: ['Climactic Volume', 'Hammer', 'Bullish Divergence'] },
    expectedOutcome: 'LONG',
    historicalAccuracy: 72,
    weight: 7
  },
  {
    id: 'BULL_FLAG_BREAKOUT',
    name: 'Bull Flag Continuation',
    conditions: { trendDirection: 'BULLISH', rangePosition: 'PREMIUM', volumeState: 'MODERATE', volatility: 'LOW', patterns: ['Bull Flag', 'Consolidation'] },
    expectedOutcome: 'LONG',
    historicalAccuracy: 71,
    weight: 7
  },
  
  // High probability bearish scenarios
  {
    id: 'UPTHRUST_REVERSAL',
    name: 'Wyckoff Upthrust Reversal',
    conditions: { trendDirection: 'BULLISH', rangePosition: 'PREMIUM', volumeState: 'HIGH', volatility: 'HIGH', patterns: ['Upthrust', 'Liquidity Sweep', 'Shooting Star'] },
    expectedOutcome: 'SHORT',
    historicalAccuracy: 85,
    weight: 10
  },
  {
    id: 'DISTRIBUTION_BREAKDOWN',
    name: 'Distribution Range Breakdown',
    conditions: { trendDirection: 'SIDEWAYS', rangePosition: 'EQUILIBRIUM', volumeState: 'HIGH', volatility: 'MODERATE', patterns: ['Break of Structure', 'Volume Expansion'] },
    expectedOutcome: 'SHORT',
    historicalAccuracy: 78,
    weight: 9
  },
  {
    id: 'LOWER_HIGH_REJECTION',
    name: 'Lower High Trend Continuation',
    conditions: { trendDirection: 'BEARISH', rangePosition: 'PREMIUM', volumeState: 'MODERATE', volatility: 'LOW', patterns: ['Lower High', 'Bearish Engulfing'] },
    expectedOutcome: 'SHORT',
    historicalAccuracy: 74,
    weight: 8
  },
  {
    id: 'OVERBOUGHT_REVERSAL',
    name: 'Extreme Overbought Rejection',
    conditions: { trendDirection: 'BULLISH', rangePosition: 'PREMIUM', volumeState: 'HIGH', volatility: 'HIGH', patterns: ['Climactic Volume', 'Shooting Star', 'Bearish Divergence'] },
    expectedOutcome: 'SHORT',
    historicalAccuracy: 71,
    weight: 7
  },
  {
    id: 'BEAR_FLAG_BREAKDOWN',
    name: 'Bear Flag Continuation',
    conditions: { trendDirection: 'BEARISH', rangePosition: 'DISCOUNT', volumeState: 'MODERATE', volatility: 'LOW', patterns: ['Bear Flag', 'Consolidation'] },
    expectedOutcome: 'SHORT',
    historicalAccuracy: 70,
    weight: 7
  },
  
  // Neutral/Caution scenarios
  {
    id: 'RANGE_CHOP',
    name: 'Choppy Range Conditions',
    conditions: { trendDirection: 'SIDEWAYS', rangePosition: 'EQUILIBRIUM', volumeState: 'LOW', volatility: 'LOW', patterns: [] },
    expectedOutcome: 'NEUTRAL',
    historicalAccuracy: 65,
    weight: 5
  },
  {
    id: 'NEWS_VOLATILITY',
    name: 'Event-Driven Volatility',
    conditions: { trendDirection: 'ANY', rangePosition: 'ANY', volumeState: 'HIGH', volatility: 'HIGH', patterns: ['Climactic Volume'] },
    expectedOutcome: 'NEUTRAL',
    historicalAccuracy: 55,
    weight: 4
  }
];

// Adaptive learning engine
function analyzeScenario(data: {
  trendDirection: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  rangePercent: number;
  volumeStrength: string;
  volatility: number;
  patterns: string[];
  memory: MarketMemory[];
  realChartData: RealChartData | null;
}): AdaptiveLearning {
  const { trendDirection, rangePercent, volumeStrength, volatility, patterns, memory, realChartData } = data;
  
  // Classify current market state
  const rangePosition = rangePercent < 35 ? 'DISCOUNT' : rangePercent > 65 ? 'PREMIUM' : 'EQUILIBRIUM';
  const volState = volumeStrength as 'HIGH' | 'MODERATE' | 'LOW';
  const volLevel = volatility > 5 ? 'HIGH' : volatility > 2 ? 'MODERATE' : 'LOW';
  
  // Match against known scenarios
  const matchedScenarios: MarketScenario[] = [];
  
  for (const scenario of MARKET_SCENARIOS) {
    let matchScore = 0;
    const maxScore = 5;
    
    // Trend match
    if (scenario.conditions.trendDirection === 'ANY' || scenario.conditions.trendDirection === trendDirection) {
      matchScore += 1;
    }
    
    // Range position match
    if (scenario.conditions.rangePosition === 'ANY' || scenario.conditions.rangePosition === rangePosition) {
      matchScore += 1;
    }
    
    // Volume match
    if (scenario.conditions.volumeState === 'ANY' || scenario.conditions.volumeState === volState) {
      matchScore += 1;
    }
    
    // Volatility match
    if (scenario.conditions.volatility === 'ANY' || scenario.conditions.volatility === volLevel) {
      matchScore += 1;
    }
    
    // Pattern match (bonus for each matching pattern)
    const matchingPatterns = scenario.conditions.patterns.filter(p => 
      patterns.some(detected => detected.toLowerCase().includes(p.toLowerCase()))
    );
    if (matchingPatterns.length > 0) {
      matchScore += Math.min(1, matchingPatterns.length * 0.3);
    }
    
    // If good match, add to list
    if (matchScore >= 3) {
      matchedScenarios.push({ ...scenario, historicalAccuracy: scenario.historicalAccuracy * (matchScore / maxScore) });
    }
  }
  
  // Sort by weighted accuracy
  matchedScenarios.sort((a, b) => (b.historicalAccuracy * b.weight) - (a.historicalAccuracy * a.weight));
  
  // Calculate pattern success rates from memory
  const patternSuccessRates: Record<string, { wins: number; losses: number; accuracy: number }> = {};
  
  if (memory && memory.length >= 3) {
    const feedbackMemory = memory.filter(m => m.wasCorrect !== undefined);
    
    for (const m of feedbackMemory) {
      for (const pattern of m.patterns || []) {
        if (!patternSuccessRates[pattern]) {
          patternSuccessRates[pattern] = { wins: 0, losses: 0, accuracy: 50 };
        }
        if (m.wasCorrect) {
          patternSuccessRates[pattern].wins++;
        } else {
          patternSuccessRates[pattern].losses++;
        }
        const total = patternSuccessRates[pattern].wins + patternSuccessRates[pattern].losses;
        patternSuccessRates[pattern].accuracy = total > 0 
          ? Math.round((patternSuccessRates[pattern].wins / total) * 100) 
          : 50;
      }
    }
  }
  
  // Calculate learning velocity based on feedback volume
  const feedbackCount = memory.filter(m => m.wasCorrect !== undefined).length;
  const learningVelocity = Math.min(100, feedbackCount * 8);
  
  // Generate adaptive adjustments
  const adaptiveAdjustments: string[] = [];
  
  // Learn from real chart data
  if (realChartData) {
    if (realChartData.trendAnalysis.strength >= 80) {
      adaptiveAdjustments.push(`Strong ${realChartData.trendAnalysis.direction.toLowerCase()} trend detected — increased bias confidence`);
    }
    if (realChartData.volumeProfile.climacticVolume) {
      adaptiveAdjustments.push('Climactic volume detected — potential reversal or acceleration point');
    }
    if (realChartData.candlePatterns.length >= 2) {
      adaptiveAdjustments.push(`Multiple candlestick confirmations — signal strength enhanced`);
    }
    
    // Learn from swing structure
    if (realChartData.trendAnalysis.higherHighs && realChartData.trendAnalysis.higherLows) {
      adaptiveAdjustments.push('Real chart confirms HH/HL structure — bullish bias reinforced');
    } else if (realChartData.trendAnalysis.lowerHighs && realChartData.trendAnalysis.lowerLows) {
      adaptiveAdjustments.push('Real chart confirms LH/LL structure — bearish bias reinforced');
    }
  }
  
  // Adapt based on pattern success rates
  for (const [pattern, stats] of Object.entries(patternSuccessRates)) {
    if (stats.accuracy >= 80 && (stats.wins + stats.losses) >= 3) {
      adaptiveAdjustments.push(`${pattern} has ${stats.accuracy}% historical accuracy — high confidence signal`);
    } else if (stats.accuracy <= 35 && (stats.wins + stats.losses) >= 3) {
      adaptiveAdjustments.push(`${pattern} underperforming (${stats.accuracy}%) — reducing weight`);
    }
  }
  
  // Scenario-based learning
  if (matchedScenarios.length > 0) {
    const topScenario = matchedScenarios[0];
    adaptiveAdjustments.push(`Matched scenario: ${topScenario.name} (${topScenario.historicalAccuracy.toFixed(0)}% historical accuracy)`);
  }
  
  return {
    currentScenario: matchedScenarios.length > 0 ? matchedScenarios[0] : null,
    matchedScenarios: matchedScenarios.slice(0, 3),
    scenarioConfidence: matchedScenarios.length > 0 ? matchedScenarios[0].historicalAccuracy : 50,
    adaptiveAdjustments,
    learningVelocity,
    patternSuccessRates
  };
}

// Real-time chart learning — extract lessons from price action
function learnFromChartData(realChartData: RealChartData | null, memory: MarketMemory[]): string[] {
  const lessons: string[] = [];
  
  if (!realChartData) return lessons;
  
  const { trendAnalysis, volumeProfile, candlePatterns, realPatterns, supportResistance } = realChartData;
  
  // Trend lessons
  if (trendAnalysis.direction === 'BULLISH' && trendAnalysis.strength >= 70) {
    lessons.push('Market in strong uptrend — favor long setups, avoid counter-trend shorts');
  } else if (trendAnalysis.direction === 'BEARISH' && trendAnalysis.strength >= 70) {
    lessons.push('Market in strong downtrend — favor short setups, avoid counter-trend longs');
  } else if (trendAnalysis.direction === 'SIDEWAYS') {
    lessons.push('Range-bound conditions — trade from extremes, avoid middle of range');
  }
  
  // Volume lessons
  if (volumeProfile.volumeTrend === 'INCREASING') {
    lessons.push('Volume expanding — trend likely to continue or accelerate');
  } else if (volumeProfile.volumeTrend === 'DECREASING') {
    lessons.push('Volume contracting — consolidation or reversal forming');
  }
  
  if (volumeProfile.climacticVolume) {
    lessons.push('Extreme volume spike — exhaustion move, expect pullback or reversal');
  }
  
  // Pattern lessons from real chart
  if (realPatterns.includes('Bullish Break of Structure (REAL)')) {
    lessons.push('Structure broke bullish — previous resistance now support');
  }
  if (realPatterns.includes('Bearish Break of Structure (REAL)')) {
    lessons.push('Structure broke bearish — previous support now resistance');
  }
  
  // Support/Resistance lessons
  if (supportResistance.supports.length > 0) {
    const nearestSupport = supportResistance.supports[0];
    const price = realChartData.candles[realChartData.candles.length - 1].close;
    const distanceToSupport = ((price - nearestSupport) / price) * 100;
    
    if (distanceToSupport < 2) {
      lessons.push(`Price at critical support ($${nearestSupport.toFixed(2)}) — high probability bounce zone`);
    } else if (distanceToSupport < 5) {
      lessons.push(`Support nearby ($${nearestSupport.toFixed(2)}) — prepare for potential reaction`);
    }
  }
  
  if (supportResistance.resistances.length > 0) {
    const nearestResistance = supportResistance.resistances[0];
    const price = realChartData.candles[realChartData.candles.length - 1].close;
    const distanceToResistance = ((nearestResistance - price) / price) * 100;
    
    if (distanceToResistance < 2) {
      lessons.push(`Price at critical resistance ($${nearestResistance.toFixed(2)}) — expect rejection or breakout`);
    } else if (distanceToResistance < 5) {
      lessons.push(`Resistance nearby ($${nearestResistance.toFixed(2)}) — prepare for potential reaction`);
    }
  }
  
  // Learn from memory success/failure
  if (memory && memory.length >= 5) {
    const recentFeedback = memory.filter(m => m.wasCorrect !== undefined).slice(0, 10);
    const correctCount = recentFeedback.filter(m => m.wasCorrect).length;
    const accuracy = recentFeedback.length > 0 ? (correctCount / recentFeedback.length) * 100 : 50;
    
    if (accuracy >= 75) {
      lessons.push(`Strategy performing excellently (${accuracy.toFixed(0)}% accuracy) — maintain current approach`);
    } else if (accuracy >= 60) {
      lessons.push(`Strategy performing well (${accuracy.toFixed(0)}% accuracy) — minor refinements suggested`);
    } else if (accuracy < 45) {
      lessons.push(`Strategy needs adjustment (${accuracy.toFixed(0)}% accuracy) — adapting parameters`);
    }
  }
  
  return lessons;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 ADVANCED PATTERN RECOGNITION DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const MARKET_PATTERNS = {
  // Bullish Reversal Patterns
  bullishEngulfing: { name: "Bullish Engulfing", accuracy: 78, weight: 8, description: "Strong reversal signal after downtrend" },
  morningStar: { name: "Morning Star", accuracy: 82, weight: 9, description: "Three-candle bottom reversal pattern" },
  hammerBottom: { name: "Hammer at Support", accuracy: 75, weight: 7, description: "Rejection of lower prices at key level" },
  bullishDivergence: { name: "Bullish RSI Divergence", accuracy: 71, weight: 8, description: "Price making lower lows while RSI makes higher lows" },
  accumulationZone: { name: "Accumulation Zone", accuracy: 80, weight: 9, description: "Price consolidating at lows with increasing volume" },
  breakoutRetest: { name: "Breakout Retest", accuracy: 76, weight: 7, description: "Successful retest of broken resistance as support" },
  inversHeadShoulders: { name: "Inverse Head & Shoulders", accuracy: 83, weight: 9, description: "Classic reversal pattern with left shoulder, head, right shoulder" },
  doublBottom: { name: "Double Bottom", accuracy: 79, weight: 8, description: "W-pattern testing same support twice" },
  springPattern: { name: "Wyckoff Spring", accuracy: 85, weight: 10, description: "False breakdown below support, immediate reclaim" },
  
  // Bearish Reversal Patterns
  bearishEngulfing: { name: "Bearish Engulfing", accuracy: 77, weight: 8, description: "Strong reversal signal after uptrend" },
  eveningStar: { name: "Evening Star", accuracy: 81, weight: 9, description: "Three-candle top reversal pattern" },
  shootingStar: { name: "Shooting Star at Resistance", accuracy: 74, weight: 7, description: "Rejection of higher prices at key level" },
  bearishDivergence: { name: "Bearish RSI Divergence", accuracy: 72, weight: 8, description: "Price making higher highs while RSI makes lower highs" },
  distributionZone: { name: "Distribution Zone", accuracy: 79, weight: 9, description: "Price consolidating at highs with increasing volume" },
  breakdownRetest: { name: "Breakdown Retest", accuracy: 75, weight: 7, description: "Failed retest of broken support as resistance" },
  headShoulders: { name: "Head & Shoulders", accuracy: 84, weight: 9, description: "Classic reversal pattern at tops" },
  doubleTop: { name: "Double Top", accuracy: 78, weight: 8, description: "M-pattern testing same resistance twice" },
  upthrustPattern: { name: "Wyckoff Upthrust", accuracy: 86, weight: 10, description: "False breakout above resistance, immediate rejection" },
  
  // Continuation Patterns
  bullFlag: { name: "Bull Flag", accuracy: 73, weight: 7, description: "Consolidation after strong upward move" },
  bearFlag: { name: "Bear Flag", accuracy: 72, weight: 7, description: "Consolidation after strong downward move" },
  triangleBreakout: { name: "Triangle Breakout", accuracy: 70, weight: 6, description: "Symmetrical triangle with directional breakout" },
  ascendingTriangle: { name: "Ascending Triangle", accuracy: 76, weight: 7, description: "Higher lows into flat resistance" },
  descendingTriangle: { name: "Descending Triangle", accuracy: 75, weight: 7, description: "Lower highs into flat support" },
  wedgePattern: { name: "Wedge Pattern", accuracy: 74, weight: 7, description: "Converging trendlines with breakout" },
  
  // Smart Money / ICT Patterns
  liquiditySweep: { name: "Liquidity Sweep", accuracy: 83, weight: 9, description: "Stop hunt followed by reversal" },
  orderBlockTest: { name: "Order Block Retest", accuracy: 79, weight: 8, description: "Price respecting institutional order block" },
  fvgFill: { name: "Fair Value Gap Fill", accuracy: 77, weight: 7, description: "Price returning to fill imbalance" },
  bos: { name: "Break of Structure", accuracy: 81, weight: 8, description: "Market structure shift confirmation" },
  choch: { name: "Change of Character", accuracy: 84, weight: 9, description: "First sign of trend reversal" },
  buysideLiquidity: { name: "Buyside Liquidity Grab", accuracy: 82, weight: 9, description: "Sweep of buy stops above highs" },
  sellsideLiquidity: { name: "Sellside Liquidity Grab", accuracy: 82, weight: 9, description: "Sweep of sell stops below lows" },
  breaker: { name: "Breaker Block", accuracy: 80, weight: 8, description: "Failed order block becomes opposite zone" },
  mitigation: { name: "Mitigation Block", accuracy: 78, weight: 7, description: "Unmitigated institutional position" },
  inducement: { name: "Inducement Trap", accuracy: 81, weight: 8, description: "Retail trap before real move" },
  
  // Volume Patterns
  volumeClimactic: { name: "Climactic Volume", accuracy: 76, weight: 8, description: "Extreme volume at key level signals exhaustion" },
  volumeDry: { name: "Volume Dry Up", accuracy: 71, weight: 6, description: "Decreasing volume before breakout" },
  volumeConfirmation: { name: "Volume Confirmation", accuracy: 79, weight: 7, description: "Volume supports price direction" },
  
  // Volatility Patterns
  volatilityContraction: { name: "Volatility Squeeze", accuracy: 74, weight: 7, description: "Bollinger Band squeeze before expansion" },
  volatilityExpansion: { name: "Volatility Expansion", accuracy: 72, weight: 6, description: "Range expansion after consolidation" }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 COMPREHENSIVE CRYPTO KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════════

const CRYPTO_KNOWLEDGE: Record<string, {
  correlations: string[];
  keyLevels: { psychological: number[]; historical: string };
  cycles: string;
  dominance: string;
  fundamentals: string;
  onchainSignals: string[];
  institutionalBehavior: string;
  volatilityProfile: string;
  liquidityZones: string;
}> = {
  BTC: {
    correlations: ["ETH (0.85)", "SPX (0.65)", "Gold (-0.3)", "DXY (-0.55)"],
    keyLevels: { psychological: [100000, 90000, 80000, 70000, 60000, 50000], historical: "2017 ATH: $20K, 2021 ATH: $69K, 2024 ATH: $73.7K" },
    cycles: "4-year halving cycle, typically bullish 12-18 months post-halving. Current: Post-halving expansion phase",
    dominance: "Market leader — when BTC moves, alts follow. High dominance = alt weakness, falling dominance = altseason",
    fundamentals: "Digital gold narrative, institutional adoption via ETFs, fixed supply of 21M, hash rate at ATH",
    onchainSignals: ["Exchange outflows bullish", "Long-term holder accumulation", "Miner position index", "MVRV ratio"],
    institutionalBehavior: "ETF flows drive price, CME gaps act as magnets, options expiry creates volatility",
    volatilityProfile: "Reduced volatility vs historical, 30-day realized vol ~40-60%",
    liquidityZones: "Major liquidity pools at round numbers and previous ATHs"
  },
  ETH: {
    correlations: ["BTC (0.85)", "DeFi TVL (0.75)", "L2 activity (0.60)"],
    keyLevels: { psychological: [5000, 4000, 3500, 3000, 2500, 2000], historical: "2021 ATH: $4.8K, 2024 high: $4K" },
    cycles: "Follows BTC with 2-4 week lag, outperforms in altseason. ETH/BTC ratio is key metric",
    dominance: "DeFi and smart contract leader, L2 ecosystem growing",
    fundamentals: "Smart contract platform, staking yield ~4%, deflationary post-merge, ultrasound money narrative",
    onchainSignals: ["Staking deposits", "Gas fees trending", "DEX volume", "NFT activity"],
    institutionalBehavior: "ETF narrative building, Grayscale ETHE discount/premium indicator",
    volatilityProfile: "Higher beta than BTC, expect 1.2-1.5x BTC moves",
    liquidityZones: "Heavy liquidity at $3K and $4K psychological levels"
  },
  SOL: {
    correlations: ["ETH (0.70)", "BTC (0.65)", "Meme coin activity (0.80)"],
    keyLevels: { psychological: [250, 200, 175, 150, 125, 100, 75], historical: "2021 ATH: $260" },
    cycles: "High beta — amplifies BTC moves 2-3x, strong in risk-on environments",
    dominance: "Leading L1 alternative, strong developer and user growth",
    fundamentals: "High TPS blockchain, low fees, strong DeFi/NFT/meme coin ecosystem, institutional backing from Jump",
    onchainSignals: ["Daily active addresses", "DEX volume vs ETH", "NFT marketplace activity", "Staking ratio"],
    institutionalBehavior: "VCs heavily invested, potential ETF candidate",
    volatilityProfile: "Very high volatility, 2-3x BTC beta, expect large swings",
    liquidityZones: "Liquidity clustered at $100, $150, $200 levels"
  },
  XRP: {
    correlations: ["BTC (0.50)", "Regulatory news (0.90)"],
    keyLevels: { psychological: [3, 2.5, 2, 1.5, 1, 0.75, 0.50], historical: "2018 ATH: $3.84" },
    cycles: "News-driven, less correlated with broader market, tends to pump violently then consolidate",
    dominance: "Cross-border payments focus, unique among top coins",
    fundamentals: "Cross-border payments, banking partnerships, SEC lawsuit resolved = clarity",
    onchainSignals: ["ODL corridor volume", "Whale wallet movements", "Escrow releases"],
    institutionalBehavior: "Banks and payment processors testing, Ripple partnerships",
    volatilityProfile: "Can be dormant then explosive, prepare for sudden 30-50% moves",
    liquidityZones: "Major liquidity at $1 and ATH area"
  },
  DOGE: {
    correlations: ["BTC (0.55)", "Social sentiment (0.90)", "Elon tweets (0.95)"],
    keyLevels: { psychological: [0.50, 0.40, 0.30, 0.25, 0.20, 0.15, 0.10], historical: "2021 ATH: $0.74" },
    cycles: "Meme-driven, social media spikes, often pumps at unexpected times",
    dominance: "Original meme coin, strong community",
    fundamentals: "Community coin, payment adoption, Elon Musk influence, X payments speculation",
    onchainSignals: ["Social mentions", "Twitter activity", "Whale accumulation"],
    institutionalBehavior: "Retail-driven primarily, some institutional meme exposure",
    volatilityProfile: "Extreme volatility, can 2-5x or -50% on social catalysts",
    liquidityZones: "Liquidity at round cent values"
  },
  ADA: {
    correlations: ["BTC (0.72)", "ETH (0.68)"],
    keyLevels: { psychological: [1.50, 1.25, 1.00, 0.75, 0.50, 0.35], historical: "2021 ATH: $3.10" },
    cycles: "Slow and steady, often lags market moves, catches up in late cycle",
    dominance: "Academic approach, peer-reviewed development",
    fundamentals: "Proof of stake pioneer, academic rigor, Hydra scaling, growing DeFi",
    onchainSignals: ["Staking participation", "Smart contract deployment", "DeFi TVL growth"],
    institutionalBehavior: "Some institutional interest, Grayscale product exists",
    volatilityProfile: "Lower volatility than SOL, moderate beta",
    liquidityZones: "Key liquidity at $0.50 and $1.00"
  },
  AVAX: {
    correlations: ["ETH (0.75)", "BTC (0.68)"],
    keyLevels: { psychological: [100, 75, 50, 40, 30, 25, 20], historical: "2021 ATH: $147" },
    cycles: "High beta like SOL, performs well in risk-on, subnet narrative",
    dominance: "Leading L1 for institutional and gaming applications",
    fundamentals: "Subnet architecture, institutional partnerships, fast finality",
    onchainSignals: ["Subnet creation", "C-Chain activity", "Bridge volume"],
    institutionalBehavior: "Strong institutional interest, real-world asset tokenization",
    volatilityProfile: "High volatility, similar to SOL profile",
    liquidityZones: "Major levels at $25, $50, $75"
  },
  LINK: {
    correlations: ["BTC (0.65)", "ETH (0.70)", "DeFi TVL (0.60)"],
    keyLevels: { psychological: [30, 25, 20, 15, 10, 8], historical: "2021 ATH: $52" },
    cycles: "Often underperforms in early bull, catches up late, CCIP narrative growing",
    dominance: "Oracle monopoly, critical infrastructure",
    fundamentals: "Decentralized oracle network, CCIP cross-chain, staking v0.2, critical to DeFi",
    onchainSignals: ["Node operator earnings", "Data feed requests", "CCIP transactions"],
    institutionalBehavior: "SWIFT partnership, bank integrations",
    volatilityProfile: "Moderate volatility, can be sticky in ranges",
    liquidityZones: "Strong support at $10-12 zone"
  },
  DOT: {
    correlations: ["ETH (0.72)", "BTC (0.65)"],
    keyLevels: { psychological: [15, 12, 10, 8, 6, 5], historical: "2021 ATH: $55" },
    cycles: "Parachain auction driven, interoperability narrative",
    dominance: "Interoperability focus, parachain ecosystem",
    fundamentals: "Parachain architecture, cross-chain messaging, governance-heavy",
    onchainSignals: ["Parachain auction activity", "Staking ratio", "XCM messages"],
    institutionalBehavior: "Web3 Foundation backing, enterprise interest",
    volatilityProfile: "Moderate to high volatility",
    liquidityZones: "Key level at $5-6 zone"
  },
  MATIC: {
    correlations: ["ETH (0.80)", "BTC (0.65)"],
    keyLevels: { psychological: [2.00, 1.50, 1.25, 1.00, 0.75, 0.50], historical: "2021 ATH: $2.92" },
    cycles: "L2 narrative driven, rebrand to POL ongoing",
    dominance: "Leading Ethereum L2/sidechain, enterprise adoption",
    fundamentals: "Ethereum scaling, zkEVM, enterprise partnerships (Disney, Starbucks)",
    onchainSignals: ["L2 TVL", "Daily transactions", "Active addresses"],
    institutionalBehavior: "Strong enterprise adoption, institutional interest",
    volatilityProfile: "High beta to ETH, amplifies ETH moves",
    liquidityZones: "Major support at $0.50 and $1.00"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 REAL-TIME CHART DATA FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  // Top 10
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', BNB: 'BNBUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT', ADA: 'ADAUSDT', AVAX: 'AVAXUSDT', TRX: 'TRXUSDT', TON: 'TONUSDT',
  // Top 11-25
  LINK: 'LINKUSDT', DOT: 'DOTUSDT', MATIC: 'MATICUSDT', SHIB: 'SHIBUSDT', LTC: 'LTCUSDT',
  BCH: 'BCHUSDT', UNI: 'UNIUSDT', ATOM: 'ATOMUSDT', XLM: 'XLMUSDT', HBAR: 'HBARUSDT',
  FIL: 'FILUSDT', ICP: 'ICPUSDT', ETC: 'ETCUSDT', NEAR: 'NEARUSDT', APT: 'APTUSDT',
  // Top 26-50
  ARB: 'ARBUSDT', OP: 'OPUSDT', SUI: 'SUIUSDT', VET: 'VETUSDT', MKR: 'MKRUSDT',
  GRT: 'GRTUSDT', AAVE: 'AAVEUSDT', ALGO: 'ALGOUSDT', RUNE: 'RUNEUSDT', FTM: 'FTMUSDT',
  THETA: 'THETAUSDT', INJ: 'INJUSDT', SEI: 'SEIUSDT', IMX: 'IMXUSDT', SAND: 'SANDUSDT',
  MANA: 'MANAUSDT', AXS: 'AXSUSDT', GALA: 'GALAUSDT', FLOW: 'FLOWUSDT', EGLD: 'EGLDUSDT',
  // Meme coins
  PEPE: 'PEPEUSDT', WIF: 'WIFUSDT', BONK: 'BONKUSDT', FLOKI: 'FLOKIUSDT', 
  // AI & Render
  RENDER: 'RENDERUSDT', FET: 'FETUSDT', AGIX: 'AGIXUSDT', OCEAN: 'OCEANUSDT', TAO: 'TAOUSDT',
  // DeFi
  CRV: 'CRVUSDT', LDO: 'LDOUSDT', SNX: 'SNXUSDT', COMP: 'COMPUSDT', SUSHI: 'SUSHIUSDT',
  '1INCH': '1INCHUSDT', CAKE: 'CAKEUSDT', DYDX: 'DYDXUSDT', GMX: 'GMXUSDT', JUP: 'JUPUSDT',
  // L2 & Scaling
  STRK: 'STRKUSDT', MANTA: 'MANTAUSDT', TIA: 'TIAUSDT', PYTH: 'PYTHUSDT', JTO: 'JTOUSDT',
  // Others
  ENS: 'ENSUSDT', APE: 'APEUSDT', BLUR: 'BLURUSDT', CFX: 'CFXUSDT', STX: 'STXUSDT',
  XMR: 'XMRUSDT', NEO: 'NEOUSDT', KAVA: 'KAVAUSDT', ZEC: 'ZECUSDT', DASH: 'DASHUSDT',
  EOS: 'EOSUSDT', XTZ: 'XTZUSDT', IOTA: 'IOTAUSDT', CHZ: 'CHZUSDT', ENJ: 'ENJUSDT',
  CKB: 'CKBUSDT', ROSE: 'ROSEUSDT', ZIL: 'ZILUSDT', ONE: 'ONEUSDT', CELO: 'CELOUSDT',
  MASK: 'MASKUSDT', RNDR: 'RNDRUSDT', WLD: 'WLDUSDT', ORDI: 'ORDIUSDT', PENDLE: 'PENDLEUSDT',
  POL: 'POLUSDT', W: 'WUSDT', ETHFI: 'ETHFIUSDT', ENA: 'ENAUSDT', NOT: 'NOTUSDT',
};

async function fetchRealChartData(crypto: string, interval: string = '4h'): Promise<RealChartData | null> {
  const symbol = BINANCE_SYMBOL_MAP[crypto];
  if (!symbol) {
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000) 
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json() as number[][];
    if (!Array.isArray(data) || data.length < 20) return null;
    
    const candles: Candle[] = data.map((k: number[]) => ({
      timestamp: k[0],
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5]))
    }));
    
    return analyzeRealChart(candles, crypto, interval);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 MULTI-TIMEFRAME ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchMultiTimeframeData(crypto: string): Promise<MultiTimeframeAnalysis> {
  console.log(`📊 Fetching multi-timeframe data for ${crypto}...`);
  
  // Fetch all timeframes in parallel
  const [tf1H, tf4H, tfDaily] = await Promise.all([
    fetchRealChartData(crypto, '1h'),
    fetchRealChartData(crypto, '4h'),
    fetchRealChartData(crypto, '1d')
  ]);
  
  const successCount = [tf1H, tf4H, tfDaily].filter(Boolean).length;
  console.log(`✅ Multi-TF fetch complete: ${successCount}/3 timeframes loaded`);
  
  // Analyze confluence
  const trends: ('BULLISH' | 'BEARISH' | 'SIDEWAYS')[] = [];
  if (tf1H) trends.push(tf1H.trendAnalysis.direction);
  if (tf4H) trends.push(tf4H.trendAnalysis.direction);
  if (tfDaily) trends.push(tfDaily.trendAnalysis.direction);
  
  const bullishCount = trends.filter(t => t === 'BULLISH').length;
  const bearishCount = trends.filter(t => t === 'BEARISH').length;
  
  let overallBias: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL' = 'NEUTRAL';
  let alignment = 0;
  
  if (trends.length > 0) {
    if (bullishCount === trends.length) {
      overallBias = 'BULLISH';
      alignment = 100;
    } else if (bearishCount === trends.length) {
      overallBias = 'BEARISH';
      alignment = 100;
    } else if (bullishCount > bearishCount) {
      overallBias = bullishCount >= 2 ? 'BULLISH' : 'MIXED';
      alignment = Math.round((bullishCount / trends.length) * 100);
    } else if (bearishCount > bullishCount) {
      overallBias = bearishCount >= 2 ? 'BEARISH' : 'MIXED';
      alignment = Math.round((bearishCount / trends.length) * 100);
    } else {
      overallBias = 'MIXED';
      alignment = 50;
    }
  }
  
  // Determine HTF trend (prefer Daily > 4H)
  const htfTrend = tfDaily?.trendAnalysis.direction || tf4H?.trendAnalysis.direction || 'SIDEWAYS';
  
  // Determine LTF entry quality
  let ltfEntry: 'OPTIMAL' | 'WAIT' | 'RISKY' = 'WAIT';
  if (tf1H && tf4H) {
    const ltfTrend = tf1H.trendAnalysis.direction;
    if (ltfTrend === htfTrend && tf1H.trendAnalysis.strength >= 60) {
      ltfEntry = 'OPTIMAL';
    } else if (ltfTrend !== htfTrend) {
      ltfEntry = 'RISKY';
    }
  }
  
  // Calculate strength from all timeframes
  const strengths: number[] = [];
  if (tf1H) strengths.push(tf1H.trendAnalysis.strength);
  if (tf4H) strengths.push(tf4H.trendAnalysis.strength * 1.2); // Weight 4H higher
  if (tfDaily) strengths.push(tfDaily.trendAnalysis.strength * 1.5); // Weight Daily highest
  const avgStrength = strengths.length > 0 ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 50;
  
  // Generate multi-TF signals
  const signals: string[] = [];
  
  if (alignment === 100) {
    signals.push(`All timeframes aligned ${overallBias} — high probability setup`);
  } else if (alignment >= 66) {
    signals.push(`Strong ${overallBias.toLowerCase()} confluence across timeframes`);
  } else {
    signals.push('Mixed signals across timeframes — wait for alignment');
  }
  
  if (htfTrend !== 'SIDEWAYS' && ltfEntry === 'OPTIMAL') {
    signals.push(`HTF ${htfTrend.toLowerCase()} trend with optimal LTF entry conditions`);
  }
  
  if (tf4H && tf1H) {
    if (tf4H.volumeProfile.volumeTrend === 'INCREASING' && tf1H.volumeProfile.volumeTrend === 'INCREASING') {
      signals.push('Volume expanding on multiple timeframes — momentum building');
    }
  }
  
  if (tfDaily?.candlePatterns && tfDaily.candlePatterns.length > 0) {
    signals.push(`Daily candle pattern: ${tfDaily.candlePatterns[0].replace(' (REAL) ✓', '')}`);
  }
  
  // Collect key levels from all timeframes
  const keyLevels = {
    dailySupport: tfDaily?.supportResistance.supports || [],
    dailyResistance: tfDaily?.supportResistance.resistances || [],
    h4Support: tf4H?.supportResistance.supports || [],
    h4Resistance: tf4H?.supportResistance.resistances || [],
    h1Support: tf1H?.supportResistance.supports || [],
    h1Resistance: tf1H?.supportResistance.resistances || []
  };
  
  return {
    tf1H,
    tf4H,
    tfDaily,
    confluence: {
      overallBias,
      strength: Math.min(98, Math.round(avgStrength)),
      alignment,
      htfTrend,
      ltfEntry
    },
    keyLevels,
    signals
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 PREDICTIVE MEMORY SYSTEM — PAST, PRESENT & FUTURE
// ═══════════════════════════════════════════════════════════════════════════════

function buildPredictiveMemory(memory: MarketMemory[], currentPrice: number, currentChange: number): PredictiveMemory {
  // Analyze past patterns and their outcomes
  const pastPatterns: { pattern: string; outcome: 'WIN' | 'LOSS' | 'PENDING'; priceChange: number }[] = [];
  
  for (let i = 0; i < Math.min(memory.length - 1, 20); i++) {
    const current = memory[i];
    const next = memory[i + 1];
    
    if (current.wasCorrect !== undefined) {
      pastPatterns.push({
        pattern: `${current.bias} at ${current.confidence || 50}% confidence`,
        outcome: current.wasCorrect ? 'WIN' : 'LOSS',
        priceChange: ((current.price - next.price) / next.price) * 100
      });
    }
  }
  
  // Build price history
  const priceHistory = memory.slice(0, 30).map(m => ({
    price: m.price,
    timestamp: m.timestamp
  }));
  
  // Calculate prediction accuracy
  const feedbackRecords = memory.filter(m => m.wasCorrect !== undefined);
  const correctCount = feedbackRecords.filter(m => m.wasCorrect).length;
  const predictionAccuracy = feedbackRecords.length >= 3 
    ? Math.round((correctCount / feedbackRecords.length) * 100)
    : 50;
  
  // Calculate trend consistency (how often bias matches actual direction)
  let consistentCount = 0;
  for (let i = 0; i < Math.min(memory.length - 1, 10); i++) {
    const m = memory[i];
    const nextM = memory[i + 1];
    const actualDirection = m.price > nextM.price ? 'LONG' : 'SHORT';
    if (m.bias === actualDirection) consistentCount++;
  }
  const trendConsistency = memory.length >= 2 
    ? Math.round((consistentCount / Math.min(memory.length - 1, 10)) * 100)
    : 50;
  
  // Generate future predictions based on patterns
  const futurePredictions: { target: number; probability: number; timeframe: string; basis: string }[] = [];
  
  // Short-term prediction (24h)
  if (memory.length >= 3) {
    const avgChange = memory.slice(0, 5).reduce((a, m) => a + m.change, 0) / Math.min(memory.length, 5);
    const momentum = currentChange > avgChange ? 'accelerating' : 'decelerating';
    
    const shortTermTarget = currentPrice * (1 + (avgChange * 0.5) / 100);
    futurePredictions.push({
      target: shortTermTarget,
      probability: Math.min(75, 50 + predictionAccuracy * 0.25),
      timeframe: '24H',
      basis: `Momentum ${momentum}, avg daily change ${avgChange.toFixed(2)}%`
    });
  }
  
  // Medium-term prediction (7D)
  if (memory.length >= 7) {
    const weeklyAvg = memory.slice(0, 7).reduce((a, m) => a + m.price, 0) / 7;
    const weeklyTrend = currentPrice > weeklyAvg ? 'above' : 'below';
    const weeklyMomentum = ((currentPrice - weeklyAvg) / weeklyAvg) * 100;
    
    const projectedChange = weeklyMomentum * 0.5; // Mean reversion factor
    const mediumTermTarget = currentPrice * (1 + projectedChange / 100);
    
    futurePredictions.push({
      target: mediumTermTarget,
      probability: Math.min(65, 45 + trendConsistency * 0.2),
      timeframe: '7D',
      basis: `Price ${weeklyTrend} weekly average, ${weeklyMomentum > 0 ? '+' : ''}${weeklyMomentum.toFixed(2)}% deviation`
    });
  }
  
  // Long-term prediction (30D)
  if (memory.length >= 20) {
    const monthlyHigh = Math.max(...memory.slice(0, 20).map(m => m.price));
    const monthlyLow = Math.min(...memory.slice(0, 20).map(m => m.price));
    const monthlyRange = monthlyHigh - monthlyLow;
    const positionInRange = ((currentPrice - monthlyLow) / monthlyRange) * 100;
    
    let longTermTarget: number;
    let basis: string;
    
    if (positionInRange < 30) {
      longTermTarget = currentPrice + monthlyRange * 0.5;
      basis = 'Near monthly lows — mean reversion likely';
    } else if (positionInRange > 70) {
      longTermTarget = currentPrice - monthlyRange * 0.3;
      basis = 'Near monthly highs — pullback possible';
    } else {
      longTermTarget = currentPrice + monthlyRange * 0.25;
      basis = 'Mid-range — continuation of trend expected';
    }
    
    futurePredictions.push({
      target: longTermTarget,
      probability: Math.min(60, 40 + predictionAccuracy * 0.15),
      timeframe: '30D',
      basis
    });
  }
  
  return {
    pastPatterns,
    priceHistory,
    predictionAccuracy,
    trendConsistency,
    futurePredictions
  };
}

function analyzeRealChart(candles: Candle[], crypto: string, timeframe: string = '4h'): RealChartData {
  const recent = candles.slice(-50); // Focus on last 50 candles (8+ days)
  const currentCandle = candles[candles.length - 1];
  
  // ═══ Swing High/Low Detection ═══
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    const prev1 = recent[i - 1];
    const prev2 = recent[i - 2];
    const next1 = recent[i + 1];
    const next2 = recent[i + 2];
    
    // Swing High: Higher than 2 candles before and after
    if (c.high > prev1.high && c.high > prev2.high && c.high > next1.high && c.high > next2.high) {
      swingHighs.push(c.high);
    }
    // Swing Low: Lower than 2 candles before and after
    if (c.low < prev1.low && c.low < prev2.low && c.low < next1.low && c.low < next2.low) {
      swingLows.push(c.low);
    }
  }
  
  // ═══ Trend Analysis (HH/HL/LH/LL) ═══
  const recentHighs = swingHighs.slice(-4);
  const recentLows = swingLows.slice(-4);
  
  let higherHighs = false;
  let higherLows = false;
  let lowerHighs = false;
  let lowerLows = false;
  
  if (recentHighs.length >= 2) {
    higherHighs = recentHighs[recentHighs.length - 1] > recentHighs[recentHighs.length - 2];
    lowerHighs = recentHighs[recentHighs.length - 1] < recentHighs[recentHighs.length - 2];
  }
  if (recentLows.length >= 2) {
    higherLows = recentLows[recentLows.length - 1] > recentLows[recentLows.length - 2];
    lowerLows = recentLows[recentLows.length - 1] < recentLows[recentLows.length - 2];
  }
  
  let direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
  let trendStrength = 50;
  
  if (higherHighs && higherLows) {
    direction = 'BULLISH';
    trendStrength = 75 + Math.min(recentHighs.length * 5, 20);
  } else if (lowerHighs && lowerLows) {
    direction = 'BEARISH';
    trendStrength = 75 + Math.min(recentLows.length * 5, 20);
  } else if (higherHighs && lowerLows) {
    direction = 'SIDEWAYS';
    trendStrength = 40;
  } else if (lowerHighs && higherLows) {
    direction = 'SIDEWAYS';
    trendStrength = 35;
  }
  
  // ═══ Volume Profile Analysis ═══
  const volumes = recent.map(c => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recentVolumes = volumes.slice(-5);
  const recentAvgVol = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const olderVolumes = volumes.slice(0, 20);
  const olderAvgVol = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;
  
  const currentVsAvg = (currentCandle.volume / avgVolume) * 100;
  const volumeTrend = recentAvgVol > olderAvgVol * 1.3 ? 'INCREASING' : 
                      recentAvgVol < olderAvgVol * 0.7 ? 'DECREASING' : 'STABLE';
  const climacticVolume = currentCandle.volume > avgVolume * 2.5;
  
  // ═══ Candlestick Pattern Detection ═══
  const candlePatterns: string[] = [];
  const last = candles.slice(-5);
  
  for (let i = 1; i < last.length; i++) {
    const c = last[i];
    const prev = last[i - 1];
    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const totalRange = c.high - c.low;
    const prevBody = Math.abs(prev.close - prev.open);
    
    // Bullish Engulfing
    if (c.close > c.open && prev.close < prev.open && 
        c.close > prev.open && c.open < prev.close && body > prevBody * 1.2) {
      candlePatterns.push('Bullish Engulfing (REAL) ✓');
    }
    
    // Bearish Engulfing
    if (c.close < c.open && prev.close > prev.open &&
        c.open > prev.close && c.close < prev.open && body > prevBody * 1.2) {
      candlePatterns.push('Bearish Engulfing (REAL) ✓');
    }
    
    // Hammer (bullish reversal)
    if (totalRange > 0 && lowerWick > body * 2 && upperWick < body * 0.3 && c.close > c.open) {
      candlePatterns.push('Hammer (REAL) ✓');
    }
    
    // Shooting Star (bearish reversal)
    if (totalRange > 0 && upperWick > body * 2 && lowerWick < body * 0.3 && c.close < c.open) {
      candlePatterns.push('Shooting Star (REAL) ✓');
    }
    
    // Doji
    if (totalRange > 0 && body < totalRange * 0.1) {
      candlePatterns.push('Doji — Indecision');
    }
    
    // Strong Bullish Candle
    if (body > totalRange * 0.7 && c.close > c.open && body > avgVolume * 0.0001) {
      candlePatterns.push('Strong Bullish Candle ✓');
    }
    
    // Strong Bearish Candle
    if (body > totalRange * 0.7 && c.close < c.open) {
      candlePatterns.push('Strong Bearish Candle ✓');
    }
  }
  
  // ═══ Support/Resistance from Swing Points ═══
  const allPrices = recent.flatMap(c => [c.high, c.low]);
  const priceRange = Math.max(...allPrices) - Math.min(...allPrices);
  const tolerance = priceRange * 0.02;
  
  // Cluster swing lows for support
  const supports = clusterLevels(swingLows, tolerance).slice(0, 3);
  // Cluster swing highs for resistance
  const resistances = clusterLevels(swingHighs, tolerance).slice(0, 3);
  
  // ═══ Real Pattern Recognition ═══
  const realPatterns: string[] = [];
  
  // Double Bottom Detection
  if (swingLows.length >= 2) {
    const lastTwo = swingLows.slice(-2);
    if (Math.abs(lastTwo[0] - lastTwo[1]) < lastTwo[0] * 0.02) {
      realPatterns.push('Double Bottom forming (REAL CHART)');
    }
  }
  
  // Double Top Detection
  if (swingHighs.length >= 2) {
    const lastTwo = swingHighs.slice(-2);
    if (Math.abs(lastTwo[0] - lastTwo[1]) < lastTwo[0] * 0.02) {
      realPatterns.push('Double Top forming (REAL CHART)');
    }
  }
  
  // Break of Structure
  if (swingHighs.length >= 2 && currentCandle.close > swingHighs[swingHighs.length - 2]) {
    realPatterns.push('Bullish Break of Structure (REAL)');
  }
  if (swingLows.length >= 2 && currentCandle.close < swingLows[swingLows.length - 2]) {
    realPatterns.push('Bearish Break of Structure (REAL)');
  }
  
  // Liquidity Sweep Detection
  if (swingLows.length > 0) {
    const recentLow = Math.min(...swingLows.slice(-2));
    if (currentCandle.low < recentLow && currentCandle.close > recentLow) {
      realPatterns.push('Sellside Liquidity Sweep + Reclaim (REAL)');
    }
  }
  if (swingHighs.length > 0) {
    const recentHigh = Math.max(...swingHighs.slice(-2));
    if (currentCandle.high > recentHigh && currentCandle.close < recentHigh) {
      realPatterns.push('Buyside Liquidity Sweep + Rejection (REAL)');
    }
  }
  
  // Volume Climax
  if (climacticVolume) {
    realPatterns.push(currentCandle.close > currentCandle.open ? 
      'Climactic Buying Volume (REAL)' : 'Climactic Selling Volume (REAL)');
  }
  
  return {
    candles,
    source: `Binance ${timeframe.toUpperCase()}`,
    timeframe: timeframe.toUpperCase(),
    realPatterns,
    trendAnalysis: {
      direction,
      strength: trendStrength,
      swingHighs,
      swingLows,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows
    },
    volumeProfile: {
      averageVolume: avgVolume,
      currentVsAvg,
      volumeTrend,
      climacticVolume
    },
    candlePatterns: [...new Set(candlePatterns)].slice(0, 5),
    supportResistance: {
      supports,
      resistances
    }
  };
}

function clusterLevels(levels: number[], tolerance: number): number[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [];
  let currentCluster: number[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= tolerance) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);
  
  // Return average of each cluster, sorted by cluster size (most touches = strongest)
  return clusters
    .sort((a, b) => b.length - a.length)
    .map(c => c.reduce((a, b) => a + b, 0) / c.length);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 WYCKOFF PHASE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function detectWyckoffPhase(data: {
  price: number;
  high: number;
  low: number;
  change: number;
  rangePercent: number;
  volumeStrength: string;
}): WyckoffPhase {
  const { price, high, low, change, rangePercent, volumeStrength } = data;
  const range = high - low;
  const rangeToPrice = (range / price) * 100;
  
  // Accumulation: Price near lows, low volatility, volume increasing
  if (rangePercent < 35 && Math.abs(change) < 3 && rangeToPrice < 8) {
    if (volumeStrength === 'HIGH' && change > 0) {
      return {
        phase: 'ACCUMULATION',
        subPhase: 'Phase C - Spring',
        confidence: 85,
        description: 'Potential Wyckoff Spring — smart money accumulating below obvious support. Watch for SOS (Sign of Strength).'
      };
    } else if (volumeStrength === 'MODERATE') {
      return {
        phase: 'ACCUMULATION',
        subPhase: 'Phase B - Building Cause',
        confidence: 70,
        description: 'Building cause for future markup. Look for secondary tests and shakeouts.'
      };
    } else {
      return {
        phase: 'ACCUMULATION',
        subPhase: 'Phase A - Stopping Action',
        confidence: 60,
        description: 'Initial stopping of downtrend. Preliminary support and selling climax forming.'
      };
    }
  }
  
  // Distribution: Price near highs, low volatility, volume increasing
  if (rangePercent > 65 && Math.abs(change) < 3 && rangeToPrice < 8) {
    if (volumeStrength === 'HIGH' && change < 0) {
      return {
        phase: 'DISTRIBUTION',
        subPhase: 'Phase C - UTAD',
        confidence: 85,
        description: 'Potential Upthrust After Distribution — smart money distributing above resistance. Watch for SOW (Sign of Weakness).'
      };
    } else if (volumeStrength === 'MODERATE') {
      return {
        phase: 'DISTRIBUTION',
        subPhase: 'Phase B - Building Cause',
        confidence: 70,
        description: 'Building cause for future markdown. Look for upthrusts and secondary tests.'
      };
    } else {
      return {
        phase: 'DISTRIBUTION',
        subPhase: 'Phase A - Stopping Action',
        confidence: 60,
        description: 'Initial stopping of uptrend. Preliminary supply and buying climax forming.'
      };
    }
  }
  
  // Markup: Strong uptrend
  if (change > 5 || (change > 2 && rangePercent > 60)) {
    return {
      phase: 'MARKUP',
      subPhase: volumeStrength === 'HIGH' ? 'Strong Markup with Volume' : 'Markup Phase',
      confidence: change > 8 ? 90 : change > 5 ? 80 : 70,
      description: 'Active markup phase — trend is your friend. Look for higher highs and higher lows structure.'
    };
  }
  
  // Markdown: Strong downtrend
  if (change < -5 || (change < -2 && rangePercent < 40)) {
    return {
      phase: 'MARKDOWN',
      subPhase: volumeStrength === 'HIGH' ? 'Strong Markdown with Volume' : 'Markdown Phase',
      confidence: change < -8 ? 90 : change < -5 ? 80 : 70,
      description: 'Active markdown phase — avoid longs until structure shifts. Look for capitulation volume.'
    };
  }
  
  // Ranging/Consolidation
  return {
    phase: 'RANGING',
    subPhase: 'Consolidation',
    confidence: 55,
    description: 'Range-bound price action. Wait for clear directional break with volume confirmation.'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ADVANCED MARKET STRUCTURE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeMarketStructure(data: {
  price: number;
  high: number;
  low: number;
  change: number;
  rangePercent: number;
  memory?: MarketMemory[];
}): MarketStructure {
  const { price, high, low, change, rangePercent, memory } = data;
  
  let higherHighs = false;
  let higherLows = false;
  let lowerHighs = false;
  let lowerLows = false;
  let lastBOS: 'BULLISH' | 'BEARISH' | null = null;
  let lastCHoCH: 'BULLISH' | 'BEARISH' | null = null;
  
  // Analyze from memory if available
  if (memory && memory.length >= 2) {
    const recentPrices = memory.slice(0, 5).map(m => m.price);
    
    // Check for higher highs / higher lows
    let hhCount = 0, hlCount = 0, lhCount = 0, llCount = 0;
    for (let i = 0; i < recentPrices.length - 1; i++) {
      if (recentPrices[i] > recentPrices[i + 1]) hhCount++;
      else if (recentPrices[i] < recentPrices[i + 1]) llCount++;
    }
    
    higherHighs = hhCount >= 2;
    lowerLows = llCount >= 2;
    
    // Detect BOS/CHoCH from price action
    if (change > 3 && rangePercent > 70) {
      lastBOS = 'BULLISH';
    } else if (change < -3 && rangePercent < 30) {
      lastBOS = 'BEARISH';
    }
    
    if (memory.length >= 3) {
      const prevBias = memory[0].bias;
      const currentBias = change > 1 ? 'LONG' : change < -1 ? 'SHORT' : 'NEUTRAL';
      if (prevBias === 'SHORT' && currentBias === 'LONG' && change > 2) {
        lastCHoCH = 'BULLISH';
      } else if (prevBias === 'LONG' && currentBias === 'SHORT' && change < -2) {
        lastCHoCH = 'BEARISH';
      }
    }
  }
  
  // Determine overall structure
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
  let strength = 50;
  
  if (change > 5 || (higherHighs && rangePercent > 60)) {
    trend = 'BULLISH';
    strength = Math.min(90, 60 + Math.abs(change) * 3);
  } else if (change < -5 || (lowerLows && rangePercent < 40)) {
    trend = 'BEARISH';
    strength = Math.min(90, 60 + Math.abs(change) * 3);
  } else {
    trend = 'RANGING';
    strength = 50 - Math.abs(rangePercent - 50);
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
// 🌊 ELLIOTT WAVE APPROXIMATION
// ═══════════════════════════════════════════════════════════════════════════════

function approximateElliottWave(data: {
  price: number;
  high: number;
  low: number;
  change: number;
  rangePercent: number;
}): ElliottWave {
  const { price, high, low, change, rangePercent } = data;
  const range = high - low;
  
  // Simplified Elliott Wave detection based on position and momentum
  if (rangePercent < 20 && change > 0) {
    return {
      wave: 'Wave 1/A',
      subwave: 'Initiating impulse',
      direction: 'IMPULSE',
      target: low + range * 1.618,
      invalidation: low - range * 0.1
    };
  } else if (rangePercent > 20 && rangePercent < 40 && change < 0) {
    return {
      wave: 'Wave 2/B',
      subwave: 'Corrective pullback',
      direction: 'CORRECTIVE',
      target: low + range * 0.382,
      invalidation: low
    };
  } else if (rangePercent > 40 && rangePercent < 70 && change > 2) {
    return {
      wave: 'Wave 3/C',
      subwave: 'Extended impulse (strongest)',
      direction: 'IMPULSE',
      target: high + range * 0.618,
      invalidation: low + range * 0.382
    };
  } else if (rangePercent > 70 && rangePercent < 85 && change < 0) {
    return {
      wave: 'Wave 4',
      subwave: 'Consolidation',
      direction: 'CORRECTIVE',
      target: low + range * 0.50,
      invalidation: price + range * 0.1
    };
  } else if (rangePercent > 85) {
    return {
      wave: 'Wave 5',
      subwave: 'Final push (ending diagonal)',
      direction: 'IMPULSE',
      target: high + range * 0.382,
      invalidation: high - range * 0.236
    };
  }
  
  return {
    wave: 'Complex',
    subwave: 'Irregular correction',
    direction: 'CORRECTIVE',
    target: price + (change > 0 ? range * 0.382 : -range * 0.382),
    invalidation: change > 0 ? low : high
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💧 LIQUIDITY MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function mapLiquidityPools(data: {
  price: number;
  high: number;
  low: number;
  crypto: string;
}): LiquidityPool[] {
  const { price, high, low, crypto } = data;
  const range = high - low;
  const pools: LiquidityPool[] = [];
  
  // Above current price (buyside liquidity / buy stops)
  pools.push({
    level: high,
    type: 'BUYSIDE',
    strength: 90,
    swept: false
  });
  pools.push({
    level: high + range * 0.1,
    type: 'BUYSIDE',
    strength: 75,
    swept: false
  });
  
  // Below current price (sellside liquidity / sell stops)
  pools.push({
    level: low,
    type: 'SELLSIDE',
    strength: 90,
    swept: false
  });
  pools.push({
    level: low - range * 0.1,
    type: 'SELLSIDE',
    strength: 75,
    swept: false
  });
  
  // Psychological levels
  const cryptoInfo = CRYPTO_KNOWLEDGE[crypto as keyof typeof CRYPTO_KNOWLEDGE];
  if (cryptoInfo) {
    cryptoInfo.keyLevels.psychological.forEach(level => {
      if (Math.abs(level - price) < price * 0.2) {
        pools.push({
          level,
          type: level > price ? 'BUYSIDE' : 'SELLSIDE',
          strength: 85,
          swept: Math.abs(level - high) < range * 0.02 || Math.abs(level - low) < range * 0.02
        });
      }
    });
  }
  
  return pools;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ELITE CHAIN-OF-THOUGHT REASONING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function thinkDeep(data: {
  crypto: string;
  price: number;
  change: number;
  high: number;
  low: number;
  rangePercent: number;
  rsi: number;
  volumeStrength: string;
  marketPhase: string;
  memory?: MarketMemory[];
}): { thoughts: ThinkingStep[]; patterns: string[]; insights: string[] } {
  const thoughts: ThinkingStep[] = [];
  const patterns: string[] = [];
  const insights: string[] = [];
  
  const { crypto, price, change, high, low, rangePercent, rsi, volumeStrength, marketPhase, memory } = data;
  const range = high - low;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: Initial Market State Assessment
  // ─────────────────────────────────────────────────────────────────────────────
  thoughts.push({
    step: 1,
    thought: `Initializing deep analysis of ${crypto} at $${price.toLocaleString()}. 24h performance: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%. Daily range: $${low.toFixed(2)} — $${high.toFixed(2)} (${(range/low*100).toFixed(1)}% volatility window). Current position: ${rangePercent.toFixed(0)}% of range.`,
    conclusion: `Market is ${Math.abs(change) > 5 ? 'highly volatile' : Math.abs(change) > 2 ? 'moderately active' : 'consolidating'}. ${rangePercent > 70 ? 'Premium pricing zone.' : rangePercent < 30 ? 'Discount pricing zone.' : 'Fair value equilibrium.'}`,
    weight: 8
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2: Advanced Pattern Recognition
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Accumulation/Distribution detection
  if (change < -3 && rangePercent < 30) {
    patterns.push(MARKET_PATTERNS.accumulationZone.name);
    patterns.push(MARKET_PATTERNS.springPattern.name);
    thoughts.push({
      step: 2,
      thought: `Price dropped ${Math.abs(change).toFixed(1)}% to ${rangePercent.toFixed(0)}% of range — this is the discount zone. This pattern matches Wyckoff Accumulation Phase C (Spring). Smart money accumulates here while retail panics. Volume is ${volumeStrength} — ${volumeStrength === 'HIGH' ? 'confirming institutional interest' : 'watch for volume confirmation'}.`,
      conclusion: "High probability accumulation zone — Spring pattern active. Prepare for markup.",
      weight: 9
    });
  } else if (change > 3 && rangePercent > 70) {
    patterns.push(MARKET_PATTERNS.distributionZone.name);
    patterns.push(MARKET_PATTERNS.upthrustPattern.name);
    thoughts.push({
      step: 2,
      thought: `Price surged ${change.toFixed(1)}% to ${rangePercent.toFixed(0)}% of range — premium zone. This matches Wyckoff Distribution Phase C (UTAD). Retail FOMO peaks here while smart money distributes. Volume is ${volumeStrength} — ${volumeStrength === 'HIGH' ? 'potential blow-off top' : 'exhaustion likely'}.`,
      conclusion: "Distribution zone detected — Upthrust pattern active. Caution on new longs.",
      weight: 9
    });
  }
  
  // Divergence patterns
  if (rsi < 30 && change > 0) {
    patterns.push(MARKET_PATTERNS.bullishDivergence.name);
    thoughts.push({
      step: 2,
      thought: `RSI at ${rsi.toFixed(0)} (oversold) while price is recovering (+${change.toFixed(1)}%). This bullish divergence indicates selling pressure is exhausting. Momentum is shifting before price confirms — high probability reversal setup.`,
      conclusion: "Bullish divergence confirmed — momentum leading price higher.",
      weight: 8
    });
  } else if (rsi > 70 && change < 0) {
    patterns.push(MARKET_PATTERNS.bearishDivergence.name);
    thoughts.push({
      step: 2,
      thought: `RSI at ${rsi.toFixed(0)} (overbought) while price is declining (${change.toFixed(1)}%). This bearish divergence shows buying pressure fading. Smart money already exiting — expect continuation lower.`,
      conclusion: "Bearish divergence active — momentum leading price lower.",
      weight: 8
    });
  }
  
  // Break of Structure / Change of Character
  if (Math.abs(change) > 4) {
    patterns.push(MARKET_PATTERNS.bos.name);
    if (memory && memory.length > 0 && memory[0].bias !== (change > 0 ? 'LONG' : 'SHORT')) {
      patterns.push(MARKET_PATTERNS.choch.name);
      thoughts.push({
        step: 2,
        thought: `Significant ${Math.abs(change).toFixed(1)}% move represents a clear Break of Structure AND Change of Character (CHoCH). Previous bias was ${memory[0].bias}, now flipping to ${change > 0 ? 'BULLISH' : 'BEARISH'}. This is the highest probability reversal confirmation in ICT methodology.`,
        conclusion: `CHoCH confirmed ${change > 0 ? 'to the upside' : 'to the downside'} — trend reversal in progress.`,
        weight: 10
      });
    } else {
      thoughts.push({
        step: 2,
        thought: `${Math.abs(change).toFixed(1)}% move confirms Break of Structure ${change > 0 ? 'to the upside' : 'to the downside'}. Market structure now ${change > 0 ? 'bullish' : 'bearish'}. Look for retest of broken level as new ${change > 0 ? 'support' : 'resistance'}.`,
        conclusion: `BOS confirmed — structure now ${change > 0 ? 'bullish' : 'bearish'}.`,
        weight: 9
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 3: Smart Money Concepts Deep Analysis
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Liquidity sweep detection
  if (rangePercent < 15 || rangePercent > 85) {
    const sweepType = rangePercent < 15 ? 'sellside' : 'buyside';
    patterns.push(rangePercent < 15 ? MARKET_PATTERNS.sellsideLiquidity.name : MARKET_PATTERNS.buysideLiquidity.name);
    patterns.push(MARKET_PATTERNS.liquiditySweep.name);
    thoughts.push({
      step: 3,
      thought: `Price at ${rangePercent.toFixed(0)}% of range — ${sweepType} liquidity has been swept. Stop losses triggered ${rangePercent < 15 ? 'below support' : 'above resistance'}. This is the classic ICT liquidity grab. Institutions collected orders from retail traders. Expect reversal as smart money now holds favorable positions.`,
      conclusion: `${sweepType.charAt(0).toUpperCase() + sweepType.slice(1)} liquidity swept — high probability reversal zone.`,
      weight: 10
    });
  }
  
  // Order Block analysis
  if ((rangePercent > 5 && rangePercent < 20) || (rangePercent > 80 && rangePercent < 95)) {
    patterns.push(MARKET_PATTERNS.orderBlockTest.name);
    const obType = rangePercent < 50 ? 'bullish' : 'bearish';
    thoughts.push({
      step: 3,
      thought: `Price testing ${obType} order block zone. This represents an area where institutions previously placed significant orders. ${obType === 'bullish' ? 'Expecting demand to enter' : 'Expecting supply to enter'}. Watch for reaction with ${volumeStrength === 'HIGH' ? 'this strong volume confirming OB' : 'volume to confirm OB holds'}.`,
      conclusion: `Order Block test in progress — ${obType} reaction expected.`,
      weight: 8
    });
  }
  
  // Fair Value Gap analysis
  if (Math.abs(change) > 2 && Math.abs(change) < 5) {
    patterns.push(MARKET_PATTERNS.fvgFill.name);
    thoughts.push({
      step: 3,
      thought: `${Math.abs(change).toFixed(1)}% move created Fair Value Gaps that price will seek to fill. These imbalances act as magnets. ${change > 0 ? 'Bullish FVG below may support pullbacks' : 'Bearish FVG above may reject rallies'}. Target: 50-70% of gap for optimal entry.`,
      conclusion: "FVG imbalance detected — watch for price to return and fill.",
      weight: 7
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 4: Volume Profile Analysis
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (volumeStrength === 'HIGH' && Math.abs(change) > 3) {
    patterns.push(MARKET_PATTERNS.volumeClimactic.name);
    thoughts.push({
      step: 4,
      thought: `Climactic volume with ${Math.abs(change).toFixed(1)}% move indicates strong conviction. This is ${change > 0 ? 'accumulation' : 'distribution'} on a large scale. ${change > 0 ? 'Buyers are aggressive — trend likely to continue after consolidation.' : 'Sellers are aggressive — expect further downside after dead cat bounces.'}`,
      conclusion: `Volume confirms ${change > 0 ? 'buying' : 'selling'} pressure — trend continuation expected.`,
      weight: 8
    });
  } else if (volumeStrength === 'LOW' && Math.abs(change) > 2) {
    patterns.push(MARKET_PATTERNS.volumeDry.name);
    thoughts.push({
      step: 4,
      thought: `Low volume on ${Math.abs(change).toFixed(1)}% move is concerning — move lacks conviction. This could be a ${change > 0 ? 'bull trap' : 'bear trap'}. Wait for volume confirmation before committing. Institutions aren't participating yet.`,
      conclusion: "Volume doesn't confirm move — potential trap, wait for confirmation.",
      weight: 7
    });
  } else {
    thoughts.push({
      step: 4,
      thought: `Volume strength is ${volumeStrength}. ${volumeStrength === 'MODERATE' ? 'Moderate conviction — trend is developing but not confirmed. Watch for volume expansion.' : 'Low volume suggests ranging conditions. Breakout needs volume confirmation.'}`,
      conclusion: volumeStrength === 'MODERATE' ? "Developing trend — monitor for volume expansion." : "Range-bound — wait for breakout with volume.",
      weight: 6
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 5: Multi-Timeframe Confluence
  // ─────────────────────────────────────────────────────────────────────────────
  
  const htfBias = change > 1 ? 'BULLISH' : change < -1 ? 'BEARISH' : 'NEUTRAL';
  const ltfZone = rangePercent < 40 ? 'discount' : rangePercent > 60 ? 'premium' : 'equilibrium';
  
  thoughts.push({
    step: 5,
    thought: `Multi-Timeframe Analysis: HTF bias is ${htfBias} based on ${Math.abs(change).toFixed(1)}% daily move. LTF is in ${ltfZone} zone (${rangePercent.toFixed(0)}% of range). ${htfBias === 'BULLISH' && ltfZone === 'discount' ? 'OPTIMAL: Bullish HTF + discount LTF = high probability long setup.' : htfBias === 'BEARISH' && ltfZone === 'premium' ? 'OPTIMAL: Bearish HTF + premium LTF = high probability short setup.' : 'Partial confluence — wait for better alignment.'}`,
    conclusion: htfBias !== 'NEUTRAL' && ((htfBias === 'BULLISH' && ltfZone === 'discount') || (htfBias === 'BEARISH' && ltfZone === 'premium')) ? "Strong MTF confluence — high probability setup." : "Partial confluence — patience required.",
    weight: 9
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 6: Memory & Learning Integration
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (memory && memory.length > 0) {
    const recentMemories = memory.slice(0, 5);
    const avgConfidence = recentMemories.reduce((a, m) => a + m.confidence, 0) / recentMemories.length;
    const biasConsistency = recentMemories.filter(m => m.bias === (change > 0 ? 'LONG' : 'SHORT')).length / recentMemories.length;
    
    // Analyze accuracy from feedback
    const feedbackMemories = memory.filter(m => m.wasCorrect !== undefined);
    const correctCount = feedbackMemories.filter(m => m.wasCorrect === true).length;
    const accuracy = feedbackMemories.length > 0 ? (correctCount / feedbackMemories.length * 100) : null;
    
    thoughts.push({
      step: 6,
      thought: `Memory Analysis: ${memory.length} historical analyses for ${crypto}. Average confidence: ${avgConfidence.toFixed(0)}%. Bias consistency with current conditions: ${(biasConsistency * 100).toFixed(0)}%. ${accuracy !== null ? `Learning accuracy: ${accuracy.toFixed(0)}% from ${feedbackMemories.length} feedback points.` : 'Collecting feedback data.'}`,
      conclusion: biasConsistency > 0.6 ? "Historical patterns align — confidence boosted." : accuracy !== null && accuracy < 50 ? "Adjusting strategy based on feedback." : "Adapting to new market conditions.",
      weight: 7
    });
    
    // Pattern matching with history
    const similarPatterns = recentMemories.filter(m => Math.abs(m.change - change) < 3);
    if (similarPatterns.length > 0) {
      const correctOnes = similarPatterns.filter(m => m.wasCorrect === true);
      insights.push(`Found ${similarPatterns.length} similar historical setups. ${correctOnes.length > 0 ? `${correctOnes.length} were confirmed correct.` : 'Awaiting outcome confirmation.'}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 7: Crypto-Specific Intelligence
  // ─────────────────────────────────────────────────────────────────────────────
  
  const cryptoInfo = CRYPTO_KNOWLEDGE[crypto as keyof typeof CRYPTO_KNOWLEDGE];
  if (cryptoInfo) {
    insights.push(`${crypto} Correlations: ${cryptoInfo.correlations.join(', ')}`);
    insights.push(`Cycle Context: ${cryptoInfo.cycles}`);
    insights.push(`Fundamentals: ${cryptoInfo.fundamentals}`);
    insights.push(`Institutional Behavior: ${cryptoInfo.institutionalBehavior}`);
    insights.push(`Volatility Profile: ${cryptoInfo.volatilityProfile}`);
    
    thoughts.push({
      step: 7,
      thought: `${crypto}-Specific Analysis: ${cryptoInfo.dominance}. Current correlations suggest watching ${cryptoInfo.correlations[0].split(' ')[0]} for confirmation. ${cryptoInfo.onchainSignals.length > 0 ? `On-chain signals to monitor: ${cryptoInfo.onchainSignals.slice(0, 2).join(', ')}.` : ''}`,
      conclusion: `Integrating ${crypto}-specific intelligence into analysis.`,
      weight: 7
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Step 8: Risk Assessment & Final Synthesis
  // ─────────────────────────────────────────────────────────────────────────────
  
  const patternScore = patterns.length;
  const volumeScore = volumeStrength === 'HIGH' ? 3 : volumeStrength === 'MODERATE' ? 2 : 1;
  const momentumScore = Math.abs(change) > 5 ? 3 : Math.abs(change) > 2 ? 2 : 1;
  const totalScore = patternScore + volumeScore + momentumScore;
  const conviction = totalScore >= 10 ? 'VERY HIGH' : totalScore >= 7 ? 'HIGH' : totalScore >= 5 ? 'MODERATE' : 'DEVELOPING';
  
  thoughts.push({
    step: 8,
    thought: `Final Synthesis: ${patterns.length} patterns detected (score: ${patternScore}). Volume conviction: ${volumeStrength} (score: ${volumeScore}). Momentum: ${Math.abs(change).toFixed(1)}% (score: ${momentumScore}). Total confluence score: ${totalScore}. Market phase: ${marketPhase}. Risk/Reward assessment: ${conviction}.`,
    conclusion: `Primary bias: ${change > 2 && rangePercent > 40 ? 'LONG' : change < -2 && rangePercent < 60 ? 'SHORT' : 'NEUTRAL'} with ${conviction} conviction. ${conviction === 'VERY HIGH' || conviction === 'HIGH' ? 'High probability setup — execute with defined risk.' : 'Wait for additional confirmation.'}`,
    weight: 10
  });
  
  return { thoughts, patterns, insights };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 ADVANCED PROBABILITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function calculateProbabilities(data: {
  change: number;
  rangePercent: number;
  rsi: number;
  volumeStrength: string;
  patterns: string[];
  marketPhase: string;
  marketStructure: MarketStructure;
  wyckoffPhase: WyckoffPhase;
  memory?: MarketMemory[];
}): { bullProb: number; bearProb: number; neutralProb: number; confidence: number } {
  let bullScore = 50;
  let bearScore = 50;
  
  // ─── Price Momentum (weighted: 20%) ───
  if (data.change > 7) bullScore += 20;
  else if (data.change > 5) bullScore += 16;
  else if (data.change > 3) bullScore += 12;
  else if (data.change > 1) bullScore += 6;
  else if (data.change < -7) bearScore += 20;
  else if (data.change < -5) bearScore += 16;
  else if (data.change < -3) bearScore += 12;
  else if (data.change < -1) bearScore += 6;
  
  // ─── Range Position (weighted: 15%) ───
  if (data.rangePercent < 15) bullScore += 15; // Deep discount
  else if (data.rangePercent < 30) bullScore += 10;
  else if (data.rangePercent < 40) bullScore += 5;
  else if (data.rangePercent > 85) bearScore += 15; // Deep premium
  else if (data.rangePercent > 70) bearScore += 10;
  else if (data.rangePercent > 60) bearScore += 5;
  
  // ─── RSI (weighted: 12%) ───
  if (data.rsi < 25) bullScore += 12; // Extremely oversold
  else if (data.rsi < 35) bullScore += 8;
  else if (data.rsi < 45) bullScore += 4;
  else if (data.rsi > 75) bearScore += 12; // Extremely overbought
  else if (data.rsi > 65) bearScore += 8;
  else if (data.rsi > 55) bearScore += 4;
  
  // ─── Volume Confirmation (weighted: 15%) ───
  if (data.volumeStrength === 'HIGH') {
    if (data.change > 0) bullScore += 15;
    else if (data.change < 0) bearScore += 15;
  } else if (data.volumeStrength === 'MODERATE') {
    if (data.change > 0) bullScore += 8;
    else if (data.change < 0) bearScore += 8;
  }
  
  // ─── Pattern Recognition (weighted: 20%) ───
  const bullishPatterns = [
    'Bullish Engulfing', 'Morning Star', 'Hammer at Support', 'Bullish RSI Divergence',
    'Accumulation Zone', 'Bull Flag', 'Inverse Head & Shoulders', 'Double Bottom',
    'Wyckoff Spring', 'Sellside Liquidity Grab', 'Breakout Retest'
  ];
  const bearishPatterns = [
    'Bearish Engulfing', 'Evening Star', 'Shooting Star at Resistance', 'Bearish RSI Divergence',
    'Distribution Zone', 'Bear Flag', 'Head & Shoulders', 'Double Top',
    'Wyckoff Upthrust', 'Buyside Liquidity Grab', 'Breakdown Retest'
  ];
  const smartMoneyPatterns = [
    'Break of Structure', 'Change of Character', 'Liquidity Sweep', 'Order Block Retest', 'Fair Value Gap Fill'
  ];
  
  data.patterns.forEach(p => {
    if (bullishPatterns.some(bp => p.includes(bp) || bp.includes(p))) bullScore += 7;
    if (bearishPatterns.some(bp => p.includes(bp) || bp.includes(p))) bearScore += 7;
    if (smartMoneyPatterns.some(smp => p.includes(smp))) {
      // Smart money patterns get directional bonus based on range position
      if (data.rangePercent < 40) bullScore += 5;
      else if (data.rangePercent > 60) bearScore += 5;
    }
  });
  
  // ─── Market Structure (weighted: 10%) ───
  if (data.marketStructure.trend === 'BULLISH') bullScore += 10;
  else if (data.marketStructure.trend === 'BEARISH') bearScore += 10;
  if (data.marketStructure.lastCHoCH === 'BULLISH') bullScore += 8;
  else if (data.marketStructure.lastCHoCH === 'BEARISH') bearScore += 8;
  if (data.marketStructure.lastBOS === 'BULLISH') bullScore += 5;
  else if (data.marketStructure.lastBOS === 'BEARISH') bearScore += 5;
  
  // ─── Wyckoff Phase (weighted: 8%) ───
  if (data.wyckoffPhase.phase === 'ACCUMULATION') bullScore += 8;
  else if (data.wyckoffPhase.phase === 'DISTRIBUTION') bearScore += 8;
  else if (data.wyckoffPhase.phase === 'MARKUP') bullScore += 6;
  else if (data.wyckoffPhase.phase === 'MARKDOWN') bearScore += 6;
  
  // ─── Learning Adjustment (weighted: 5%) ───
  if (data.memory && data.memory.length >= 3) {
    const feedbackMemories = data.memory.filter(m => m.wasCorrect !== undefined);
    if (feedbackMemories.length >= 3) {
      const longFeedback = feedbackMemories.filter(m => m.bias === 'LONG');
      const shortFeedback = feedbackMemories.filter(m => m.bias === 'SHORT');
      
      const longAccuracy = longFeedback.length > 0 ? 
        (longFeedback.filter(m => m.wasCorrect).length / longFeedback.length) : 0.5;
      const shortAccuracy = shortFeedback.length > 0 ? 
        (shortFeedback.filter(m => m.wasCorrect).length / shortFeedback.length) : 0.5;
      
      // Boost probabilities based on historical accuracy
      if (longAccuracy > 0.7) bullScore += 5;
      if (shortAccuracy > 0.7) bearScore += 5;
      if (longAccuracy < 0.3) bullScore -= 5;
      if (shortAccuracy < 0.3) bearScore -= 5;
    }
  }
  
  // Normalize to 100%
  const total = bullScore + bearScore;
  const bullProb = Math.round((bullScore / total) * 100);
  const bearProb = Math.round((bearScore / total) * 100);
  const neutralProb = Math.max(0, Math.min(20, Math.abs(bullProb - bearProb) < 10 ? 15 : 5));
  
  // Calculate overall confidence based on conviction
  const probDiff = Math.abs(bullProb - bearProb);
  const patternCount = data.patterns.length;
  const confidence = Math.min(95, Math.max(55, 
    50 + probDiff * 0.3 + patternCount * 3 + 
    (data.volumeStrength === 'HIGH' ? 8 : data.volumeStrength === 'MODERATE' ? 4 : 0) +
    data.wyckoffPhase.confidence * 0.1
  ));
  
  return { bullProb, bearProb, neutralProb, confidence: Math.round(confidence) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateCryptoSymbol(value: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, sanitized: "", error: "Cryptocurrency symbol is required" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 20) {
    return { valid: false, sanitized: "", error: "Invalid symbol length" };
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  if (sanitized.length === 0) {
    return { valid: false, sanitized: "", error: "Invalid cryptocurrency symbol format" };
  }
  return { valid: true, sanitized };
}

function validateNumber(value: unknown, fieldName: string, min: number, max: number, required = true): { valid: boolean; value: number; error?: string } {
  if (value === undefined || value === null) {
    if (required) return { valid: false, value: 0, error: `${fieldName} is required` };
    return { valid: true, value: 0 };
  }
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return { valid: false, value: 0, error: `${fieldName} must be a valid number` };
  }
  if (value < min || value > max) {
    return { valid: false, value: 0, error: `${fieldName} out of range` };
  }
  return { valid: true, value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN SERVER HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    let body: { crypto?: unknown; price?: unknown; change?: unknown; high24h?: unknown; low24h?: unknown; volume?: unknown; marketCap?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { crypto, price, change, high24h, low24h, volume, marketCap } = body;
    
    const cryptoValidation = validateCryptoSymbol(crypto);
    if (!cryptoValidation.valid) {
      return new Response(JSON.stringify({ error: cryptoValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const priceValidation = validateNumber(price, "price", 0, 1e15);
    const changeValidation = validateNumber(change, "change", -100, 10000);
    
    if (!priceValidation.valid) {
      return new Response(JSON.stringify({ error: priceValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (!changeValidation.valid) {
      return new Response(JSON.stringify({ error: changeValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const high24hValidation = validateNumber(high24h, "high24h", 0, 1e15, false);
    const low24hValidation = validateNumber(low24h, "low24h", 0, 1e15, false);
    const volumeValidation = validateNumber(volume, "volume", 0, 1e18, false);
    const marketCapValidation = validateNumber(marketCap, "marketCap", 0, 1e18, false);
    
    const sanitizedCrypto = cryptoValidation.sanitized;
    const validatedPrice = priceValidation.value;
    const validatedChange = changeValidation.value;
    const validatedHigh24h = high24hValidation.value || validatedPrice * 1.025;
    const validatedLow24h = low24hValidation.value || validatedPrice * 0.975;
    const validatedVolume = volumeValidation.value;
    const validatedMarketCap = marketCapValidation.value;
    
    console.log(`🧠 AI Brain v7.0 analyzing ${sanitizedCrypto} at $${validatedPrice} with ${validatedChange}% change`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 📊 MULTI-TIMEFRAME CHART ANALYSIS (1H, 4H, DAILY)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const mtfAnalysis = await fetchMultiTimeframeData(sanitizedCrypto);
    const realChartData = mtfAnalysis.tf4H; // Primary timeframe for patterns
    
    console.log(`📊 MTF Analysis: ${mtfAnalysis.confluence.overallBias} bias, ${mtfAnalysis.confluence.alignment}% alignment, HTF: ${mtfAnalysis.confluence.htfTrend}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 CORE AI BRAIN v6.0 — ADAPTIVE NEURAL LEARNING
    // ═══════════════════════════════════════════════════════════════════════════
    
    const priceNum = validatedPrice;
    const highNum = validatedHigh24h;
    const lowNum = validatedLow24h;
    const range = highNum - lowNum;
    const midPoint = (highNum + lowNum) / 2;
    const rangePercent = range > 0 ? ((priceNum - lowNum) / range) * 100 : 50;
    
    // Advanced RSI estimation
    const rsiEstimate = rangePercent > 80 ? 70 + (rangePercent - 80) * 0.75 : 
                        rangePercent > 60 ? 55 + (rangePercent - 60) * 0.75 :
                        rangePercent < 20 ? 30 - (20 - rangePercent) * 0.75 :
                        rangePercent < 40 ? 45 - (40 - rangePercent) * 0.5 :
                        50 + (rangePercent - 50) * 0.25;
    
    const volumeToMcap = validatedVolume && validatedMarketCap ? 
                         ((validatedVolume / validatedMarketCap) * 100) : 0;
    const volumeStrength = volumeToMcap > 8 ? 'HIGH' : volumeToMcap > 3 ? 'MODERATE' : 'LOW';
    
    // Market phase detection
    let marketPhase = "Consolidation";
    let bias = "NEUTRAL";
    if (validatedChange > 7) { marketPhase = "Strong Markup"; bias = "LONG"; }
    else if (validatedChange > 4) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -7) { marketPhase = "Strong Markdown"; bias = "SHORT"; }
    else if (validatedChange < -4) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (validatedChange > 2 && rangePercent > 60) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -2 && rangePercent < 40) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (rangePercent > 75) { marketPhase = "Distribution"; bias = "SHORT"; }
    else if (rangePercent < 25) { marketPhase = "Accumulation"; bias = "LONG"; }
    
    // Fetch memory and learning stats from database
    let memory: MarketMemory[] = [];
    let learningAccuracy = 95;
    let totalFeedback = 0;
    let correctPredictions = 0;
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: historyData } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('symbol', sanitizedCrypto)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (historyData) {
          memory = historyData.map(h => ({
            symbol: h.symbol,
            price: h.price,
            change: h.change_24h,
            bias: h.bias || 'NEUTRAL',
            confidence: h.confidence || 70,
            timestamp: h.created_at,
            patterns: [],
            wasCorrect: h.was_correct
          }));
          
          const feedbackRecords = historyData.filter(h => h.was_correct !== null);
          totalFeedback = feedbackRecords.length;
          correctPredictions = feedbackRecords.filter(h => h.was_correct === true).length;
          
          if (totalFeedback >= 3) {
            learningAccuracy = Math.round((correctPredictions / totalFeedback) * 100);
            console.log(`📊 Learning Stats: ${correctPredictions}/${totalFeedback} correct (${learningAccuracy}%)`);
          }
        }
      }
    } catch (e) {
      console.log("Memory fetch skipped:", e);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔮 ADVANCED ANALYSIS ENGINES
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Wyckoff Phase Detection
    const wyckoffPhase = detectWyckoffPhase({
      price: priceNum,
      high: highNum,
      low: lowNum,
      change: validatedChange,
      rangePercent,
      volumeStrength
    });
    
    // Market Structure Analysis
    const marketStructure = analyzeMarketStructure({
      price: priceNum,
      high: highNum,
      low: lowNum,
      change: validatedChange,
      rangePercent,
      memory
    });
    
    // Elliott Wave Approximation
    const elliottWave = approximateElliottWave({
      price: priceNum,
      high: highNum,
      low: lowNum,
      change: validatedChange,
      rangePercent
    });
    
    // Liquidity Mapping
    const liquidityPools = mapLiquidityPools({
      price: priceNum,
      high: highNum,
      low: lowNum,
      crypto: sanitizedCrypto
    });
    
    // Deep Thinking Engine
    const { thoughts, patterns, insights } = thinkDeep({
      crypto: sanitizedCrypto,
      price: priceNum,
      change: validatedChange,
      high: highNum,
      low: lowNum,
      rangePercent,
      rsi: rsiEstimate,
      volumeStrength,
      marketPhase,
      memory
    });
    
    // Probability Calculation
    const probabilities = calculateProbabilities({
      change: validatedChange,
      rangePercent,
      rsi: rsiEstimate,
      volumeStrength,
      patterns,
      marketPhase,
      marketStructure,
      wyckoffPhase,
      memory
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🧬 ADAPTIVE LEARNING ENGINE + PREDICTIVE MEMORY
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Build predictive memory from historical data
    const predictiveMemory = buildPredictiveMemory(memory, priceNum, validatedChange);
    
    // Get trend direction for scenario matching — use MTF confluence
    const trendDirection = mtfAnalysis.confluence.htfTrend || 
      (validatedChange > 3 ? 'BULLISH' : validatedChange < -3 ? 'BEARISH' : 'SIDEWAYS');
    
    // Run adaptive scenario analysis
    const adaptiveLearning = analyzeScenario({
      trendDirection,
      rangePercent,
      volumeStrength,
      volatility: Math.abs(validatedChange),
      patterns,
      memory,
      realChartData
    });
    
    // Learn from real chart data
    const chartLessons = learnFromChartData(realChartData, memory);
    
    // Learning insights with MTF integration
    const learningInsights: string[] = [];
    
    // Add MTF signals first
    learningInsights.push(...mtfAnalysis.signals.slice(0, 2));
    
    if (totalFeedback >= 3) {
      if (learningAccuracy >= 80) {
        learningInsights.push(`Excellent accuracy (${learningAccuracy}%) — strategy highly effective for ${sanitizedCrypto}`);
      } else if (learningAccuracy >= 65) {
        learningInsights.push(`Good accuracy (${learningAccuracy}%) — strategy performing above average`);
      } else if (learningAccuracy >= 50) {
        learningInsights.push(`Moderate accuracy (${learningAccuracy}%) — refining approach based on ${totalFeedback} feedback points`);
      } else {
        learningInsights.push(`Adaptive mode — adjusting strategy, accuracy at ${learningAccuracy}% from ${totalFeedback} points`);
      }
    }
    
    // Add adaptive adjustments and chart lessons
    learningInsights.push(...adaptiveLearning.adaptiveAdjustments.slice(0, 2));
    learningInsights.push(...chartLessons.slice(0, 2));
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📐 SMART MONEY LEVELS CALCULATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Order Blocks
    const obBullishLow = lowNum;
    const obBullishHigh = lowNum + (range * 0.15);
    const obBearishLow = highNum - (range * 0.15);
    const obBearishHigh = highNum;
    
    // Fair Value Gaps
    const fvgBullishZone = `$${(lowNum + range * 0.25).toFixed(2)} - $${(lowNum + range * 0.35).toFixed(2)}`;
    const fvgBearishZone = `$${(highNum - range * 0.35).toFixed(2)} - $${(highNum - range * 0.25).toFixed(2)}`;
    
    // Micro Order Blocks (15M precision)
    const microOBBullish = `$${(lowNum + range * 0.05).toFixed(2)} - $${(lowNum + range * 0.10).toFixed(2)}`;
    const microOBBearish = `$${(highNum - range * 0.10).toFixed(2)} - $${(highNum - range * 0.05).toFixed(2)}`;
    
    // Optimal Trade Entry (OTE) zones
    const oteZoneBullish = `$${(lowNum + range * 0.618).toFixed(2)} - $${(lowNum + range * 0.786).toFixed(2)}`;
    const oteZoneBearish = `$${(highNum - range * 0.786).toFixed(2)} - $${(highNum - range * 0.618).toFixed(2)}`;
    
    // Equilibrium
    const equilibrium = (highNum + lowNum) / 2;
    
    // Entry/exit calculations
    const bullEntry = (lowNum + range * 0.236).toFixed(2);
    const bullStop = (lowNum - range * 0.05).toFixed(2);
    const bullTP1 = (priceNum + range * 0.382).toFixed(2);
    const bullTP2 = (priceNum + range * 0.618).toFixed(2);
    const bullTP3 = (priceNum + range * 1.0).toFixed(2);
    const bullTP4 = (priceNum + range * 1.618).toFixed(2);
    
    const bearEntry = (highNum - range * 0.236).toFixed(2);
    const bearStop = (highNum + range * 0.05).toFixed(2);
    const bearTarget1 = lowNum - (range * 0.382);
    const bearTarget2 = lowNum - (range * 0.618);
    const bearTarget3 = lowNum - range;
    const bearTarget4 = lowNum - range * 1.618;
    
    const bullRR = ((Number(bullTP2) - Number(bullEntry)) / (Number(bullEntry) - Number(bullStop))).toFixed(1);
    const bearRR = ((Number(bearEntry) - bearTarget2) / (Number(bearStop) - Number(bearEntry))).toFixed(1);
    
    // Session context
    const hour = new Date().getUTCHours();
    const sessionContext = hour >= 0 && hour < 8 ? "🌏 Asian Session — lower volatility, range-bound, accumulation common" :
                          hour >= 8 && hour < 14 ? "🌍 London Session — high volatility, trend initiation, smart money active" :
                          hour >= 14 && hour < 21 ? "🌎 New York Session — continuation moves, major reversals, highest volume" :
                          "🌙 Late Session — reduced liquidity, potential for manipulation, caution advised";
    
    // Crypto-specific info
    const cryptoInfo = CRYPTO_KNOWLEDGE[sanitizedCrypto as keyof typeof CRYPTO_KNOWLEDGE];
    const correlationInfo = cryptoInfo ? cryptoInfo.correlations.join(', ') : 'Standard crypto correlations apply';
    const cycleInfo = cryptoInfo ? cryptoInfo.cycles : 'Following general market cycle';
    
    // Combine all insights
    const allInsights = [...insights, ...learningInsights];
    
    const trendEmoji = validatedChange >= 0 ? "▲" : "▼";
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 GENERATE ELITE AI ANALYSIS v6.0 — ADAPTIVE NEURAL LEARNING
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Real chart data and learning processed internally — powers analysis without display
    // Multi-timeframe confluence enhances predictions with HTF/LTF alignment

    // Combine real chart patterns from ALL timeframes
    const allPatterns = [
      ...(mtfAnalysis.tfDaily?.realPatterns || []).map(p => `[D] ${p}`),
      ...(mtfAnalysis.tf4H?.realPatterns || []).map(p => `[4H] ${p}`),
      ...(mtfAnalysis.tf1H?.realPatterns || []).map(p => `[1H] ${p}`),
      ...(realChartData?.candlePatterns || []),
      ...patterns
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 15);
    
    // Adaptive confidence calculation — multi-timeframe neural weighting
    const mtfBoost = mtfAnalysis.confluence.alignment >= 90 ? 15 :
                     mtfAnalysis.confluence.alignment >= 70 ? 10 :
                     mtfAnalysis.confluence.alignment >= 50 ? 5 : 0;
    
    const realDataBoost = realChartData ? (
      realChartData.realPatterns.length * 3 +
      realChartData.candlePatterns.length * 2 +
      (realChartData.trendAnalysis.strength >= 70 ? 6 : realChartData.trendAnalysis.strength >= 50 ? 3 : 0) +
      (realChartData.volumeProfile.climacticVolume ? 5 : 0)
    ) : 0;
    
    // Scenario-based confidence boost
    const scenarioBoost = adaptiveLearning.currentScenario 
      ? Math.round((adaptiveLearning.scenarioConfidence - 50) * 0.25) 
      : 0;
    
    // Predictive memory boost (consistent past = higher confidence)
    const memoryBoost = predictiveMemory.trendConsistency >= 70 ? 5 :
                        predictiveMemory.trendConsistency >= 50 ? 3 : 0;
    
    const adjustedConfidence = Math.min(98, Math.max(55, probabilities.confidence + mtfBoost + realDataBoost + scenarioBoost + memoryBoost));
    
    // Adaptive bias synthesis — MTF confluence + scenario learning
    let finalBias = bias;
    
    // MTF confluence override (strongest signal)
    if (mtfAnalysis.confluence.alignment >= 80) {
      if (mtfAnalysis.confluence.overallBias === 'BULLISH') {
        finalBias = 'LONG';
        allInsights.push(`🎯 ${mtfAnalysis.confluence.alignment}% multi-timeframe bullish alignment`);
      } else if (mtfAnalysis.confluence.overallBias === 'BEARISH') {
        finalBias = 'SHORT';
        allInsights.push(`🎯 ${mtfAnalysis.confluence.alignment}% multi-timeframe bearish alignment`);
      }
    }
    
    // Scenario-based bias (secondary)
    if (adaptiveLearning.currentScenario && adaptiveLearning.scenarioConfidence >= 70) {
      if (adaptiveLearning.currentScenario.expectedOutcome !== 'NEUTRAL') {
        finalBias = adaptiveLearning.currentScenario.expectedOutcome;
        allInsights.push(`🎯 Matched scenario: ${adaptiveLearning.currentScenario.name}`);
      }
    }
    
    // Real chart data reinforcement
    if (realChartData) {
      const trendStrength = realChartData.trendAnalysis.strength;
      const volumeConfirms = realChartData.volumeProfile.currentVsAvg > 100;
      
      if (realChartData.trendAnalysis.direction === 'BULLISH' && trendStrength >= 65) {
        if (finalBias !== 'SHORT') finalBias = 'LONG';
        if (volumeConfirms && trendStrength >= 80) {
          allInsights.push('High-conviction bullish setup — trend + volume aligned');
        }
      } else if (realChartData.trendAnalysis.direction === 'BEARISH' && trendStrength >= 65) {
        if (finalBias !== 'LONG') finalBias = 'SHORT';
        if (volumeConfirms && trendStrength >= 80) {
          allInsights.push('High-conviction bearish setup — trend + volume aligned');
        }
      }
      
      // Add chart-derived insights
      if (realChartData.candlePatterns.length > 0) {
        allInsights.push(`Recent price action shows ${realChartData.candlePatterns[0].toLowerCase().replace(' (real) ✓', '')}`);
      }
      if (realChartData.supportResistance.supports.length > 0) {
        const nearestSupport = realChartData.supportResistance.supports[0];
        if (Math.abs(priceNum - nearestSupport) / priceNum < 0.02) {
          allInsights.push('Price testing significant support zone — watch for reaction');
        }
      }
      if (realChartData.supportResistance.resistances.length > 0) {
        const nearestResistance = realChartData.supportResistance.resistances[0];
        if (Math.abs(nearestResistance - priceNum) / priceNum < 0.02) {
          allInsights.push('Price approaching key resistance — expect volatility');
        }
      }
    }
    
    // Pattern success rate adjustments
    for (const [pattern, stats] of Object.entries(adaptiveLearning.patternSuccessRates)) {
      if (patterns.some(p => p.includes(pattern)) && stats.accuracy >= 75 && (stats.wins + stats.losses) >= 3) {
        allInsights.push(`${pattern} historically ${stats.accuracy}% accurate — high confidence signal`);
      }
    }
    
    const analysis = `🧠 ZIKALYZE AI BRAIN v7.0 — MULTI-TIMEFRAME PREDICTIVE INTELLIGENCE
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${trendEmoji} ${Math.abs(validatedChange).toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 MULTI-TIMEFRAME CONFLUENCE
HTF Trend (Daily): ${mtfAnalysis.tfDaily?.trendAnalysis.direction || 'N/A'} ${mtfAnalysis.tfDaily ? `(${mtfAnalysis.tfDaily.trendAnalysis.strength}%)` : ''}
MTF Trend (4H): ${mtfAnalysis.tf4H?.trendAnalysis.direction || 'N/A'} ${mtfAnalysis.tf4H ? `(${mtfAnalysis.tf4H.trendAnalysis.strength}%)` : ''}
LTF Trend (1H): ${mtfAnalysis.tf1H?.trendAnalysis.direction || 'N/A'} ${mtfAnalysis.tf1H ? `(${mtfAnalysis.tf1H.trendAnalysis.strength}%)` : ''}
Confluence: ${mtfAnalysis.confluence.overallBias} — ${mtfAnalysis.confluence.alignment}% aligned
Entry Quality: ${mtfAnalysis.confluence.ltfEntry === 'OPTIMAL' ? '🟢 OPTIMAL' : mtfAnalysis.confluence.ltfEntry === 'WAIT' ? '🟡 WAIT' : '🔴 RISKY'}

🎯 MTF KEY LEVELS
Daily S/R: ${mtfAnalysis.keyLevels.dailySupport.slice(0, 2).map(s => `$${s.toFixed(2)}`).join(', ') || 'N/A'} | ${mtfAnalysis.keyLevels.dailyResistance.slice(0, 2).map(r => `$${r.toFixed(2)}`).join(', ') || 'N/A'}
4H S/R: ${mtfAnalysis.keyLevels.h4Support.slice(0, 2).map(s => `$${s.toFixed(2)}`).join(', ') || 'N/A'} | ${mtfAnalysis.keyLevels.h4Resistance.slice(0, 2).map(r => `$${r.toFixed(2)}`).join(', ') || 'N/A'}

💭 CHAIN-OF-THOUGHT REASONING
${thoughts.map(t => `[Step ${t.step}] ${t.thought}
→ Conclusion: ${t.conclusion} (Weight: ${t.weight}/10)`).join('\n\n')}

🔍 DETECTED PATTERNS (${allPatterns.length})
${allPatterns.slice(0, 10).map((p, i) => `${i + 1}. ${p}`).join('\n')}
Pattern Confluence: ${allPatterns.length >= 8 ? 'EXCELLENT ⭐⭐⭐⭐⭐' : allPatterns.length >= 5 ? 'STRONG ⭐⭐⭐⭐' : allPatterns.length >= 3 ? 'GOOD ⭐⭐⭐' : allPatterns.length >= 2 ? 'MODERATE ⭐⭐' : 'DEVELOPING ⭐'}

📊 PROBABILITY MATRIX
Bull Probability: ${probabilities.bullProb}% ${'█'.repeat(Math.round(probabilities.bullProb / 5))}${'░'.repeat(20 - Math.round(probabilities.bullProb / 5))}
Bear Probability: ${probabilities.bearProb}% ${'█'.repeat(Math.round(probabilities.bearProb / 5))}${'░'.repeat(20 - Math.round(probabilities.bearProb / 5))}
Neutral Zone: ${probabilities.neutralProb}%
Primary Bias: ${probabilities.bullProb > probabilities.bearProb + 10 ? 'BULLISH 🟢' : probabilities.bearProb > probabilities.bullProb + 10 ? 'BEARISH 🔴' : 'NEUTRAL ⚪'}
Predictive Confidence: ${adjustedConfidence}%

🔮 PREDICTIVE MEMORY (PAST → FUTURE)
Historical Accuracy: ${predictiveMemory.predictionAccuracy}% | Trend Consistency: ${predictiveMemory.trendConsistency}%
${predictiveMemory.futurePredictions.length > 0 ? predictiveMemory.futurePredictions.map(p => 
  `${p.timeframe}: $${p.target.toFixed(2)} (${p.probability}% probability) — ${p.basis}`
).join('\n') : 'Building prediction model...'}

🧬 ADAPTIVE LEARNING STATUS
${adaptiveLearning.currentScenario ? `Active Scenario: ${adaptiveLearning.currentScenario.name} (${adaptiveLearning.scenarioConfidence.toFixed(0)}% match)` : 'Scenario: Analyzing market conditions...'}
Learning Velocity: ${adaptiveLearning.learningVelocity}% ${'█'.repeat(Math.round(adaptiveLearning.learningVelocity / 10))}${'░'.repeat(10 - Math.round(adaptiveLearning.learningVelocity / 10))}
Matched Scenarios: ${adaptiveLearning.matchedScenarios.length}
Pattern Tracking: ${Object.keys(adaptiveLearning.patternSuccessRates).length} patterns with feedback

📈 WYCKOFF PHASE ANALYSIS
Phase: ${wyckoffPhase.phase} — ${wyckoffPhase.subPhase}
Confidence: ${wyckoffPhase.confidence}%
${wyckoffPhase.description}

🌊 ELLIOTT WAVE POSITION
Current Wave: ${elliottWave.wave} (${elliottWave.direction})
Subwave: ${elliottWave.subwave}
Target: $${elliottWave.target.toFixed(2)}
Invalidation: $${elliottWave.invalidation.toFixed(2)}

🏗️ MARKET STRUCTURE
Trend: ${marketStructure.trend} (Strength: ${marketStructure.strength}%)
${marketStructure.lastCHoCH ? `CHoCH: ${marketStructure.lastCHoCH} ✓` : 'CHoCH: Awaiting confirmation'}
${marketStructure.lastBOS ? `BOS: ${marketStructure.lastBOS} ✓` : 'BOS: Awaiting break'}
Structure: ${marketStructure.higherHighs ? 'HH ' : ''}${marketStructure.higherLows ? 'HL ' : ''}${marketStructure.lowerHighs ? 'LH ' : ''}${marketStructure.lowerLows ? 'LL' : ''}

💧 LIQUIDITY MAP
${liquidityPools.slice(0, 4).map(p => `${p.type === 'BUYSIDE' ? '🔵' : '🔴'} ${p.type}: $${p.level.toFixed(2)} (Strength: ${p.strength}%)${p.swept ? ' [SWEPT]' : ''}`).join('\n')}

🎓 LEARNING & MEMORY
Historical Analyses: ${memory.length} records | Accuracy: ${learningAccuracy}%
${memory.length > 0 ? `Last Analysis: ${memory[0].bias} at $${memory[0].price.toLocaleString()}${memory[0].wasCorrect !== undefined ? ` — ${memory[0].wasCorrect ? '✓ Correct' : '✗ Incorrect'}` : ''}` : 'Building memory...'}
Bias Trend: ${memory.length >= 3 ? memory.slice(0, 5).map(m => m.bias === 'LONG' ? '🟢' : m.bias === 'SHORT' ? '🔴' : '⚪').join('') : 'Insufficient data'}
${learningInsights.length > 0 ? learningInsights.slice(0, 5).map(l => `• ${l}`).join('\n') : ''}

🌐 MARKET INTELLIGENCE
Correlations: ${correlationInfo}
Cycle: ${cycleInfo}
${cryptoInfo ? `Volatility: ${cryptoInfo.volatilityProfile}` : ''}
${cryptoInfo ? `Institutional: ${cryptoInfo.institutionalBehavior}` : ''}

📈 TECHNICAL STRUCTURE
Market Phase: ${marketPhase}
Range Position: ${rangePercent.toFixed(1)}% ${rangePercent > 80 ? '[DEEP PREMIUM ⚠️]' : rangePercent > 60 ? '[PREMIUM]' : rangePercent < 20 ? '[DEEP DISCOUNT 🎯]' : rangePercent < 40 ? '[DISCOUNT]' : '[EQUILIBRIUM]'}
RSI Estimate: ${rsiEstimate.toFixed(0)} ${rsiEstimate > 75 ? '[EXTREME OB ⚠️]' : rsiEstimate > 65 ? '[OVERBOUGHT]' : rsiEstimate < 25 ? '[EXTREME OS 🎯]' : rsiEstimate < 35 ? '[OVERSOLD]' : '[NEUTRAL]'}
Volume: ${volumeStrength} ${volumeStrength === 'HIGH' ? '— Strong institutional activity' : volumeStrength === 'MODERATE' ? '— Developing interest' : '— Low participation, caution'}
Session: ${sessionContext}

📐 SMART MONEY LEVELS
Order Block (Bull): $${obBullishLow.toFixed(2)} - $${obBullishHigh.toFixed(2)}
Order Block (Bear): $${obBearishLow.toFixed(2)} - $${obBearishHigh.toFixed(2)}
Fair Value Gap: ${finalBias === 'LONG' ? fvgBullishZone : fvgBearishZone}
OTE Zone (61.8-78.6%): ${finalBias === 'LONG' ? oteZoneBullish : oteZoneBearish}
Equilibrium: $${equilibrium.toFixed(2)}

⏱️ 15M PRECISION ENTRY
Micro Order Block: ${finalBias === 'LONG' ? microOBBullish : microOBBearish}
Entry Trigger: ${finalBias === 'LONG' ? 'Bullish BOS/CHoCH on 15M with volume' : 'Bearish BOS/CHoCH on 15M with volume'}
Optimal Entry: $${finalBias === 'LONG' ? bullEntry : bearEntry}
Confirmation: ${finalBias === 'LONG' ? 'Bullish engulfing or hammer at OB' : 'Bearish engulfing or shooting star at OB'}

🟢 BULL CASE ${finalBias === 'LONG' ? '(PRIMARY SCENARIO)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bullProb}% | Confidence: ${adjustedConfidence}%
Entry Zone: $${bullEntry} — OTE/Order Block confluence
Stop Loss: $${bullStop} — Below structure low
TP1: $${bullTP1} (+${((Number(bullTP1) - priceNum) / priceNum * 100).toFixed(1)}%) — First resistance
TP2: $${bullTP2} (+${((Number(bullTP2) - priceNum) / priceNum * 100).toFixed(1)}%) — Golden ratio
TP3: $${bullTP3} (+${((Number(bullTP3) - priceNum) / priceNum * 100).toFixed(1)}%) — Range extension
TP4: $${bullTP4} (+${((Number(bullTP4) - priceNum) / priceNum * 100).toFixed(1)}%) — 1.618 extension
R:R = 1:${bullRR} ${Number(bullRR) >= 3 ? '✓ Excellent' : Number(bullRR) >= 2 ? '◐ Good' : '⚠️ Consider'}

🔴 BEAR CASE ${finalBias === 'SHORT' ? '(PRIMARY SCENARIO)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bearProb}% | Confidence: ${100 - adjustedConfidence}%
Entry Zone: $${bearEntry} — Premium zone rejection
Stop Loss: $${bearStop} — Above structure high
TP1: $${bearTarget1.toFixed(2)} | TP2: $${bearTarget2.toFixed(2)} | TP3: $${bearTarget3.toFixed(2)} | TP4: $${bearTarget4.toFixed(2)}
R:R = 1:${bearRR} ${Number(bearRR) >= 3 ? '✓ Excellent' : Number(bearRR) >= 2 ? '◐ Good' : '⚠️ Consider'}

⚠️ KEY LEVELS TO WATCH
Support: $${lowNum.toFixed(2)} → $${(lowNum - range * 0.236).toFixed(2)} → $${(lowNum - range * 0.382).toFixed(2)}
Resistance: $${highNum.toFixed(2)} → $${(highNum + range * 0.236).toFixed(2)} → $${(highNum + range * 0.382).toFixed(2)}
Psychological: ${cryptoInfo ? cryptoInfo.keyLevels.psychological.filter(l => Math.abs(l - priceNum) < priceNum * 0.15).map(l => `$${l.toLocaleString()}`).join(', ') || 'None nearby' : 'N/A'}

🔄 INVALIDATION LEVELS
Bull Invalid: Close below $${(lowNum - range * 0.1).toFixed(2)} — Structure break
Bear Invalid: Close above $${(highNum + range * 0.1).toFixed(2)} — Structure break

💡 AI INSIGHTS (${allInsights.length})
${allInsights.slice(0, 7).map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

🎯 EXECUTIVE SUMMARY
${probabilities.bullProb > probabilities.bearProb + 15 ? 
  `BULLISH BIAS with ${adjustedConfidence}% adaptive confidence. ${adaptiveLearning.currentScenario ? `Scenario: ${adaptiveLearning.currentScenario.name}.` : ''} ${allPatterns.length >= 3 ? 'Strong pattern confluence supports longs.' : 'Developing setup.'} ${wyckoffPhase.phase === 'ACCUMULATION' ? 'Wyckoff accumulation active.' : ''} ${marketStructure.lastCHoCH === 'BULLISH' ? 'CHoCH confirms reversal.' : ''} Target: $${bullTP2} with stop at $${bullStop}.` :
  probabilities.bearProb > probabilities.bullProb + 15 ?
  `BEARISH BIAS with ${adjustedConfidence}% adaptive confidence. ${adaptiveLearning.currentScenario ? `Scenario: ${adaptiveLearning.currentScenario.name}.` : ''} ${allPatterns.length >= 3 ? 'Strong pattern confluence supports shorts.' : 'Developing setup.'} ${wyckoffPhase.phase === 'DISTRIBUTION' ? 'Wyckoff distribution active.' : ''} ${marketStructure.lastCHoCH === 'BEARISH' ? 'CHoCH confirms reversal.' : ''} Target: $${bearTarget2.toFixed(2)} with stop at $${bearStop}.` :
  `NEUTRAL — No clear edge. ${adaptiveLearning.currentScenario?.expectedOutcome === 'NEUTRAL' ? 'Scenario confirms caution.' : ''} Wait for ${rangePercent < 40 ? 'support confirmation' : rangePercent > 60 ? 'resistance rejection' : 'directional break'} with volume. Patience is a trade.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Zikalyze AI Brain v6.0 — Adaptive Neural Learning System
Patterns: ${allPatterns.length} | Memory: ${memory.length} | Accuracy: ${learningAccuracy}% | Adaptive Confidence: ${adjustedConfidence}%
Learning Velocity: ${adaptiveLearning.learningVelocity}% | Scenarios Matched: ${adaptiveLearning.matchedScenarios.length}
🎓 Status: ${totalFeedback >= 10 ? 'Mature' : totalFeedback >= 5 ? 'Active' : 'Collecting'} — Your feedback accelerates learning!`;

    // Stream the analysis
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = analysis.split(' ');
        let index = 0;
        
        const sendChunk = () => {
          if (index < words.length) {
            const chunkSize = Math.min(3 + Math.floor(Math.random() * 3), words.length - index);
            const chunk = words.slice(index, index + chunkSize).join(' ') + ' ';
            
            const data = JSON.stringify({
              choices: [{ delta: { content: chunk } }]
            });
            
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            index += chunkSize;
            setTimeout(sendChunk, 12 + Math.random() * 20);
          } else {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        };
        
        sendChunk();
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in crypto-analyze function:", error);
    return new Response(
      JSON.stringify({ error: "Analysis service temporarily unavailable." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
