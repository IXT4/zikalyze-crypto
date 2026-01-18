import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/render@0.0.12'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
  Link,
} from 'https://esm.sh/@react-email/components@0.0.12'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

// ═══════════════════════════════════════════════════════════════════════════════
// 📧 Send Digest Email Edge Function with Authentication for Manual Triggers
// ═══════════════════════════════════════════════════════════════════════════════

// Allowed origins for CORS - restrict to application domains
const ALLOWED_ORIGINS = [
  "https://zikalyze.app",
  "https://www.zikalyze.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Authentication & Authorization
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthResult {
  authorized: boolean;
  userId?: string;
  isCron: boolean;
  isAdmin: boolean;
  error?: string;
}

async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Check for cron secret (for scheduled jobs)
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCronSecret = Deno.env.get('CRON_SECRET');
  
  if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
    console.log('[digest] Authenticated via cron secret');
    return { authorized: true, isCron: true, isAdmin: true };
  }
  
  // Check for service role key (internal calls)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'invalid')) {
    console.log('[digest] Authenticated via service role');
    return { authorized: true, isCron: false, isAdmin: true };
  }
  
  // Check for user JWT (manual trigger by authenticated user)
  if (authHeader?.startsWith('Bearer ')) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('[digest] Invalid user token:', error?.message);
      return { authorized: false, isCron: false, isAdmin: false, error: 'Invalid authentication token' };
    }
    
    console.log('[digest] Authenticated user:', user.id);
    return { authorized: true, userId: user.id, isCron: false, isAdmin: false };
  }
  
  // No authentication provided - only allow if this looks like a Supabase cron job
  // Supabase cron jobs don't always have headers, but they come from internal IPs
  const forwardedFor = req.headers.get('x-forwarded-for');
  const userAgent = req.headers.get('user-agent');
  
  // Allow requests that appear to be from Supabase infrastructure
  if (!forwardedFor && userAgent?.includes('Supabase')) {
    console.log('[digest] Allowing Supabase infrastructure request');
    return { authorized: true, isCron: true, isAdmin: true };
  }
  
  return { authorized: false, isCron: false, isAdmin: false, error: 'Authentication required' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting for Manual Triggers
// ═══════════════════════════════════════════════════════════════════════════════

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5; // max manual triggers per hour per user
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitCache.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Email Components
// ═══════════════════════════════════════════════════════════════════════════════

interface AlertItem {
  type: string;
  symbol: string;
  title: string;
  body: string;
  triggered_at: string;
}

interface MarketSummary {
  topGainer: { symbol: string; change: number };
  topLoser: { symbol: string; change: number };
  btcPrice: number;
  btcChange: number;
  ethPrice: number;
  ethChange: number;
  fearGreed: number;
  fearGreedLabel: string;
}

// Inline DigestEmail component
const DigestEmail = ({ frequency, alerts, marketSummary, dashboardUrl }: {
  frequency: 'daily' | 'weekly';
  alerts: AlertItem[];
  marketSummary?: MarketSummary;
  dashboardUrl: string;
}) => {
  const periodLabel = frequency === 'daily' ? 'Daily' : 'Weekly';
  const getEmoji = (type: string) => ({ price_alert: '🎯', price_surge: '🚀', price_drop: '📉', sentiment_shift: '📊', whale_activity: '🐋', volume_spike: '📈' }[type] || '🔔');
  
  return React.createElement(Html, null,
    React.createElement(Head, null),
    React.createElement(Preview, null, `${periodLabel} Zikalyze Digest - ${alerts.length} alerts`),
    React.createElement(Body, { style: { backgroundColor: '#0a0a0f', fontFamily: 'sans-serif' } },
      React.createElement(Container, { style: { margin: '0 auto', padding: '20px', maxWidth: '600px' } },
        React.createElement(Section, { style: { textAlign: 'center', padding: '32px 20px' } },
          React.createElement(Text, { style: { color: '#a855f7', fontSize: '24px', fontWeight: 'bold' } }, '⚡ ZIKALYZE'),
          React.createElement(Heading, { style: { color: '#fff', fontSize: '28px' } }, `${periodLabel} Market Digest`)
        ),
        marketSummary && React.createElement(Section, { style: { padding: '0 20px' } },
          React.createElement(Heading, { style: { color: '#fff', fontSize: '18px' } }, '📊 Market Overview'),
          React.createElement(Text, { style: { color: '#a1a1aa' } }, 
            `BTC: $${marketSummary.btcPrice.toLocaleString()} (${marketSummary.btcChange >= 0 ? '+' : ''}${marketSummary.btcChange.toFixed(1)}%) | ETH: $${marketSummary.ethPrice.toLocaleString()} | Fear & Greed: ${marketSummary.fearGreed}`
          )
        ),
        React.createElement(Hr, { style: { borderColor: '#27272a', margin: '24px 20px' } }),
        React.createElement(Section, { style: { padding: '0 20px' } },
          React.createElement(Heading, { style: { color: '#fff', fontSize: '18px' } }, `🔔 Your Alerts (${alerts.length})`),
          alerts.length > 0 
            ? alerts.slice(0, 10).map((a, i) => 
                React.createElement(Section, { key: i, style: { backgroundColor: '#18181b', borderRadius: '12px', padding: '16px', marginBottom: '12px', borderLeft: '4px solid #a855f7' } },
                  React.createElement(Text, { style: { color: '#fff', fontWeight: '600', margin: 0 } }, `${getEmoji(a.type)} ${a.title}`),
                  React.createElement(Text, { style: { color: '#a1a1aa', fontSize: '13px', margin: '8px 0' } }, a.body)
                )
              )
            : React.createElement(Text, { style: { color: '#22c55e' } }, '✅ No alerts triggered during this period.')
        ),
        React.createElement(Section, { style: { textAlign: 'center', padding: '20px' } },
          React.createElement(Link, { href: dashboardUrl, style: { backgroundColor: '#a855f7', color: '#fff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none' } }, 'View Dashboard →')
        ),
        React.createElement(Section, { style: { textAlign: 'center' } },
          React.createElement(Text, { style: { color: '#52525b', fontSize: '12px' } }, `You're receiving this because you subscribed to ${frequency} email digests.`),
          React.createElement(Link, { href: `${dashboardUrl}/settings`, style: { color: '#a855f7', fontSize: '12px' } }, 'Manage preferences')
        )
      )
    )
  );
};

async function fetchMarketSummary(): Promise<MarketSummary | null> {
  try {
    const [btcResponse, ethResponse] = await Promise.all([
      fetch('https://coins.llama.fi/prices/current/coingecko:bitcoin?searchWidth=4h', { signal: AbortSignal.timeout(8000) }),
      fetch('https://coins.llama.fi/prices/current/coingecko:ethereum?searchWidth=4h', { signal: AbortSignal.timeout(8000) }),
    ]);
    
    let btcPrice = 0, ethPrice = 0;
    
    if (btcResponse.ok) {
      const btcData = await btcResponse.json();
      btcPrice = btcData.coins?.['coingecko:bitcoin']?.price || 0;
    }
    
    if (ethResponse.ok) {
      const ethData = await ethResponse.json();
      ethPrice = ethData.coins?.['coingecko:ethereum']?.price || 0;
    }
    
    const historicalResponse = await fetch(
      'https://coins.llama.fi/chart/coingecko:bitcoin?start=' + Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
      { signal: AbortSignal.timeout(8000) }
    );
    
    let btcChange = 0;
    let fearGreed = 50;
    let fearGreedLabel = 'Neutral';
    
    if (historicalResponse.ok) {
      const historicalData = await historicalResponse.json();
      const prices = historicalData.coins?.['coingecko:bitcoin']?.prices || [];
      if (prices.length >= 2) {
        const oldPrice = prices[0]?.price || btcPrice;
        btcChange = ((btcPrice - oldPrice) / oldPrice) * 100;
        
        if (btcChange > 10) { fearGreed = 85; fearGreedLabel = 'Extreme Greed'; }
        else if (btcChange > 5) { fearGreed = 70; fearGreedLabel = 'Greed'; }
        else if (btcChange > 0) { fearGreed = 55; fearGreedLabel = 'Neutral'; }
        else if (btcChange > -5) { fearGreed = 40; fearGreedLabel = 'Fear'; }
        else { fearGreed = 20; fearGreedLabel = 'Extreme Fear'; }
      }
    }
    
    return {
      btcPrice,
      btcChange,
      ethPrice,
      ethChange: 0,
      topGainer: { symbol: 'N/A', change: 0 },
      topLoser: { symbol: 'N/A', change: 0 },
      fearGreed,
      fearGreedLabel,
    };
  } catch (error) {
    console.error('[digest] Error fetching market summary:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // Authentication
    // ═══════════════════════════════════════════════════════════════════════════
    
    const auth = await authenticateRequest(req);
    
    if (!auth.authorized) {
      console.warn('[digest] Unauthorized request:', auth.error);
      return new Response(
        JSON.stringify({ error: auth.error || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for manual trigger or use cron logic
    let targetFrequency: 'daily' | 'weekly' | null = null;
    let targetUserId: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        targetFrequency = body.frequency || null;
        targetUserId = body.userId || null;
      } catch {
        // No body or invalid JSON, continue with cron logic
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Authorization & Rate Limiting for Manual Triggers
    // ═══════════════════════════════════════════════════════════════════════════
    
    // If a specific user is targeted and requester is not admin, verify they can only target themselves
    if (targetUserId && !auth.isAdmin) {
      if (auth.userId !== targetUserId) {
        console.warn('[digest] User tried to send digest to another user:', auth.userId, '->', targetUserId);
        return new Response(
          JSON.stringify({ error: 'Cannot send digest to other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Rate limit manual triggers
      if (!checkRateLimit(auth.userId)) {
        console.warn('[digest] Rate limit exceeded for user:', auth.userId);
        return new Response(
          JSON.stringify({ error: 'Too many manual digest requests. Try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine which users to send digests to
    const now = new Date();
    const currentHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    let query = supabase
      .from('user_email_preferences')
      .select('*')
      .neq('digest_frequency', 'none');
    
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else if (targetFrequency) {
      query = query.eq('digest_frequency', targetFrequency);
    } else {
      query = query.eq('digest_time', currentHour);
      if (dayOfWeek !== 0) {
        query = query.neq('digest_frequency', 'weekly');
      }
    }

    const { data: preferences, error: prefError } = await query;

    if (prefError) {
      console.error('[digest] Error fetching preferences:', prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log('[digest] No users to send digests to at this time');
      return new Response(
        JSON.stringify({ message: 'No users eligible for digest', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[digest] Processing ${preferences.length} digest emails`);

    const marketSummary = await fetchMarketSummary();

    const dashboardUrl = supabaseUrl.includes('supabase.co')
      ? supabaseUrl.replace('.supabase.co', '.lovableproject.com')
      : 'https://zikalyze.app';

    let sentCount = 0;
    const errors: string[] = [];

    for (const pref of preferences) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(pref.user_id);
        
        if (authError || !authUser?.user?.email) {
          console.error(`[digest] Error fetching email for user ${pref.user_id}:`, authError);
          errors.push(`${pref.user_id}: Could not fetch user email`);
          continue;
        }
        
        const userEmail = authUser.user.email;
        
        const alertsQuery = supabase
          .from('alert_digest_queue')
          .select('*')
          .eq('user_id', pref.user_id)
          .eq('included_in_digest', false)
          .order('triggered_at', { ascending: false })
          .limit(50);

        const { data: alerts, error: alertsError } = await alertsQuery;

        if (alertsError) {
          console.error(`[digest] Error fetching alerts for user ${pref.user_id}:`, alertsError);
          continue;
        }

        const filteredAlerts = (alerts || []).filter((alert: any) => {
          if (alert.alert_type === 'price_alert' && !pref.include_price_alerts) return false;
          if (alert.alert_type === 'sentiment_shift' && !pref.include_sentiment) return false;
          if (alert.alert_type === 'whale_activity' && !pref.include_whale_activity) return false;
          return true;
        });

        const alertItems: AlertItem[] = filteredAlerts.map((a: any) => ({
          type: a.alert_type,
          symbol: a.symbol,
          title: a.title,
          body: a.body,
          triggered_at: a.triggered_at,
        }));

        if (alertItems.length === 0 && !pref.include_market_summary) {
          console.log(`[digest] Skipping user ${pref.user_id} - no content to send`);
          continue;
        }

        const html = render(
          React.createElement(DigestEmail, {
            frequency: pref.digest_frequency as 'daily' | 'weekly',
            alerts: alertItems,
            marketSummary: pref.include_market_summary && marketSummary ? marketSummary : undefined,
            dashboardUrl,
          })
        );

        const periodLabel = pref.digest_frequency === 'daily' ? 'Daily' : 'Weekly';
        
        const { error: sendError } = await resend.emails.send({
          from: 'Zikalyze <onboarding@resend.dev>',
          to: [userEmail],
          subject: `📊 Your ${periodLabel} Zikalyze Digest - ${alertItems.length} Alerts`,
          html,
        });

        if (sendError) {
          console.error(`[digest] Error sending to ${userEmail}:`, sendError);
          errors.push(`${userEmail}: ${sendError.message}`);
          continue;
        }

        if (filteredAlerts.length > 0) {
          const alertIds = filteredAlerts.map((a: any) => a.id);
          await supabase
            .from('alert_digest_queue')
            .update({ 
              included_in_digest: true, 
              digest_sent_at: new Date().toISOString() 
            })
            .in('id', alertIds);
        }

        await supabase
          .from('user_email_preferences')
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq('id', pref.id);

        sentCount++;
        console.log(`[digest] Sent digest to ${userEmail}`);

      } catch (userError) {
        console.error(`[digest] Error processing user ${pref.user_id}:`, userError);
        errors.push(`${pref.user_id}: ${userError}`);
      }
    }

    console.log(`[digest] Successfully sent ${sentCount}/${preferences.length} digest emails`);

    return new Response(
      JSON.stringify({ 
        message: 'Digest processing complete', 
        sent: sentCount, 
        total: preferences.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[digest] Error in send-digest-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
