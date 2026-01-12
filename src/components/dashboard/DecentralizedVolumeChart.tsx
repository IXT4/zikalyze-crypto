// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 DecentralizedVolumeChart — Oracle-Only Live Streaming Activity Chart
// ═══════════════════════════════════════════════════════════════════════════════
// Visualizes price momentum as activity bars (oracles don't provide volume data)
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useGlobalPriceWebSocket } from "@/hooks/useGlobalPriceWebSocket";
import { TrendingUp } from "lucide-react";
import {
  OracleSourceBadge,
  OracleConnectionDots,
  ChartBuildingState,
  ChartConnectingState,
} from "./charts/OracleStatusIndicators";

interface ActivityDataPoint {
  time: string;
  price: number;
  momentum: number;
  positive: boolean;
  source: string;
}

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
  const symbol = crypto.toUpperCase();
  const ws = useGlobalPriceWebSocket([symbol]);
  
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Stream price updates into activity bars
  useEffect(() => {
    const wsPrice = ws.getPrice(symbol);
    if (!wsPrice || wsPrice.price <= 0) return;

    const now = Date.now();
    const newPrice = wsPrice.price;

    // Throttle updates to every 500ms for smooth activity visualization
    if (now - lastUpdateRef.current < 500) return;

    // Skip if price hasn't changed
    if (lastPriceRef.current !== null && newPrice === lastPriceRef.current) return;

    lastUpdateRef.current = now;

    // Calculate momentum based on price change
    let momentum = 50;
    let positive = true;
    if (lastPriceRef.current !== null) {
      const priceChange = (newPrice - lastPriceRef.current) / lastPriceRef.current;
      positive = priceChange >= 0;
      momentum = Math.min(100, 30 + Math.abs(priceChange) * 10000);
    }

    const newPoint: ActivityDataPoint = {
      time: new Date(now).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      price: newPrice,
      momentum,
      positive,
      source: "WebSocket",
    };

    lastPriceRef.current = newPrice;

    setActivityData(prev => {
      const updated = [...prev, newPoint];
      // Keep last 30 data points for clean visualization
      return updated.slice(-30);
    });
  }, [ws.prices, symbol, ws.getPrice]);

  const isLive = ws.connected;
  const dataPointCount = activityData.length;
  const isBuilding = dataPointCount < 3;
  const currentSource = ws.connected ? "WebSocket" : null;

  const oracleStatus = {
    pythConnected: false,
    diaConnected: false,
    redstoneConnected: false,
    primarySource: "WebSocket" as const,
  };

  const activeSource = currentSource || oracleStatus.primarySource;

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={activityData}>
        <XAxis dataKey="time" hide />
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
          {activityData.map((entry, index) => (
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
      
    </div>
  );
};

export default DecentralizedVolumeChart;
