// ═══════════════════════════════════════════════════════════════════════════════
// 📊 crypto-ws-proxy — Deprecated: Use Pyth/Chainlink Oracles Instead
// ═══════════════════════════════════════════════════════════════════════════════
// This edge function is no longer needed for price streaming.
// Real-time prices now come directly from decentralized oracles:
// - Pyth Network (primary): Client-side SSE streaming
// - Chainlink (fallback): On-chain price feeds
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Return deprecation notice for non-WebSocket requests
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(
      JSON.stringify({
        status: "deprecated",
        message: "This WebSocket proxy is deprecated. Use Pyth Oracle or Chainlink for real-time price data.",
        alternatives: {
          pyth: "https://hermes.pyth.network/v2/updates/price/stream",
          chainlink: "On-chain price feeds via ethers.js"
        }
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // For WebSocket upgrade requests, return a helpful message
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  
  clientSocket.onopen = () => {
    // Send deprecation notice and close
    clientSocket.send(JSON.stringify({
      type: "notice",
      message: "This WebSocket proxy is deprecated. Please migrate to Pyth Oracle for decentralized price streaming.",
      action: "close"
    }));
    
    // Close after sending notice
    setTimeout(() => {
      clientSocket.close(1000, "Service deprecated - use Pyth Oracle");
    }, 1000);
  };

  return response;
});
