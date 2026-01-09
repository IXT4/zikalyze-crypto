import { useState, useEffect, useCallback, useRef } from "react";
import { useBinanceLivePrice } from "./useBinanceLivePrice";
import { supabase } from "@/integrations/supabase/client";
import { useSmartNotifications } from "./useSmartNotifications";

export interface LiveOnChainData {
  exchangeNetFlow: { value: number; trend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL'; magnitude: string };
  whaleActivity: { buying: number; selling: number; netFlow: string; largeTxCount24h: number };
  mempoolData: { unconfirmedTxs: number; avgFeeRate: number };
  activeAddresses: { current: number; change24h: number; trend: 'INCREASING' | 'DECREASING' | 'STABLE' };
  transactionVolume: { value: number; change24h: number };
  isLive: boolean;
}

export interface LiveSentimentData {
  fearGreedValue: number;
  fearGreedLabel: string;
  overallSentiment: string;
  sentimentScore: number;
  socialMentions: number;
  trendingTopics: string[];
  macroEvents: Array<{ event: string; impact: string; countdown: string }>;
  isLive: boolean;
}

export interface LiveMarketData {
  // Price data
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  priceIsLive: boolean;
  
  // On-chain data
  onChain: LiveOnChainData | null;
  
  // Sentiment data
  sentiment: LiveSentimentData | null;
  
