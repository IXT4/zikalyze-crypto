import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMemo } from "react";

const COLORS = [
  "hsl(270, 70%, 55%)",
  "hsl(217, 91%, 60%)",
  "hsl(186, 100%, 50%)",
  "hsl(142, 76%, 46%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

const PredictiveChart = () => {
  const { prices, loading } = useCryptoPrices();

  const chartData = useMemo(() => {
    if (prices.length === 0) return [];
    
    // Get top 6 cryptos by 24h volume as a "predictive" indicator
    const topByVolume = prices
      .filter(p => p.total_volume)
      .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
      .slice(0, 6);
    
    const maxVolume = Math.max(...topByVolume.map(p => p.total_volume || 0));
    
    return topByVolume.map((crypto) => ({
      name: crypto.symbol.toUpperCase(),
      value: Number(((crypto.total_volume || 0) / maxVolume * 100).toFixed(1)),
      volume: crypto.total_volume,
    }));
  }, [prices]);

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Predictive</h3>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Loading...
          </span>
        </div>
        <div className="h-40 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Predictive</h3>
        <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-medium text-success">
          Live
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              formatter={(value: number, name: string, props: any) => [
                formatVolume(props.payload.volume),
                "24h Volume"
              ]}
              labelStyle={{ color: "hsl(215, 20%, 65%)" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictiveChart;