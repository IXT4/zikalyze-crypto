import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// TOTP implementation
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateSecret(length = 20): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytes[i] % 32];
  }
  return secret;
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const length = Math.floor((cleaned.length * 5) / 8);
  const result = new Uint8Array(length);
  
  let buffer = 0;
  let bitsLeft = 0;
  let index = 0;
  
  for (const char of cleaned) {
    const value = BASE32_CHARS.indexOf(char);
    if (value === -1) continue;
    
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result[index++] = (buffer >> bitsLeft) & 0xff;
    }
  }
  
  return result;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

async function generateTOTP(secret: string, timeStep = 30, digits = 6): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  const key = base32Decode(secret);
  const hmac = await hmacSha1(key, counterBytes);
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor(now / timeStep) + i;
    
    const counterBytes = new Uint8Array(8);
    let temp = counter;
    for (let j = 7; j >= 0; j--) {
      counterBytes[j] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }
    
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key, counterBytes);
    
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, "0");
    
    if (otp === token) {
      return true;
    }
  }
  
  return false;
}

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.replace(/-/g, "").toUpperCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Enhanced input validation functions
function validateToken(token: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (token === undefined || token === null) {
    return { valid: false, sanitized: "", error: "Token is required" };
  }
  
  if (typeof token !== "string") {
    return { valid: false, sanitized: "", error: "Token must be a string" };
  }
  
  // Remove any whitespace and validate
  const cleaned = token.replace(/\s/g, "");
  
  if (cleaned.length !== 6) {
    return { valid: false, sanitized: "", error: "Token must be exactly 6 digits" };
  }
  
  if (!/^\d{6}$/.test(cleaned)) {
    return { valid: false, sanitized: "", error: "Token must contain only digits" };
  }
  
  return { valid: true, sanitized: cleaned };
}

function validateBackupCode(code: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (code === undefined || code === null) {
    return { valid: false, sanitized: "", error: "Backup code is required" };
  }
  
  if (typeof code !== "string") {
    return { valid: false, sanitized: "", error: "Backup code must be a string" };
  }
  
  // Remove whitespace and validate format (XXXX-XXXX)
  const cleaned = code.replace(/\s/g, "").toUpperCase();
  
  if (cleaned.length > 20) {
    return { valid: false, sanitized: "", error: "Backup code too long" };
  }
  
  // Accept format with or without hyphen
  if (!/^[A-F0-9]{4}-?[A-F0-9]{4}$/i.test(cleaned)) {
    return { valid: false, sanitized: "", error: "Invalid backup code format" };
  }
  
  return { valid: true, sanitized: cleaned };
}

function validateAction(action: unknown): { valid: boolean; value: string; error?: string } {
  const validActions = ["setup", "verify", "validate", "validate-backup", "status", "disable"];
  
  if (!action || typeof action !== "string") {
    return { valid: false, value: "", error: "Action is required" };
  }
  
  if (!validActions.includes(action)) {
    return { valid: false, value: "", error: `Invalid action. Must be one of: ${validActions.join(", ")}` };
  }
  
  return { valid: true, value: action };
}

