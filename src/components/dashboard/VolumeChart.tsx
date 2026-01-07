import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface VolumeDataPoint {
  time: string;
  volume: number;
  positive: boolean;
  timestamp: number;
}

interface VolumeChartProps {
  crypto?: string;
}

const MAX_DATA_POINTS = 12;

const VolumeChart = ({ crypto = "BTC" }: VolumeChartProps) => {
  const [volumeHistory, setVolumeHistory] = useState<VolumeDataPoint[]>([]);
  const { getPriceBySymbol } = useCryptoPrices();
  const lastVolumeRef = useRef<number | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const currentData = getPriceBySymbol(crypto);
  const currentVolume = currentData?.total_volume || 0;
  const currentPrice = currentData?.current_price || 0;

  // Reset volume history when crypto changes
  useEffect(() => {
    setVolumeHistory([]);
    lastVolumeRef.current = null;
    lastPriceRef.current = null;
    lastUpdateRef.current = 0;
  }, [crypto]);

  // Add new volume point when data updates
  useEffect(() => {
    if (!currentVolume || currentVolume === 0) return;
    
    const now = Date.now();
    // Only add new point if volume changed and at least 5 seconds passed
    if (
      currentVolume !== lastVolumeRef.current && 
      now - lastUpdateRef.current > 5000
    ) {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Determine if price went up (positive/green) or down (negative/red)
      const isPositive = lastPriceRef.current !== null 
        ? currentPrice >= lastPriceRef.current 
        : true;

      // Calculate volume delta in millions for display
      const volumeInMillions = currentVolume / 1e6;

      setVolumeHistory(prev => {
        const newPoint: VolumeDataPoint = {
          time: timeStr,
          volume: Math.round(volumeInMillions),
          positive: isPositive,
          timestamp: now
        };

        // Keep only last MAX_DATA_POINTS
        const updated = [...prev, newPoint];
        return updated.slice(-MAX_DATA_POINTS);
      });

      lastVolumeRef.current = currentVolume;
      lastPriceRef.current = currentPrice;
      lastUpdateRef.current = now;
    }
  }, [currentVolume, currentPrice]);

  // Format volume for tooltip
  const formatVolume = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Volume</h3>
        <span className="text-xs text-muted-foreground">
          24h: {formatVolume(currentVolume / 1e6)}
        </span>
      </div>
      <div className="h-32">
        {volumeHistory.length < 2 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <div className="animate-pulse">Collecting volume data...</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeHistory}>
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
                {volumeHistory.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.positive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default VolumeChart;
