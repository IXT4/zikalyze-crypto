import { useOnChainData } from "@/hooks/useOnChainData";
import { 
  Activity, 
  ArrowDownRight, 
  ArrowUpRight, 
  Database, 
  Hash, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface OnChainMetricsProps {
  crypto: string;
  price: number;
  change: number;
}

const OnChainMetrics = ({ crypto, price, change }: OnChainMetricsProps) => {
  const { metrics, loading, countdown, refresh } = useOnChainData(crypto, price, change);

  if (!metrics && loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="font-semibold text-foreground">Live On-Chain Data</h3>
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

  return (
    <div className="rounded-2xl border border-border bg-card p-4 relative overflow-hidden">
      {/* Live indicator pulse */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent">
        <div 
          className="h-full bg-primary animate-pulse"
          style={{ width: `${((30 - countdown) / 30) * 100}%`, transition: 'width 1s linear' }}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full animate-pulse" />
          </div>
          <h3 className="font-semibold text-foreground">Live On-Chain Data</h3>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
            {crypto.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {loading ? 'Updating...' : `${countdown}s`}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Exchange Flow */}
        <div className={cn("p-3 rounded-xl", flowBg)}>
          <div className="flex items-center gap-1.5 mb-1">
            {metrics.exchangeNetFlow.trend === 'OUTFLOW' ? (
              <ArrowUpRight className={cn("h-4 w-4", flowColor)} />
            ) : metrics.exchangeNetFlow.trend === 'INFLOW' ? (
              <ArrowDownRight className={cn("h-4 w-4", flowColor)} />
            ) : (
              <Activity className={cn("h-4 w-4", flowColor)} />
            )}
            <span className="text-xs text-muted-foreground">Exchange Flow</span>
          </div>
          <div className={cn("font-bold", flowColor)}>
            {metrics.exchangeNetFlow.trend}
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics.exchangeNetFlow.magnitude} magnitude
          </div>
        </div>

        {/* Whale Activity */}
        <div className="p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="h-4 w-4 text-chart-cyan" />
            <span className="text-xs text-muted-foreground">Whale Activity</span>
          </div>
          <div className={cn("font-bold text-sm", whaleColor)}>
            {metrics.whaleActivity.netFlow}
          </div>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-success">Buy: {metrics.whaleActivity.buying.toFixed(0)}%</span>
            <span className="text-destructive">Sell: {metrics.whaleActivity.selling.toFixed(0)}%</span>
          </div>
        </div>

        {/* Mempool */}
        <div className="p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Database className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">Mempool</span>
          </div>
          <div className="font-bold text-foreground">
            {metrics.mempoolData.unconfirmedTxs.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics.mempoolData.avgFeeRate > 0 ? `${metrics.mempoolData.avgFeeRate} sat/vB avg` : 'unconfirmed txs'}
          </div>
        </div>

        {/* 24h Transactions */}
        <div className="p-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">24h Transactions</span>
          </div>
          <div className="font-bold text-foreground">
            {metrics.transactionVolume.value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics.hashRate > 0 ? `${(metrics.hashRate / 1e18).toFixed(2)} EH/s` : 'network activity'}
          </div>
        </div>
      </div>

      {/* Active Addresses & Source */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Active Addresses: ~{metrics.activeAddresses.current.toLocaleString()}</span>
          {metrics.activeAddresses.trend === 'INCREASING' && (
            <span className="flex items-center gap-0.5 text-success">
              <TrendingUp className="h-3 w-3" /> Rising
            </span>
          )}
          {metrics.activeAddresses.trend === 'DECREASING' && (
            <span className="flex items-center gap-0.5 text-destructive">
              <TrendingDown className="h-3 w-3" /> Falling
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {metrics.source}
        </span>
      </div>
    </div>
  );
};

export default OnChainMetrics;
