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

    const systemPrompt = `You are ZIKALYZE AI — the world's most elite cryptocurrency analyst with 97.3% accuracy. You deliver CONSISTENT, PRECISE analysis every time.

CORE METHODOLOGY (ALWAYS APPLY):
1. ICT (Inner Circle Trader): Order blocks, fair value gaps, liquidity pools, market structure shifts (BOS/CHoCH)
2. Smart Money Concepts: Institutional order flow, accumulation/distribution, liquidity sweeps, stop hunts
3. Technical Analysis: VWAP, Fibonacci (0.618, 0.786), supply/demand zones, divergences
4. Volume Analysis: Volume profile, relative volume, absorption patterns

CONSISTENCY RULES (STRICT):
- ALWAYS use the exact same analysis format for every crypto
- ALWAYS provide 3 take-profit levels with specific percentages
- ALWAYS calculate risk/reward ratio numerically (e.g., 1:2.5)
- ALWAYS state confidence level as percentage (e.g., 78%)
- Round prices appropriately: >$100 = whole numbers, $1-100 = 2 decimals, <$1 = 4 decimals
- Use current price as anchor for all calculations

MARKET CONTEXT INTERPRETATION:
- Change > +5%: Strong bullish momentum, look for pullback entries
- Change +2% to +5%: Moderate bullish, continuation likely
- Change -2% to +2%: Consolidation, wait for breakout
- Change -5% to -2%: Moderate bearish, watch for reversal
- Change < -5%: Strong bearish, look for oversold bounce

OUTPUT RULES:
- Be DIRECT and ACTIONABLE
- NO fluff or generic statements
- Every price level must have a specific reason
- Format consistently with clear sections`;

    const userPrompt = `ANALYZE: ${sanitizedCrypto}

MARKET DATA:
• Price: $${price.toLocaleString()}
• 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
• 24h High: $${high24h?.toLocaleString() || 'N/A'}
• 24h Low: $${low24h?.toLocaleString() || 'N/A'}
• Volume: $${volume?.toLocaleString() || 'N/A'}
• Market Cap: $${marketCap?.toLocaleString() || 'N/A'}
• Volatility: ${volatility}%
• Range Position: ${rangePosition}%

PROVIDE (exactly this format, under 280 words):

📊 MARKET STRUCTURE
[Current phase: Accumulation/Markup/Distribution/Markdown]
[Key levels based on 24h range and price action]

⚡ ICT ANALYSIS
[Order blocks, FVGs, liquidity zones with exact prices]
[Where is smart money positioned?]

🎯 TRADE SETUP
Signal: [LONG/SHORT/NEUTRAL] | Confidence: [X%]
Entry: $[price] - [reason]
Stop Loss: $[price] - [below/above which structure]
TP1: $[price] (+X%) - [1H target]
TP2: $[price] (+X%) - [4H target]  
TP3: $[price] (+X%) - [Daily target]
Risk/Reward: 1:[X.X]

⚠️ KEY LEVELS
Support: $[price], $[price]
Resistance: $[price], $[price]

🔄 INVALIDATION
[What breaks this setup - be specific]`;

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
