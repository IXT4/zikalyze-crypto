import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/render@0.0.12'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Inline email template for new device notifications
const NewDeviceEmail = ({ email, device_info, ip_address, login_time }: {
  email: string;
  device_info: string;
  ip_address: string | null;
  login_time: string;
}) => {
  return React.createElement('html', null,
    React.createElement('head', null,
      React.createElement('meta', { charSet: 'utf-8' }),
      React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
      React.createElement('title', null, 'New Device Login - Zikalyze')
    ),
    React.createElement('body', { style: { 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#0a0a0f',
      margin: 0,
      padding: '40px 20px',
    }},
      React.createElement('div', { style: {
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#12121a',
        borderRadius: '16px',
        border: '1px solid #1e1e2e',
        overflow: 'hidden',
      }},
        // Header
        React.createElement('div', { style: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '30px',
          textAlign: 'center',
        }},
          React.createElement('div', { style: {
            display: 'inline-block',
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            lineHeight: '60px',
            fontSize: '28px',
          }}, '📱'),
          React.createElement('h1', { style: {
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '20px 0 0 0',
          }}, 'New Device Login')
        ),
        // Content
        React.createElement('div', { style: { padding: '30px' }},
          React.createElement('p', { style: {
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '1.6',
            margin: '0 0 20px 0',
          }}, 'We detected a new login to your Zikalyze account from a device we haven\'t seen before.'),
          // Details Box
          React.createElement('div', { style: {
            backgroundColor: '#1c1c2e',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #2a2a3e',
            marginBottom: '20px',
          }},
            React.createElement('h3', { style: {
              color: '#fbbf24',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 15px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}, 'Login Details'),
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' }},
              React.createElement('tbody', null,
                React.createElement('tr', null,
                  React.createElement('td', { style: { color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}, 'Account:'),
                  React.createElement('td', { style: { color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' }}, email)
                ),
                React.createElement('tr', null,
                  React.createElement('td', { style: { color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}, 'Device:'),
                  React.createElement('td', { style: { color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right' }}, device_info)
                ),
                ip_address && React.createElement('tr', null,
                  React.createElement('td', { style: { color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}, 'IP Address:'),
                  React.createElement('td', { style: { color: '#e5e5e5', padding: '8px 0', fontSize: '14px', textAlign: 'right', fontFamily: 'monospace' }}, ip_address)
                ),
                React.createElement('tr', null,
                  React.createElement('td', { style: { color: '#9ca3af', padding: '8px 0', fontSize: '14px' }}, 'Time:'),
                  React.createElement('td', { style: { color: '#22d3ee', padding: '8px 0', fontSize: '14px', textAlign: 'right' }}, login_time)
                )
              )
            )
          ),
          React.createElement('p', { style: { color: '#9ca3af', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }},
            React.createElement('strong', { style: { color: '#22c55e' }}, 'Was this you?'),
            React.createElement('br'),
            'If you just logged in from a new device, you can safely ignore this email.'
          ),
          React.createElement('p', { style: { color: '#9ca3af', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }},
            React.createElement('strong', { style: { color: '#f87171' }}, 'Wasn\'t you?'),
            React.createElement('br'),
            'If you didn\'t log in from this device, your account may be compromised.'
          ),
          // Security Tips
          React.createElement('div', { style: {
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #1e3a5f',
          }},
            React.createElement('h4', { style: { color: '#22d3ee', fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0' }}, '🛡️ Secure Your Account'),
            React.createElement('ul', { style: { color: '#9ca3af', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }},
              React.createElement('li', null, 'Change your password immediately'),
              React.createElement('li', null, 'Review and revoke unknown sessions in Settings'),
              React.createElement('li', null, 'Enable Two-Factor Authentication')
            )
          )
        ),
        // Footer
        React.createElement('div', { style: { borderTop: '1px solid #1e1e2e', padding: '20px 30px', textAlign: 'center' }},
          React.createElement('p', { style: { color: '#6b7280', fontSize: '12px', margin: 0 }},
            'This is an automated security notification from Zikalyze.'
          )
        )
      )
    )
  );
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
          
          // Send new device notification email
          try {
            const loginTime = new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            });
            
            const html = render(
              React.createElement(NewDeviceEmail, {
                email: user.email || 'Unknown',
                device_info: deviceInfo,
                ip_address: clientIp !== 'Unknown' ? clientIp : null,
                login_time: loginTime,
              })
            );
            
            await resend.emails.send({
              from: 'Zikalyze Security <onboarding@resend.dev>',
              to: [user.email!],
              subject: '🔐 New device login detected - Zikalyze',
              html,
            });
            
            console.log(`New device notification sent to ${user.email}`);
          } catch (emailError) {
            // Don't fail the session creation if email fails
            console.error('Failed to send new device notification:', emailError);
          }
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
        
        // Mask IP addresses for privacy (e.g., 192.168.1.100 -> 192.168.1.***)
        const safeSessions = sessions?.map(session => ({
          ...session,
          ip_address: session.ip_address 
            ? session.ip_address.replace(/\.\d+$/, '.***')
            : null
        }));
        
        return new Response(
          JSON.stringify({ sessions: safeSessions }),
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
