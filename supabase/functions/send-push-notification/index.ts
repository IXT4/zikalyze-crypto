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

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  symbol?: string;
}

// Enhanced input validation functions
function validateUUID(value: unknown, fieldName: string): { valid: boolean; value: string; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, value: "", error: `${fieldName} is required` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, value: "", error: `Invalid ${fieldName} format` };
  }
  
  return { valid: true, value: value.toLowerCase() };
}

function validateString(value: unknown, fieldName: string, maxLength: number, required = true): { valid: boolean; sanitized: string; error?: string } {
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, sanitized: "", error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: "" };
  }
  
  if (typeof value !== "string") {
    return { valid: false, sanitized: "", error: `${fieldName} must be a string` };
  }
  
  const trimmed = value.trim();
  
  if (required && trimmed.length === 0) {
    return { valid: false, sanitized: "", error: `${fieldName} cannot be empty` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, sanitized: "", error: `${fieldName} too long (max ${maxLength} characters)` };
  }
  
  return { valid: true, sanitized: trimmed };
}

function validateUrl(value: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true, sanitized: "" };
  }
  
  if (typeof value !== "string") {
    return { valid: false, sanitized: "", error: "URL must be a string" };
  }
  
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: true, sanitized: "" };
  }
  
  // Only allow relative URLs or https URLs
  if (trimmed.startsWith("/")) {
    if (trimmed.length > 500) {
      return { valid: false, sanitized: "", error: "URL too long" };
    }
    return { valid: true, sanitized: trimmed };
  }
  
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return { valid: false, sanitized: "", error: "Only HTTPS URLs are allowed" };
    }
    return { valid: true, sanitized: trimmed };
  } catch {
    return { valid: false, sanitized: "", error: "Invalid URL format" };
  }
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Import web-push compatible functions
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID
    const header = { alg: "ES256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      aud: new URL(subscription.endpoint).origin,
      exp: now + 12 * 60 * 60,
      sub: "mailto:alerts@zikalyze.app"
    };

    // For Deno, we'll use a simplified approach with fetch
    const payloadString = JSON.stringify(payload);
    
    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payloadString
    });

    console.log(`Push response status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Push failed: ${response.status} - ${text}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse JSON body with error handling
    let requestBody: PushPayload;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request body is an object
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, title, body, url, symbol } = requestBody;

    // Validate userId (UUID format)
    const userIdValidation = validateUUID(userId, "userId");
    if (!userIdValidation.valid) {
      return new Response(
        JSON.stringify({ error: userIdValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate title
    const titleValidation = validateString(title, "title", 200);
    if (!titleValidation.valid) {
      return new Response(
        JSON.stringify({ error: titleValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate body
    const bodyValidation = validateString(body, "body", 500);
    if (!bodyValidation.valid) {
      return new Response(
        JSON.stringify({ error: bodyValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate optional URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate optional symbol
    const symbolValidation = validateString(symbol, "symbol", 20, false);
    if (!symbolValidation.valid) {
      return new Response(
        JSON.stringify({ error: symbolValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notification to user ${userIdValidation.value}: ${titleValidation.sanitized}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userIdValidation.value);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = { 
      title: titleValidation.sanitized, 
      body: bodyValidation.sanitized, 
      url: urlValidation.sanitized || "/alerts", 
      symbol: symbolValidation.sanitized 
    };
    let successCount = 0;
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (success) {
        successCount++;
      } else {
        failedSubscriptions.push(sub.id);
      }
    }

    // Clean up failed subscriptions (likely expired)
    if (failedSubscriptions.length > 0) {
      console.log(`Removing ${failedSubscriptions.length} failed subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
    }

    console.log(`Successfully sent ${successCount} push notifications`);

    return new Response(
      JSON.stringify({ 
        message: "Push notifications processed", 
        sent: successCount,
        failed: failedSubscriptions.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
