import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface PriceDataPoint {
  time: string;
  price: number;
  timestamp: number;
}

interface PriceChartProps {
  crypto: string;
}

const MAX_DATA_POINTS = 20;

const PriceChart = ({ crypto }: PriceChartProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const { getPriceBySymbol, loading } = useCryptoPrices();
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const currentData = getPriceBySymbol(crypto);
  const currentPrice = currentData?.current_price || 0;
  const priceChange = currentData?.price_change_percentage_24h || 0;

  // Reset price history when crypto changes
  useEffect(() => {
    setPriceHistory([]);
    lastPriceRef.current = null;
    lastUpdateRef.current = 0;
  }, [crypto]);

  // Add new price point when price updates
  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;
    
    const now = Date.now();
    // Only add new point if price changed and at least 3 seconds passed
    if (
      currentPrice !== lastPriceRef.current && 
      now - lastUpdateRef.current > 3000
    ) {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      setPriceHistory(prev => {
        const newPoint: PriceDataPoint = {
          time: timeStr,
          price: currentPrice,
          timestamp: now
        };

        // Keep only last MAX_DATA_POINTS
        const updated = [...prev, newPoint];
        return updated.slice(-MAX_DATA_POINTS);
      });

      lastPriceRef.current = currentPrice;
      lastUpdateRef.current = now;
    }
  }, [currentPrice]);

  // Calculate min/max for Y-axis domain
  const prices = priceHistory.map(p => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : currentPrice * 0.99;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice * 1.01;
  const padding = (maxPrice - minPrice) * 0.1 || currentPrice * 0.005;

  // Format price for display
  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  const isPositive = priceChange >= 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
          <span className="text-xs text-muted-foreground">
            {crypto}/USD
          </span>
          {loading && (
            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          )}
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-medium ${
          isPositive 
            ? "bg-success/20 text-success" 
            : "bg-destructive/20 text-destructive"
        }`}>
          {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
        </span>
      </div>

      {/* Current Price Display */}
      <div className="mb-4">
        <span className="text-2xl font-bold text-foreground">
          {formatPrice(currentPrice)}
        </span>
      </div>

      <div className="h-64">
        {priceHistory.length < 2 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <div className="animate-pulse mb-2">Collecting live data...</div>
              <div className="text-xs">Chart will appear as prices update</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceHistory}>
              <defs>
                <linearGradient id={`priceGradient-${crypto}`} x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="0%" 
                    stopColor={isPositive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"} 
                    stopOpacity={0.3} 
                  />
                  <stop 
                    offset="100%" 
                    stopColor={isPositive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"} 
                    stopOpacity={0} 
                  />
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
                tickFormatter={formatPrice}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 8%)",
                  border: "1px solid hsl(222, 47%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 98%)",
                }}
                formatter={(value: number) => [formatPrice(value), "Price"]}
                labelStyle={{ color: "hsl(215, 20%, 65%)" }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
                strokeWidth={2}
                fill={`url(#priceGradient-${crypto})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
