import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRealtimeChartData } from "@/hooks/useRealtimeChartData";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface PriceChartProps {
  crypto: string;
  coinGeckoId?: string;
  change24h?: number; // Pass actual 24h change from parent
}

const PriceChart = ({ crypto, coinGeckoId, change24h }: PriceChartProps) => {
  const { chartData, priceChange: chartRangeChange, isLoading, isSupported, error, dataSource } = useRealtimeChartData(crypto, coinGeckoId);
  
  // Use 24h change if provided, otherwise fall back to chart range change
  const displayChange = change24h !== undefined ? change24h : chartRangeChange;
  const isPositive = displayChange >= 0;
  const strokeColor = isPositive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)";
  const gradientId = `priceGradient-${crypto}`;
  
  // Calculate dynamic Y-axis domain
  const prices = chartData.map(d => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const padding = (maxPrice - minPrice) * 0.1 || 10;

  const renderContent = () => {
    // Not supported or error state
    if (!isSupported || error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-warning" />
          <span className="text-sm">{error || `Chart not available for ${crypto}`}</span>
          {dataSource === "coingecko" ? (
            <span className="text-xs text-muted-foreground/70">Using delayed data</span>
          ) : (
            <span className="text-xs text-muted-foreground/70">Trying alternative sources…</span>
          )}
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading data...</span>
          </div>
        </div>
      );
    }

    // No data after loading
    if (chartData.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-warning" />
          <span className="text-sm">No chart data available</span>
        </div>
      );
    }

    // Chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            tickFormatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 8%)",
              border: "1px solid hsl(222, 47%, 18%)",
              borderRadius: "8px",
              color: "hsl(210, 40%, 98%)",
            }}
            formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Price"]}
            labelStyle={{ color: "hsl(215, 20%, 65%)" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
          {dataSource && (
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              dataSource === "coingecko" 
                ? "bg-warning/20 text-warning" 
                : "bg-success/20 text-success"
            )}>
              {dataSource === "coingecko" ? "Delayed" : "Live"}
            </span>
          )}
        </div>
        {isSupported && chartData.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded-lg px-2 py-1 text-xs font-medium",
              isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}>
              {isPositive ? "+" : ""}{displayChange.toFixed(2)}%
            </span>
            <span className="text-[10px] text-muted-foreground">24h</span>
          </div>
        )}
      </div>
      <div className="h-64">
        {renderContent()}
      </div>
    </div>
  );
};

export default PriceChart;
