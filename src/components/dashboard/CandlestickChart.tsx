import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMemo, useState } from "react";

interface CandlestickChartProps {
  crypto?: string;
}

const CandlestickChart = ({ crypto = "BTC" }: CandlestickChartProps) => {
  const { prices, loading, getPriceBySymbol } = useCryptoPrices();
  const [viewMode, setViewMode] = useState<"indicator" | "dashboard">("dashboard");

  const chartData = useMemo(() => {
    if (prices.length === 0) return [];

    // Get top 10 cryptos by market cap for candlestick visualization
    const topCryptos = [...prices]
      .filter(p => p.market_cap && p.current_price)
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 10);

    return topCryptos.map((coin) => {
      const change = coin.price_change_percentage_24h || 0;
      const isBullish = change >= 0;
      
      return {
        name: coin.symbol.toUpperCase(),
        open: coin.low_24h || coin.current_price * 0.97,
        close: coin.current_price,
        high: coin.high_24h || coin.current_price * 1.02,
        low: coin.low_24h || coin.current_price * 0.97,
        bullish: isBullish,
        change: change,
      };
    });
  }, [prices]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Candlesticks</h3>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Loading...
          </span>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Candlesticks</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode("indicator")}
            className={`rounded-lg px-3 py-1 text-xs transition-colors ${
              viewMode === "indicator" 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Indicator
          </button>
          <button 
            onClick={() => setViewMode("dashboard")}
            className={`rounded-lg px-3 py-1 text-xs transition-colors ${
              viewMode === "dashboard" 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              formatter={(value: number, name: string) => {
                if (name === "close") return [`$${value.toLocaleString()}`, "Price"];
                return [value, name];
              }}
              labelStyle={{ color: "hsl(215, 20%, 65%)" }}
            />
            <Bar 
              dataKey="close" 
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.bullish ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CandlestickChart;