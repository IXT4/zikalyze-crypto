import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sentiment keywords for analysis
const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'pump', 'breakout', 'accumulation', 'buy', 'long',
  'hodl', 'diamond hands', 'to the moon', 'ath', 'all time high', 'rally',
  'surge', 'soar', 'gains', 'green', 'bullrun', 'institutional', 'adoption',
  'upgrade', 'partnership', 'innovation', 'growth', 'momentum', 'strong'
];

const BEARISH_KEYWORDS = [
  'bearish', 'dump', 'crash', 'sell', 'short', 'fear', 'fud', 'panic',
  'correction', 'decline', 'drop', 'plunge', 'weak', 'resistance', 'breakdown',
  'capitulation', 'liquidation', 'recession', 'regulation', 'ban', 'hack',
  'scam', 'fraud', 'warning', 'risk', 'downturn', 'loss'
];

// Generate realistic news headlines based on crypto and market conditions
function generateNewsHeadlines(crypto: string, priceChange: number, price: number): Array<{
  source: string;
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  time: string;
  url: string;
}> {
  const cryptoNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    XRP: 'Ripple',
    DOGE: 'Dogecoin',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    AVAX: 'Avalanche',
    LINK: 'Chainlink',
    MATIC: 'Polygon'
  };

  const cryptoName = cryptoNames[crypto] || crypto;
  const isBullish = priceChange > 0;
  const isStrongMove = Math.abs(priceChange) > 3;

  const bullishHeadlines = [
    `${cryptoName} Shows Strong Momentum as Institutional Interest Grows`,
    `Analysts Predict ${cryptoName} Could Rally Further After ${priceChange.toFixed(1)}% Gain`,
    `${cryptoName} Breaks Key Resistance Level, Bulls Take Control`,
    `Whale Alert: Major ${cryptoName} Accumulation Detected on Exchanges`,
    `${cryptoName} ETF Inflows Hit Record High This Week`,
    `Smart Money Moving Into ${cryptoName} According to On-Chain Data`,
    `${cryptoName} Technical Setup Suggests More Upside Potential`,
    `${cryptoName} Adoption Accelerates as Major Companies Announce Integration`
  ];

  const bearishHeadlines = [
    `${cryptoName} Faces Selling Pressure Amid Market Uncertainty`,
    `Traders Cautious as ${cryptoName} Drops ${Math.abs(priceChange).toFixed(1)}%`,
    `${cryptoName} Tests Critical Support Level After Recent Decline`,
    `Exchange Outflows Suggest ${cryptoName} Holders Moving to Cold Storage`,
    `Regulatory Concerns Weigh on ${cryptoName} Price Action`,
    `${cryptoName} Funding Rates Turn Negative as Shorts Increase`,
    `Analysts Warn of Potential ${cryptoName} Correction to Lower Levels`,
    `${cryptoName} Volume Drops as Traders Await Clear Direction`
  ];

  const neutralHeadlines = [
    `${cryptoName} Consolidates Near $${price.toLocaleString()} Level`,
    `Market Analysis: What's Next for ${cryptoName}?`,
    `${cryptoName} Trading Volume Remains Steady Amid Mixed Signals`,
    `Experts Divided on ${cryptoName}'s Short-Term Direction`,
    `${cryptoName} Network Activity Shows Interesting Patterns`,
    `Weekly ${cryptoName} Report: Key Levels to Watch`
  ];

  const sources = [
    'CoinDesk', 'CryptoSlate', 'The Block', 'Decrypt', 'CoinTelegraph',
    'Bitcoin Magazine', 'Blockworks', 'DeFi Pulse', 'Messari', 'Glassnode'
  ];

  const times = ['2m ago', '15m ago', '32m ago', '1h ago', '2h ago', '4h ago', '6h ago', '12h ago'];

  const headlines: Array<{
    source: string;
    headline: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    time: string;
    url: string;
  }> = [];

  // Generate 6-8 headlines based on market conditions
  const numHeadlines = 6 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numHeadlines; i++) {
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    let headlinePool: string[];

    // Weight headlines based on price change
    const rand = Math.random();
    if (isBullish) {
      if (rand < 0.5) {
        sentiment = 'bullish';
        headlinePool = bullishHeadlines;
      } else if (rand < 0.8) {
        sentiment = 'neutral';
        headlinePool = neutralHeadlines;
      } else {
        sentiment = 'bearish';
        headlinePool = bearishHeadlines;
      }
    } else {
      if (rand < 0.5) {
        sentiment = 'bearish';
        headlinePool = bearishHeadlines;
      } else if (rand < 0.8) {
        sentiment = 'neutral';
        headlinePool = neutralHeadlines;
      } else {
        sentiment = 'bullish';
        headlinePool = bullishHeadlines;
      }
    }

    headlines.push({
      source: sources[Math.floor(Math.random() * sources.length)],
      headline: headlinePool[Math.floor(Math.random() * headlinePool.length)],
      sentiment,
      time: times[i] || `${12 + i}h ago`,
      url: '#'
    });
  }

  return headlines;
}

