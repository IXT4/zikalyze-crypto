import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMemo } from "react";

const COLORS = [
  "hsl(270, 70%, 55%)",
  "hsl(217, 91%, 60%)",
  "hsl(186, 100%, 50%)",
  "hsl(142, 76%, 46%)",
  "hsl(38, 92%, 50%)",
];

const DonutChart = () => {
  const { prices, loading } = useCryptoPrices();

  const chartData = useMemo(() => {
    if (prices.length === 0) return [];
    
    // Get top 5 cryptos by market cap
    const top5 = prices
      .filter(p => p.market_cap)
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 5);
    
    const totalMarketCap = top5.reduce((sum, p) => sum + (p.market_cap || 0), 0);
    
    return top5.map((crypto, index) => ({
      name: crypto.symbol.toUpperCase(),
      value: Number(((crypto.market_cap || 0) / totalMarketCap * 100).toFixed(1)),
      color: COLORS[index % COLORS.length],
    }));
  }, [prices]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Indicative</h3>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Loading...
          </span>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Indicative</h3>
        <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-medium text-success">
          Live
        </span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
              labelStyle={{ color: "hsl(215, 20%, 65%)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center gap-1">
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[10px] text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;