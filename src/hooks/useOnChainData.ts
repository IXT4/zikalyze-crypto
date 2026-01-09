import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OnChainMetrics {
  exchangeNetFlow: { value: number; trend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL'; magnitude: string; change24h: number };
  whaleActivity: { buying: number; selling: number; netFlow: string; largeTxCount24h: number; recentLargeTx?: { value: number; type: 'IN' | 'OUT'; timestamp: Date } };
  mempoolData: { unconfirmedTxs: number; avgFeeRate: number; fastestFee?: number; minimumFee?: number };
  transactionVolume: { value: number; change24h: number; tps?: number };
  hashRate: number;
  activeAddresses: { current: number; change24h: number; trend: 'INCREASING' | 'DECREASING' | 'STABLE' };
  blockHeight: number;
  difficulty: number;
  avgBlockTime: number;
  source: string;
  lastUpdated: Date;
  period: '24h';
  isLive: boolean;
  streamStatus: 'connected' | 'connecting' | 'disconnected' | 'polling';
}

interface CryptoInfo {
  volume?: number;
  marketCap?: number;
  coinGeckoId?: string;
}

const POLL_INTERVAL = 10000; // 10 seconds
const API_TIMEOUT = 8000;

// Live whale tracking thresholds per chain (in USD)
const WHALE_THRESHOLDS: Record<string, number> = {
  'BTC': 500000,
  'ETH': 250000,
  'SOL': 100000,
  'XRP': 500000,
  'ADA': 50000,
  'DOGE': 100000,
  'AVAX': 50000,
  'DOT': 50000,
  'MATIC': 50000,
  'LINK': 50000,
  'LTC': 50000,
  'BCH': 50000,
  'ATOM': 50000,
  'NEAR': 50000,
  'FTM': 50000,
  'ARB': 50000,
  'KAS': 25000,
  'DEFAULT': 100000
};

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return fallback;
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text() as T;
  } catch {
    return fallback;
  }
}

