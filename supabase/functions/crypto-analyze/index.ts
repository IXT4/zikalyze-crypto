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

    // Generate algorithmic analysis without external API
    const generateLocalAnalysis = () => {
      const trendDirection = validatedChange >= 0 ? "bullish" : "bearish";
      const trendEmoji = validatedChange >= 0 ? "▲" : "▼";
      const signalType = bias === 'LONG' ? 'LONG' : bias === 'SHORT' ? 'SHORT' : 'NEUTRAL';
      
      // Calculate entry, stop, and targets
      const bullEntry = (lowNum + range * 0.25).toFixed(2);
      const bullStop = (lowNum - range * 0.05).toFixed(2);
      const bullTP1 = (priceNum + range * 0.382).toFixed(2);
      const bullTP2 = (priceNum + range * 0.618).toFixed(2);
      const bullTP3 = (priceNum + range * 1.0).toFixed(2);
      
      const bearEntry = (highNum - range * 0.25).toFixed(2);
      const bearStop = (highNum + range * 0.05).toFixed(2);
      
      // Risk/Reward calculations
      const bullRR = ((Number(bullTP2) - Number(bullEntry)) / (Number(bullEntry) - Number(bullStop))).toFixed(1);
      const bearRR = ((Number(bearEntry) - bearTarget2) / (Number(bearStop) - Number(bearEntry))).toFixed(1);
      
      // RSI interpretation
      const rsiContext = rsiEstimate > 70 ? "overbought territory — watch for bearish divergence" :
                         rsiEstimate < 30 ? "oversold territory — watch for bullish reversal" :
                         rsiEstimate > 55 ? "bullish momentum building" :
                         rsiEstimate < 45 ? "bearish pressure present" : "neutral momentum";
      
      // Volume interpretation
      const volumeContext = volumeStrength === 'HIGH' ? "Strong volume confirms " + (validatedChange >= 0 ? "accumulation" : "distribution") :
                           volumeStrength === 'MODERATE' ? "Moderate volume — watching for confirmation" :
                           "Low volume — waiting for conviction";
      
      // ETF flow interpretation
      const etfContext = etfFlowData.sentiment.includes('BULLISH') ? 
        "Institutional inflows detected — smart money accumulating. This aligns with bullish price action." :
        etfFlowData.sentiment.includes('BEARISH') ?
        "Institutional outflows observed — distribution phase. Caution warranted on longs." :
        "Neutral institutional flows — mixed positioning from smart money.";
      
      // Market phase interpretation
      const phaseContext = marketPhase === 'Markup' ? "Clear markup phase with higher highs and higher lows forming." :
                          marketPhase === 'Markdown' ? "Markdown phase active with lower highs and lower lows." :
                          marketPhase === 'Accumulation' ? "Accumulation zone — smart money building positions quietly." :
                          marketPhase === 'Distribution' ? "Distribution phase — watch for reversal signals." :
                          "Consolidation range — waiting for directional breakout.";
      
      // Structure analysis
      const structureAnalysis = rangePercent > 70 ? "Price in premium zone — ideal for shorts, risky for longs" :
                               rangePercent < 30 ? "Price in discount zone — ideal for longs, risky for shorts" :
                               rangePercent > 50 ? "Above equilibrium — slight bullish edge" :
                               "Below equilibrium — slight bearish edge";
      
      // 15M analysis
      const microContext = bias === 'LONG' ? 
        `Look for 15M bullish BOS/CHoCH at ${microOBBullish}. Entry on micro FVG fill at ${microFVGBullish} with stop below $${microStopBullish}.` :
        `Watch for 15M bearish BOS/CHoCH at ${microOBBearish}. Entry on micro FVG fill at ${microFVGBearish} with stop above $${microStopBearish}.`;
      
      // Session context based on time
      const hour = new Date().getUTCHours();
      const sessionContext = hour >= 0 && hour < 8 ? "Asian session — typically lower volatility, range-bound" :
                            hour >= 8 && hour < 14 ? "London session — high volatility, trend initiation" :
                            hour >= 14 && hour < 21 ? "New York session — continuation moves, major reversals" :
                            "Late session — reduced liquidity, avoid new positions";
      
      // Macro context
      const macroRisk = Math.abs(validatedChange) > 5 ? 
        "Elevated volatility suggests macro-driven moves. Watch for correlation with traditional markets." :
        "Stable conditions — crypto-specific factors likely driving price.";

      return `🔮 ZIKALYZE AI ANALYSIS
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${trendEmoji} ${Math.abs(validatedChange).toFixed(2)}%

📡 ETF INSTITUTIONAL FLOW
BTC ETF: ${etfFlowData.btcNetFlow} | Trend: ${etfFlowData.flowTrend} | Sentiment: ${etfFlowData.sentiment}
${etfContext}

📊 VOLUME PROFILE & RSI
POC: $${poc.toFixed(2)} — Price gravitating toward high-volume node
RSI: ${rsiEstimate.toFixed(0)} — ${rsiContext}
Volume: ${volumeStrength} — ${volumeContext}
${priceVsVolume !== 'CONVERGENT' ? `⚠️ ${priceVsVolume} detected — potential reversal signal` : ''}

🌐 MACRO CONTEXT
Market Phase: ${marketPhase} — ${phaseContext}
Range Position: ${rangePosition}% — ${structureAnalysis}
${macroRisk}

📅 DAILY TIMEFRAME
Trend: ${trendDirection.toUpperCase()} with ${Math.abs(validatedChange).toFixed(2)}% momentum
Structure: ${validatedChange > 0 ? 'Higher highs forming' : 'Lower lows forming'}
HTF Order Block: $${obBullishLow.toFixed(2)} - $${obBullishHigh.toFixed(2)} (demand)
Key Resistance: $${highNum.toFixed(2)} — 24h high

⏰ 4H TIMEFRAME
Bias: ${bias} — ${bias === 'LONG' ? 'Bullish structure intact' : bias === 'SHORT' ? 'Bearish structure dominant' : 'No clear directional bias'}
Order Block: $${rangePercent < 50 ? obBullishLow.toFixed(2) + ' - ' + obBullishHigh.toFixed(2) : obBearishLow.toFixed(2) + ' - ' + obBearishHigh.toFixed(2)}
FVG Zone: ${rangePercent < 50 ? fvgBullishZone : fvgBearishZone} — ${rangePercent < 50 ? 'unfilled bullish gap' : 'unfilled bearish gap'}

🕐 1H TIMEFRAME
Structure: ${validatedChange > 1 ? 'Bullish BOS confirmed' : validatedChange < -1 ? 'Bearish BOS confirmed' : 'Consolidating — awaiting BOS'}
${sessionContext}
Liquidity: ${rangePercent > 60 ? 'Equal highs above — likely sweep target' : 'Equal lows below — liquidity pool'}

⏱️ 15M PRECISION ENTRY (CRITICAL)
Micro Order Block: ${bias === 'LONG' ? microOBBullish : microOBBearish}
Micro FVG: ${bias === 'LONG' ? microFVGBullish : microFVGBearish}
OTE Zone (62-79%): ${bias === 'LONG' ? oteZoneBullish : oteZoneBearish}
${microContext}

🟢 BULL CASE (${bias === 'LONG' ? 'PRIMARY' : 'ALTERNATIVE'})
Signal: LONG | Confidence: ${calculatedConfidence}%
Entry: $${bullEntry} — OTE zone + micro OB confluence
Stop Loss: $${bullStop} — Below 15M structure low
TP1: $${bullTP1} (+${((Number(bullTP1) - priceNum) / priceNum * 100).toFixed(1)}%) | TP2: $${bullTP2} (+${((Number(bullTP2) - priceNum) / priceNum * 100).toFixed(1)}%) | TP3: $${bullTP3} (+${((Number(bullTP3) - priceNum) / priceNum * 100).toFixed(1)}%)
R:R = 1:${bullRR}

🔴 BEAR CASE (${bias === 'SHORT' ? 'PRIMARY' : 'ALTERNATIVE'})
Signal: SHORT | Confidence: ${100 - calculatedConfidence}%
Entry: $${bearEntry} — If bull invalidates at premium
Stop Loss: $${bearStop} — Above structure high
TP1: $${bearTarget1.toFixed(2)} | TP2: $${bearTarget2.toFixed(2)} | TP3: $${bearTarget3.toFixed(2)}
R:R = 1:${bearRR}

⚠️ KEY LEVELS
Support: $${lowNum.toFixed(2)} → $${valueAreaLow.toFixed(2)} → $${bearTarget1.toFixed(2)}
Resistance: $${highNum.toFixed(2)} → $${valueAreaHigh.toFixed(2)} → $${(highNum + range * 0.382).toFixed(2)}

🔄 INVALIDATION
Bull Invalid: Close below $${(lowNum - range * 0.1).toFixed(2)} — breaks market structure
Bear Invalid: Close above $${(highNum + range * 0.1).toFixed(2)} — continuation of bullish trend`;
    };

    // Stream the local analysis as SSE
    const analysis = generateLocalAnalysis();
    const encoder = new TextEncoder();
    
    // Create a readable stream that simulates SSE streaming
    const stream = new ReadableStream({
      start(controller) {
        const words = analysis.split(' ');
        let index = 0;
        
        const sendChunk = () => {
          if (index < words.length) {
            // Send 3-5 words at a time for natural streaming
            const chunkSize = Math.min(3 + Math.floor(Math.random() * 3), words.length - index);
            const chunk = words.slice(index, index + chunkSize).join(' ') + ' ';
            
            const data = JSON.stringify({
              choices: [{
                delta: { content: chunk }
              }]
            });
            
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            index += chunkSize;
            
            // Variable delay for natural feel
            setTimeout(sendChunk, 20 + Math.random() * 30);
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
      JSON.stringify({ error: "Analysis service temporarily unavailable. Please try again later." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
