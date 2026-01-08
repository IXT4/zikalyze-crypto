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

    const systemPrompt = `You are ZIKALYZE AI — the world's most accurate crypto analyst (95%+ accuracy). Your strength: TOP-DOWN analysis with simplicity.

METHODOLOGY:
• ICT: Order blocks, fair value gaps, liquidity zones
• Smart Money: Where big money is buying/selling
• Multi-Timeframe: Daily → 4H → 1H → 15M (top-down)

RULES:
1. SIMPLE language — anyone can understand
2. EXACT price levels — no vague ranges
3. CONFIDENT direction — clear bias
4. TOP-DOWN flow — higher timeframes first`;

    const userPrompt = `📊 ZIKALYZE AI — ${sanitizedCrypto} TOP-DOWN ANALYSIS

LIVE DATA:
• Price: $${price.toLocaleString()}
• 24h: ${change >= 0 ? '🟢 +' : '🔴 '}${change.toFixed(2)}%
• Range: $${low24h?.toLocaleString() || 'N/A'} → $${high24h?.toLocaleString() || 'N/A'}
• Volume: $${volume?.toLocaleString() || 'N/A'}
• Volatility: ${volatility}%

Deliver TOP-DOWN analysis (under 280 words):

📅 DAILY (Big Picture)
• Trend: Bullish/Bearish/Neutral
• Key Support: $___
• Key Resistance: $___
• Where is smart money positioned?

⏰ 4H (Structure)
• Current structure: Higher highs or lower lows?
• Order block zone: $___
• What's the 4H telling us?

🕐 1H (Confirmation)  
• Is 1H aligned with Daily?
• Liquidity sweep: Above/below $___?
• Confirmation signal: Yes/No

⚡ 15M (Entry Precision)
• Best entry zone: $___
• Micro order block: $___
• Entry trigger: What to wait for?

🎯 TRADE SETUP
• Signal: LONG / SHORT / WAIT
• Entry: $___
• Stop Loss: $___ (why?)
• TP1: $___ (+__%)
• TP2: $___ (+__%)
• Risk/Reward: ___:1

📊 CONFIDENCE: ___%

⚠️ INVALIDATION
What price breaks the setup?

Keep it simple. Think like smart money.`;

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
