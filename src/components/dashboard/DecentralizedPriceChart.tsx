// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 DecentralizedPriceChart — 100% Oracle-Only Live Streaming Chart
// ═══════════════════════════════════════════════════════════════════════════════

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useDecentralizedChartData } from "@/hooks/useDecentralizedChartData";
import { cn } from "@/lib/utils";
import {
  OracleSourceBadge,
  OracleConnectionDots,
  LiveBadge,
  ChartBuildingState,
  ChartConnectingState,
} from "./charts/OracleStatusIndicators";

interface DecentralizedPriceChartProps {
  crypto: string;
  change24h?: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

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

  const displayChange = change24h ?? priceChange;
  const isPositive = displayChange >= 0;
  const strokeColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const gradientId = `decentralizedPriceGradient-${crypto}`;

  // Calculate dynamic Y-axis domain
  const prices = chartData.map((d) => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const padding = (maxPrice - minPrice) * 0.1 || 10;

  const activeSource = currentSource || oracleStatus.primarySource;

  const renderChart = () => (
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
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          tickFormatter={(value) =>
            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
          width={80}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, _name: string, props: any) => [
            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            props.payload?.source ? `Price (${props.payload.source})` : "Price",
          ]}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
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

  const renderContent = () => {
    if (isBuilding && dataPointCount < 3) {
      return <ChartBuildingState dataPointCount={dataPointCount} />;
    }
    if (!isLive && dataPointCount === 0) {
      return <ChartConnectingState />;
    }
    return renderChart();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
          <OracleSourceBadge source={activeSource} />
          {isLive && <LiveBadge />}
        </div>
        
        <div className="flex items-center gap-3">
          <OracleConnectionDots status={oracleStatus} />
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
      
      {/* Chart */}
      <div className="h-64">{renderContent()}</div>
    </div>
  );
};

export default DecentralizedPriceChart;