serve(async (req: Request) => {
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
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth header format
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization header format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON body with error handling
    let requestBody: { action?: unknown; token?: unknown; backupCode?: unknown };
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

    const { action, token, backupCode } = requestBody;
    
    // Validate action
    const actionValidation = validateAction(action);
    if (!actionValidation.valid) {
      return new Response(
        JSON.stringify({ error: actionValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`2FA action: ${actionValidation.value} for user: ${user.id}`);

    // Admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    switch (actionValidation.value) {
      case "setup": {
        // Generate new TOTP secret
        const secret = generateSecret(20);
        const issuer = "Zikalyze";
        const accountName = user.email || user.id;
        
        // Generate backup codes
        const backupCodes = generateBackupCodes(8);
        const hashedBackupCodes = await Promise.all(backupCodes.map(hashCode));
        
        // Store secret (not enabled yet)
        const { error: upsertError } = await adminClient
          .from("user_2fa")
          .upsert({
            user_id: user.id,
            totp_secret: secret,
            backup_codes: hashedBackupCodes,
            is_enabled: false,
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Error storing 2FA secret:", upsertError);
          throw new Error("Failed to setup 2FA");
        }

        // Generate QR code URL (using Google Charts API for simplicity)
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

        return new Response(
          JSON.stringify({
            success: true,
            secret,
            qrCodeUrl,
            backupCodes,
            otpauthUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        // Validate token with enhanced validation
        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          return new Response(
            JSON.stringify({ error: tokenValidation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: twoFaData, error: fetchError } = await adminClient
          .from("user_2fa")
          .select("totp_secret, is_enabled")
          .eq("user_id", user.id)
          .single();

        if (fetchError || !twoFaData?.totp_secret) {
          return new Response(
            JSON.stringify({ error: "2FA not setup" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyTOTP(twoFaData.totp_secret, tokenValidation.sanitized);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid verification code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Enable 2FA
        const { error: updateError } = await adminClient
          .from("user_2fa")
          .update({ is_enabled: true })
          .eq("user_id", user.id);

        if (updateError) {
          throw new Error("Failed to enable 2FA");
        }

        console.log(`2FA enabled for user: ${user.id}`);

        return new Response(
          JSON.stringify({ success: true, enabled: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        // Validate token with enhanced validation
        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          return new Response(
            JSON.stringify({ error: tokenValidation.error, valid: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: twoFaData, error: fetchError } = await adminClient
          .from("user_2fa")
          .select("totp_secret, is_enabled")
          .eq("user_id", user.id)
          .single();

        if (fetchError || !twoFaData?.totp_secret || !twoFaData.is_enabled) {
          return new Response(
            JSON.stringify({ error: "2FA not enabled", valid: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyTOTP(twoFaData.totp_secret, tokenValidation.sanitized);

        return new Response(
          JSON.stringify({ valid: isValid }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate-backup": {
        // Validate backup code with enhanced validation
        const backupValidation = validateBackupCode(backupCode);
        if (!backupValidation.valid) {
          return new Response(
            JSON.stringify({ error: backupValidation.error, valid: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: twoFaData, error: fetchError } = await adminClient
          .from("user_2fa")
          .select("backup_codes, is_enabled")
          .eq("user_id", user.id)
          .single();

        if (fetchError || !twoFaData?.is_enabled || !twoFaData.backup_codes) {
          return new Response(
            JSON.stringify({ error: "2FA not enabled", valid: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const hashedInput = await hashCode(backupValidation.sanitized);
        const codeIndex = twoFaData.backup_codes.indexOf(hashedInput);

        if (codeIndex === -1) {
          return new Response(
            JSON.stringify({ valid: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove used backup code
        const updatedCodes = [...twoFaData.backup_codes];
        updatedCodes.splice(codeIndex, 1);

        await adminClient
          .from("user_2fa")
          .update({ backup_codes: updatedCodes })
          .eq("user_id", user.id);

        console.log(`Backup code used for user: ${user.id}, remaining: ${updatedCodes.length}`);

        return new Response(
          JSON.stringify({ valid: true, remainingCodes: updatedCodes.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        // Check if 2FA is enabled
        const { data: twoFaData } = await adminClient
          .from("user_2fa")
          .select("is_enabled")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({ enabled: twoFaData?.is_enabled || false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disable": {
        // Validate token with enhanced validation
        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          return new Response(
            JSON.stringify({ error: tokenValidation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: twoFaData, error: fetchError } = await adminClient
          .from("user_2fa")
          .select("totp_secret")
          .eq("user_id", user.id)
          .single();

        if (fetchError || !twoFaData?.totp_secret) {
          return new Response(
            JSON.stringify({ error: "2FA not setup" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyTOTP(twoFaData.totp_secret, tokenValidation.sanitized);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid verification code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete 2FA record
        await adminClient
          .from("user_2fa")
          .delete()
          .eq("user_id", user.id);

        console.log(`2FA disabled for user: ${user.id}`);

        return new Response(
          JSON.stringify({ success: true, enabled: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("2FA error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});