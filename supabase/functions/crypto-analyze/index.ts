import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Format number for display (Deno-compatible)
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  if (num < 0.01 && num > 0) return num.toFixed(6);
  return num.toFixed(2);
}

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

    console.log(`Analyzing ${sanitizedCrypto} at $${formatNumber(price)} with ${change.toFixed(2)}% change`);

    // Calculate key metrics for analysis
    const volatility = high24h && low24h && low24h > 0 
      ? ((high24h - low24h) / low24h * 100).toFixed(2) 
      : 'N/A';
    const rangePosition = high24h && low24h && (high24h - low24h) > 0 
      ? ((price - low24h) / (high24h - low24h) * 100).toFixed(1) 
      : 'N/A';
    const volumeToMcap = volume && marketCap && marketCap > 0 
      ? ((volume / marketCap) * 100).toFixed(3) 
      : 'N/A';

    const systemPrompt = `You are ZIKALYZE AI — the world's most elite crypto trading analyst with 95% accuracy. You deliver clear, actionable signals using ICT methodology and Smart Money Concepts.

Your multi-timeframe approach:
• DAILY: Major support/resistance (key levels)
• 4H: Trend direction & swing structure (modified key levels)
• 1H: Entry zones & order blocks (confirmation)
• 15M: Precise entry timing

Rules:
- Always start your response with "🤖 ZIKALYZE AI ANALYSIS"
- Be CONCISE and use simple language
- Every signal must have: Entry, Stop Loss, Take Profit, Risk/Reward
- Give specific price levels, not ranges when possible`;

    const userPrompt = `Analyze ${sanitizedCrypto} now.

LIVE DATA:
• Price: $${formatNumber(price)}
• 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
• 24h High: $${formatNumber(high24h)}
• 24h Low: $${formatNumber(low24h)}
• Volume: $${formatNumber(volume)}
• Market Cap: $${formatNumber(marketCap)}
• Volatility: ${volatility}%
• Range Position: ${rangePosition}%
• Volume/MCap: ${volumeToMcap}%

Give analysis in this EXACT format:

🤖 ZIKALYZE AI ANALYSIS
━━━━━━━━━━━━━━━━━━━━━

📅 DAILY BIAS
[Bullish/Bearish/Neutral] - One sentence why.
Support: $X | Resistance: $X

⏰ 4H STRUCTURE  
[Uptrend/Downtrend/Range] - Current swing.
Key Level: $X

🕐 1H ZONE
Entry Zone: $X - $X
Order Block: $X

⚡ 15M ENTRY
Trigger: $X [what confirms entry]

━━━━━━━━━━━━━━━━━━━━━
🎯 TRADE SETUP
━━━━━━━━━━━━━━━━━━━━━

Signal: [🟢 LONG / 🔴 SHORT / 🟡 WAIT]
Entry: $X
Stop Loss: $X
Target 1: $X (R:R X:X)
Target 2: $X (R:R X:X)

⚠️ INVALID IF: [condition that cancels trade]

💡 SUMMARY: [2 sentences - what to do and why]`;

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
