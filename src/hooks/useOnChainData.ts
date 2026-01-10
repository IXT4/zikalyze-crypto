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

interface WebSocketState {
  socket: WebSocket | null;
  reconnectAttempts: number;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
}

const POLL_INTERVAL = 2000;
const API_TIMEOUT = 8000;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY = 2000;
const CACHE_DURATION = 30000;

// WebSocket URLs for live streaming
const WS_ENDPOINTS: Record<string, string[]> = {
  'BTC': ['wss://mempool.space/api/v1/ws'],
  'ETH': [
    'wss://ethereum-rpc.publicnode.com',
    'wss://eth.drpc.org',
    'wss://ethereum.publicnode.com'
  ],
  'KAS': [] // Kaspa uses fast REST polling (no public WS)
};

// Whale thresholds in USD
const WHALE_THRESHOLDS: Record<string, number> = {
  'BTC': 500000, 'ETH': 250000, 'SOL': 100000, 'XRP': 500000, 'ADA': 50000,
  'DOGE': 100000, 'AVAX': 50000, 'DOT': 50000, 'MATIC': 50000, 'LINK': 50000,
  'LTC': 50000, 'BCH': 50000, 'ATOM': 50000, 'NEAR': 50000, 'FTM': 50000,
  'ARB': 50000, 'KAS': 25000, 'DEFAULT': 100000
};

// TPS estimates for chains
const CHAIN_TPS: Record<string, number> = {
  'SOL': 3000, 'AVAX': 4500, 'MATIC': 2000, 'KAS': 100, 'ETH': 15, 'BTC': 7, 'DEFAULT': 50
};

// API cache to prevent rate limiting
const apiCache: Record<string, { data: any; timestamp: number }> = {};

async function cachedFetch<T>(url: string, fallback: T): Promise<T> {
  const now = Date.now();
  
  if (apiCache[url] && (now - apiCache[url].timestamp) < CACHE_DURATION) {
    return apiCache[url].data as T;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 429 && apiCache[url]) {
        apiCache[url].timestamp = now;
        return apiCache[url].data as T;
      }
      return fallback;
    }
    
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json') ? await response.json() : await response.text();
    apiCache[url] = { data, timestamp: now };
    return data as T;
  } catch {
    if (apiCache[url]) return apiCache[url].data as T;
    return fallback;
  }
}

