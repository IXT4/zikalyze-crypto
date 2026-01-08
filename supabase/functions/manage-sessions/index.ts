import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown Device";
  
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  
  // Detect browser
  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari")) {
    browser = "Safari";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }
  
  // Detect OS
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }
  
  return `${browser} on ${os}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, sessionId } = await req.json();
    const userAgent = req.headers.get("User-Agent") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "Unknown";

    switch (action) {
      case "register": {
        // Create a session hash from the token (don't store full token)
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sessionToken = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        
        const deviceInfo = parseUserAgent(userAgent);
        
        // Check if session already exists
        const { data: existing } = await supabase
          .from("user_sessions")
          .select("id")
          .eq("session_token", sessionToken)
          .single();
        
        if (existing) {
          // Update last active
          await supabase
            .from("user_sessions")
            .update({ 
              last_active_at: new Date().toISOString(),
              is_current: true 
            })
            .eq("id", existing.id);
          
          // Mark other sessions as not current
          await supabase
            .from("user_sessions")
            .update({ is_current: false })
            .eq("user_id", user.id)
            .neq("id", existing.id);
        } else {
          // Mark all other sessions as not current
          await supabase
            .from("user_sessions")
            .update({ is_current: false })
            .eq("user_id", user.id);
          
          // Insert new session
          await supabase
            .from("user_sessions")
            .insert({
              user_id: user.id,
              session_token: sessionToken,
              device_info: deviceInfo,
              ip_address: clientIp,
              user_agent: userAgent,
              is_current: true,
            });
        }
        
        // Clean up old sessions (older than 30 days)
        await supabase
          .from("user_sessions")
          .delete()
          .eq("user_id", user.id)
          .lt("last_active_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { data: sessions, error } = await supabase
          .from("user_sessions")
          .select("id, device_info, ip_address, last_active_at, created_at, is_current")
          .eq("user_id", user.id)
          .order("last_active_at", { ascending: false });
        
        if (error) {
          throw error;
        }
        
        return new Response(
          JSON.stringify({ sessions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "revoke": {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: "Session ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Check if trying to revoke current session
        const { data: sessionToRevoke } = await supabase
          .from("user_sessions")
          .select("is_current")
          .eq("id", sessionId)
          .eq("user_id", user.id)
          .single();
        
        if (sessionToRevoke?.is_current) {
          return new Response(
            JSON.stringify({ error: "Cannot revoke current session. Use logout instead." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const { error } = await supabase
          .from("user_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("user_id", user.id);
        
        if (error) {
          throw error;
        }
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "revoke-all": {
        // Revoke all sessions except current
        const { error } = await supabase
          .from("user_sessions")
          .delete()
          .eq("user_id", user.id)
          .eq("is_current", false);
        
        if (error) {
          throw error;
        }
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Session management error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
