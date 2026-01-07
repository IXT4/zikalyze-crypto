import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useRealtimeChartData } from "@/hooks/useRealtimeChartData";
import { AlertCircle } from "lucide-react";

interface VolumeChartProps {
  crypto: string;
  coinGeckoId?: string;
}

const VolumeChart = ({ crypto, coinGeckoId }: VolumeChartProps) => {
  const { chartData, isLoading, isSupported, error, dataSource } = useRealtimeChartData(crypto, coinGeckoId);

  // Format volume for display (convert to K, M, B)
  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
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

    // No data after loading
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
        {dataSource === "coingecko" && (
          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
            Delayed
          </span>
        )}
      </div>
      <div className="h-32">
        {renderContent()}
      </div>
    </div>
  );
};

export default VolumeChart;
