// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 DecentralizedPriceChart — 100% Oracle-Only Live Streaming Chart
// ═══════════════════════════════════════════════════════════════════════════════

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useDecentralizedChartData } from "@/hooks/useDecentralizedChartData";
import { cn } from "@/lib/utils";
import { Zap, Link2, Radio, Layers } from "lucide-react";

interface DecentralizedPriceChartProps {
  crypto: string;
  change24h?: number;
}

const DecentralizedPriceChart = ({ crypto, change24h }: DecentralizedPriceChartProps) => {
  const {
    chartData,
    priceChange,
    isBuilding,
    isLive,
    currentSource,
    oracleStatus,
    dataPointCount,
  } = useDecentralizedChartData(crypto);

  // Use 24h change if provided, otherwise use chart range change
  const displayChange = change24h !== undefined ? change24h : priceChange;
  const isPositive = displayChange >= 0;
  const strokeColor = isPositive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)";
  const gradientId = `decentralizedPriceGradient-${crypto}`;

  // Calculate dynamic Y-axis domain
  const prices = chartData.map((d) => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const padding = (maxPrice - minPrice) * 0.1 || 10;

  // Source icon and color
  const getSourceDisplay = () => {
    const sourceConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
      Pyth: { 
        icon: <Zap className="h-3 w-3" />, 
        color: "text-chart-cyan", 
        bg: "bg-chart-cyan/20" 
      },
      DIA: { 
        icon: <Radio className="h-3 w-3" />, 
        color: "text-chart-purple", 
        bg: "bg-chart-purple/20" 
      },
      API3: { 
        icon: <Link2 className="h-3 w-3" />, 
        color: "text-chart-blue", 
        bg: "bg-chart-blue/20" 
      },
      Redstone: { 
        icon: <Layers className="h-3 w-3" />, 
        color: "text-chart-orange", 
        bg: "bg-chart-orange/20" 
      },
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
    // Building state - waiting for oracle ticks
    if (isBuilding && dataPointCount < 3) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-chart-cyan animate-pulse" />
            <span className="text-sm font-medium">Building from Oracle Ticks...</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground/70">
              100% Decentralized • No Exchange APIs
            </span>
            <span className="text-[10px] text-chart-cyan/70">
              {dataPointCount} / 5 points collected
            </span>
          </div>
          {getConnectionDots()}
        </div>
      );
    }

    // No oracles connected
    if (!isLive && dataPointCount === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Radio className="h-8 w-8 text-warning animate-pulse" />
          <span className="text-sm">Connecting to Decentralized Oracles...</span>
          {getConnectionDots()}
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
            tickFormatter={(value) =>
              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 8%)",
              border: "1px solid hsl(222, 47%, 18%)",
              borderRadius: "8px",
              color: "hsl(210, 40%, 98%)",
            }}
            formatter={(value: number, _name: string, props: any) => [
              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              props.payload?.source ? `Price (${props.payload.source})` : "Price",
            ]}
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
          {getSourceDisplay()}
          {isLive && (
            <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-success/20 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getConnectionDots()}
          {chartData.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                )}
              >
                {isPositive ? "+" : ""}
                {displayChange.toFixed(2)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {change24h !== undefined ? "24h" : "session"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-64">{renderContent()}</div>
    </div>
  );
};

export default DecentralizedPriceChart;
