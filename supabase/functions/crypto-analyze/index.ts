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

    const systemPrompt = `You are ZIKALYZE AI, a professional cryptocurrency trading analyst. You provide consistent, structured analysis using ICT (Inner Circle Trader) and Smart Money Concepts.

ANALYSIS FRAMEWORK:
- Market Structure: Identify trend direction, key swing highs/lows, Break of Structure (BOS), Change of Character (CHoCH)
- Order Blocks: Institutional buying/selling zones from impulsive moves
- Fair Value Gaps (FVG): Imbalanced price areas that price may revisit
- Liquidity: Stop loss clusters above highs / below lows that get swept
- VWAP: Volume-weighted average price as dynamic support/resistance

RULES FOR CONSISTENCY:
1. Always use the EXACT format provided - never deviate
2. Base all levels on the actual price data given - use real math
3. Support/Resistance must be calculated from the 24h high/low data
4. Entry, SL, TP levels must be precise numbers relative to current price
5. Risk/Reward must be mathematically calculated
6. Keep analysis under 250 words - be direct and actionable
7. Signal confidence should reflect the data: consolidation = 50-65%, trending = 70-85%`;

    const priceNum = Number(price);
    const highNum = Number(high24h) || priceNum * 1.02;
    const lowNum = Number(low24h) || priceNum * 0.98;
    const range = highNum - lowNum;
    const midPoint = (highNum + lowNum) / 2;
    const isBullish = change >= 0;
    const priceNearHigh = priceNum > midPoint;

    const userPrompt = `Analyze ${sanitizedCrypto} with this EXACT format:

CURRENT DATA:
- Price: $${priceNum.toLocaleString()}
- 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
- 24h High: $${highNum.toLocaleString()}
- 24h Low: $${lowNum.toLocaleString()}
- 24h Range: $${range.toFixed(2)} (${volatility}%)
- Range Position: ${rangePosition}% (0=at low, 100=at high)
- Volume: $${volume?.toLocaleString() || 'N/A'}
- Market Cap: $${marketCap?.toLocaleString() || 'N/A'}

RESPOND WITH THIS EXACT STRUCTURE:

📊 MARKET STRUCTURE
Current phase: [Accumulation/Markup/Distribution/Markdown/Consolidation]
Key levels based on 24h range and price action: Resistance at $[high area], Support at $[low area]. [1-2 sentence observation about current position in range]

⚡ ICT ANALYSIS
[Bullish/Bearish] Order Block: $[price zone] ([reasoning from structure]).
Fair Value Gap (FVG): $[price range] ([which timeframe/move created it]).
[Buy-Side/Sell-Side] Liquidity: [Where stops are clustered based on swing points].
Smart money appears to be [accumulating/distributing/neutral], [1 sentence why based on price action].

🎯 TRADE SETUP
Signal: ${isBullish ? 'LONG' : 'SHORT'} | Confidence: [50-85]%
Entry: $[specific price] - [reason]
Stop Loss: $[specific price] - [reason, should be beyond key structure]
TP1: $[price] (+[%]) - [reason]
TP2: $[price] (+[%]) - [reason]  
TP3: $[price] (+[%]) - [reason]
Risk/Reward: 1:[calculated ratio]

⚠️ KEY LEVELS
Support: $[level 1], $[level 2]
Resistance: $[level 1], $[level 2]

🔄 INVALIDATION
[What price action would invalidate this setup - be specific with price level]`;

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
