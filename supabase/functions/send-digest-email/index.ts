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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    // Use DeFiLlama (open source, decentralized) for market data
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
    
    // Calculate sentiment from on-chain data (decentralized alternative to Fear & Greed)
    // Use BTC price momentum as proxy for market sentiment
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
        
        // Derive sentiment from 7-day performance
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
      ethChange: 0, // Simplified - could fetch historical ETH data too
      topGainer: { symbol: 'N/A', change: 0 },
      topLoser: { symbol: 'N/A', change: 0 },
      fearGreed,
      fearGreedLabel,
    };
  } catch (error) {
    console.error('Error fetching market summary:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Determine which users to send digests to
    const now = new Date();
    const currentHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday
    
    // Build query based on trigger type
    let query = supabase
      .from('user_email_preferences')
      .select('*')
      .neq('digest_frequency', 'none');
    
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else if (targetFrequency) {
      query = query.eq('digest_frequency', targetFrequency);
    } else {
      // Cron job logic: send to users whose digest_time matches current hour
      query = query.eq('digest_time', currentHour);
      
      // For weekly digests, only send on Sundays
      if (dayOfWeek !== 0) {
        query = query.neq('digest_frequency', 'weekly');
      }
    }

    const { data: preferences, error: prefError } = await query;

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users to send digests to at this time');
      return new Response(
        JSON.stringify({ message: 'No users eligible for digest', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${preferences.length} digest emails`);

    // Fetch market summary once for all emails
    const marketSummary = await fetchMarketSummary();

    // Determine dashboard URL
    const dashboardUrl = supabaseUrl.includes('supabase.co')
      ? supabaseUrl.replace('.supabase.co', '.lovableproject.com')
      : 'https://zikalyze.app';

    let sentCount = 0;
    const errors: string[] = [];

    for (const pref of preferences) {
      try {
        // Fetch user email from Supabase Auth (more secure than storing in application table)
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(pref.user_id);
        
        if (authError || !authUser?.user?.email) {
          console.error(`Error fetching email for user ${pref.user_id}:`, authError);
          errors.push(`${pref.user_id}: Could not fetch user email`);
          continue;
        }
        
        const userEmail = authUser.user.email;
        // Fetch pending alerts for this user
        const alertsQuery = supabase
          .from('alert_digest_queue')
          .select('*')
          .eq('user_id', pref.user_id)
          .eq('included_in_digest', false)
          .order('triggered_at', { ascending: false })
          .limit(50);

        const { data: alerts, error: alertsError } = await alertsQuery;

        if (alertsError) {
          console.error(`Error fetching alerts for user ${pref.user_id}:`, alertsError);
          continue;
        }

        // Filter alerts based on user preferences
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

        // Skip if no alerts and no market summary
        if (alertItems.length === 0 && !pref.include_market_summary) {
          console.log(`Skipping user ${pref.user_id} - no content to send`);
          continue;
        }

        // Render email
        const html = render(
          React.createElement(DigestEmail, {
            frequency: pref.digest_frequency as 'daily' | 'weekly',
            alerts: alertItems,
            marketSummary: pref.include_market_summary && marketSummary ? marketSummary : undefined,
            dashboardUrl,
          })
        );

        const periodLabel = pref.digest_frequency === 'daily' ? 'Daily' : 'Weekly';
        
        // Send email (using email from Supabase Auth)
        const { error: sendError } = await resend.emails.send({
          from: 'Zikalyze <onboarding@resend.dev>',
          to: [userEmail],
          subject: `📊 Your ${periodLabel} Zikalyze Digest - ${alertItems.length} Alerts`,
          html,
        });

        if (sendError) {
          console.error(`Error sending to ${userEmail}:`, sendError);
          errors.push(`${userEmail}: ${sendError.message}`);
          continue;
        }

        // Mark alerts as included in digest
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

        // Update last_digest_sent_at
        await supabase
          .from('user_email_preferences')
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq('id', pref.id);

        sentCount++;
        console.log(`Sent digest to ${userEmail}`);

      } catch (userError) {
        console.error(`Error processing user ${pref.user_id}:`, userError);
        errors.push(`${pref.user_id}: ${userError}`);
      }
    }

    console.log(`Successfully sent ${sentCount}/${preferences.length} digest emails`);

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
    console.error('Error in send-digest-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
