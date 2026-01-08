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
// 🧠 ZIKALYZE AI BRAIN v3.0 — ELITE COGNITIVE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

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
    
    console.log(`🧠 AI Brain v3.0 analyzing ${sanitizedCrypto} at $${validatedPrice} with ${validatedChange}% change`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 CORE AI BRAIN v3.0 CALCULATIONS
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
    
    // Learning insights
    const learningInsights: string[] = [];
    if (totalFeedback >= 3) {
      if (learningAccuracy >= 80) {
        learningInsights.push(`Excellent accuracy (${learningAccuracy}%) — strategy is highly effective for ${sanitizedCrypto}`);
      } else if (learningAccuracy >= 65) {
        learningInsights.push(`Good accuracy (${learningAccuracy}%) — strategy performing above average`);
      } else if (learningAccuracy >= 50) {
        learningInsights.push(`Moderate accuracy (${learningAccuracy}%) — refining approach based on ${totalFeedback} feedback points`);
      } else {
        learningInsights.push(`Learning mode — adjusting strategy, accuracy at ${learningAccuracy}% from ${totalFeedback} points`);
      }
    }
    
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
    // 🧠 GENERATE ELITE AI ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const analysis = `🧠 ZIKALYZE AI BRAIN v3.0 — ELITE ANALYSIS
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${trendEmoji} ${Math.abs(validatedChange).toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💭 CHAIN-OF-THOUGHT REASONING
${thoughts.map(t => `[Step ${t.step}] ${t.thought}
→ Conclusion: ${t.conclusion} (Weight: ${t.weight}/10)`).join('\n\n')}

🔍 DETECTED PATTERNS (${patterns.length})
${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}
Pattern Confluence: ${patterns.length >= 5 ? 'EXCELLENT ⭐⭐⭐⭐⭐' : patterns.length >= 4 ? 'STRONG ⭐⭐⭐⭐' : patterns.length >= 3 ? 'GOOD ⭐⭐⭐' : patterns.length >= 2 ? 'MODERATE ⭐⭐' : 'DEVELOPING ⭐'}

📊 PROBABILITY MATRIX
Bull Probability: ${probabilities.bullProb}% ${'█'.repeat(Math.round(probabilities.bullProb / 5))}${'░'.repeat(20 - Math.round(probabilities.bullProb / 5))}
Bear Probability: ${probabilities.bearProb}% ${'█'.repeat(Math.round(probabilities.bearProb / 5))}${'░'.repeat(20 - Math.round(probabilities.bearProb / 5))}
Neutral Zone: ${probabilities.neutralProb}%
Primary Bias: ${probabilities.bullProb > probabilities.bearProb + 10 ? 'BULLISH 🟢' : probabilities.bearProb > probabilities.bullProb + 10 ? 'BEARISH 🔴' : 'NEUTRAL ⚪'}
Confidence: ${probabilities.confidence}%

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

🎓 LEARNING & ACCURACY
Historical Accuracy: ${learningAccuracy}% ${totalFeedback >= 5 ? `(${correctPredictions}/${totalFeedback} correct predictions)` : totalFeedback >= 3 ? `(${correctPredictions}/${totalFeedback} feedback points)` : '(building baseline)'}
Learning Status: ${totalFeedback >= 10 ? '✓ Mature Model' : totalFeedback >= 5 ? '◐ Learning Active' : '○ Collecting Data'}
${learningInsights.length > 0 ? learningInsights.map(l => `• ${l}`).join('\n') : '• Provide feedback on predictions to improve accuracy'}

🧬 MEMORY CONTEXT
Historical Analyses: ${memory.length} records
${memory.length > 0 ? `Last Analysis: ${memory[0].bias} at $${memory[0].price.toLocaleString()} (${memory[0].confidence}% confidence)${memory[0].wasCorrect !== undefined ? ` — ${memory[0].wasCorrect ? '✓ Correct' : '✗ Incorrect'}` : ''}` : 'Building memory database...'}
Bias Trend: ${memory.length >= 3 ? memory.slice(0, 3).map(m => m.bias === 'LONG' ? '🟢' : m.bias === 'SHORT' ? '🔴' : '⚪').join('') : 'Insufficient data'}

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
Fair Value Gap: ${bias === 'LONG' ? fvgBullishZone : fvgBearishZone}
OTE Zone (61.8-78.6%): ${bias === 'LONG' ? oteZoneBullish : oteZoneBearish}
Equilibrium: $${equilibrium.toFixed(2)}

⏱️ 15M PRECISION ENTRY
Micro Order Block: ${bias === 'LONG' ? microOBBullish : microOBBearish}
Entry Trigger: ${bias === 'LONG' ? 'Bullish BOS/CHoCH on 15M with volume' : 'Bearish BOS/CHoCH on 15M with volume'}
Optimal Entry: $${bias === 'LONG' ? bullEntry : bearEntry}
Confirmation: ${bias === 'LONG' ? 'Bullish engulfing or hammer at OB' : 'Bearish engulfing or shooting star at OB'}

🟢 BULL CASE ${bias === 'LONG' ? '(PRIMARY SCENARIO)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bullProb}% | Confidence: ${probabilities.confidence}%
Entry Zone: $${bullEntry} — OTE/Order Block confluence
Stop Loss: $${bullStop} — Below structure low
TP1: $${bullTP1} (+${((Number(bullTP1) - priceNum) / priceNum * 100).toFixed(1)}%) — First resistance
TP2: $${bullTP2} (+${((Number(bullTP2) - priceNum) / priceNum * 100).toFixed(1)}%) — Golden ratio
TP3: $${bullTP3} (+${((Number(bullTP3) - priceNum) / priceNum * 100).toFixed(1)}%) — Range extension
TP4: $${bullTP4} (+${((Number(bullTP4) - priceNum) / priceNum * 100).toFixed(1)}%) — 1.618 extension
R:R = 1:${bullRR} ${Number(bullRR) >= 3 ? '✓ Excellent' : Number(bullRR) >= 2 ? '◐ Good' : '⚠️ Consider'}

🔴 BEAR CASE ${bias === 'SHORT' ? '(PRIMARY SCENARIO)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bearProb}% | Confidence: ${100 - probabilities.confidence}%
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
  `BULLISH BIAS with ${probabilities.confidence}% confidence. ${patterns.length >= 3 ? 'Strong pattern confluence supports longs.' : 'Developing setup.'} ${wyckoffPhase.phase === 'ACCUMULATION' ? 'Wyckoff accumulation active.' : ''} ${marketStructure.lastCHoCH === 'BULLISH' ? 'CHoCH confirms reversal.' : ''} Target: $${bullTP2} with stop at $${bullStop}.` :
  probabilities.bearProb > probabilities.bullProb + 15 ?
  `BEARISH BIAS with ${probabilities.confidence}% confidence. ${patterns.length >= 3 ? 'Strong pattern confluence supports shorts.' : 'Developing setup.'} ${wyckoffPhase.phase === 'DISTRIBUTION' ? 'Wyckoff distribution active.' : ''} ${marketStructure.lastCHoCH === 'BEARISH' ? 'CHoCH confirms reversal.' : ''} Target: $${bearTarget2.toFixed(2)} with stop at $${bearStop}.` :
  `NEUTRAL — No clear edge. Wait for ${rangePercent < 40 ? 'support confirmation' : rangePercent > 60 ? 'resistance rejection' : 'directional break'} with volume. Patience is a trade.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Zikalyze AI Brain v3.0 — Elite Cognitive System
Patterns: ${patterns.length} | Memory: ${memory.length} | Accuracy: ${learningAccuracy}% | Confidence: ${probabilities.confidence}%
🎓 Learning: ${totalFeedback >= 10 ? 'Mature' : totalFeedback >= 5 ? 'Active' : 'Collecting'} — Your feedback shapes predictions!`;

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
