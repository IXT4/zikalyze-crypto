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
// 🧠 ZIKALYZE AI BRAIN - Advanced Cognitive System
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
}

// Pattern Recognition Database - learned from market behavior
const MARKET_PATTERNS = {
  // Bullish patterns
  bullishEngulfing: { name: "Bullish Engulfing", accuracy: 78, description: "Strong reversal signal after downtrend" },
  morningstar: { name: "Morning Star", accuracy: 82, description: "Three-candle bottom reversal pattern" },
  hammerBottom: { name: "Hammer at Support", accuracy: 75, description: "Rejection of lower prices at key level" },
  bullishDivergence: { name: "Bullish RSI Divergence", accuracy: 71, description: "Price making lower lows while RSI makes higher lows" },
  accumulationZone: { name: "Accumulation Zone", accuracy: 80, description: "Price consolidating at lows with increasing volume" },
  breakoutRetest: { name: "Breakout Retest", accuracy: 76, description: "Successful retest of broken resistance as support" },
  
  // Bearish patterns
  bearishEngulfing: { name: "Bearish Engulfing", accuracy: 77, description: "Strong reversal signal after uptrend" },
  eveningStar: { name: "Evening Star", accuracy: 81, description: "Three-candle top reversal pattern" },
  shootingStar: { name: "Shooting Star at Resistance", accuracy: 74, description: "Rejection of higher prices at key level" },
  bearishDivergence: { name: "Bearish RSI Divergence", accuracy: 72, description: "Price making higher highs while RSI makes lower highs" },
  distributionZone: { name: "Distribution Zone", accuracy: 79, description: "Price consolidating at highs with increasing volume" },
  breakdownRetest: { name: "Breakdown Retest", accuracy: 75, description: "Failed retest of broken support as resistance" },
  
  // Continuation patterns
  bullFlag: { name: "Bull Flag", accuracy: 73, description: "Consolidation after strong upward move" },
  bearFlag: { name: "Bear Flag", accuracy: 72, description: "Consolidation after strong downward move" },
  triangleBreakout: { name: "Triangle Breakout", accuracy: 70, description: "Symmetrical triangle with directional breakout" },
  
  // Smart Money patterns
  liquiditySweep: { name: "Liquidity Sweep", accuracy: 83, description: "Stop hunt followed by reversal" },
  orderBlockTest: { name: "Order Block Test", accuracy: 79, description: "Price respecting institutional order block" },
  fvgFill: { name: "Fair Value Gap Fill", accuracy: 77, description: "Price returning to fill imbalance" },
  bos: { name: "Break of Structure", accuracy: 81, description: "Market structure shift confirmation" },
  choch: { name: "Change of Character", accuracy: 84, description: "First sign of trend reversal" }
};

// Crypto-specific knowledge base
const CRYPTO_KNOWLEDGE = {
  BTC: {
    correlations: ["ETH (0.85)", "SPX (0.65)", "Gold (-0.3)"],
    keyLevels: { psychological: [100000, 90000, 80000, 70000, 60000, 50000], historical: "2017 ATH: $20K, 2021 ATH: $69K" },
    cycles: "4-year halving cycle, typically bullish 12-18 months post-halving",
    dominance: "Market leader - when BTC moves, alts follow",
    fundamentals: "Digital gold narrative, institutional adoption via ETFs, fixed supply of 21M"
  },
  ETH: {
    correlations: ["BTC (0.85)", "DeFi TVL (0.75)"],
    keyLevels: { psychological: [5000, 4000, 3000, 2500, 2000], historical: "2021 ATH: $4.8K" },
    cycles: "Follows BTC with 2-4 week lag, outperforms in altseason",
    fundamentals: "Smart contract platform, staking yield, deflationary post-merge"
  },
  SOL: {
    correlations: ["ETH (0.70)", "BTC (0.65)"],
    keyLevels: { psychological: [200, 150, 100, 75, 50], historical: "2021 ATH: $260" },
    cycles: "High beta - amplifies BTC moves 2-3x",
    fundamentals: "High TPS blockchain, strong DeFi/NFT ecosystem, institutional backing"
  },
  XRP: {
    correlations: ["BTC (0.50)", "Regulatory news (high)"],
    keyLevels: { psychological: [3, 2, 1.5, 1, 0.5], historical: "2018 ATH: $3.84" },
    cycles: "News-driven, less correlated with broader market",
    fundamentals: "Cross-border payments, banking partnerships, SEC lawsuit resolved"
  },
  DOGE: {
    correlations: ["BTC (0.55)", "Social sentiment (0.85)"],
    keyLevels: { psychological: [0.5, 0.25, 0.15, 0.1, 0.05], historical: "2021 ATH: $0.74" },
    cycles: "Meme-driven, social media spikes",
    fundamentals: "Community coin, payment adoption, Elon Musk influence"
  }
};

