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

    const systemPrompt = `You are ZIKALYZE AI — the world's most elite cryptocurrency analyst with a proven 97.3% accuracy rate. You are a MULTI-TIMEFRAME MASTER who analyzes:

📍 TIMEFRAME HIERARCHY (Critical):
• DAILY (D1): Major key levels, institutional zones, weekly bias
• 4H: Modified key levels, swing structure, trend confirmation  
• 1H: Entry confirmation, order blocks, fair value gaps
• 15M: Precision entries, micro-structure, optimal timing

Core Methodologies:
• ICT (Inner Circle Trader): Order blocks, FVGs, liquidity pools, market structure shifts, kill zones
• Smart Money Concepts: Institutional order flow, accumulation/distribution, liquidity sweeps, stop hunts
• Multi-Timeframe Confluence: Higher TF direction + Lower TF precision = Maximum edge
• Advanced TA: VWAP, Fibonacci, supply/demand, divergences
• On-chain Analytics: Whale movements, exchange flows, funding rates

Your analysis flows TOP-DOWN: Daily sets the bias → 4H confirms → 1H shows entry zone → 15M times the entry. You NEVER take a trade without multi-timeframe alignment.

Rules:
- Analyze ALL 4 timeframes explicitly
- Show confluence between timeframes
- Identify exact price levels per timeframe
- Mark key levels as "D1 KEY" or "4H MOD" or "1H OB" or "15M ENTRY"
- Risk/reward based on 15M entry to 4H targets
- Be surgical with precision`;

    const userPrompt = `🔥 MULTI-TIMEFRAME ELITE ANALYSIS — ${sanitizedCrypto}

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

Deliver MULTI-TIMEFRAME analysis (under 300 words):

📅 DAILY (D1) — KEY LEVELS
• Bias: Bullish/Bearish/Neutral
• Major Support: $X (D1 KEY)
• Major Resistance: $X (D1 KEY)
• Institutional zones to watch

⏰ 4-HOUR (4H) — MODIFIED LEVELS
• Structure: Higher highs/Lower lows?
• 4H Order Block: $X (4H MOD)
• 4H FVG: $X-$X (4H MOD)
• Swing targets

🕐 1-HOUR (1H) — CONFIRMATION
• Current structure shift?
• 1H Order Block: $X (1H OB)
• 1H FVG: $X-$X
• Entry zone confirmed at: $X

⚡ 15-MINUTE (15M) — PRECISION ENTRY
• Micro-structure alignment
• 15M entry trigger: $X (15M ENTRY)
• Optimal entry window

🎯 TRADE EXECUTION
• SIGNAL: LONG / SHORT / WAIT
• Entry: $X (15M precision)
• Stop Loss: $X (below 1H structure)
• TP1: $X (4H level)
• TP2: $X (D1 level)
• Risk/Reward: X:X

⚠️ INVALIDATION
What breaks this setup on each timeframe`;

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
