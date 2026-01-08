import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to application domains
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Extract client IP from various headers (in order of priority)
function getClientIP(req: Request): string | null {
  // Cloudflare
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;
  
  // X-Forwarded-For (may contain multiple IPs, first one is client)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }
  
  // X-Real-IP
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  
  // True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIP = req.headers.get("true-client-ip");
  if (trueClientIP) return trueClientIP;
  
  return null;
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  return ipv6Pattern.test(ip);
}

interface RateLimitRequest {
  email: string;
  action: "check" | "record";
  success?: boolean; // Only for "record" action
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: RateLimitRequest = await req.json();
    const { email, action, success } = body;
    
    // Validate email
    if (!email || typeof email !== "string" || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get and validate client IP
    const clientIP = getClientIP(req);
    const validatedIP = clientIP && isValidIP(clientIP) ? clientIP : null;
    
    console.log(`Rate limit ${action} for ${email.toLowerCase()} from IP: ${validatedIP || "unknown"}`);
    
    if (action === "check") {
      // Check rate limit with both email and IP
      const { data, error } = await supabase.rpc("check_rate_limit", {
        p_email: email.toLowerCase(),
        p_ip_address: validatedIP,
        p_max_attempts: 5,
        p_window_minutes: 15,
      });
      
      if (error) {
        console.error("Rate limit check error:", error);
        // Fail open for UX - allow the attempt if check fails
        return new Response(
          JSON.stringify({ allowed: true, attempts: 0, max_attempts: 5, retry_after: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else if (action === "record") {
      // Record login attempt with IP
      const { error } = await supabase.rpc("record_login_attempt", {
        p_email: email.toLowerCase(),
        p_ip_address: validatedIP,
        p_success: success ?? false,
      });
      
      if (error) {
        console.error("Record attempt error:", error);
        // Don't fail the request, just log the error
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
