// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 DecentralizedVolumeChart — Oracle-Only Live Streaming Activity Chart
// ═══════════════════════════════════════════════════════════════════════════════
// Visualizes price momentum as activity bars (oracles don't provide volume data)
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDecentralizedChartData } from "@/hooks/useDecentralizedChartData";
import { TrendingUp } from "lucide-react";
import {
  OracleSourceBadge,
  OracleConnectionDots,
  ChartBuildingState,
  ChartConnectingState,
} from "./charts/OracleStatusIndicators";

interface DecentralizedVolumeChartProps {
  crypto: string;
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

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
  const momentumData = useMemo(() => {
    return chartData.map((point, index) => {
      if (index === 0) {
        return { ...point, momentum: 50 };
      }
      const prevPrice = chartData[index - 1].price;
      const priceChange = Math.abs((point.price - prevPrice) / prevPrice) * 100;
      const momentum = Math.min(100, 30 + priceChange * 500);
      return { ...point, momentum };
    });
  }, [chartData]);

  const activeSource = currentSource || oracleStatus.primarySource;

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={momentumData}>
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={[0, 100]} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(_value: number, _name: string, props: any) => {
            const price = props.payload?.price;
            const source = props.payload?.source;
            return [
              `$${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              source ? `Price (${source})` : "Price",
            ];
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        <Bar dataKey="momentum" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {momentumData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.positive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderContent = () => {
    if (isBuilding && dataPointCount < 3) {
      return <ChartBuildingState dataPointCount={dataPointCount} compact />;
    }
    if (!isLive && dataPointCount === 0) {
      return <ChartConnectingState compact />;
    }
    return renderChart();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Activity</h3>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <OracleSourceBadge source={activeSource} />
        </div>
        <OracleConnectionDots status={oracleStatus} />
      </div>
      
      {/* Chart */}
      <div className="h-32">{renderContent()}</div>
      
      {/* Footer */}
      <div className="mt-2 text-center">
        <span className="text-[10px] text-muted-foreground/70">
          Price momentum from decentralized oracles
        </span>
      </div>
    </div>
  );
};

export default DecentralizedVolumeChart;