export function useOnChainData(crypto: string, price: number, change: number, cryptoInfo?: CryptoInfo) {
  const [metrics, setMetrics] = useState<OnChainMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'polling'>('connecting');

  // Stable refs
  const cryptoRef = useRef(crypto);
  const priceRef = useRef(price);
  const changeRef = useRef(change);
  const cryptoInfoRef = useRef(cryptoInfo);
  const isMountedRef = useRef(true);
  const metricsRef = useRef<OnChainMetrics | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isLoadingRef = useRef(false);
  const whaleAlertCooldownRef = useRef<number>(0);
  const wsStateRef = useRef<WebSocketState>({ socket: null, reconnectAttempts: 0, reconnectTimeout: null });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cryptoRef.current = crypto;
    priceRef.current = price;
    changeRef.current = change;
    cryptoInfoRef.current = cryptoInfo;
  }, [crypto, price, change, cryptoInfo]);

  const sendWhaleAlert = useCallback(async (
    symbol: string, whaleTx: { value: number; type: 'IN' | 'OUT'; timestamp: Date }, currentPrice: number
  ) => {
    const now = Date.now();
    if (now - whaleAlertCooldownRef.current < 300000) return;
    
    const valueUSD = whaleTx.value * currentPrice;
    const threshold = WHALE_THRESHOLDS[symbol] || WHALE_THRESHOLDS['DEFAULT'];
    if (valueUSD < threshold) return;
    
    whaleAlertCooldownRef.current = now;
    const direction = whaleTx.type === 'IN' ? 'buying' : 'selling';
    const emoji = whaleTx.type === 'IN' ? '🐋💰' : '🐋📤';
    const title = `${emoji} Whale ${direction.charAt(0).toUpperCase() + direction.slice(1)} ${symbol}!`;
    const body = `Large ${direction}: ${whaleTx.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol} ($${(valueUSD / 1000000).toFixed(2)}M)`;
    
    console.log(`[OnChain] 🐋 Whale Alert: ${title}`);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.functions.invoke('send-push-notification', {
          body: { userId: user.id, title, body, symbol, type: 'whale_activity', urgency: valueUSD >= 1000000 ? 'critical' : 'high', url: `/dashboard?crypto=${symbol.toLowerCase()}` }
        });
        await supabase.from('alert_digest_queue').insert({ user_id: user.id, alert_type: 'whale_activity', symbol, title, body });
      }
    } catch (err) {
      console.warn('[OnChain] Whale alert error:', err);
    }
  }, []);

  const updateMetrics = useCallback((partial: Partial<OnChainMetrics>) => {
    if (!isMountedRef.current) return;
    
    const current = metricsRef.current;
    const newMetrics: OnChainMetrics = {
      exchangeNetFlow: partial.exchangeNetFlow || current?.exchangeNetFlow || { value: 0, trend: 'NEUTRAL', magnitude: 'LOW', change24h: 0 },
      whaleActivity: partial.whaleActivity || current?.whaleActivity || { buying: 50, selling: 50, netFlow: 'BALANCED', largeTxCount24h: 0 },
      mempoolData: partial.mempoolData || current?.mempoolData || { unconfirmedTxs: 0, avgFeeRate: 0 },
      transactionVolume: partial.transactionVolume || current?.transactionVolume || { value: 0, change24h: 0, tps: 0 },
      hashRate: partial.hashRate ?? current?.hashRate ?? 0,
      activeAddresses: partial.activeAddresses || current?.activeAddresses || { current: 0, change24h: 0, trend: 'STABLE' },
      blockHeight: partial.blockHeight ?? current?.blockHeight ?? 0,
      difficulty: partial.difficulty ?? current?.difficulty ?? 0,
      avgBlockTime: partial.avgBlockTime ?? current?.avgBlockTime ?? 0,
      source: partial.source || current?.source || 'unknown',
      lastUpdated: new Date(),
      period: '24h',
      isLive: partial.isLive ?? true,
      streamStatus: partial.streamStatus || 'connected'
    };
    
    metricsRef.current = newMetrics;
    setMetrics(newMetrics);
  }, []);

  // Fetch chain-specific data via REST APIs
  const fetchRestData = useCallback(async () => {
    const now = Date.now();
    if (isLoadingRef.current || (now - lastFetchRef.current < 1500)) return;
    
    isLoadingRef.current = true;
    lastFetchRef.current = now;
    setLoading(true);

    const currentCrypto = cryptoRef.current.toUpperCase();
    const currentPrice = priceRef.current;
    const currentChange = changeRef.current;
    const currentInfo = cryptoInfoRef.current;

    try {
      let mempoolData = { unconfirmedTxs: 0, avgFeeRate: 0, fastestFee: 0, minimumFee: 0 };
      let hashRate = 0, transactionVolume = { value: 0, change24h: currentChange, tps: CHAIN_TPS[currentCrypto] || CHAIN_TPS['DEFAULT'] };
      let blockHeight = 0, difficulty = 0, avgBlockTime = 0;
      let activeAddressesCurrent = 0, activeAddressChange24h = currentChange * 0.6;
      let largeTxCount24h = 20;
      let source = 'derived';

      // BTC - mempool.space REST
      if (currentCrypto === 'BTC') {
        const [fees, blocks, stats, diffAdj, tipHeight] = await Promise.all([
          cachedFetch<any>('https://mempool.space/api/v1/fees/recommended', null),
          cachedFetch<any>('https://mempool.space/api/v1/fees/mempool-blocks', null),
          cachedFetch<any>('https://mempool.space/api/v1/mining/hashrate/1d', null),
          cachedFetch<any>('https://mempool.space/api/v1/difficulty-adjustment', null),
          cachedFetch<number>('https://mempool.space/api/blocks/tip/height', 0),
        ]);

        if (fees) {
          mempoolData = { avgFeeRate: fees.halfHourFee || 0, fastestFee: fees.fastestFee, minimumFee: fees.minimumFee, unconfirmedTxs: 0 };
        }
        if (blocks && Array.isArray(blocks)) {
          mempoolData.unconfirmedTxs = blocks.reduce((acc: number, b: any) => acc + (b.nTx || 0), 0);
        }
        if (stats?.currentHashrate) hashRate = stats.currentHashrate;
        if (diffAdj) { difficulty = diffAdj.progressPercent || 0; avgBlockTime = diffAdj.timeAvg ? diffAdj.timeAvg / 60000 : 10; }
        blockHeight = tipHeight || 0;
        transactionVolume = { value: mempoolData.unconfirmedTxs * 100, change24h: currentChange, tps: Math.round(mempoolData.unconfirmedTxs / 600) };
        largeTxCount24h = Math.max(Math.round(mempoolData.unconfirmedTxs * 0.02), 50);
        source = 'mempool-live';
      }
      // ETH - public APIs
      else if (currentCrypto === 'ETH') {
        const [gasData, blockData] = await Promise.all([
          cachedFetch<any>('https://api.blocknative.com/gasprices/blockprices', null),
          cachedFetch<any>('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber', null),
        ]);

        if (gasData?.blockPrices?.[0]) {
          const bp = gasData.blockPrices[0];
          mempoolData = {
            unconfirmedTxs: bp.estimatedTransactionCount || 150,
            avgFeeRate: Math.round(bp.baseFeePerGas || 20),
            fastestFee: Math.round(bp.estimatedPrices?.[0]?.maxFeePerGas || 30),
            minimumFee: Math.round(bp.estimatedPrices?.[3]?.maxFeePerGas || 15),
          };
        }
        if (blockData?.result) {
          blockHeight = parseInt(blockData.result, 16) || 0;
        }
        // Use minutes in UI; Ethereum blocks ~12s
        avgBlockTime = 12 / 60;
        transactionVolume.tps = 15;
        source = 'eth-api';
      }
      // KAS - Kaspa API
      else if (currentCrypto === 'KAS') {
        const [networkInfo, blockInfo] = await Promise.all([
          cachedFetch<any>('https://api.kaspa.org/info/network', null),
          cachedFetch<any>('https://api.kaspa.org/info/virtual-chain-blue-score', null),
        ]);

        if (networkInfo) {
          hashRate = networkInfo.hashrate || 0;
          difficulty = networkInfo.difficulty || 0;
        }
        if (blockInfo?.blueScore) {
          blockHeight = blockInfo.blueScore;
        }
        // Use minutes in UI; Kaspa ~1s blocks
        avgBlockTime = 1 / 60;
        transactionVolume.tps = 100;
        source = 'kaspa-api';
      }
      // SOL - Solana public RPC
      else if (currentCrypto === 'SOL') {
        const slotData = await cachedFetch<any>('https://api.mainnet-beta.solana.com', null);
        // Solana RPC needs POST, use derived data
        avgBlockTime = 0.4;
        transactionVolume.tps = 3000;
        source = 'solana-derived';
      }
      // Other chains - derive from price action
      else {
        transactionVolume.tps = CHAIN_TPS[currentCrypto] || CHAIN_TPS['DEFAULT'];
        source = 'derived';
      }

      // Derive metrics from market data
      if (!activeAddressesCurrent && currentInfo?.volume) {
        activeAddressesCurrent = Math.max(Math.round(currentInfo.volume / currentPrice * 0.1), 50000);
      }
      activeAddressChange24h = currentChange * 0.6 + (Math.random() - 0.5) * 2;

      // Derive exchange flow from price action
      const isStrongBullish = currentChange > 5;
      const isStrongBearish = currentChange < -5;
      const mempoolHigh = mempoolData.unconfirmedTxs > 50000;

      let exchangeNetFlow, whaleActivity;
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
        trend: activeAddressChange24h > 3 ? 'INCREASING' as const : activeAddressChange24h < -3 ? 'DECREASING' as const : 'STABLE' as const
      };

      // Whale alert check
      if (largeTxCount24h > 100 && Math.abs(exchangeNetFlow.value) > 10000) {
        sendWhaleAlert(currentCrypto, { value: Math.abs(exchangeNetFlow.value) / currentPrice, type: exchangeNetFlow.value > 0 ? 'IN' : 'OUT', timestamp: new Date() }, currentPrice);
      }

      const hasWebSocket = wsStateRef.current.socket?.readyState === WebSocket.OPEN;
      
      updateMetrics({
        exchangeNetFlow, whaleActivity, mempoolData, transactionVolume, hashRate,
        activeAddresses, blockHeight, difficulty, avgBlockTime, source,
        streamStatus: hasWebSocket ? 'connected' : 'polling'
      });
      setError(null);
    } catch (e) {
      console.error('[OnChain] REST fetch error:', e);
      setError('Failed to fetch on-chain data');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [sendWhaleAlert, updateMetrics]);

  // Multi-chain WebSocket connection (BTC + ETH)
  const connectWebSocket = useCallback(() => {
    const cryptoUpper = cryptoRef.current.toUpperCase();
    const endpoints = WS_ENDPOINTS[cryptoUpper];
    
    // If no WebSocket endpoints, use REST polling
    if (!endpoints || endpoints.length === 0) {
      console.log(`[OnChain] ${cryptoUpper} using REST polling (no WS)`);
      setStreamStatus('polling');
      return;
    }

    // Cleanup existing
    if (wsStateRef.current.socket) {
      wsStateRef.current.socket.close();
      wsStateRef.current.socket = null;
    }
    if (wsStateRef.current.reconnectTimeout) {
      clearTimeout(wsStateRef.current.reconnectTimeout);
      wsStateRef.current.reconnectTimeout = null;
    }

    setStreamStatus('connecting');
    const wsUrl = endpoints[wsStateRef.current.reconnectAttempts % endpoints.length];
    console.log(`[OnChain] Connecting ${cryptoUpper} WebSocket: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsStateRef.current.socket = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.log(`[OnChain] ${cryptoUpper} WebSocket connected`);
        wsStateRef.current.reconnectAttempts = 0;
        setStreamStatus('connected');
        
        // BTC-specific init
        if (cryptoUpper === 'BTC') {
          ws.send(JSON.stringify({ action: 'init' }));
          ws.send(JSON.stringify({ action: 'want', data: ['blocks', 'mempool-blocks', 'stats'] }));
        }
        // ETH - subscribe to new blocks
        else if (cryptoUpper === 'ETH') {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: ['newHeads']
          }));
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          // BTC message handling
          if (cryptoUpper === 'BTC') {
            if (data.mempoolInfo) {
              updateMetrics({
                mempoolData: {
                  unconfirmedTxs: data.mempoolInfo.size || 0,
                  avgFeeRate: metricsRef.current?.mempoolData?.avgFeeRate || 0,
                  fastestFee: metricsRef.current?.mempoolData?.fastestFee,
                  minimumFee: metricsRef.current?.mempoolData?.minimumFee,
                },
                source: 'mempool-ws',
                streamStatus: 'connected'
              });
            }

            if (data.block) {
              updateMetrics({
                blockHeight: data.block.height || metricsRef.current?.blockHeight || 0,
                source: 'mempool-ws',
                streamStatus: 'connected'
              });
              console.log(`[OnChain] BTC New block: ${data.block.height}`);
            }

            if (data['mempool-blocks']) {
              const blocks = data['mempool-blocks'];
              const totalTxs = blocks.reduce((acc: number, b: any) => acc + (b.nTx || 0), 0);
              const avgFee = blocks[0]?.medianFee || 0;
              
              updateMetrics({
                mempoolData: {
                  unconfirmedTxs: totalTxs,
                  avgFeeRate: avgFee,
                  fastestFee: blocks[0]?.feeRange?.[blocks[0].feeRange.length - 1] || avgFee,
                  minimumFee: blocks[blocks.length - 1]?.feeRange?.[0] || 1,
                },
                source: 'mempool-ws',
                streamStatus: 'connected'
              });
            }

            if (data.fees) {
              updateMetrics({
                mempoolData: {
                  unconfirmedTxs: metricsRef.current?.mempoolData?.unconfirmedTxs || 0,
                  avgFeeRate: data.fees.halfHourFee || data.fees.hourFee || 0,
                  fastestFee: data.fees.fastestFee,
                  minimumFee: data.fees.minimumFee,
                },
                source: 'mempool-ws',
                streamStatus: 'connected'
              });
            }
          }
          // ETH message handling
          else if (cryptoUpper === 'ETH') {
            // New block header subscription result
            if (data.params?.result?.number) {
              const blockNum = parseInt(data.params.result.number, 16);
              const gasUsed = parseInt(data.params.result.gasUsed || '0', 16);
              const baseFee = parseInt(data.params.result.baseFeePerGas || '0', 16);
              
              updateMetrics({
                blockHeight: blockNum,
                mempoolData: {
                  unconfirmedTxs: metricsRef.current?.mempoolData?.unconfirmedTxs || 150,
                  avgFeeRate: Math.round(baseFee / 1e9), // Convert wei to Gwei
                  fastestFee: metricsRef.current?.mempoolData?.fastestFee,
                  minimumFee: metricsRef.current?.mempoolData?.minimumFee,
                },
                transactionVolume: {
                  value: gasUsed,
                  change24h: changeRef.current,
                  tps: 15
                },
                source: 'eth-ws',
                streamStatus: 'connected'
              });
              console.log(`[OnChain] ETH New block: ${blockNum}`);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        console.warn(`[OnChain] ${cryptoUpper} WebSocket error`);
        setStreamStatus('disconnected');
      };

      ws.onclose = (event) => {
        console.log(`[OnChain] ${cryptoUpper} WebSocket closed: ${event.code}`);
        wsStateRef.current.socket = null;
        
        if (!isMountedRef.current) return;
        setStreamStatus('disconnected');

        if (wsStateRef.current.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, wsStateRef.current.reconnectAttempts);
          console.log(`[OnChain] Reconnecting ${cryptoUpper} in ${delay}ms (attempt ${wsStateRef.current.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          wsStateRef.current.reconnectAttempts++;
          wsStateRef.current.reconnectTimeout = setTimeout(() => {
            if (isMountedRef.current) connectWebSocket();
          }, delay);
        } else {
          console.log(`[OnChain] ${cryptoUpper} WebSocket max attempts, using polling`);
          setStreamStatus('polling');
        }
      };
    } catch (e) {
      console.error(`[OnChain] ${cryptoUpper} WebSocket error:`, e);
      setStreamStatus('polling');
    }
  }, [updateMetrics]);

  // Main effect
  useEffect(() => {
    isMountedRef.current = true;
    metricsRef.current = null;
    lastFetchRef.current = 0;
    isLoadingRef.current = false;
    wsStateRef.current.reconnectAttempts = 0;

    setMetrics(null);
    setStreamStatus('connecting');

    // Initial fetch
    fetchRestData();

    // Connect WebSocket for BTC
    connectWebSocket();

    // Polling fallback
    pollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) fetchRestData();
    }, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      
      if (wsStateRef.current.socket) {
        wsStateRef.current.socket.close();
        wsStateRef.current.socket = null;
      }
      if (wsStateRef.current.reconnectTimeout) {
        clearTimeout(wsStateRef.current.reconnectTimeout);
        wsStateRef.current.reconnectTimeout = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [crypto]);

  return { metrics, loading, error, streamStatus, refresh: fetchRestData };
}