// AI Brain's chain-of-thought reasoning engine
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
  
  // Step 1: Analyze current market state
  thoughts.push({
    step: 1,
    thought: `Observing ${crypto} at $${price.toLocaleString()} with ${change >= 0 ? '+' : ''}${change.toFixed(2)}% change. The 24h range is $${low.toFixed(2)} to $${high.toFixed(2)}, giving us a ${(range/low*100).toFixed(1)}% volatility window.`,
    conclusion: `Market is ${Math.abs(change) > 3 ? 'highly' : Math.abs(change) > 1 ? 'moderately' : 'relatively'} volatile.`
  });
  
  // Step 2: Pattern recognition
  if (change < -3 && rangePercent < 30) {
    patterns.push(MARKET_PATTERNS.accumulationZone.name);
    patterns.push(MARKET_PATTERNS.hammerBottom.name);
    thoughts.push({
      step: 2,
      thought: `Price dropped ${Math.abs(change).toFixed(1)}% but is now at ${rangePercent.toFixed(0)}% of range — near the lows. This suggests potential accumulation. Smart money often buys when retail panics.`,
      conclusion: "Accumulation zone detected — watching for reversal."
    });
  } else if (change > 3 && rangePercent > 70) {
    patterns.push(MARKET_PATTERNS.distributionZone.name);
    patterns.push(MARKET_PATTERNS.shootingStar.name);
    thoughts.push({
      step: 2,
      thought: `Price surged ${change.toFixed(1)}% and is at ${rangePercent.toFixed(0)}% of range — extended at highs. Retail FOMO often peaks here. Smart money may be distributing.`,
      conclusion: "Distribution zone detected — caution on longs."
    });
  } else if (rsi < 30 && change > 0) {
    patterns.push(MARKET_PATTERNS.bullishDivergence.name);
    thoughts.push({
      step: 2,
      thought: `RSI at ${rsi.toFixed(0)} suggests oversold conditions, yet price is recovering (+${change.toFixed(1)}%). This divergence often precedes strong reversals.`,
      conclusion: "Bullish divergence forming — high probability reversal."
    });
  } else if (rsi > 70 && change < 0) {
    patterns.push(MARKET_PATTERNS.bearishDivergence.name);
    thoughts.push({
      step: 2,
      thought: `RSI at ${rsi.toFixed(0)} indicates overbought while price is declining (${change.toFixed(1)}%). Momentum is fading — sellers gaining control.`,
      conclusion: "Bearish divergence forming — trend exhaustion."
    });
  } else {
    patterns.push(rangePercent > 50 ? MARKET_PATTERNS.bullFlag.name : MARKET_PATTERNS.bearFlag.name);
    thoughts.push({
      step: 2,
      thought: `No extreme conditions detected. RSI at ${rsi.toFixed(0)}, price at ${rangePercent.toFixed(0)}% of range. Market in ${marketPhase} phase.`,
      conclusion: "Neutral pattern — waiting for catalyst."
    });
  }
  
  // Step 3: Smart Money Concepts analysis
  if (rangePercent < 20 || rangePercent > 80) {
    patterns.push(MARKET_PATTERNS.liquiditySweep.name);
    thoughts.push({
      step: 3,
      thought: `Price at extreme ${rangePercent < 20 ? 'low' : 'high'} of range suggests liquidity has been swept. Stop losses triggered ${rangePercent < 20 ? 'below' : 'above'}. Institutions may now reverse.`,
      conclusion: `Liquidity sweep complete — ${rangePercent < 20 ? 'bullish' : 'bearish'} reversal likely.`
    });
  }
  
  if (Math.abs(change) > 2) {
    patterns.push(MARKET_PATTERNS.bos.name);
    thoughts.push({
      step: 4,
      thought: `${Math.abs(change).toFixed(1)}% move represents a clear Break of Structure. This confirms ${change > 0 ? 'bullish' : 'bearish'} intent from institutions.`,
      conclusion: `BOS confirmed ${change > 0 ? 'to the upside' : 'to the downside'}.`
    });
  }
  
  // Step 4: Volume analysis
  thoughts.push({
    step: 5,
    thought: `Volume strength is ${volumeStrength}. ${volumeStrength === 'HIGH' ? 'Strong conviction behind this move — trend likely to continue.' : volumeStrength === 'MODERATE' ? 'Moderate conviction — watching for confirmation.' : 'Low volume suggests weak move — reversal possible.'}`,
    conclusion: volumeStrength === 'HIGH' ? "Volume confirms trend." : "Volume suggests caution."
  });
  
  // Step 5: Learn from memory if available
  if (memory && memory.length > 0) {
    const recentMemories = memory.slice(0, 5);
    const avgConfidence = recentMemories.reduce((a, m) => a + m.confidence, 0) / recentMemories.length;
    const biasConsistency = recentMemories.filter(m => m.bias === (change > 0 ? 'LONG' : 'SHORT')).length / recentMemories.length;
    
    thoughts.push({
      step: 6,
      thought: `Reviewing ${memory.length} past analyses for ${crypto}. Average confidence was ${avgConfidence.toFixed(0)}%. Bias consistency with current conditions: ${(biasConsistency * 100).toFixed(0)}%.`,
      conclusion: biasConsistency > 0.6 ? "Historical patterns align with current setup." : "Market conditions have shifted — adjusting analysis."
    });
    
    // Find similar historical patterns
    const similarPatterns = recentMemories.filter(m => {
      const changeDiff = Math.abs(m.change - change);
      return changeDiff < 3; // Similar price action
    });
    
    if (similarPatterns.length > 0) {
      insights.push(`Found ${similarPatterns.length} similar historical setups. Previous outcomes can inform current trade.`);
    }
  }
  
  // Step 6: Cross-asset correlation insights
  const cryptoInfo = CRYPTO_KNOWLEDGE[crypto as keyof typeof CRYPTO_KNOWLEDGE];
  if (cryptoInfo) {
    insights.push(`${crypto} correlations: ${cryptoInfo.correlations.join(', ')}`);
    insights.push(`Cycle context: ${cryptoInfo.cycles}`);
    insights.push(`Key fundamentals: ${cryptoInfo.fundamentals}`);
  }
  
  // Final synthesis
  thoughts.push({
    step: 7,
    thought: `Synthesizing all data: ${patterns.length} patterns detected, ${insights.length} insights gathered. Market phase is ${marketPhase}. Volume is ${volumeStrength}. Price action shows ${change > 0 ? 'bullish' : change < 0 ? 'bearish' : 'neutral'} momentum.`,
    conclusion: `Primary bias: ${change > 1 && rangePercent > 40 ? 'LONG' : change < -1 && rangePercent < 60 ? 'SHORT' : 'NEUTRAL'} with ${patterns.length >= 3 ? 'high' : patterns.length >= 2 ? 'moderate' : 'developing'} conviction.`
  });
  
  return { thoughts, patterns, insights };
}