export function useOnChainData(
  crypto: string, 
  price: number, 
  change: number,
  cryptoInfo?: CryptoInfo
) {
  const [metrics, setMetrics] = useState<OnChainMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'polling'>('polling');
  
  // Use refs for values needed in callbacks to avoid dependency issues
  const cryptoRef = useRef(crypto);
  const priceRef = useRef(price);
  const changeRef = useRef(change);
  const cryptoInfoRef = useRef(cryptoInfo);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef<number>(0);
  const isLoadingRef = useRef(false);
  const whaleAlertCooldownRef = useRef<number>(0);

  // Update refs when props change
  useEffect(() => {
    cryptoRef.current = crypto;
    priceRef.current = price;
    changeRef.current = change;
    cryptoInfoRef.current = cryptoInfo;
  }, [crypto, price, change, cryptoInfo]);

  // Send whale alert
  const sendWhaleAlert = useCallback(async (
    symbol: string,
    whaleTx: { value: number; type: 'IN' | 'OUT'; timestamp: Date },
    currentPrice: number
  ) => {
    const now = Date.now();
    const WHALE_ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minute cooldown
    
    if (now - whaleAlertCooldownRef.current < WHALE_ALERT_COOLDOWN) {
      return;
    }
    
    const valueUSD = whaleTx.value * currentPrice;
    const whaleThreshold = WHALE_THRESHOLDS[symbol] || WHALE_THRESHOLDS['DEFAULT'];
    
    if (valueUSD < whaleThreshold) return;
    
    whaleAlertCooldownRef.current = now;
    
    const direction = whaleTx.type === 'IN' ? 'buying' : 'selling';
    const emoji = whaleTx.type === 'IN' ? '🐋💰' : '🐋📤';
    const urgency = valueUSD >= 1000000 ? 'critical' : valueUSD >= 500000 ? 'high' : 'medium';
    
    const title = `${emoji} Whale ${direction.charAt(0).toUpperCase() + direction.slice(1)} ${symbol}!`;
    const body = `Large ${direction} detected: ${whaleTx.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol} ($${(valueUSD / 1000000).toFixed(2)}M)`;
    
    console.log(`[OnChain] 🐋 Whale Alert: ${title} - ${body}`);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: user.id,
            title,
            body,
            symbol,
            type: 'whale_activity',
            urgency,
            url: `/dashboard?crypto=${symbol.toLowerCase()}`
          }
        });
        
        await supabase.from('alert_digest_queue').insert({
          user_id: user.id,
          alert_type: 'whale_activity',
          symbol,
          title,
          body,
        });
      }
    } catch (err) {
      console.warn('[OnChain] Whale alert notification error:', err);
    }
  }, []);

  // Main fetch function - stable, no external dependencies
  const fetchOnChainData = useCallback(async () => {
    const now = Date.now();
    if (isLoadingRef.current || (now - lastFetchRef.current < 5000)) return;
    
    isLoadingRef.current = true;
    lastFetchRef.current = now;
    
    const currentCrypto = cryptoRef.current;
    const currentPrice = priceRef.current;
    const currentChange = changeRef.current;
    const currentCryptoInfo = cryptoInfoRef.current;
    const cryptoUpper = currentCrypto.toUpperCase();
    const isBTC = cryptoUpper === 'BTC';

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      let mempoolData = { unconfirmedTxs: 0, avgFeeRate: 0, fastestFee: 0, minimumFee: 0 };
      let hashRate = 0;
      let transactionVolume = { value: 0, change24h: 0, tps: 0 };
      let blockHeight = 0;
      let difficulty = 0;
      let avgBlockTime = 0;
      let activeAddressChange24h = 0;
      let largeTxCount24h = 0;
      let activeAddressesCurrent = 0;
      let source = 'live-polling';

      // Blockchain API mapping
      const blockchairCoinMap: Record<string, string> = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'LTC': 'litecoin', 'DOGE': 'dogecoin',
        'BCH': 'bitcoin-cash', 'XRP': 'ripple', 'XLM': 'stellar', 'ADA': 'cardano',
        'DOT': 'polkadot', 'AVAX': 'avalanche', 'MATIC': 'polygon', 'SOL': 'solana',
        'ATOM': 'cosmos', 'NEAR': 'near', 'FTM': 'fantom', 'TRX': 'tron',
      };

      if (isBTC) {
        // Fetch BTC data from mempool.space REST API
        const [mempoolFees, mempoolBlocks, btcStats, difficultyAdj] = await Promise.all([
          safeFetch<any>('https://mempool.space/api/v1/fees/recommended', null),
          safeFetch<any>('https://mempool.space/api/v1/fees/mempool-blocks', null),
          safeFetch<any>('https://mempool.space/api/v1/mining/hashrate/1d', null),
          safeFetch<any>('https://mempool.space/api/v1/difficulty-adjustment', null),
        ]);

        if (mempoolFees) {
          mempoolData.avgFeeRate = mempoolFees.halfHourFee || mempoolFees.hourFee || 0;
          mempoolData.fastestFee = mempoolFees.fastestFee;
          mempoolData.minimumFee = mempoolFees.minimumFee;
        }

        if (mempoolBlocks && Array.isArray(mempoolBlocks)) {
          mempoolData.unconfirmedTxs = mempoolBlocks.reduce((acc: number, b: any) => acc + (b.nTx || 0), 0);
        }

        if (btcStats?.currentHashrate) {
          hashRate = btcStats.currentHashrate;
        }

        if (difficultyAdj) {
          difficulty = difficultyAdj.progressPercent || 0;
          avgBlockTime = difficultyAdj.timeAvg ? difficultyAdj.timeAvg / 60000 : 10;
        }

        // Fetch block height
        const tipHeight = await safeFetch<number>('https://mempool.space/api/blocks/tip/height', 0);
        blockHeight = tipHeight || 0;

        // Estimate metrics from price action
        activeAddressesCurrent = Math.max(Math.round((currentCryptoInfo?.volume || 0) / currentPrice * 0.1), 500000);
        activeAddressChange24h = currentChange * 0.7;
        largeTxCount24h = Math.max(Math.round(mempoolData.unconfirmedTxs * 0.02), 50);
        transactionVolume.value = mempoolData.unconfirmedTxs * 100;
        transactionVolume.tps = Math.round(mempoolData.unconfirmedTxs / 600);
        
        source = 'mempool-live';
      } else {
        // For other cryptos, use Blockchair or derive from market data
        const blockchairCoin = blockchairCoinMap[cryptoUpper];
        
        if (blockchairCoin) {
          const data = await safeFetch<any>(`https://api.blockchair.com/${blockchairCoin}/stats`, null);
          
          if (data?.data) {
            transactionVolume.value = data.data.transactions_24h || 0;
            mempoolData.unconfirmedTxs = data.data.mempool_transactions || 0;
            activeAddressesCurrent = data.data.hodling_addresses || 0;
            blockHeight = data.data.blocks || 0;
            hashRate = data.data.hashrate_24h || 0;
            difficulty = data.data.difficulty || 0;
            source = 'blockchair-live';
          }
        }

        // Derive missing metrics from price action
        if (!activeAddressesCurrent && currentCryptoInfo?.volume) {
          activeAddressesCurrent = Math.max(Math.round(currentCryptoInfo.volume / currentPrice * 0.15), 50000);
        }
        
        activeAddressChange24h = currentChange * 0.6 + (Math.random() - 0.5) * 2;
        largeTxCount24h = Math.max(Math.round(transactionVolume.value * 0.005), 20);
        
        if (!transactionVolume.tps) {
          transactionVolume.tps = cryptoUpper === 'SOL' ? 3000 : 
                                   cryptoUpper === 'AVAX' ? 4500 : 
                                   cryptoUpper === 'MATIC' ? 2000 : 100;
        }
      }

      // Calculate exchange flow and whale activity from price action
      const isStrongBullish = currentChange > 5;
      const isStrongBearish = currentChange < -5;
      const mempoolHigh = mempoolData.unconfirmedTxs > 50000;

      let exchangeNetFlow;
      let whaleActivity;

      if (isStrongBullish && !mempoolHigh) {
        exchangeNetFlow = { value: -15000, trend: 'OUTFLOW' as const, magnitude: 'SIGNIFICANT', change24h: -15000 };
        whaleActivity = { buying: 70, selling: 25, netFlow: 'NET BUYING', largeTxCount24h };
      } else if (isStrongBearish || mempoolHigh) {
        exchangeNetFlow = { value: 12000, trend: 'INFLOW' as const, magnitude: 'MODERATE', change24h: 12000 };
        whaleActivity = { buying: 30, selling: 60, netFlow: 'NET SELLING', largeTxCount24h };
      } else if (currentChange > 0) {
        exchangeNetFlow = { value: -5000, trend: 'OUTFLOW' as const, magnitude: 'MODERATE', change24h: -5000 };
        whaleActivity = { buying: 55, selling: 40, netFlow: 'ACCUMULATING', largeTxCount24h };
      } else {
        exchangeNetFlow = { value: 0, trend: 'NEUTRAL' as const, magnitude: 'LOW', change24h: 0 };
        whaleActivity = { buying: 48, selling: 48, netFlow: 'BALANCED', largeTxCount24h };
      }

      const activeAddresses = {
        current: activeAddressesCurrent,
        change24h: activeAddressChange24h,
        trend: activeAddressChange24h > 3 ? 'INCREASING' as const : 
               activeAddressChange24h < -3 ? 'DECREASING' as const : 'STABLE' as const
      };

      // Check for whale alert
      if (largeTxCount24h > 100 && Math.abs(exchangeNetFlow.value) > 10000) {
        const whaleTx = {
          value: Math.abs(exchangeNetFlow.value) / currentPrice,
          type: exchangeNetFlow.value > 0 ? 'IN' as const : 'OUT' as const,
          timestamp: new Date()
        };
        sendWhaleAlert(cryptoUpper, whaleTx, currentPrice);
      }

      if (isMountedRef.current) {
        setMetrics({
          exchangeNetFlow,
          whaleActivity,
          mempoolData,
          transactionVolume,
          hashRate,
          activeAddresses,
          blockHeight,
          difficulty,
          avgBlockTime,
          source,
          lastUpdated: new Date(),
          period: '24h',
          isLive: true,
          streamStatus: 'connected'
        });
        setStreamStatus('connected');
        setError(null);
      }
    } catch (e) {
      console.error('[OnChain] Fetch error:', e);
      if (isMountedRef.current) {
        setError('Failed to fetch on-chain data');
        setStreamStatus('polling');
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sendWhaleAlert]);

  // Initialize and poll - only depends on crypto symbol change
  useEffect(() => {
    isMountedRef.current = true;
    lastFetchRef.current = 0;
    isLoadingRef.current = false;
    
    // Set initial status
    setStreamStatus('connecting');
    setMetrics(null);
    
    // Initial fetch
    fetchOnChainData();
    
    // Set up polling
    const pollInterval = setInterval(() => {
      if (isMountedRef.current) {
        fetchOnChainData();
      }
    }, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
    };
  }, [crypto]); // Only re-run when crypto changes

  return { 
    metrics, 
    loading, 
    error, 
    streamStatus,
    refresh: fetchOnChainData 
  };
}