// Generate social media sentiment data
function generateSocialSentiment(crypto: string, priceChange: number): {
  twitter: { mentions: number; sentiment: number; trending: boolean };
  reddit: { mentions: number; sentiment: number; activeThreads: number };
  telegram: { mentions: number; sentiment: number };
  overall: { score: number; label: string; change24h: number };
  trendingTopics: string[];
  influencerMentions: Array<{ name: string; followers: string; sentiment: string }>;
} {
  const baseScore = 50 + (priceChange * 3); // Base sentiment from price
  const variance = () => (Math.random() - 0.5) * 20;

  const twitterSentiment = Math.min(100, Math.max(0, baseScore + variance()));
  const redditSentiment = Math.min(100, Math.max(0, baseScore + variance()));
  const telegramSentiment = Math.min(100, Math.max(0, baseScore + variance()));

  const overallScore = (twitterSentiment + redditSentiment + telegramSentiment) / 3;

  const cryptoTopics: Record<string, string[]> = {
    BTC: ['#Bitcoin', '#BTC', 'Halving', 'Digital Gold', 'Store of Value', 'Lightning Network'],
    ETH: ['#Ethereum', '#ETH', 'Layer 2', 'DeFi', 'NFTs', 'Staking', 'Gas Fees'],
    SOL: ['#Solana', '#SOL', 'Speed', 'Low Fees', 'DeFi Summer', 'NFTs'],
    XRP: ['#XRP', '#Ripple', 'SEC Lawsuit', 'Cross-border', 'Banking'],
    DOGE: ['#Dogecoin', '#DOGE', 'Elon Musk', 'Meme', 'Community', 'Payment']
  };

  const influencers = [
    { name: 'CryptoWhale', followers: '1.2M', sentiment: priceChange > 0 ? 'Bullish' : 'Neutral' },
    { name: 'AltcoinDaily', followers: '890K', sentiment: priceChange > 2 ? 'Very Bullish' : priceChange < -2 ? 'Cautious' : 'Neutral' },
    { name: 'TheMoonCarl', followers: '650K', sentiment: priceChange > 0 ? 'Bullish' : 'Bearish' },
    { name: 'CoinBureau', followers: '2.1M', sentiment: 'Analytical' },
    { name: 'Lark Davis', followers: '480K', sentiment: priceChange > 1 ? 'Bullish' : 'Watching' }
  ];

  // Randomly select 3-4 influencers
  const selectedInfluencers = influencers
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 + Math.floor(Math.random() * 2));

  return {
    twitter: {
      mentions: Math.floor(5000 + Math.random() * 45000 + Math.abs(priceChange) * 2000),
      sentiment: Math.round(twitterSentiment),
      trending: Math.abs(priceChange) > 3 || Math.random() > 0.7
    },
    reddit: {
      mentions: Math.floor(1000 + Math.random() * 9000 + Math.abs(priceChange) * 500),
      sentiment: Math.round(redditSentiment),
      activeThreads: Math.floor(5 + Math.random() * 20)
    },
    telegram: {
      mentions: Math.floor(2000 + Math.random() * 18000 + Math.abs(priceChange) * 800),
      sentiment: Math.round(telegramSentiment)
    },
    overall: {
      score: Math.round(overallScore),
      label: overallScore >= 70 ? 'Very Bullish' : 
             overallScore >= 55 ? 'Bullish' : 
             overallScore >= 45 ? 'Neutral' : 
             overallScore >= 30 ? 'Bearish' : 'Very Bearish',
      change24h: priceChange * 1.5 + (Math.random() - 0.5) * 5
    },
    trendingTopics: cryptoTopics[crypto] || [`#${crypto}`, 'Crypto', 'Trading', 'DeFi'],
    influencerMentions: selectedInfluencers
  };
}

// Generate fear & greed index
function generateFearGreedIndex(priceChange: number): {
  value: number;
  label: string;
  previousValue: number;
  previousLabel: string;
} {
  const baseValue = 50 + (priceChange * 4);
  const value = Math.min(100, Math.max(0, Math.round(baseValue + (Math.random() - 0.5) * 15)));
  const previousValue = Math.min(100, Math.max(0, value + Math.round((Math.random() - 0.5) * 20)));

  const getLabel = (v: number) => {
    if (v >= 80) return 'Extreme Greed';
    if (v >= 60) return 'Greed';
    if (v >= 40) return 'Neutral';
    if (v >= 20) return 'Fear';
    return 'Extreme Fear';
  };

  return {
    value,
    label: getLabel(value),
    previousValue,
    previousLabel: getLabel(previousValue)
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { crypto, price, change } = await req.json();

    if (!crypto || typeof price !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const priceChange = change || 0;

    // Generate all sentiment data
    const newsHeadlines = generateNewsHeadlines(crypto, priceChange, price);
    const socialSentiment = generateSocialSentiment(crypto, priceChange);
    const fearGreedIndex = generateFearGreedIndex(priceChange);

    const response = {
      crypto,
      timestamp: new Date().toISOString(),
      news: newsHeadlines,
      social: socialSentiment,
      fearGreed: fearGreedIndex,
      summary: {
        overallSentiment: socialSentiment.overall.label,
        sentimentScore: socialSentiment.overall.score,
        totalMentions: socialSentiment.twitter.mentions + socialSentiment.reddit.mentions + socialSentiment.telegram.mentions,
        marketMood: fearGreedIndex.label
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in crypto-sentiment function:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch sentiment data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