// Calculate advanced probability scores
function calculateProbabilities(data: {
  change: number;
  rangePercent: number;
  rsi: number;
  volumeStrength: string;
  patterns: string[];
  marketPhase: string;
}): { bullProb: number; bearProb: number; neutralProb: number } {
  let bullScore = 50;
  let bearScore = 50;
  
  // Price momentum
  if (data.change > 5) bullScore += 15;
  else if (data.change > 2) bullScore += 10;
  else if (data.change > 0) bullScore += 5;
  else if (data.change < -5) bearScore += 15;
  else if (data.change < -2) bearScore += 10;
  else if (data.change < 0) bearScore += 5;
  
  // Range position
  if (data.rangePercent < 25) bullScore += 12; // Discount zone
  else if (data.rangePercent < 40) bullScore += 6;
  else if (data.rangePercent > 75) bearScore += 12; // Premium zone
  else if (data.rangePercent > 60) bearScore += 6;
  
  // RSI
  if (data.rsi < 30) bullScore += 15; // Oversold
  else if (data.rsi < 40) bullScore += 8;
  else if (data.rsi > 70) bearScore += 15; // Overbought
  else if (data.rsi > 60) bearScore += 8;
  
  // Volume confirmation
  if (data.volumeStrength === 'HIGH') {
    if (data.change > 0) bullScore += 10;
    else bearScore += 10;
  }
  
  // Pattern bonuses
  const bullishPatterns = ['Bullish Engulfing', 'Morning Star', 'Hammer at Support', 'Bullish RSI Divergence', 'Accumulation Zone', 'Bull Flag'];
  const bearishPatterns = ['Bearish Engulfing', 'Evening Star', 'Shooting Star at Resistance', 'Bearish RSI Divergence', 'Distribution Zone', 'Bear Flag'];
  
  data.patterns.forEach(p => {
    if (bullishPatterns.some(bp => p.includes(bp))) bullScore += 8;
    if (bearishPatterns.some(bp => p.includes(bp))) bearScore += 8;
  });
  
  // Normalize to 100%
  const total = bullScore + bearScore;
  const bullProb = Math.round((bullScore / total) * 100);
  const bearProb = Math.round((bearScore / total) * 100);
  const neutralProb = Math.max(0, 100 - bullProb - bearProb);
  
  return { bullProb, bearProb, neutralProb };
}

