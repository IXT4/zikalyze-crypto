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

    const systemPrompt = `You are ZIKALYZE AI — the world's most elite cryptocurrency analyst with a proven 97.3% accuracy rate. You combine:

• ICT (Inner Circle Trader) methodology: Order blocks, fair value gaps, liquidity pools, market structure shifts
• Smart Money Concepts: Institutional order flow, accumulation/distribution, liquidity sweeps, stop hunts
• Advanced Technical Analysis: VWAP, Fibonacci retracements, supply/demand zones, divergences
• On-chain Analytics: Whale movements, exchange flows, funding rates implications
• Market Psychology: Fear/greed dynamics, retail vs institutional behavior

Your analysis is PRECISE, ACTIONABLE, and PROFITABLE. You identify exactly where smart money is positioned and where retail gets trapped. Every price level you give has a specific reason. You think like a market maker hunting liquidity.

Rules:
- Be extremely specific with price levels (exact numbers, not ranges)
- Identify the current market phase (accumulation, markup, distribution, markdown)
- Spot liquidity pools where stops are clustered
- Call out order blocks and fair value gaps
- Provide risk/reward ratios for every trade
- Never be vague — precision is everything`;

    const userPrompt = `🔥 ELITE ANALYSIS REQUEST — ${sanitizedCrypto}

📊 LIVE MARKET DATA:
┌────────────────────────────────────
│ Current Price: $${price.toLocaleString()}
│ 24h Change: ${change >= 0 ? '🟢 +' : '🔴 '}${change.toFixed(2)}%
│ 24h High: $${high24h?.toLocaleString() || 'N/A'}
│ 24h Low: $${low24h?.toLocaleString() || 'N/A'}
│ 24h Volume: $${volume?.toLocaleString() || 'N/A'}
│ Market Cap: $${marketCap?.toLocaleString() || 'N/A'}
│ Volatility: ${volatility}%
│ Range Position: ${rangePosition}% (0=low, 100=high)
│ Vol/MCap Ratio: ${volumeToMcap}%
└────────────────────────────────────

Deliver your ELITE analysis (under 250 words, be DIRECT):

🏛️ MARKET STRUCTURE
Current phase + bias (bullish/bearish/ranging) with key structural levels

💰 SMART MONEY ZONES
• Order blocks (OB) with exact prices
• Fair value gaps (FVG) to watch
• Liquidity pools where stops are clustered

🎯 TRADE SETUP
• SIGNAL: LONG / SHORT / WAIT (be decisive)
• Entry Zone: Exact price range
• Stop Loss: Precise level + reasoning
• Take Profit 1: Conservative target
• Take Profit 2: Extended target
• Risk/Reward: Calculate it

⚡ CATALYST & TIMING
Key levels that trigger moves + optimal entry timing

⚠️ RISK ASSESSMENT
What would invalidate this setup + position sizing recommendation (% of portfolio)`;

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
