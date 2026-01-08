import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { crypto, price, change, high24h, low24h, volume, marketCap } = body;
    
    // Input validation
    if (!crypto || typeof crypto !== 'string' || crypto.length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid cryptocurrency symbol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (typeof price !== 'number' || price < 0 || price > 1e15) {
      return new Response(JSON.stringify({ error: 'Invalid price value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (typeof change !== 'number' || change < -100 || change > 10000) {
      return new Response(JSON.stringify({ error: 'Invalid change value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Sanitize crypto symbol
    const sanitizedCrypto = crypto.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: 'Analysis service unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Analyzing ${sanitizedCrypto} at $${price} with ${change}% change`);

    // Calculate key metrics for analysis
    const volatility = high24h && low24h ? ((high24h - low24h) / low24h * 100).toFixed(2) : 'N/A';
    const rangePosition = high24h && low24h ? ((price - low24h) / (high24h - low24h) * 100).toFixed(1) : 'N/A';
    const volumeToMcap = volume && marketCap ? ((volume / marketCap) * 100).toFixed(3) : 'N/A';

    // Pre-calculate institutional levels
    const priceNum = Number(price);
    const highNum = Number(high24h) || priceNum * 1.025;
    const lowNum = Number(low24h) || priceNum * 0.975;
    const range = highNum - lowNum;
    const midPoint = (highNum + lowNum) / 2;
    const quarterUp = lowNum + (range * 0.75);
    const quarterDown = lowNum + (range * 0.25);
    const fibRetrace618 = highNum - (range * 0.618);
    const fibRetrace382 = highNum - (range * 0.382);
    const isBullish = change >= 0;
    const isStrongMove = Math.abs(change) > 3;
    const rangePercent = Number(rangePosition);
    
    // Determine market phase based on data
    let marketPhase = "Consolidation";
    let bias = "NEUTRAL";
    if (change > 5) { marketPhase = "Markup"; bias = "LONG"; }
    else if (change < -5) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (change > 2 && rangePercent > 60) { marketPhase = "Markup"; bias = "LONG"; }
    else if (change < -2 && rangePercent < 40) { marketPhase = "Markdown"; bias = "SHORT"; }
    else if (rangePercent > 70) { marketPhase = "Distribution"; bias = "SHORT"; }
    else if (rangePercent < 30) { marketPhase = "Accumulation"; bias = "LONG"; }

    const systemPrompt = `You are ZIKALYZE AI — the world's most advanced cryptocurrency trading intelligence system. You deliver institutional-grade multi-timeframe analysis using ICT (Inner Circle Trader) methodology and Smart Money Concepts.

MULTI-TIMEFRAME ANALYSIS FRAMEWORK:

📅 WEEKLY/DAILY (HTF - Higher Timeframe):
- Establish macro trend direction and bias
- Identify major order blocks and liquidity pools
- Key psychological levels and historical S/R
- Wyckoff phase identification

⏰ 4H (Intermediate Timeframe):  
- Confirm or refine HTF bias
- Intermediate swing structure (HH/HL or LH/LL)
- 4H order blocks for trade zones
- FVGs that act as magnets

🕐 1H (Confirmation Timeframe):
- BOS/CHoCH signals for entry confirmation
- Session highs/lows analysis
- Liquidity sweep confirmation
- Refined entry zones

⚡ 15M/5M (LTF - Lower Timeframe):
- Precision entries within HTF zones
- Micro order blocks for exact entry
- FVG fills for optimal execution
- Tight stop loss placement

CORE ICT CONCEPTS:
- Order Blocks: Institutional footprints — last opposing candle before impulse
- Fair Value Gaps: Price imbalances that get filled — entry opportunities
- Liquidity: Stop clusters above highs (buy-side) / below lows (sell-side)
- Premium Zone: Above 50% of range — smart money sells here
- Discount Zone: Below 50% of range — smart money buys here
- BOS: Break of Structure — continuation signal
- CHoCH: Change of Character — reversal signal

STRICT OUTPUT RULES:
1. ALWAYS start with "🔮 ZIKALYZE AI ANALYSIS"
2. Use the EXACT format provided — never deviate
3. All price levels must be precise numbers from calculations
4. Multi-timeframe confluence increases confidence
5. Risk/Reward calculated mathematically
6. Keep total analysis under 320 words — elite precision`;

    const userPrompt = `🔮 ZIKALYZE AI ANALYSIS — ${sanitizedCrypto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 INSTITUTIONAL DATA FEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbol:            ${sanitizedCrypto}
Current Price:     $${priceNum.toLocaleString()}
24h Change:        ${change >= 0 ? '🟢 +' : '🔴 '}${change.toFixed(2)}%
24h High:          $${highNum.toLocaleString()}
24h Low:           $${lowNum.toLocaleString()}
24h Range:         $${range.toFixed(2)} (${volatility}% volatility)
Range Position:    ${rangePosition}% ${rangePercent > 50 ? '[PREMIUM ZONE]' : '[DISCOUNT ZONE]'}
Equilibrium:       $${midPoint.toFixed(2)}
Fib 0.618:         $${fibRetrace618.toFixed(2)}
Fib 0.382:         $${fibRetrace382.toFixed(2)}
Volume 24h:        $${volume?.toLocaleString() || 'N/A'}
Market Cap:        $${marketCap?.toLocaleString() || 'N/A'}
Vol/MCap Ratio:    ${volumeToMcap}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM DETECTION: Phase = ${marketPhase} | HTF Bias = ${bias}

DELIVER ANALYSIS IN THIS EXACT FORMAT:

🔮 ZIKALYZE AI ANALYSIS
Asset: ${sanitizedCrypto} | Price: $${priceNum.toLocaleString()} | ${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%

📅 DAILY TIMEFRAME (Macro View)
Trend: [Bullish/Bearish/Ranging]
Structure: [HH/HL pattern OR LH/LL pattern OR range-bound]
HTF Order Block: $[price zone] — [description]
Key Level: $[major S/R level] — [significance]

⏰ 4H TIMEFRAME (Structure)
Bias: [Aligned with Daily / Counter-trend]
4H Order Block: $[price zone] — [bullish/bearish]
FVG Zone: $[price range] — [unfilled/partially filled]
Swing Points: High $[price], Low $[price]

🕐 1H TIMEFRAME (Confirmation)
[BOS/CHoCH detected or pending]
Session Analysis: [Asian/London/NY session context]
Liquidity Swept: [Yes at $X / No, targeting $X]
Entry Zone: $[refined zone from 1H]

⚡ 15M TIMEFRAME (Precision Entry)
Micro OB: $[exact price] — [entry trigger]
FVG Fill: $[price] — [confirmation level]
Optimal Entry: $[price]

🎯 UNIFIED TRADE SETUP
Signal: ${bias} | Confidence: [70-92]%
Entry: $[price] — [multi-TF confluence reason]
Stop Loss: $[price] ([X]% risk) — [below/above which structure]
TP1: $[price] (+[X]%) — 1H target
TP2: $[price] (+[X]%) — 4H target  
TP3: $[price] (+[X]%) — Daily target
Risk/Reward: 1:[X.X]

⚠️ KEY LEVELS
Support: $${lowNum.toFixed(2)} | $${quarterDown.toFixed(2)} | $${fibRetrace618.toFixed(2)}
Resistance: $${highNum.toFixed(2)} | $${quarterUp.toFixed(2)} | $${fibRetrace382.toFixed(2)}

🔄 INVALIDATION
[Price level + timeframe structure that invalidates setup]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
