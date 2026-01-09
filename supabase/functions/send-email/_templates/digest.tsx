import React from 'https://esm.sh/react@18.3.1'
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

interface DigestEmailProps {
  frequency: 'daily' | 'weekly';
  alerts: AlertItem[];
  marketSummary?: MarketSummary;
  dashboardUrl: string;
}

const getAlertEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    price_alert: '🎯',
    price_surge: '🚀',
    price_drop: '📉',
    sentiment_shift: '📊',
    whale_activity: '🐋',
    volume_spike: '📈',
  };
  return emojis[type] || '🔔';
};

const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const DigestEmail = ({
  frequency,
  alerts,
  marketSummary,
  dashboardUrl,
}: DigestEmailProps) => {
  const periodLabel = frequency === 'daily' ? 'Daily' : 'Weekly';
  const hasAlerts = alerts && alerts.length > 0;
  
  return (
    <Html>
      <Head />
      <Preview>{periodLabel} Zikalyze Market Digest - {hasAlerts ? `${alerts.length} alerts` : 'Market Summary'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ ZIKALYZE</Text>
            <Heading style={h1}>{periodLabel} Market Digest</Heading>
            <Text style={subtitle}>
              Your personalized crypto intelligence report
            </Text>
          </Section>

          {/* Market Summary */}
          {marketSummary && (
            <Section style={section}>
              <Heading style={h2}>📊 Market Overview</Heading>
              <Section style={statsGrid}>
                <Section style={statCard}>
                  <Text style={statLabel}>Bitcoin</Text>
                  <Text style={statValue}>${marketSummary.btcPrice.toLocaleString()}</Text>
                  <Text style={marketSummary.btcChange >= 0 ? statChangeUp : statChangeDown}>
                    {formatChange(marketSummary.btcChange)}
                  </Text>
                </Section>
                <Section style={statCard}>
                  <Text style={statLabel}>Ethereum</Text>
                  <Text style={statValue}>${marketSummary.ethPrice.toLocaleString()}</Text>
                  <Text style={marketSummary.ethChange >= 0 ? statChangeUp : statChangeDown}>
                    {formatChange(marketSummary.ethChange)}
                  </Text>
                </Section>
              </Section>
              
              <Section style={fearGreedSection}>
                <Text style={fearGreedLabel}>Fear & Greed Index</Text>
                <Text style={fearGreedValue}>{marketSummary.fearGreed}</Text>
                <Text style={fearGreedText}>{marketSummary.fearGreedLabel}</Text>
              </Section>

              <Section style={moversSection}>
                <Section style={moverCard}>
                  <Text style={moverLabel}>🚀 Top Gainer</Text>
                  <Text style={moverSymbol}>{marketSummary.topGainer.symbol}</Text>
                  <Text style={statChangeUp}>{formatChange(marketSummary.topGainer.change)}</Text>
                </Section>
                <Section style={moverCard}>
                  <Text style={moverLabel}>📉 Top Loser</Text>
                  <Text style={moverSymbol}>{marketSummary.topLoser.symbol}</Text>
                  <Text style={statChangeDown}>{formatChange(marketSummary.topLoser.change)}</Text>
                </Section>
              </Section>
            </Section>
          )}

          <Hr style={divider} />

          {/* Triggered Alerts */}
          <Section style={section}>
            <Heading style={h2}>🔔 Your Alerts ({alerts.length})</Heading>
            
            {hasAlerts ? (
              alerts.slice(0, 10).map((alert, index) => (
                <Section key={index} style={alertCard}>
                  <Text style={alertHeader}>
                    {getAlertEmoji(alert.type)} {alert.title}
                  </Text>
                  <Text style={alertBody}>{alert.body}</Text>
                  <Text style={alertTime}>
                    {new Date(alert.triggered_at).toLocaleString()}
                  </Text>
                </Section>
              ))
            ) : (
              <Section style={emptyState}>
                <Text style={emptyText}>
                  ✅ No alerts triggered during this period.
                </Text>
                <Text style={emptySubtext}>
                  Your watchlist is performing within expected ranges.
                </Text>
              </Section>
            )}
            
            {alerts.length > 10 && (
              <Text style={moreAlerts}>
                + {alerts.length - 10} more alerts
              </Text>
            )}
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Link href={dashboardUrl} style={ctaButton}>
              View Full Dashboard →
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you subscribed to {frequency} email digests.
            </Text>
            <Link href={`${dashboardUrl}/settings`} style={footerLink}>
              Manage email preferences
            </Link>
            <Text style={footerBrand}>
              © {new Date().getFullYear()} Zikalyze. AI-Powered Crypto Intelligence.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default DigestEmail;

// Styles
const main = {
  backgroundColor: '#0a0a0f',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  padding: '32px 20px',
};

const logoText = {
  color: '#a855f7',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  padding: '0',
};

const subtitle = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '0',
};

const section = {
  padding: '0 20px',
  marginBottom: '24px',
};

const h2 = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const statsGrid = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  gap: '12px',
  marginBottom: '16px',
};

const statCard = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '16px',
  flex: '1',
  textAlign: 'center' as const,
};

const statLabel = {
  color: '#71717a',
  fontSize: '12px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const statValue = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
};

const statChangeUp = {
  color: '#22c55e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const statChangeDown = {
  color: '#ef4444',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const fearGreedSection = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '16px',
};

const fearGreedLabel = {
  color: '#71717a',
  fontSize: '12px',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
};

const fearGreedValue = {
  color: '#a855f7',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0',
};

const fearGreedText = {
  color: '#ffffff',
  fontSize: '16px',
  margin: '8px 0 0 0',
};

const moversSection = {
  display: 'flex' as const,
  gap: '12px',
};

const moverCard = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '16px',
  flex: '1',
  textAlign: 'center' as const,
};

const moverLabel = {
  color: '#71717a',
  fontSize: '12px',
  margin: '0 0 8px 0',
};

const moverSymbol = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
};

const divider = {
  borderColor: '#27272a',
  margin: '24px 20px',
};

const alertCard = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
  borderLeft: '4px solid #a855f7',
};

const alertHeader = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const alertBody = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const alertTime = {
  color: '#52525b',
  fontSize: '11px',
  margin: '0',
};

const emptyState = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const emptyText = {
  color: '#22c55e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const emptySubtext = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0',
};

const moreAlerts = {
  color: '#a855f7',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '12px 0 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '0 20px',
  marginBottom: '32px',
};

const ctaButton = {
  backgroundColor: '#a855f7',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 20px',
};

const footerText = {
  color: '#52525b',
  fontSize: '12px',
  margin: '0 0 8px 0',
};

const footerLink = {
  color: '#a855f7',
  fontSize: '12px',
  textDecoration: 'underline',
};

const footerBrand = {
  color: '#3f3f46',
  fontSize: '11px',
  margin: '16px 0 0 0',
};
