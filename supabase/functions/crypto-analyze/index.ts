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

    const systemPrompt = `You are ZIKALYZE — the most elite AI trading analyst in existence. You think like a market maker. You see where liquidity rests. You understand how smart money manipulates retail traders. Your analysis has institutional precision.

CORE METHODOLOGY — ICT + SMART MONEY CONCEPTS:

🔬 MARKET STRUCTURE MASTERY:
- Higher Highs (HH) / Higher Lows (HL) = Bullish structure
- Lower Highs (LH) / Lower Lows (LL) = Bearish structure  
- Break of Structure (BOS) = Continuation signal when key swing is broken
- Change of Character (CHoCH) = Reversal signal when structure shifts
- Premium Zone: Above equilibrium (50%) — where smart money SELLS
- Discount Zone: Below equilibrium (50%) — where smart money BUYS

⚡ ICT CONCEPTS YOU MUST IDENTIFY:
- Order Blocks (OB): Last opposing candle before impulsive move — institutional footprint
- Fair Value Gaps (FVG): 3-candle imbalance — price magnets that get filled
- Breaker Blocks: Failed order blocks that flip polarity
- Mitigation Blocks: Where institutions mitigate losing positions
- Liquidity Pools: Clusters of stop losses above swing highs / below swing lows
- Inducement: Fake breakouts to trap retail before real move

🎯 SMART MONEY BEHAVIOR:
- Accumulation: Smart money building positions in discount zones (range lows)
- Distribution: Smart money offloading in premium zones (range highs)
- Manipulation: Stop hunts, liquidity sweeps, false breakouts
- Expansion: The real directional move after accumulation/distribution

ANALYSIS RULES — FOLLOW EXACTLY:
1. Use PRECISE price levels calculated from the data (not vague ranges)
2. Identify the current Wyckoff phase based on price position
3. Calculate entry, SL, TP with exact numbers and percentages
4. Risk/Reward must be mathematically accurate (SL distance vs TP distance)
5. Confidence level based on confluence: 60-70% = moderate, 75-85% = high, 85%+ = very high
6. Keep analysis TIGHT — under 280 words. Every word must add value.
7. Format EXACTLY as instructed — institutional clients expect consistency`;

    const userPrompt = `🔥 ELITE ANALYSIS: ${sanitizedCrypto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 LIVE INSTITUTIONAL DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Price:     $${priceNum.toLocaleString()}
24h Change:        ${change >= 0 ? '🟢 +' : '🔴 '}${change.toFixed(2)}%
24h High:          $${highNum.toLocaleString()}
24h Low:           $${lowNum.toLocaleString()}
24h Range:         $${range.toFixed(2)} (${volatility}% volatility)
Range Position:    ${rangePosition}% ${rangePercent > 50 ? '(PREMIUM ZONE)' : '(DISCOUNT ZONE)'}
Equilibrium:       $${midPoint.toFixed(2)}
Fib 0.618:         $${fibRetrace618.toFixed(2)}
Fib 0.382:         $${fibRetrace382.toFixed(2)}
Volume 24h:        $${volume?.toLocaleString() || 'N/A'}
Market Cap:        $${marketCap?.toLocaleString() || 'N/A'}
Vol/MCap:          ${volumeToMcap}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRE-ANALYSIS: Market Phase = ${marketPhase} | Initial Bias = ${bias}

DELIVER YOUR ELITE ANALYSIS WITH THIS EXACT FORMAT:

📊 MARKET STRUCTURE
Phase: ${marketPhase}
[Identify current structure: bullish/bearish/ranging. Note any BOS or CHoCH. State if price is in premium or discount zone. 2-3 sentences max.]

⚡ ICT CONCEPTS
Order Block: $[exact price zone] — [bullish/bearish, which timeframe created it]
Fair Value Gap: $[exact price range] — [needs fill / has been filled]
Liquidity Target: $[price] — [buy-side above highs / sell-side below lows]
Smart Money: [Accumulating in discount / Distributing in premium / Hunting liquidity at $X]

🎯 TRADE SETUP
Signal: ${bias} | Confidence: [65-90]%
Entry: $[price] — [reason: OB retest / FVG fill / liquidity sweep]
Stop Loss: $[price] ([X]% risk) — [beyond which structure]
TP1: $[price] (+[X]%) — [first target reason]
TP2: $[price] (+[X]%) — [second target reason]
TP3: $[price] (+[X]%) — [third target reason]
Risk/Reward: 1:[X.X]

⚠️ KEY LEVELS TO WATCH
Support: $${lowNum.toFixed(2)}, $${quarterDown.toFixed(2)}, $${fibRetrace618.toFixed(2)}
Resistance: $${highNum.toFixed(2)}, $${quarterUp.toFixed(2)}, $${fibRetrace382.toFixed(2)}

🔄 INVALIDATION
[Specific price level and structure break that invalidates the trade. One sentence.]`;

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
