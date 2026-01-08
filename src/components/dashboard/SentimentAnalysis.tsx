import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, TrendingDown, MessageCircle, Users, 
  Newspaper, RefreshCw, Twitter, AlertCircle, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SentimentData {
  crypto: string;
  timestamp: string;
  news: Array<{
    source: string;
    headline: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    time: string;
    url: string;
  }>;
  social: {
    twitter: { mentions: number; sentiment: number; trending: boolean; followers?: number };
    reddit: { mentions: number; sentiment: number; activeThreads: number; subscribers?: number };
    telegram: { mentions: number; sentiment: number; channelUsers?: number };
    overall: { score: number; label: string; change24h: number };
    trendingTopics: string[];
    influencerMentions: Array<{ name: string; followers: string; sentiment: string }>;
  };
  fearGreed: {
    value: number;
    label: string;
    previousValue: number;
    previousLabel: string;
  };
  summary: {
    overallSentiment: string;
    sentimentScore: number;
    totalMentions: number;
    marketMood: string;
  };
}

interface SentimentAnalysisProps {
  crypto: string;
  price: number;
  change: number;
}

// Hidden historical storage for AI learning (stores last 10 snapshots per crypto)
const sentimentHistory: Record<string, SentimentData[]> = {};

const SentimentAnalysis = ({ crypto, price, change }: SentimentAnalysisProps) => {
  const { t } = useTranslation();
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);

  const storeForLearning = (newData: SentimentData) => {
    if (!sentimentHistory[crypto]) {
      sentimentHistory[crypto] = [];
    }
    // Keep last 10 snapshots for learning patterns
    sentimentHistory[crypto].unshift({
      ...newData,
      timestamp: new Date().toISOString()
    });
    if (sentimentHistory[crypto].length > 10) {
      sentimentHistory[crypto].pop();
    }
    // Log for AI learning (hidden from UI)
    console.log(`[AI Learning] Stored sentiment snapshot for ${crypto}. History: ${sentimentHistory[crypto].length} records`);
  };

  const fetchSentiment = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('crypto-sentiment', {
        body: { 
          crypto, 
          price, 
          change,
          // Pass historical data for AI context
          historicalSnapshots: sentimentHistory[crypto]?.slice(0, 5) || []
        }
      });

      if (fnError) throw fnError;
      
      // Store previous data for learning before updating
      storeForLearning(response);
      
      setData(response);
      setLastUpdate(new Date());
      setCountdown(60);
    } catch (err) {
      console.error('Failed to fetch sentiment:', err);
      if (!isAutoRefresh) setError('Failed to load sentiment data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and when crypto changes
  useEffect(() => {
    fetchSentiment();
  }, [crypto]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchSentiment(true);
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [crypto, price, change]);

  // Countdown timer
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 60));
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 55) return 'text-success/70';
    if (score >= 45) return 'text-muted-foreground';
    if (score >= 30) return 'text-destructive/70';
    return 'text-destructive';
  };

  const getSentimentBg = (score: number) => {
    if (score >= 70) return 'bg-success/20';
    if (score >= 55) return 'bg-success/10';
    if (score >= 45) return 'bg-muted';
    if (score >= 30) return 'bg-destructive/10';
    return 'bg-destructive/20';
  };

  const getFearGreedColor = (value: number) => {
    if (value >= 70) return 'from-success to-success/50';
    if (value >= 55) return 'from-success/70 to-warning';
    if (value >= 45) return 'from-warning to-warning/70';
    if (value >= 30) return 'from-warning/70 to-destructive/70';
    return 'from-destructive to-destructive/50';
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error || 'No data available'}</p>
          <Button onClick={() => fetchSentiment()} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Sentiment Analysis — {crypto}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Auto-refresh in {countdown}s
          </span>
          <Button onClick={() => fetchSentiment()} variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall Sentiment */}
          <div className={`rounded-xl p-4 ${getSentimentBg(data.summary.sentimentScore)}`}>
            <div className="text-sm text-muted-foreground mb-1">Overall Sentiment</div>
            <div className={`text-2xl font-bold ${getSentimentColor(data.summary.sentimentScore)}`}>
              {data.summary.sentimentScore}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {data.social.overall.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={`text-xs ${data.social.overall.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                {data.social.overall.change24h >= 0 ? '+' : ''}{data.social.overall.change24h.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Fear & Greed */}
          <div className="rounded-xl p-4 bg-secondary/50">
            <div className="text-sm text-muted-foreground mb-1">Fear & Greed</div>
            <div className="text-2xl font-bold text-foreground">{data.fearGreed.value}</div>
            <Badge variant="outline" className={`mt-1 text-xs ${
              data.fearGreed.value >= 50 ? 'border-success text-success' : 'border-destructive text-destructive'
            }`}>
              {data.fearGreed.label}
            </Badge>
          </div>

          {/* Total Mentions */}
          <div className="rounded-xl p-4 bg-secondary/50">
            <div className="text-sm text-muted-foreground mb-1">Total Mentions</div>
            <div className="text-2xl font-bold text-foreground">
              {(data.summary.totalMentions / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
          </div>

          {/* Market Mood */}
          <div className="rounded-xl p-4 bg-secondary/50">
            <div className="text-sm text-muted-foreground mb-1">Market Mood</div>
            <div className={`text-lg font-bold ${getSentimentColor(data.summary.sentimentScore)}`}>
              {data.summary.overallSentiment}
            </div>
            {data.social.twitter.trending && (
              <Badge className="mt-1 bg-primary/20 text-primary text-xs">
                <Flame className="h-3 w-3 mr-1" /> Trending
              </Badge>
            )}
          </div>
        </div>

        {/* Fear & Greed Gauge */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Fear & Greed Index</span>
            <span className="text-xs text-muted-foreground">
              Previous: {data.fearGreed.previousValue} ({data.fearGreed.previousLabel})
            </span>
          </div>
          <div className="relative">
            <div className={`h-3 rounded-full bg-gradient-to-r ${getFearGreedColor(data.fearGreed.value)}`}>
              <div 
                className="absolute top-0 h-3 w-1 bg-foreground rounded-full transition-all duration-500"
                style={{ left: `${data.fearGreed.value}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Extreme Fear</span>
              <span>Neutral</span>
              <span>Extreme Greed</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
          </TabsList>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4 mt-4">
            {/* Platform Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                  <span className="text-sm font-medium">Twitter/X</span>
                </div>
                <div className="text-lg font-bold">{(data.social.twitter.mentions / 1000).toFixed(1)}K</div>
                <Progress value={data.social.twitter.sentiment} className="h-1.5 mt-2" />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{data.social.twitter.sentiment}% positive</span>
                  {data.social.twitter.followers && data.social.twitter.followers > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {(data.social.twitter.followers / 1000000).toFixed(1)}M followers
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded-full bg-[#FF4500] flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">r/</span>
                  </div>
                  <span className="text-sm font-medium">Reddit</span>
                </div>
                <div className="text-lg font-bold">{(data.social.reddit.mentions / 1000).toFixed(1)}K</div>
                <Progress value={data.social.reddit.sentiment} className="h-1.5 mt-2" />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{data.social.reddit.activeThreads} active</span>
                  {data.social.reddit.subscribers && data.social.reddit.subscribers > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {(data.social.reddit.subscribers / 1000000).toFixed(1)}M subs
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded-full bg-[#0088CC] flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">T</span>
                  </div>
                  <span className="text-sm font-medium">Telegram</span>
                </div>
                <div className="text-lg font-bold">{(data.social.telegram.mentions / 1000).toFixed(1)}K</div>
                <Progress value={data.social.telegram.sentiment} className="h-1.5 mt-2" />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">{data.social.telegram.sentiment}% positive</span>
                  {data.social.telegram.channelUsers && data.social.telegram.channelUsers > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {(data.social.telegram.channelUsers / 1000).toFixed(0)}K users
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" />
                Trending Topics
              </div>
              <div className="flex flex-wrap gap-2">
                {data.social.trendingTopics.map((topic, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="mt-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {data.news.map((item, i) => (
                <div key={i} className="rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Newspaper className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-sm font-medium">{item.headline}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`shrink-0 text-xs ${
                        item.sentiment === 'bullish' ? 'border-success text-success' :
                        item.sentiment === 'bearish' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}
                    >
                      {item.sentiment === 'bullish' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : item.sentiment === 'bearish' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : null}
                      {item.sentiment}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Influencers Tab */}
          <TabsContent value="influencers" className="mt-4">
            <div className="space-y-3">
              {data.social.influencerMentions.map((influencer, i) => (
                <div key={i} className="rounded-lg border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">
                        {influencer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{influencer.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {influencer.followers} followers
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={`${
                      influencer.sentiment.toLowerCase().includes('bullish') ? 'border-success text-success' :
                      influencer.sentiment.toLowerCase().includes('bearish') || influencer.sentiment.toLowerCase().includes('cautious') ? 'border-destructive text-destructive' :
                      'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {influencer.sentiment}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SentimentAnalysis;
