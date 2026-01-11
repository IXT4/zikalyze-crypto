import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useRealtimeChartData } from "@/hooks/useRealtimeChartData";
import { cn } from "@/lib/utils";
import { AlertCircle, Zap, Wifi, Clock } from "lucide-react";

interface VolumeChartProps {
  crypto: string;
  coinGeckoId?: string;
}

const VolumeChart = ({ crypto, coinGeckoId }: VolumeChartProps) => {
  const { 
    chartData, 
    isLoading, 
    isSupported, 
    error, 
    dataSource,
    isPythStreaming,
    oracleConnected,
  } = useRealtimeChartData(crypto, coinGeckoId);

  // Format volume for display (convert to K, M, B)
  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  // Determine data source badge
  const getDataSourceBadge = () => {
    if (isPythStreaming) {
      return (
        <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-chart-cyan/20 text-chart-cyan">
          <Zap className="h-3 w-3" />
          Pyth Oracle
        </span>
      );
    }
    if (dataSource === "coingecko") {
      return (
        <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning/20 text-warning">
          <Clock className="h-3 w-3" />
          Delayed
        </span>
      );
    }
    if (dataSource) {
      return (
        <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-success/20 text-success">
          <Wifi className="h-3 w-3" />
          Live
        </span>
      );
    }
    return null;
  };

  const renderContent = () => {
    // Not supported or error state
    if (!isSupported || error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <AlertCircle className="h-5 w-5 text-warning" />
          <span className="text-xs">{error || "Not available"}</span>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading...</span>
          </div>
        </div>
      );
    }

    // Pyth streaming mode - waiting for ticks
    if (isPythStreaming && chartData.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-chart-cyan animate-pulse" />
            <span className="text-xs">Building from Pyth Oracle ticks...</span>
          </div>
          <span className="text-[10px] text-muted-foreground/70">Decentralized streaming active</span>
        </div>
      );
    }

    // No data after loading (non-Pyth)
    if (chartData.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <AlertCircle className="h-5 w-5 text-warning" />
          <span className="text-xs">No data</span>
        </div>
      );
    }

    // Chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 8%)",
              border: "1px solid hsl(222, 47%, 18%)",
              borderRadius: "8px",
              color: "hsl(210, 40%, 98%)",
            }}
            formatter={(value: number) => [formatVolume(value), "Volume"]}
            labelStyle={{ color: "hsl(215, 20%, 65%)" }}
          />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.positive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">Volume</h3>
        {getDataSourceBadge()}
        {oracleConnected && !isPythStreaming && (
          <span className="text-[10px] text-muted-foreground">(Oracle ready)</span>
        )}
      </div>
      <div className="h-32">
        {renderContent()}
      </div>
    </div>
  );
};

export default VolumeChart;
