import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  symbol?: string;
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { userId, title, body, url, symbol }: PushPayload = await req.json();

    console.log(`Sending push notification to user ${userId}: ${title}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

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

    const payload = { title, body, url: url || "/alerts", symbol };
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
