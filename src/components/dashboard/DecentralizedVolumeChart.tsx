// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 DecentralizedVolumeChart — Oracle-Only Live Streaming (Price-Based Visualization)
// ═══════════════════════════════════════════════════════════════════════════════
// Note: Decentralized oracles don't provide volume data, so this displays
// price momentum/activity as a volume-like visualization
// ═══════════════════════════════════════════════════════════════════════════════

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDecentralizedChartData } from "@/hooks/useDecentralizedChartData";
import { cn } from "@/lib/utils";
import { Zap, Link2, Radio, Layers, TrendingUp } from "lucide-react";

interface DecentralizedVolumeChartProps {
  crypto: string;
}

const DecentralizedVolumeChart = ({ crypto }: DecentralizedVolumeChartProps) => {
  const {
    chartData,
    isBuilding,
    isLive,
    currentSource,
    oracleStatus,
    dataPointCount,
  } = useDecentralizedChartData(crypto);

  // Convert price data to momentum/activity bars
  // Since oracles don't provide volume, we visualize price momentum instead
  const momentumData = chartData.map((point, index) => {
    if (index === 0) {
      return { ...point, momentum: 50 }; // Base momentum
    }
    const prevPrice = chartData[index - 1].price;
    const priceChange = Math.abs((point.price - prevPrice) / prevPrice) * 100;
    // Scale momentum: larger price changes = taller bars
    const momentum = Math.min(100, 30 + priceChange * 500);
    return { ...point, momentum };
  });

  // Source icon and color
  const getSourceDisplay = () => {
    const sourceConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
      Pyth: { icon: <Zap className="h-3 w-3" />, color: "text-chart-cyan", bg: "bg-chart-cyan/20" },
      DIA: { icon: <Radio className="h-3 w-3" />, color: "text-chart-purple", bg: "bg-chart-purple/20" },
      API3: { icon: <Link2 className="h-3 w-3" />, color: "text-chart-blue", bg: "bg-chart-blue/20" },
      Redstone: { icon: <Layers className="h-3 w-3" />, color: "text-chart-orange", bg: "bg-chart-orange/20" },
    };

    const source = currentSource || oracleStatus.primarySource;
    if (!source || source === "none") return null;

    const config = sourceConfig[source];
    if (!config) return null;

    return (
      <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", config.bg, config.color)}>
        {config.icon}
        {source}
      </span>
    );
  };

  // Connection indicators
  const getConnectionDots = () => {
    const dots = [
      { connected: oracleStatus.pythConnected, label: "Pyth", color: "bg-chart-cyan" },
      { connected: oracleStatus.diaConnected, label: "DIA", color: "bg-chart-purple" },
      { connected: oracleStatus.api3Connected, label: "API3", color: "bg-chart-blue" },
      { connected: oracleStatus.redstoneConnected, label: "Redstone", color: "bg-chart-orange" },
    ];

    return (
      <div className="flex items-center gap-1">
        {dots.map((dot) => (
          <div
            key={dot.label}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              dot.connected ? dot.color : "bg-muted-foreground/30"
            )}
            title={`${dot.label}: ${dot.connected ? "Connected" : "Disconnected"}`}
          />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    // Building state
    if (isBuilding && dataPointCount < 3) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-chart-cyan animate-pulse" />
            <span className="text-xs">Building from Oracle Ticks...</span>
          </div>
          <span className="text-[10px] text-muted-foreground/70">
            {dataPointCount} / 5 points
          </span>
        </div>
      );
    }

    // No oracles connected
    if (!isLive && dataPointCount === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <Radio className="h-5 w-5 text-warning animate-pulse" />
          <span className="text-xs">Connecting...</span>
        </div>
      );
    }

    // Chart - Price Momentum visualization
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={momentumData}>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 8%)",
              border: "1px solid hsl(222, 47%, 18%)",
              borderRadius: "8px",
              color: "hsl(210, 40%, 98%)",
            }}
            formatter={(_value: number, _name: string, props: any) => {
              const price = props.payload?.price;
              const source = props.payload?.source;
              return [
                `$${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                source ? `Price (${source})` : "Price",
              ];
            }}
            labelStyle={{ color: "hsl(215, 20%, 65%)" }}
          />
          <Bar dataKey="momentum" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {momentumData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.positive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Activity</h3>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          {getSourceDisplay()}
        </div>
        {getConnectionDots()}
      </div>
      <div className="h-32">{renderContent()}</div>
      <div className="mt-2 text-center">
        <span className="text-[10px] text-muted-foreground/70">
          Price momentum from decentralized oracles
        </span>
      </div>
    </div>
  );
};

export default DecentralizedVolumeChart;