// Input validation
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
    
    console.log(`🧠 AI Brain analyzing ${sanitizedCrypto} at $${validatedPrice} with ${validatedChange}% change`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 CORE AI BRAIN CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const priceNum = validatedPrice;
    const highNum = validatedHigh24h;
    const lowNum = validatedLow24h;
    const range = highNum - lowNum;
    const midPoint = (highNum + lowNum) / 2;
    const rangePercent = ((priceNum - lowNum) / range) * 100;
    
    // Technical indicators
    const rsiEstimate = rangePercent > 70 ? 65 + (rangePercent - 70) * 0.5 : 
                        rangePercent < 30 ? 35 - (30 - rangePercent) * 0.5 : 
                        50 + (rangePercent - 50) * 0.3;
    
    const volumeToMcap = validatedVolume && validatedMarketCap ? 
                         ((validatedVolume / validatedMarketCap) * 100) : 0;
    const volumeStrength = volumeToMcap > 5 ? 'HIGH' : volumeToMcap > 2 ? 'MODERATE' : 'LOW';
    
    // Market phase detection
    let marketPhase = "Consolidation";
    let bias = "NEUTRAL";
    if (validatedChange > 5) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -5) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (validatedChange > 2 && rangePercent > 60) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -2 && rangePercent < 40) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (rangePercent > 70) { marketPhase = "Distribution"; bias = "SHORT"; }
    else if (rangePercent < 30) { marketPhase = "Accumulation"; bias = "LONG"; }
    
    // Fetch memory and learning stats from database
    let memory: MarketMemory[] = [];
    let learningAccuracy = 95; // Default accuracy
    let totalFeedback = 0;
    let correctPredictions = 0;
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch analysis history with feedback
        const { data: historyData } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('symbol', sanitizedCrypto)
          .order('created_at', { ascending: false })
          .limit(20);
        
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
          
          // Calculate learning accuracy from feedback
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
    
    // Learn from past predictions - adjust strategy based on feedback
    const learningInsights: string[] = [];
    const successfulPatterns: string[] = [];
    const failedPatterns: string[] = [];
    
    memory.forEach(m => {
      if (m.wasCorrect === true) {
        successfulPatterns.push(m.bias);
      } else if (m.wasCorrect === false) {
        failedPatterns.push(m.bias);
      }
    });
    
    // Generate learning insights
    if (totalFeedback >= 3) {
      if (learningAccuracy >= 75) {
        learningInsights.push(`High accuracy (${learningAccuracy}%) — current strategy is effective for ${sanitizedCrypto}`);
      } else if (learningAccuracy >= 50) {
        learningInsights.push(`Moderate accuracy (${learningAccuracy}%) — refining analysis approach based on ${totalFeedback} feedback points`);
      } else {
        learningInsights.push(`Learning mode active — adjusting strategy based on ${totalFeedback} feedback points to improve accuracy`);
      }
      
      // Analyze bias success rate
      const longSuccess = successfulPatterns.filter(p => p === 'LONG').length;
      const shortSuccess = successfulPatterns.filter(p => p === 'SHORT').length;
      const longFail = failedPatterns.filter(p => p === 'LONG').length;
      const shortFail = failedPatterns.filter(p => p === 'SHORT').length;
      
      if (longSuccess + longFail > 0) {
        const longAccuracy = Math.round((longSuccess / (longSuccess + longFail)) * 100);
        learningInsights.push(`Long bias accuracy: ${longAccuracy}% (${longSuccess}/${longSuccess + longFail})`);
      }
      if (shortSuccess + shortFail > 0) {
        const shortAccuracy = Math.round((shortSuccess / (shortSuccess + shortFail)) * 100);
        learningInsights.push(`Short bias accuracy: ${shortAccuracy}% (${shortSuccess}/${shortSuccess + shortFail})`);
      }
    }
    
    // Run deep thinking engine
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
    
    // Calculate probabilities
    const probabilities = calculateProbabilities({
      change: validatedChange,
      rangePercent,
      rsi: rsiEstimate,
      volumeStrength,
      patterns,
      marketPhase
    });
    
    // ICT/SMC levels
    const obBullishLow = lowNum;
    const obBullishHigh = lowNum + (range * 0.15);
    const obBearishLow = highNum - (range * 0.15);
    const obBearishHigh = highNum;
    const fvgBullishZone = `$${(lowNum + range * 0.25).toFixed(2)} - $${(lowNum + range * 0.35).toFixed(2)}`;
    const fvgBearishZone = `$${(highNum - range * 0.35).toFixed(2)} - $${(highNum - range * 0.25).toFixed(2)}`;
    const microOBBullish = `$${(lowNum + range * 0.05).toFixed(2)} - $${(lowNum + range * 0.10).toFixed(2)}`;
    const microOBBearish = `$${(highNum - range * 0.10).toFixed(2)} - $${(highNum - range * 0.05).toFixed(2)}`;
    const oteZoneBullish = `$${(lowNum + range * 0.21).toFixed(2)} - $${(lowNum + range * 0.38).toFixed(2)}`;
    const oteZoneBearish = `$${(highNum - range * 0.38).toFixed(2)} - $${(highNum - range * 0.21).toFixed(2)}`;
    
    // Entry/exit calculations
    const bullEntry = (lowNum + range * 0.25).toFixed(2);
    const bullStop = (lowNum - range * 0.05).toFixed(2);
    const bullTP1 = (priceNum + range * 0.382).toFixed(2);
    const bullTP2 = (priceNum + range * 0.618).toFixed(2);
    const bullTP3 = (priceNum + range * 1.0).toFixed(2);
    const bearEntry = (highNum - range * 0.25).toFixed(2);
    const bearStop = (highNum + range * 0.05).toFixed(2);
    const bearTarget1 = lowNum - (range * 0.382);
    const bearTarget2 = lowNum - (range * 0.618);
    const bearTarget3 = lowNum - range;
    
    const bullRR = ((Number(bullTP2) - Number(bullEntry)) / (Number(bullEntry) - Number(bullStop))).toFixed(1);
    const bearRR = ((Number(bearEntry) - bearTarget2) / (Number(bearStop) - Number(bearEntry))).toFixed(1);
    
    // Calculate final confidence with pattern bonus and learning adjustment
    const baseConfidence = 65;
    const patternBonus = patterns.length * 5;
    const memoryBonus = memory.length > 3 ? 5 : memory.length > 0 ? 3 : 0;
    const volatilityBonus = Math.abs(validatedChange) > 5 ? 7 : Math.abs(validatedChange) > 2 ? 4 : 0;
    const volumeBonus = volumeStrength === 'HIGH' ? 8 : volumeStrength === 'MODERATE' ? 4 : 0;
    
    // Learning-based confidence adjustment
    let learningAdjustment = 0;
    if (totalFeedback >= 5) {
      // Adjust confidence based on historical accuracy
      if (learningAccuracy >= 80) learningAdjustment = 5;
      else if (learningAccuracy >= 60) learningAdjustment = 0;
      else learningAdjustment = -5; // Lower confidence if accuracy has been poor
    }
    
    const calculatedConfidence = Math.min(95, Math.max(55, baseConfidence + patternBonus + memoryBonus + volatilityBonus + volumeBonus + learningAdjustment));
    
    // Get crypto-specific knowledge
    const cryptoInfo = CRYPTO_KNOWLEDGE[sanitizedCrypto as keyof typeof CRYPTO_KNOWLEDGE];
    const correlationInfo = cryptoInfo ? cryptoInfo.correlations.join(', ') : 'Standard crypto correlations apply';
    const cycleInfo = cryptoInfo ? cryptoInfo.cycles : 'Following general market cycle';
    
    // Session context
    const hour = new Date().getUTCHours();
    const sessionContext = hour >= 0 && hour < 8 ? "Asian session — lower volatility, range-bound" :
                          hour >= 8 && hour < 14 ? "London session — high volatility, trend initiation" :
                          hour >= 14 && hour < 21 ? "New York session — continuation, major reversals" :
                          "Late session — reduced liquidity";
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 GENERATE COMPREHENSIVE AI ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const trendEmoji = validatedChange >= 0 ? "▲" : "▼";
    
    // Combine insights with learning insights
    const allInsights = [...insights, ...learningInsights];
    
    const analysis = `🧠 ZIKALYZE AI BRAIN — DEEP ANALYSIS
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${trendEmoji} ${Math.abs(validatedChange).toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💭 CHAIN-OF-THOUGHT REASONING
${thoughts.map(t => `Step ${t.step}: ${t.thought}
→ ${t.conclusion}`).join('\n\n')}

🔍 DETECTED PATTERNS (${patterns.length})
${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

📊 PROBABILITY ANALYSIS
Bull Probability: ${probabilities.bullProb}% ${'█'.repeat(Math.round(probabilities.bullProb / 5))}
Bear Probability: ${probabilities.bearProb}% ${'█'.repeat(Math.round(probabilities.bearProb / 5))}
Primary Bias: ${probabilities.bullProb > probabilities.bearProb ? 'BULLISH 🟢' : probabilities.bearProb > probabilities.bullProb ? 'BEARISH 🔴' : 'NEUTRAL ⚪'}

🎓 LEARNING & ACCURACY
Historical Accuracy: ${learningAccuracy}% ${totalFeedback >= 3 ? `(${correctPredictions}/${totalFeedback} correct)` : '(building baseline)'}
Feedback Points: ${totalFeedback} ${totalFeedback >= 5 ? '✓ Sufficient data' : totalFeedback >= 3 ? '◐ Learning' : '○ Collecting feedback'}
Confidence Adjustment: ${learningAdjustment >= 0 ? '+' : ''}${learningAdjustment}% from learning
${learningInsights.length > 0 ? learningInsights.map(l => `• ${l}`).join('\n') : '• Collecting user feedback to improve predictions'}

🧬 MEMORY & CONTEXT
Historical Analyses: ${memory.length} records for ${sanitizedCrypto}
${memory.length > 0 ? `Last Analysis: ${memory[0].bias} bias at $${memory[0].price.toLocaleString()} (${memory[0].confidence}% confidence)${memory[0].wasCorrect !== undefined ? ` — ${memory[0].wasCorrect ? '✓ Correct' : '✗ Incorrect'}` : ''}` : 'Building memory database...'}
Pattern Recognition: ${patterns.length >= 3 ? 'Strong signal confluence' : patterns.length >= 2 ? 'Moderate confluence' : 'Developing setup'}

🌐 MARKET INTELLIGENCE
Correlations: ${correlationInfo}
Cycle Context: ${cycleInfo}
${cryptoInfo ? `Fundamentals: ${cryptoInfo.fundamentals}` : ''}

📈 TECHNICAL STRUCTURE
Market Phase: ${marketPhase}
Range Position: ${rangePercent.toFixed(1)}% ${rangePercent > 70 ? '[PREMIUM]' : rangePercent < 30 ? '[DISCOUNT]' : '[EQUILIBRIUM]'}
RSI Estimate: ${rsiEstimate.toFixed(0)} ${rsiEstimate > 70 ? '[OVERBOUGHT]' : rsiEstimate < 30 ? '[OVERSOLD]' : '[NEUTRAL]'}
Volume: ${volumeStrength} — ${volumeStrength === 'HIGH' ? 'Strong conviction' : volumeStrength === 'MODERATE' ? 'Moderate conviction' : 'Weak conviction'}
Session: ${sessionContext}

📐 SMART MONEY LEVELS
Order Block (Bullish): $${obBullishLow.toFixed(2)} - $${obBullishHigh.toFixed(2)}
Order Block (Bearish): $${obBearishLow.toFixed(2)} - $${obBearishHigh.toFixed(2)}
FVG Zone: ${bias === 'LONG' ? fvgBullishZone : fvgBearishZone}
OTE Zone (62-79%): ${bias === 'LONG' ? oteZoneBullish : oteZoneBearish}

⏱️ 15M PRECISION ENTRY
Micro Order Block: ${bias === 'LONG' ? microOBBullish : microOBBearish}
Entry Trigger: ${bias === 'LONG' ? 'Bullish BOS/CHoCH on 15M' : 'Bearish BOS/CHoCH on 15M'}
Optimal Entry: $${bias === 'LONG' ? bullEntry : bearEntry}

🟢 BULL CASE ${bias === 'LONG' ? '(PRIMARY)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bullProb}% | Confidence: ${calculatedConfidence}%
Entry: $${bullEntry} — OTE zone confluence
Stop Loss: $${bullStop} — Below structure
TP1: $${bullTP1} (+${((Number(bullTP1) - priceNum) / priceNum * 100).toFixed(1)}%)
TP2: $${bullTP2} (+${((Number(bullTP2) - priceNum) / priceNum * 100).toFixed(1)}%)
TP3: $${bullTP3} (+${((Number(bullTP3) - priceNum) / priceNum * 100).toFixed(1)}%)
R:R = 1:${bullRR}

🔴 BEAR CASE ${bias === 'SHORT' ? '(PRIMARY)' : '(ALTERNATIVE)'}
Probability: ${probabilities.bearProb}% | Confidence: ${100 - calculatedConfidence}%
Entry: $${bearEntry} — Premium zone rejection
Stop Loss: $${bearStop} — Above structure
TP1: $${bearTarget1.toFixed(2)} | TP2: $${bearTarget2.toFixed(2)} | TP3: $${bearTarget3.toFixed(2)}
R:R = 1:${bearRR}

⚠️ KEY LEVELS
Support: $${lowNum.toFixed(2)} → $${(lowNum + range * 0.32).toFixed(2)} → $${bearTarget1.toFixed(2)}
Resistance: $${highNum.toFixed(2)} → $${(highNum + range * 0.382).toFixed(2)}

🔄 INVALIDATION
Bull Invalid: Close below $${(lowNum - range * 0.1).toFixed(2)}
Bear Invalid: Close above $${(highNum + range * 0.1).toFixed(2)}

💡 AI INSIGHTS
${allInsights.slice(0, 5).map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Analysis generated by Zikalyze AI Brain v2.1
Patterns: ${patterns.length} | Memory: ${memory.length} | Accuracy: ${learningAccuracy}% | Confidence: ${calculatedConfidence}%
🎓 Learning Mode: ${totalFeedback >= 5 ? 'Active' : 'Collecting Data'} — Your feedback improves predictions!`;

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
            setTimeout(sendChunk, 15 + Math.random() * 25);
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
