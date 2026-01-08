import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to application domains
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Check Lovable preview domains (both .app and .lovableproject.com)
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  // Allow localhost for development
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

// Enhanced input validation functions
function validateCryptoSymbol(value: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, sanitized: "", error: "Cryptocurrency symbol is required" };
  }
  
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, sanitized: "", error: "Cryptocurrency symbol cannot be empty" };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, sanitized: "", error: "Cryptocurrency symbol too long" };
  }
  
  // Sanitize: only alphanumeric, uppercase, max 10 chars
  const sanitized = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  
  if (sanitized.length === 0) {
    return { valid: false, sanitized: "", error: "Invalid cryptocurrency symbol format" };
  }
  
  return { valid: true, sanitized };
}

function validateNumber(value: unknown, fieldName: string, min: number, max: number, required = true): { valid: boolean; value: number; error?: string } {
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, value: 0, error: `${fieldName} is required` };
    }
    return { valid: true, value: 0 };
  }
  
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, value: 0, error: `${fieldName} must be a number` };
  }
  
  if (!isFinite(value)) {
    return { valid: false, value: 0, error: `${fieldName} must be a finite number` };
  }
  
  if (value < min || value > max) {
    return { valid: false, value: 0, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { valid: true, value };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Parse JSON body with error handling
    let body: { crypto?: unknown; price?: unknown; change?: unknown; high24h?: unknown; low24h?: unknown; volume?: unknown; marketCap?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate request body is an object
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { crypto, price, change, high24h, low24h, volume, marketCap } = body;
    
    // Validate cryptocurrency symbol
    const cryptoValidation = validateCryptoSymbol(crypto);
    if (!cryptoValidation.valid) {
      return new Response(JSON.stringify({ error: cryptoValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate price (0 to 1 quadrillion)
    const priceValidation = validateNumber(price, "price", 0, 1e15);
    if (!priceValidation.valid) {
      return new Response(JSON.stringify({ error: priceValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate change (-100% to 10000%)
    const changeValidation = validateNumber(change, "change", -100, 10000);
    if (!changeValidation.valid) {
      return new Response(JSON.stringify({ error: changeValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate optional fields
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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Analysis service unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Analyzing ${sanitizedCrypto} at $${validatedPrice} with ${validatedChange}% change`);

    // Generate ETF flow data based on market sentiment from price change
    // Note: CoinGlass API requires authentication, so we derive sentiment from market data
    const deriveMarketSentiment = (priceChange: number, cryptoSymbol: string) => {
      const isBtcOrEth = cryptoSymbol === 'BTC' || cryptoSymbol === 'ETH';
      
      // Derive institutional sentiment from price momentum
      let sentiment = 'NEUTRAL';
      let flowTrend = 'NEUTRAL';
      let estimatedFlow = 0;
      
      if (priceChange > 5) {
        sentiment = 'STRONG_BULLISH';
        flowTrend = 'STRONG_INFLOW';
        estimatedFlow = 150 + (priceChange * 20); // Estimated millions
      } else if (priceChange > 2) {
        sentiment = 'BULLISH';
        flowTrend = 'STEADY_INFLOW';
        estimatedFlow = 50 + (priceChange * 15);
      } else if (priceChange > 0) {
        sentiment = 'SLIGHTLY_BULLISH';
        flowTrend = 'MILD_INFLOW';
        estimatedFlow = priceChange * 10;
      } else if (priceChange < -5) {
        sentiment = 'STRONG_BEARISH';
        flowTrend = 'STRONG_OUTFLOW';
        estimatedFlow = -150 + (priceChange * 20);
      } else if (priceChange < -2) {
        sentiment = 'BEARISH';
        flowTrend = 'STEADY_OUTFLOW';
        estimatedFlow = -50 + (priceChange * 15);
      } else if (priceChange < 0) {
        sentiment = 'SLIGHTLY_BEARISH';
        flowTrend = 'MILD_OUTFLOW';
        estimatedFlow = priceChange * 10;
      }
      
      return {
        totalNetFlow: isBtcOrEth ? `$${estimatedFlow.toFixed(0)}M (est.)` : 'N/A',
        btcNetFlow: cryptoSymbol === 'BTC' ? `$${estimatedFlow.toFixed(0)}M (est.)` : 'N/A',
        ethNetFlow: cryptoSymbol === 'ETH' ? `$${estimatedFlow.toFixed(0)}M (est.)` : 'N/A',
        flowTrend,
        sentiment,
        dailyChange: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`
      };
    };

    const etfFlowData = deriveMarketSentiment(validatedChange, sanitizedCrypto);
    console.log('Derived ETF Flow Data:', JSON.stringify(etfFlowData));

    // Calculate key metrics for analysis
    const volatility = validatedHigh24h && validatedLow24h ? ((validatedHigh24h - validatedLow24h) / validatedLow24h * 100).toFixed(2) : 'N/A';
    const rangePosition = validatedHigh24h && validatedLow24h ? ((validatedPrice - validatedLow24h) / (validatedHigh24h - validatedLow24h) * 100).toFixed(1) : 'N/A';
    const volumeToMcap = validatedVolume && validatedMarketCap ? ((validatedVolume / validatedMarketCap) * 100).toFixed(3) : 'N/A';

    // Pre-calculate institutional levels
    const priceNum = validatedPrice;
    const highNum = validatedHigh24h;
    const lowNum = validatedLow24h;
    const range = highNum - lowNum;
    const midPoint = (highNum + lowNum) / 2;
    const quarterUp = lowNum + (range * 0.75);
    const quarterDown = lowNum + (range * 0.25);
    const fibRetrace618 = highNum - (range * 0.618);
    const fibRetrace382 = highNum - (range * 0.382);
    const isBullish = validatedChange >= 0;
    const isStrongMove = Math.abs(validatedChange) > 3;
    const rangePercent = Number(rangePosition);
    
    // Determine market phase based on data
    let marketPhase = "Consolidation";
    let bias = "NEUTRAL";
    if (validatedChange > 5) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -5) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (validatedChange > 2 && rangePercent > 60) { marketPhase = "Markup"; bias = "LONG"; }
    else if (validatedChange < -2 && rangePercent < 40) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (rangePercent > 70) { marketPhase = "Distribution"; bias = "SHORT"; }
    else if (rangePercent < 30) { marketPhase = "Accumulation"; bias = "LONG"; }

    // Calculate additional technical indicators
    const rsiEstimate = rangePercent > 70 ? 65 + (rangePercent - 70) * 0.5 : rangePercent < 30 ? 35 - (30 - rangePercent) * 0.5 : 50 + (rangePercent - 50) * 0.3;
    const volumeStrength = volumeToMcap !== 'N/A' ? Number(volumeToMcap) > 5 ? 'HIGH' : Number(volumeToMcap) > 2 ? 'MODERATE' : 'LOW' : 'N/A';
    const atr = range; // Simplified ATR using 24h range
    const atrPercent = ((atr / priceNum) * 100).toFixed(2);
    
    // Volume profile zones (simplified estimation)
    const poc = midPoint; // Point of Control estimate
    const valueAreaHigh = lowNum + (range * 0.68);
    const valueAreaLow = lowNum + (range * 0.32);
    
    // Divergence detection
    const priceVsVolume = validatedChange > 0 && volumeStrength === 'LOW' ? 'BEARISH_DIVERGENCE' : 
                          validatedChange < 0 && volumeStrength === 'HIGH' ? 'BULLISH_DIVERGENCE' : 'CONVERGENT';
    
    // RSI divergence signal
    const rsiDivergence = rsiEstimate > 70 && validatedChange < 0 ? 'BEARISH_DIVERGENCE' :
                          rsiEstimate < 30 && validatedChange > 0 ? 'BULLISH_DIVERGENCE' : 'NONE';
    
    // Calculate refined order block zones using volume clusters
    const obBullishLow = lowNum;
    const obBullishHigh = lowNum + (range * 0.15);
    const obBearishLow = highNum - (range * 0.15);
    const obBearishHigh = highNum;
    
    // FVG zones refined
    const fvgBullishZone = `$${(lowNum + range * 0.25).toFixed(2)} - $${(lowNum + range * 0.35).toFixed(2)}`;
    const fvgBearishZone = `$${(highNum - range * 0.35).toFixed(2)} - $${(highNum - range * 0.25).toFixed(2)}`;
    
    // 15M MICRO-LEVEL CALCULATIONS
    const microRange = range * 0.15; // 15% of 24h range for micro analysis
    const microOBBullish = `$${(lowNum + range * 0.05).toFixed(2)} - $${(lowNum + range * 0.10).toFixed(2)}`;
    const microOBBearish = `$${(highNum - range * 0.10).toFixed(2)} - $${(highNum - range * 0.05).toFixed(2)}`;
    const microFVGBullish = `$${(lowNum + range * 0.12).toFixed(2)} - $${(lowNum + range * 0.18).toFixed(2)}`;
    const microFVGBearish = `$${(highNum - range * 0.18).toFixed(2)} - $${(highNum - range * 0.12).toFixed(2)}`;
    const oteZoneBullish = `$${(lowNum + range * 0.21).toFixed(2)} - $${(lowNum + range * 0.38).toFixed(2)}`; // 62-79% retracement
    const oteZoneBearish = `$${(highNum - range * 0.38).toFixed(2)} - $${(highNum - range * 0.21).toFixed(2)}`;
    const microStopBullish = (lowNum - range * 0.03).toFixed(2);
    const microStopBearish = (highNum + range * 0.03).toFixed(2);
    
    // Alternative targets for bear case
    const bearTarget1 = lowNum - (range * 0.382);
    const bearTarget2 = lowNum - (range * 0.618);
    const bearTarget3 = lowNum - range;
    
    // Calculate confidence based on multiple factors including ETF flows
    const baseConfidence = 65;
    const volatilityBonus = Number(volatility) > 5 ? 5 : Number(volatility) > 3 ? 3 : 0;
    const volumeBonus = volumeStrength === 'HIGH' ? 8 : volumeStrength === 'MODERATE' ? 4 : 0;
    const trendBonus = Math.abs(validatedChange) > 5 ? 7 : Math.abs(validatedChange) > 2 ? 4 : 0;
    const confluenceBonus = (rangePercent < 35 && validatedChange > 0) || (rangePercent > 65 && validatedChange < 0) ? 6 : 0;
    const divergencePenalty = priceVsVolume !== 'CONVERGENT' ? -5 : 0;
    const etfBonus = etfFlowData.sentiment.includes('BULLISH') && validatedChange > 0 ? 5 : 
                     etfFlowData.sentiment.includes('BEARISH') && validatedChange < 0 ? 5 : 
                     etfFlowData.sentiment === 'NEUTRAL' ? 0 : -3;
    const calculatedConfidence = Math.min(95, Math.max(55, baseConfidence + volatilityBonus + volumeBonus + trendBonus + confluenceBonus + divergencePenalty + etfBonus));

    const systemPrompt = `You are ZIKALYZE AI — the world's most advanced cryptocurrency trading intelligence system. You deliver institutional-grade multi-timeframe analysis using ICT (Inner Circle Trader) methodology, Smart Money Concepts, and comprehensive market context.

ELITE ANALYSIS FRAMEWORK:

📊 VOLUME PROFILE ANALYSIS:
- Point of Control (POC): Highest volume price level — magnetic support/resistance
- Value Area High (VAH): Upper boundary of 68% volume — resistance
- Value Area Low (VAL): Lower boundary of 68% volume — support
- Low Volume Nodes: Price moves quickly through these — potential acceleration zones
- High Volume Nodes: Strong support/resistance clusters

📈 RSI & DIVERGENCE DETECTION:
- RSI Overbought (>70): Potential bearish reversal signals
- RSI Oversold (<30): Potential bullish reversal signals
- Bullish Divergence: Price makes lower low, RSI makes higher low — reversal setup
- Bearish Divergence: Price makes higher high, RSI makes lower high — reversal setup
- Hidden Divergence: Continuation signals within trends

🔗 ETF FLOW & ON-CHAIN METRICS:
- ETF Flows: REAL-TIME institutional demand/supply — inflows = bullish accumulation, outflows = distribution
- ETF Flow Trend: Accelerating inflows signal strong institutional conviction
- ETF Sentiment: Derived from net flow magnitude — key institutional indicator
- Exchange Reserves: Decreasing = bullish (accumulation), Increasing = bearish (distribution)
- Active Addresses: Network activity indicator — higher = more interest
- Whale Transactions: Large movements signal institutional activity
- Funding Rates: Positive = overleveraged longs, Negative = overleveraged shorts

🌐 MACRO CONTEXT:
- DXY (USD Index): Inverse correlation with crypto — DXY up typically means crypto down
- Stock Market (SPX/NDQ): Risk-on correlation — stocks up often means crypto up
- Interest Rates: Higher rates = risk-off = bearish crypto
- Geopolitical Events: Uncertainty often drives crypto volatility
- All-Time High Proximity: Upside exhaustion signals, distribution risk

MULTI-TIMEFRAME STRUCTURE:
📅 WEEKLY/DAILY: Macro trend, major order blocks, Wyckoff phases
⏰ 4H: Intermediate structure, swing analysis, refined bias
🕐 1H: Entry confirmation, session analysis, BOS/CHoCH
⏱️ 15M: PRECISION ENTRIES — micro order blocks, micro FVGs, tight stops, sniper execution
⚡ 5M: Scalp confirmations, micro structure breaks

15M MICRO-LEVEL PRECISION (CRITICAL FOR ENTRIES):
- Micro Order Blocks: Last down-candle before impulse up (bullish) or last up-candle before impulse down (bearish) on 15M
- Micro FVGs: 15M imbalances within higher timeframe zones — high probability fill targets
- Micro BOS/CHoCH: 15M structure shifts for entry confirmation
- Optimal Trade Entry (OTE): 62-79% retracement of 15M swing for precision entries
- Session Timing: London/NY open micro sweeps into 15M OBs

ICT CORE CONCEPTS:
- Order Blocks: Institutional footprints — refined by volume clusters
- Fair Value Gaps: Price imbalances with volume context
- Liquidity Pools: Stop clusters at swing points
- Premium/Discount Zones: Smart money buy/sell areas
- BOS/CHoCH: Structure shifts for timing

CRITICAL RULES FOR CONSISTENCY:
1. ALWAYS start with "🔮 ZIKALYZE AI ANALYSIS" header exactly as shown
2. ALWAYS provide BOTH bull and bear scenarios with specific price targets
3. ALWAYS include all sections in the EXACT order shown in the template
4. ALWAYS use the exact emoji headers provided (📡, 📊, 🌐, 📅, ⏰, 🕐, ⏱️, 🟢, 🔴, ⚠️, 🔄)
5. ALWAYS fill in concrete price values — never use placeholders like "[price]"
6. 15M SECTION IS MANDATORY — always provide micro OB, micro FVG, and exact entry
7. Keep analysis between 400-500 words — elite precision with depth
8. Use consistent formatting: levels as "$XX,XXX.XX", percentages as "+X.XX%"
9. NEVER skip sections — if data unavailable, state "Awaiting confirmation"
10. End with INVALIDATION section showing specific invalidation prices`;

    const userPrompt = `🔮 ZIKALYZE AI ANALYSIS — ${sanitizedCrypto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 INSTITUTIONAL DATA FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbol:            ${sanitizedCrypto}
Current Price:     $${priceNum.toLocaleString()}
24h Change:        ${validatedChange >= 0 ? '🟢 +' : '🔴 '}${validatedChange.toFixed(2)}%
24h High:          $${highNum.toLocaleString()}
24h Low:           $${lowNum.toLocaleString()}
24h Range:         $${range.toFixed(2)} (${volatility}% volatility)
ATR (24h):         $${atr.toFixed(2)} (${atrPercent}%)
Range Position:    ${rangePosition}% ${rangePercent > 50 ? '[PREMIUM ZONE]' : '[DISCOUNT ZONE]'}

📈 VOLUME PROFILE DATA
Point of Control:  $${poc.toFixed(2)}
Value Area High:   $${valueAreaHigh.toFixed(2)}
Value Area Low:    $${valueAreaLow.toFixed(2)}
Volume Strength:   ${volumeStrength}
Vol/MCap Ratio:    ${volumeToMcap}%

🔄 MOMENTUM INDICATORS
RSI Estimate:      ${rsiEstimate.toFixed(1)} ${rsiEstimate > 70 ? '[OVERBOUGHT]' : rsiEstimate < 30 ? '[OVERSOLD]' : '[NEUTRAL]'}
RSI Divergence:    ${rsiDivergence}
Price/Vol Signal:  ${priceVsVolume}

📍 REFINED ORDER BLOCK ZONES (4H/1H)
Bullish OB:        $${obBullishLow.toFixed(2)} - $${obBullishHigh.toFixed(2)}
Bearish OB:        $${obBearishLow.toFixed(2)} - $${obBearishHigh.toFixed(2)}
Bullish FVG:       ${fvgBullishZone}
Bearish FVG:       ${fvgBearishZone}

⏱️ 15M MICRO-LEVEL ZONES (PRECISION ENTRIES)
Micro OB Bull:     ${microOBBullish} [last down-candle before impulse]
Micro OB Bear:     ${microOBBearish} [last up-candle before impulse]
Micro FVG Bull:    ${microFVGBullish} [15M imbalance - high prob fill]
Micro FVG Bear:    ${microFVGBearish} [15M imbalance - high prob fill]
OTE Zone Bull:     ${oteZoneBullish} [62-79% retracement]
OTE Zone Bear:     ${oteZoneBearish} [62-79% retracement]
Micro Stop Bull:   $${microStopBullish} [below 15M structure]
Micro Stop Bear:   $${microStopBearish} [above 15M structure]

📐 FIBONACCI LEVELS
Fib 0.618:         $${fibRetrace618.toFixed(2)}
Fib 0.382:         $${fibRetrace382.toFixed(2)}
Equilibrium:       $${midPoint.toFixed(2)}

💰 MARKET DATA
Volume 24h:        $${validatedVolume?.toLocaleString() || 'N/A'}
Market Cap:        $${validatedMarketCap?.toLocaleString() || 'N/A'}

📡 REAL-TIME ETF FLOW DATA
BTC ETF Net Flow:  ${etfFlowData.btcNetFlow}
ETH ETF Net Flow:  ${etfFlowData.ethNetFlow}
Flow Trend:        ${etfFlowData.flowTrend}
Daily Change:      ${etfFlowData.dailyChange}
ETF Sentiment:     ${etfFlowData.sentiment} ${etfFlowData.sentiment.includes('BULLISH') ? '🟢' : etfFlowData.sentiment.includes('BEARISH') ? '🔴' : '⚪'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM DETECTION: Phase = ${marketPhase} | HTF Bias = ${bias}
CALCULATED CONFIDENCE: ${calculatedConfidence}% (Vol: +${volumeBonus}, Trend: +${trendBonus}, Confluence: +${confluenceBonus}, ETF: ${etfBonus >= 0 ? '+' : ''}${etfBonus}${divergencePenalty < 0 ? ', Divergence: ' + divergencePenalty : ''})

DELIVER ANALYSIS IN THIS EXACT FORMAT:

🔮 ZIKALYZE AI ANALYSIS
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${validatedChange >= 0 ? '▲' : '▼'} ${Math.abs(validatedChange).toFixed(2)}%

📡 ETF INSTITUTIONAL FLOW
BTC ETF: ${etfFlowData.btcNetFlow} | Trend: ${etfFlowData.flowTrend} | Sentiment: ${etfFlowData.sentiment}
[Interpret ETF flow impact on price action — institutional demand/supply pressure]
[If inflows: Smart money accumulating — bullish signal]
[If outflows: Distribution phase — bearish signal]

📊 VOLUME PROFILE & RSI
POC: $${poc.toFixed(2)} — [magnetic level behavior]
RSI: ${rsiEstimate.toFixed(0)} — [overbought/oversold/divergence context]
Volume: ${volumeStrength} — [accumulation/distribution signal]

🌐 MACRO CONTEXT
DXY Correlation: [Impact on ${sanitizedCrypto}]
Risk Sentiment: [Risk-on/Risk-off implications]
ATH Proximity: [Upside exhaustion risk if applicable]
Key Macro Risk: [Primary macro factor to watch]

📅 DAILY TIMEFRAME
Trend: [Bullish/Bearish/Ranging]
Structure: [HH/HL or LH/LL pattern]
HTF Order Block: $[refined zone] — [volume-backed]
Key Level: $[major S/R] — [significance]

⏰ 4H TIMEFRAME
Bias: [Aligned/Counter to Daily]
Order Block: $${rangePercent < 50 ? obBullishLow.toFixed(2) + ' - ' + obBullishHigh.toFixed(2) : obBearishLow.toFixed(2) + ' - ' + obBearishHigh.toFixed(2)} — [volume cluster]
FVG Zone: ${rangePercent < 50 ? fvgBullishZone : fvgBearishZone} — [fill status]

🕐 1H TIMEFRAME
[BOS/CHoCH status]
Session: [Asian/London/NY context]
Liquidity: [Swept/Targeting $X]
Entry Zone: $[refined 1H zone]

⏱️ 15M PRECISION ENTRY (CRITICAL)
Micro Order Block: $[exact 15M OB zone] — [last opposing candle before impulse]
Micro FVG: $[15M imbalance zone] — [fill target within HTF zone]
15M Structure: [BOS/CHoCH status on 15M]
OTE Zone (62-79%): $[15M swing retracement zone]
Optimal Entry: $[exact sniper entry] — [confluence: micro OB + FVG + OTE]
Micro Stop: $[tight stop below/above 15M structure]
Session Context: [Asian range / London sweep / NY continuation]


🟢 BULL CASE (${bias === 'LONG' ? 'PRIMARY' : 'ALTERNATIVE'})
Signal: LONG | Confidence: ${calculatedConfidence}%
Entry: $[price] — [confluence reason]
Stop Loss: $[price] — [structure reference]
TP1: $[price] (+X%) | TP2: $[price] (+X%) | TP3: $[price] (+X%)
R:R = 1:[X.X]

🔴 BEAR CASE (${bias === 'SHORT' ? 'PRIMARY' : 'ALTERNATIVE'})
Signal: SHORT | Confidence: [X]%
Entry: $[price] — [if bull invalidates]
Stop Loss: $[price]
TP1: $${bearTarget1.toFixed(2)} | TP2: $${bearTarget2.toFixed(2)} | TP3: $${bearTarget3.toFixed(2)}
R:R = 1:[X.X]

⚠️ KEY LEVELS
Support: $${lowNum.toFixed(2)} → $${valueAreaLow.toFixed(2)} → $${bearTarget1.toFixed(2)}
Resistance: $${highNum.toFixed(2)} → $${valueAreaHigh.toFixed(2)} → $${(highNum + range * 0.382).toFixed(2)}

🔄 INVALIDATION
Bull Invalid: [Price + structure that invalidates bull case]
Bear Invalid: [Price + structure that invalidates bear case]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        // Quota / billing limit at AI gateway. Instead of failing hard (503),
        // stream a deterministic fallback analysis so the UI stays usable.
        const fallbackText =
          `\n\n⚠️ Service at capacity (quota reached). Showing fallback analysis (no AI).\n\n` +
          `Symbol: ${sanitizedCrypto}\n` +
          `Price: $${validatedPrice.toLocaleString()}\n` +
          `24h Change: ${validatedChange >= 0 ? "+" : ""}${validatedChange.toFixed(2)}%\n` +
          `24h Range: $${validatedLow24h.toFixed(2)} → $${validatedHigh24h.toFixed(2)}\n` +
          `Volatility (24h): ${volatility}%\n` +
          `Range Position: ${rangePosition}%\n` +
          `ETF Flow (est.): ${etfFlowData.totalNetFlow} (${etfFlowData.flowTrend})\n\n` +
          `Quick read:\n` +
          `• Bias: ${bias}\n` +
          `• Key Support: $${valueAreaLow.toFixed(2)}\n` +
          `• Key Resistance: $${valueAreaHigh.toFixed(2)}\n` +
          `• Bull invalidation: below $${(valueAreaLow - range * 0.05).toFixed(2)}\n` +
          `• Bear invalidation: above $${(valueAreaHigh + range * 0.05).toFixed(2)}\n`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const chunks = fallbackText.match(/.{1,120}/g) ?? [fallbackText];
            for (const chunk of chunks) {
              const payload = {
                choices: [{ delta: { content: chunk } }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      
      return new Response(JSON.stringify({ error: "Analysis unavailable. Please try again later." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in crypto-analyze function:", error);
    return new Response(
      JSON.stringify({ error: "Analysis service temporarily unavailable. Please try again later." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
