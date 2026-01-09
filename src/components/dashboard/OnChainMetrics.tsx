import { useOnChainData } from "@/hooks/useOnChainData";
import { 
  Activity, 
  ArrowDownRight, 
  ArrowUpRight, 
  Database, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  Zap,
  Radio,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface OnChainMetricsProps {
  crypto: string;
  price: number;
  change: number;
  volume?: number;
  marketCap?: number;
  coinGeckoId?: string;
}

const OnChainMetrics = ({ crypto, price, change, volume, marketCap, coinGeckoId }: OnChainMetricsProps) => {
  const { metrics, loading, streamStatus } = useOnChainData(crypto, price, change, {
    volume,
    marketCap,
    coinGeckoId
  });
  
  const [pulseKey, setPulseKey] = useState(0);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);

  // Pulse animation on data update
  useEffect(() => {
    if (metrics?.lastUpdated) {
      setPulseKey(prev => prev + 1);
    }
  }, [metrics?.lastUpdated]);

  // Time since last update counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (metrics?.lastUpdated) {
        const elapsed = Math.floor((Date.now() - new Date(metrics.lastUpdated).getTime()) / 1000);
        setTimeSinceUpdate(elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [metrics?.lastUpdated]);

  if (!metrics && loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="font-semibold text-foreground">Premium Live On-Chain Data</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const flowColor = metrics.exchangeNetFlow.trend === 'OUTFLOW' ? 'text-success' : 
                    metrics.exchangeNetFlow.trend === 'INFLOW' ? 'text-destructive' : 'text-muted-foreground';
  const flowBg = metrics.exchangeNetFlow.trend === 'OUTFLOW' ? 'bg-success/10' : 
                 metrics.exchangeNetFlow.trend === 'INFLOW' ? 'bg-destructive/10' : 'bg-secondary';

  const whaleColor = metrics.whaleActivity.netFlow === 'NET BUYING' ? 'text-success' : 
                     metrics.whaleActivity.netFlow === 'NET SELLING' ? 'text-destructive' : 'text-warning';

  const isConnected = streamStatus === 'connected';
  const isPolling = streamStatus === 'polling';

  const StatusIcon = isConnected ? Radio : isPolling ? Wifi : WifiOff;
  const statusColor = isConnected ? 'text-success' : isPolling ? 'text-primary' : 'text-muted-foreground';
  const statusLabel = isConnected ? 'LIVE STREAM' : isPolling ? 'LIVE POLL' : 'CONNECTING';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
      {/* Premium live indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-success/40 to-primary/20">
        <div 
          key={pulseKey}
          className="h-full bg-gradient-to-r from-success via-primary to-success animate-pulse"
          style={{ 
            animation: 'shimmer 2s linear infinite',
            backgroundSize: '200% 100%'
          }}
        />
      </div>

      {/* Floating update indicator */}
      {metrics.whaleActivity.recentLargeTx && (
        <div 
          key={`tx-${pulseKey}`}
          className={cn(
            "absolute top-12 right-4 px-2 py-1 rounded-lg text-xs font-medium animate-in slide-in-from-right fade-in duration-300",
            metrics.whaleActivity.recentLargeTx.type === 'OUT' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}
        >
          🐋 {metrics.whaleActivity.recentLargeTx.value.toFixed(2)} BTC {metrics.whaleActivity.recentLargeTx.type === 'OUT' ? '→ Cold' : '→ Exchange'}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="h-5 w-5 text-primary" />
            <span className={cn(
              "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full",
              isConnected ? "bg-success animate-pulse" : isPolling ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )} />
          </div>
          <h3 className="font-semibold text-foreground">24h On-Chain Data</h3>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
            {crypto.toUpperCase()}
          </span>
          <div className={cn(
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium",
            isConnected ? "bg-success/20 text-success" : isPolling ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <StatusIcon className="h-3 w-3" />
            {statusLabel}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {loading ? 'Syncing...' : timeSinceUpdate < 60 ? `${timeSinceUpdate}s ago` : `${Math.floor(timeSinceUpdate / 60)}m ago`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 24h Exchange Flow */}
        <div className={cn("p-3 rounded-xl transition-all duration-300", flowBg)} key={`flow-${pulseKey}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {metrics.exchangeNetFlow.trend === 'OUTFLOW' ? (
              <ArrowUpRight className={cn("h-4 w-4", flowColor)} />
            ) : metrics.exchangeNetFlow.trend === 'INFLOW' ? (
              <ArrowDownRight className={cn("h-4 w-4", flowColor)} />
            ) : (
              <Activity className={cn("h-4 w-4", flowColor)} />
            )}
            <span className="text-xs text-muted-foreground">24h Exchange Flow</span>
          </div>
          <div className={cn("font-bold", flowColor)}>
            {metrics.exchangeNetFlow.trend}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {metrics.exchangeNetFlow.magnitude}
            <span className={cn(
              "text-[10px]",
              metrics.exchangeNetFlow.change24h > 0 ? "text-success" : "text-destructive"
            )}>
              ({metrics.exchangeNetFlow.change24h > 0 ? '+' : ''}{(metrics.exchangeNetFlow.change24h / 1000).toFixed(1)}K)
            </span>
          </div>
        </div>

        {/* 24h Whale Activity */}
        <div className="p-3 rounded-xl bg-secondary/50 transition-all duration-300" key={`whale-${pulseKey}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="h-4 w-4 text-chart-cyan" />
            <span className="text-xs text-muted-foreground">24h Whale Activity</span>
          </div>
          <div className={cn("font-bold text-sm", whaleColor)}>
            {metrics.whaleActivity.netFlow}
          </div>
          <div className="flex flex-col gap-0.5 text-xs mt-1">
            <div className="flex gap-2">
              <span className="text-success">Buy: {metrics.whaleActivity.buying.toFixed(0)}%</span>
              <span className="text-destructive">Sell: {metrics.whaleActivity.selling.toFixed(0)}%</span>
            </div>
            <span className="text-muted-foreground text-[10px]">
              {metrics.whaleActivity.largeTxCount24h} large txs
            </span>
          </div>
        </div>

        {/* Mempool - Enhanced with fee tiers */}
        <div className="p-3 rounded-xl bg-secondary/50 transition-all duration-300" key={`mempool-${pulseKey}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Database className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">Mempool</span>
            {isConnected && <span className="h-1.5 w-1.5 bg-success rounded-full animate-pulse" />}
          </div>
          <div className="font-bold text-foreground">
            {metrics.mempoolData.unconfirmedTxs.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {metrics.mempoolData.avgFeeRate > 0 && (
              <div className="flex items-center gap-1">
                <span>{metrics.mempoolData.avgFeeRate} sat/vB</span>
                {metrics.mempoolData.fastestFee && (
                  <span className="text-[10px] text-warning">
                    (⚡{metrics.mempoolData.fastestFee})
                  </span>
                )}
              </div>
            )}
            {!metrics.mempoolData.avgFeeRate && <span>unconfirmed txs</span>}
          </div>
        </div>

        {/* 24h Transactions - Enhanced with TPS */}
        <div className="p-3 rounded-xl bg-secondary/50 transition-all duration-300" key={`tx-${pulseKey}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">24h Transactions</span>
          </div>
          <div className="font-bold text-foreground">
            {metrics.transactionVolume.value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {metrics.transactionVolume.tps ? (
              <span className="flex items-center gap-1">
                <span className="text-primary">{metrics.transactionVolume.tps} TPS</span>
                {metrics.hashRate > 0 && <span>• {(metrics.hashRate / 1e18).toFixed(2)} EH/s</span>}
              </span>
            ) : metrics.hashRate > 0 ? (
              `${(metrics.hashRate / 1e18).toFixed(2)} EH/s hash rate`
            ) : (
              'network activity'
            )}
          </div>
        </div>
      </div>

      {/* 24h Active Addresses & Network Stats */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>Active Addresses:</span>
          <span className="text-foreground font-medium">~{metrics.activeAddresses.current.toLocaleString()}</span>
          {metrics.activeAddresses.trend === 'INCREASING' && (
            <span className="flex items-center gap-0.5 text-success">
              <TrendingUp className="h-3 w-3" />
              +{metrics.activeAddresses.change24h.toFixed(1)}%
            </span>
          )}
          {metrics.activeAddresses.trend === 'DECREASING' && (
            <span className="flex items-center gap-0.5 text-destructive">
              <TrendingDown className="h-3 w-3" />
              {metrics.activeAddresses.change24h.toFixed(1)}%
            </span>
          )}
        </div>
        {metrics.blockHeight > 0 && (
          <div className="text-muted-foreground">
            Block: <span className="text-foreground font-medium">{metrics.blockHeight.toLocaleString()}</span>
          </div>
        )}
        {metrics.avgBlockTime > 0 && (
          <div className="text-muted-foreground">
            Avg Block: <span className="text-foreground font-medium">{metrics.avgBlockTime.toFixed(1)}m</span>
          </div>
        )}
        {/* Source info hidden - data is live */}
        {isConnected && (
          <div className="flex items-center gap-1 text-success justify-end md:col-span-1 col-span-2 md:justify-start text-[10px]">
            <Radio className="h-2.5 w-2.5" />
            LIVE
          </div>
        )}
      </div>

      {/* CSS for shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default OnChainMetrics;
