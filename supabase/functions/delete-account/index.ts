import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to application domains
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Check Lovable preview domains
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

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to delete user data and auth account
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user's data from ALL tables permanently
    const userId = user.id;
    console.log(`Starting permanent deletion for user: ${userId}`);

    // Delete price_alerts
    const { error: alertsError } = await adminClient
      .from("price_alerts")
      .delete()
      .eq("user_id", userId);
    if (alertsError) console.error("Error deleting price_alerts:", alertsError);
    else console.log("Deleted price_alerts");

    // Delete analysis_history
    const { error: historyError } = await adminClient
      .from("analysis_history")
      .delete()
      .eq("user_id", userId);
    if (historyError) console.error("Error deleting analysis_history:", historyError);
    else console.log("Deleted analysis_history");

    // Delete push_subscriptions
    const { error: pushError } = await adminClient
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);
    if (pushError) console.error("Error deleting push_subscriptions:", pushError);
    else console.log("Deleted push_subscriptions");

    // Delete user_2fa settings
    const { error: twoFaError } = await adminClient
      .from("user_2fa")
      .delete()
      .eq("user_id", userId);
    if (twoFaError) console.error("Error deleting user_2fa:", twoFaError);
    else console.log("Deleted user_2fa");

    // Delete user_sessions
    const { error: sessionsError } = await adminClient
      .from("user_sessions")
      .delete()
      .eq("user_id", userId);
    if (sessionsError) console.error("Error deleting user_sessions:", sessionsError);
    else console.log("Deleted user_sessions");

    console.log(`All user data deleted for: ${userId}`);

    // Delete the user's auth account permanently
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
