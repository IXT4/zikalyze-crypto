import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

// Allowed origins for CORS - restrict to application domains
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Support lovable.app and lovableproject.com preview domains
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
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
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;
  
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  
  const trueClientIP = req.headers.get("true-client-ip");
  if (trueClientIP) return trueClientIP;
  
  return null;
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  return ipv6Pattern.test(ip);
}

// Generate lockout email HTML
function generateLockoutEmailHTML(email: string, ipAddress: string | null, unlockTime: string, attempts: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert - Account Temporarily Locked</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #12121a; border-radius: 16px; border: 1px solid #1e1e2e; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
          <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 12px; line-height: 60px; font-size: 28px;">🔒</div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 20px 0 0 0;">Security Alert</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We detected multiple failed login attempts on your Zikalyze account. For your security, we've temporarily locked access to your account.
          </p>

          <!-- Alert Box -->
          <div style="background-color: #1c1c2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a3e; margin-bottom: 20px;">
            <h3 style="color: #f87171; font-size: 14px; font-weight: 600; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">Lockout Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Account:</td>
                <td style="color: #e5e5e5; padding: 8px 0; font-size: 14px; text-align: right;">${email}</td>
              </tr>
              <tr>
                <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Failed Attempts:</td>
                <td style="color: #f87171; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">${attempts}</td>
              </tr>
              ${ipAddress ? `
              <tr>
                <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">IP Address:</td>
                <td style="color: #e5e5e5; padding: 8px 0; font-size: 14px; text-align: right; font-family: monospace;">${ipAddress}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="color: #9ca3af; padding: 8px 0; font-size: 14px;">Unlocks At:</td>
                <td style="color: #22d3ee; padding: 8px 0; font-size: 14px; text-align: right;">${unlockTime}</td>
              </tr>
            </table>
          </div>

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong style="color: #e5e5e5;">Was this you?</strong><br>
            If you were trying to log in, please wait for the lockout period to end and try again with the correct password.
          </p>

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong style="color: #e5e5e5;">Wasn't you?</strong><br>
            Someone may be trying to access your account. We recommend changing your password immediately once the lockout expires.
          </p>

          <!-- Tips Box -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #1e3a5f;">
            <h4 style="color: #22d3ee; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">🛡️ Security Tips</h4>
            <ul style="color: #9ca3af; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Use a strong, unique password</li>
              <li>Never share your login credentials</li>
              <li>Be cautious of phishing emails</li>
              <li>Contact support if you notice suspicious activity</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #1e1e2e; padding: 20px 30px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated security notification from Zikalyze.<br>
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface RateLimitRequest {
  email: string;
  action: "check" | "record";
  success?: boolean;
}

// Enhanced input validation functions
function validateEmail(email: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, sanitized: "", error: "Email is required" };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Length validation
  if (trimmed.length === 0) {
    return { valid: false, sanitized: "", error: "Email cannot be empty" };
  }
  if (trimmed.length > 254) {
    return { valid: false, sanitized: "", error: "Email too long" };
  }
  
  // Format validation (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, sanitized: "", error: "Invalid email format" };
  }
  
  // Check for suspicious patterns
  if (trimmed.includes("..") || trimmed.startsWith(".") || trimmed.includes(".@")) {
    return { valid: false, sanitized: "", error: "Invalid email format" };
  }
  
  return { valid: true, sanitized: trimmed };
}

function validateAction(action: unknown): { valid: boolean; value: "check" | "record"; error?: string } {
  if (!action || typeof action !== "string") {
    return { valid: false, value: "check", error: "Action is required" };
  }
  
  const validActions = ["check", "record"];
  if (!validActions.includes(action)) {
    return { valid: false, value: "check", error: "Invalid action. Must be 'check' or 'record'" };
  }
  
  return { valid: true, value: action as "check" | "record" };
}

function validateBoolean(value: unknown, fieldName: string): { valid: boolean; value: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true, value: false }; // Default to false
  }
  
  if (typeof value !== "boolean") {
    return { valid: false, value: false, error: `${fieldName} must be a boolean` };
  }
  
  return { valid: true, value };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse JSON body with error handling
    let body: RateLimitRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate request body exists and is an object
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { email, action, success } = body;
    
    // Validate email with enhanced validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate action
    const actionValidation = validateAction(action);
    if (!actionValidation.valid) {
      return new Response(
        JSON.stringify({ error: actionValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate success field if present
    const successValidation = validateBoolean(success, "success");
    if (!successValidation.valid) {
      return new Response(
        JSON.stringify({ error: successValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const sanitizedEmail = emailValidation.sanitized;
    const validatedAction = actionValidation.value;
    const validatedSuccess = successValidation.value;
    
    // Get and validate client IP
    const clientIP = getClientIP(req);
    const validatedIP = clientIP && isValidIP(clientIP) ? clientIP : null;
    
    console.log(`Rate limit ${validatedAction} for ${sanitizedEmail} from IP: ${validatedIP || "unknown"}`);
    
    if (validatedAction === "check") {
      // Check rate limit with both email and IP
      const { data, error } = await supabase.rpc("check_rate_limit", {
        p_email: sanitizedEmail,
        p_ip_address: validatedIP,
        p_max_attempts: 5,
        p_window_minutes: 15,
      });
      
      if (error) {
        console.error("Rate limit check error:", error);
        return new Response(
          JSON.stringify({ allowed: true, attempts: 0, max_attempts: 5, retry_after: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Check if this is a new lockout (just hit the limit)
      const rateLimitData = data as { allowed: boolean; attempts: number; max_attempts: number; retry_after: number };
      
      if (!rateLimitData.allowed && rateLimitData.attempts === rateLimitData.max_attempts && resendApiKey) {
        // Send lockout notification email
        try {
          const resend = new Resend(resendApiKey);
          const unlockTime = new Date(Date.now() + rateLimitData.retry_after * 1000).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          
          const emailHtml = generateLockoutEmailHTML(
            sanitizedEmail,
            validatedIP,
            unlockTime,
            rateLimitData.attempts
          );
          
          await resend.emails.send({
            from: 'Zikalyze Security <onboarding@resend.dev>',
            to: [sanitizedEmail],
            subject: '🔒 Security Alert: Account Temporarily Locked',
            html: emailHtml,
          });
          
          console.log(`Lockout notification sent to ${sanitizedEmail}`);
        } catch (emailError) {
          console.error("Failed to send lockout notification:", emailError);
          // Don't fail the rate limit check if email fails
        }
      }
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else if (validatedAction === "record") {
      const { error } = await supabase.rpc("record_login_attempt", {
        p_email: sanitizedEmail,
        p_ip_address: validatedIP,
        p_success: validatedSuccess,
      });
      
      if (error) {
        console.error("Record attempt error:", error);
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