  // Overall status
  isFullyLive: boolean;
  lastUpdated: number;
  dataSourcesSummary: string;
}

const SENTIMENT_CACHE_TTL = 30000; // 30 seconds
const ONCHAIN_POLL_INTERVAL = 15000; // 15 seconds

export function useLiveMarketData(
  crypto: string,
  fallbackPrice: number,
  fallbackChange: number,
  fallbackHigh?: number,
  fallbackLow?: number,
  fallbackVolume?: number
) {
  // Live price from WebSocket
  const livePrice = useBinanceLivePrice(crypto, fallbackPrice, fallbackChange);
  
  // Smart notifications
  const { checkSentimentShift, checkWhaleActivity } = useSmartNotifications();
  
  // On-chain metrics state
  const [onChainData, setOnChainData] = useState<LiveOnChainData | null>(null);
  const [sentimentData, setSentimentData] = useState<LiveSentimentData | null>(null);
  
  const lastSentimentFetchRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSentimentRef = useRef<{ fearGreed: number; sentiment: string } | null>(null);
  const prevWhaleRef = useRef<{ netFlow: number; txCount: number } | null>(null);

  // Fetch on-chain metrics
  const fetchOnChainData = useCallback(async () => {
    const cryptoUpper = crypto.toUpperCase();
    const isBTC = cryptoUpper === 'BTC';
    
    try {
      const currentChange = livePrice.isLive ? livePrice.change24h : fallbackChange;
      let onChain: LiveOnChainData = {
        exchangeNetFlow: { value: 0, trend: 'NEUTRAL', magnitude: 'LOW' },
        whaleActivity: { buying: 50, selling: 50, netFlow: 'BALANCED', largeTxCount24h: 0 },
        mempoolData: { unconfirmedTxs: 0, avgFeeRate: 0 },
        activeAddresses: { current: 0, change24h: 0, trend: 'STABLE' },
        transactionVolume: { value: 0, change24h: 0 },
        isLive: false,
      };

      if (isBTC) {
        // Fetch real BTC on-chain data
        const [mempoolFees, mempoolBlocks] = await Promise.all([
          fetch('https://mempool.space/api/v1/fees/recommended', { signal: AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('https://mempool.space/api/v1/fees/mempool-blocks', { signal: AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (mempoolFees) {
          onChain.mempoolData.avgFeeRate = mempoolFees.halfHourFee || mempoolFees.hourFee || 0;
        }

        if (mempoolBlocks && Array.isArray(mempoolBlocks)) {
          onChain.mempoolData.unconfirmedTxs = mempoolBlocks.reduce((acc: number, b: any) => acc + (b.nTx || 0), 0);
        }

        onChain.isLive = true;
      } else {
        // For other cryptos - use Blockchair
        const blockchairCoinMap: Record<string, string> = {
          'ETH': 'ethereum', 'LTC': 'litecoin', 'DOGE': 'dogecoin',
          'XRP': 'ripple', 'SOL': 'solana'
        };
        
        const blockchairCoin = blockchairCoinMap[cryptoUpper];
        if (blockchairCoin) {
          const data = await fetch(`https://api.blockchair.com/${blockchairCoin}/stats`, { signal: AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null).catch(() => null);
          
          if (data?.data) {
            onChain.transactionVolume.value = data.data.transactions_24h || 0;
            onChain.mempoolData.unconfirmedTxs = data.data.mempool_transactions || 0;
            onChain.activeAddresses.current = data.data.hodling_addresses || 0;
            onChain.isLive = true;
          }
        }
      }

      // Derive exchange flow from price action and mempool
      const isStrongBullish = currentChange > 5;
      const isStrongBearish = currentChange < -5;
      const mempoolHigh = onChain.mempoolData.unconfirmedTxs > 50000;
      
      if (isStrongBullish && !mempoolHigh) {
        onChain.exchangeNetFlow = { value: -15000, trend: 'OUTFLOW', magnitude: 'SIGNIFICANT' };
        onChain.whaleActivity = { buying: 70, selling: 25, netFlow: 'NET BUYING', largeTxCount24h: 45 };
      } else if (isStrongBearish || mempoolHigh) {
        onChain.exchangeNetFlow = { value: 12000, trend: 'INFLOW', magnitude: 'MODERATE' };
        onChain.whaleActivity = { buying: 30, selling: 60, netFlow: 'NET SELLING', largeTxCount24h: 38 };
      } else if (currentChange > 0) {
        onChain.exchangeNetFlow = { value: -5000, trend: 'OUTFLOW', magnitude: 'MODERATE' };
        onChain.whaleActivity = { buying: 55, selling: 40, netFlow: 'ACCUMULATING', largeTxCount24h: 32 };
      } else {
        onChain.exchangeNetFlow = { value: 0, trend: 'NEUTRAL', magnitude: 'LOW' };
        onChain.whaleActivity = { buying: 48, selling: 48, netFlow: 'BALANCED', largeTxCount24h: 28 };
      }

      onChain.activeAddresses.trend = currentChange > 3 ? 'INCREASING' : currentChange < -3 ? 'DECREASING' : 'STABLE';
      onChain.activeAddresses.change24h = currentChange * 0.8;

      if (isMountedRef.current) {
        setOnChainData(onChain);
        
        // Check for significant whale activity changes and send notifications
        const whaleNetFlowValue = onChain.exchangeNetFlow.value;
        const whaleNetFlowAbs = Math.abs(whaleNetFlowValue);
        const prevWhale = prevWhaleRef.current;
        
        // Only notify if there's a significant change from previous state
        if (onChain.isLive && whaleNetFlowAbs > 10000) {
          if (!prevWhale || Math.abs(whaleNetFlowValue - prevWhale.netFlow) > 5000) {
            await checkWhaleActivity(
              crypto.toUpperCase(),
              whaleNetFlowValue * 1000, // Convert to dollar value estimate
              onChain.whaleActivity.largeTxCount24h
            );
          }
        }
        
        prevWhaleRef.current = {
          netFlow: whaleNetFlowValue,
          txCount: onChain.whaleActivity.largeTxCount24h
        };
      }
    } catch (e) {
      console.warn('[LiveMarketData] On-chain fetch error:', e);
    }
  }, [crypto, livePrice.isLive, livePrice.change24h, fallbackChange, checkWhaleActivity]);

  // Fetch sentiment data (cached, less frequent)
  const fetchSentimentData = useCallback(async () => {
    const now = Date.now();
    if (now - lastSentimentFetchRef.current < SENTIMENT_CACHE_TTL) return;
    lastSentimentFetchRef.current = now;
    
    try {
      const currentPrice = livePrice.isLive ? livePrice.price : fallbackPrice;
      const currentChange = livePrice.isLive ? livePrice.change24h : fallbackChange;
      
      const { data: response, error } = await supabase.functions.invoke('crypto-sentiment', {
        body: { crypto, price: currentPrice, change: currentChange }
      });

      if (error || !response) return;

      const sentiment: LiveSentimentData = {
        fearGreedValue: response.fearGreed?.value || 50,
        fearGreedLabel: response.fearGreed?.label || 'Neutral',
        overallSentiment: response.summary?.overallSentiment || 'Neutral',
        sentimentScore: response.summary?.sentimentScore || 50,
        socialMentions: response.summary?.totalMentions || 0,
        trendingTopics: response.social?.trendingTopics || [],
        macroEvents: (response.macroEvents || []).slice(0, 3).map((e: any) => ({
          event: e.event,
          impact: e.impact,
          countdown: e.countdown
        })),
        isLive: response.meta?.isLive || false,
      };

      if (isMountedRef.current) {
        setSentimentData(sentiment);
        
        // Check for sentiment shifts and send notifications
        const prevSentiment = prevSentimentRef.current;
        if (sentiment.isLive && sentiment.fearGreedValue) {
          if (prevSentiment) {
            const shift = Math.abs(sentiment.fearGreedValue - prevSentiment.fearGreed);
            if (shift >= 10) { // Significant shift
              await checkSentimentShift(
                crypto.toUpperCase(),
                sentiment.fearGreedValue,
                sentiment.overallSentiment
              );
            }
          }
        }
        
        prevSentimentRef.current = {
          fearGreed: sentiment.fearGreedValue,
          sentiment: sentiment.overallSentiment
        };
      }
    } catch (e) {
      console.warn('[LiveMarketData] Sentiment fetch error:', e);
    }
  }, [crypto, livePrice.isLive, livePrice.price, livePrice.change24h, fallbackPrice, fallbackChange, checkSentimentShift]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    
    // Fetch immediately
    fetchOnChainData();
    fetchSentimentData();
    
    // Poll for updates
    pollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchOnChainData();
        fetchSentimentData();
      }
    }, ONCHAIN_POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [crypto, fetchOnChainData, fetchSentimentData]);

  // Build aggregated data
  const currentPrice = livePrice.isLive ? livePrice.price : (livePrice.price || fallbackPrice);
  const currentChange = livePrice.isLive ? livePrice.change24h : (livePrice.change24h || fallbackChange);
  const currentHigh = livePrice.isLive && livePrice.high24h ? livePrice.high24h : fallbackHigh || 0;
  const currentLow = livePrice.isLive && livePrice.low24h ? livePrice.low24h : fallbackLow || 0;
  const currentVolume = livePrice.isLive && livePrice.volume ? livePrice.volume : fallbackVolume || 0;

  const isFullyLive = livePrice.isLive && (onChainData?.isLive || false) && (sentimentData?.isLive || false);
  
  const dataSources: string[] = [];
  if (livePrice.isLive) dataSources.push('price');
  if (onChainData?.isLive) dataSources.push('on-chain');
  if (sentimentData?.isLive) dataSources.push('sentiment');

  const liveMarketData: LiveMarketData = {
    price: currentPrice,
    change24h: currentChange,
    high24h: currentHigh,
    low24h: currentLow,
    volume: currentVolume,
    priceIsLive: livePrice.isLive,
    onChain: onChainData,
    sentiment: sentimentData,
    isFullyLive,
    lastUpdated: livePrice.lastUpdate,
    dataSourcesSummary: dataSources.length > 0 ? dataSources.join('+') : 'cached',
  };

  return liveMarketData;
}
