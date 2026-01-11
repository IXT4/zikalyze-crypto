import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";
import { Zap, Activity, TrendingUp, TrendingDown, Clock, Database } from "lucide-react";
import { usePythOHLC, CandleInterval, INTERVAL_LABELS } from "@/hooks/usePythOHLC";

interface CandlestickChartProps {
  crypto?: string;
}

// Custom candlestick shape for the bar chart
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const { open, high, low, close } = payload;
  const isBullish = close >= open;
  const color = isBullish ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)";
  
  // Calculate positions for OHLC visualization
  const candleWidth = Math.max(width * 0.6, 4);
  const wickWidth = 2;
  const centerX = x + width / 2;
  
  // Scale factor for wick (relative to candle body)
  const priceRange = high - low;
  const bodyTop = Math.max(open, close);
  const bodyBottom = Math.min(open, close);
  
  // Calculate heights
  const totalHeight = height;
  const bodyHeight = priceRange > 0 ? ((bodyTop - bodyBottom) / priceRange) * totalHeight : totalHeight;
  const upperWickHeight = priceRange > 0 ? ((high - bodyTop) / priceRange) * totalHeight : 0;
  const lowerWickHeight = priceRange > 0 ? ((bodyBottom - low) / priceRange) * totalHeight : 0;
  
  // Positions
  const bodyY = y + upperWickHeight;
  
  return (
    <g>
      {/* Upper wick */}
      <rect
        x={centerX - wickWidth / 2}
        y={y}
        width={wickWidth}
        height={upperWickHeight}
        fill={color}
      />
      {/* Candle body */}
      <rect
        x={centerX - candleWidth / 2}
        y={bodyY}
        width={candleWidth}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
      {/* Lower wick */}
      <rect
        x={centerX - wickWidth / 2}
        y={bodyY + bodyHeight}
        width={wickWidth}
        height={lowerWickHeight}
        fill={color}
      />
    </g>
  );
};

const CandlestickChart = ({ crypto = "BTC" }: CandlestickChartProps) => {
  const [interval, setInterval] = useState<CandleInterval>("1m");
  
  const {
    candles,
    currentCandle,
    isStreaming,
    isConnected,
    hasPythFeed,
    ticksReceived,
    lastTick,
    hasPersistedData,
  } = usePythOHLC(crypto, interval, 20);

  // Calculate price change
  const priceChange = candles.length >= 2 
    ? ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
    : 0;

  // Prepare chart data with normalized heights
  const chartData = candles.map(candle => {
    const range = candle.high - candle.low;
    return {
      ...candle,
      // Bar height represents the range
      range: range || 0.01,
      bullish: candle.close >= candle.open,
    };
  });

  // Loading state - waiting for Pyth connection (but show cached data if available)
  if (!isConnected && hasPythFeed && !hasPersistedData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">OHLC Candlesticks</h3>
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <Zap className="h-3 w-3" />
              Connecting...
            </span>
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-muted-foreground">Connecting to Pyth Network...</span>
        </div>
      </div>
    );
  }

  // No Pyth feed available
  if (!hasPythFeed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">OHLC Candlesticks</h3>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            No Oracle Feed
          </span>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Activity className="h-8 w-8 opacity-50" />
          <span className="text-sm">{crypto} not available on Pyth Network</span>
        </div>
      </div>
    );
  }

  // Building candles from ticks
  if (isStreaming && candles.length === 0) {
    // Calculate time remaining for longer intervals
    const getTimeRemaining = () => {
      if (interval === "1h") return "~1 hour";
      if (interval === "4h") return "~4 hours";
      if (interval === "1d") return "~24 hours";
      return null;
    };
    const timeNote = getTimeRemaining();
    
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">OHLC Candlesticks</h3>
            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 animate-pulse">
              <Zap className="h-3 w-3" />
              Building {INTERVAL_LABELS[interval]}...
            </span>
          </div>
          <div className="flex gap-0.5">
            {(["1m", "5m", "15m", "1h", "4h", "1d"] as CandleInterval[]).map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
                  interval === int
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">Building {INTERVAL_LABELS[interval]} candles from Pyth Oracle...</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {ticksReceived} tick{ticksReceived !== 1 ? 's' : ''} received • Last: ${lastTick?.toLocaleString() ?? '-'}
          </span>
          {timeNote && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400/80">
              <Clock className="h-3 w-3" />
              First candle completes in {timeNote}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">OHLC Candlesticks</h3>
          {isStreaming ? (
            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              <Zap className="h-3 w-3" />
              Pyth Oracle
            </span>
          ) : hasPersistedData ? (
            <span className="flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              <Database className="h-3 w-3" />
              Cached
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <Zap className="h-3 w-3" />
              Connecting...
            </span>
          )}
          {priceChange !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {priceChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {ticksReceived} ticks{hasPersistedData && !isStreaming ? ' (saved)' : ''}
          </span>
          <div className="flex gap-0.5">
            {(["1m", "5m", "15m", "1h", "4h", "1d"] as CandleInterval[]).map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
                  interval === int
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                title={INTERVAL_LABELS[int]}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Current candle info */}
      {currentCandle && (
        <div className="mb-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>O: <span className="text-foreground">${currentCandle.open.toLocaleString()}</span></span>
          <span>H: <span className="text-emerald-400">${currentCandle.high.toLocaleString()}</span></span>
          <span>L: <span className="text-red-400">${currentCandle.low.toLocaleString()}</span></span>
          <span>C: <span className={currentCandle.close >= currentCandle.open ? 'text-emerald-400' : 'text-red-400'}>
            ${currentCandle.close.toLocaleString()}
          </span></span>
        </div>
      )}
      
      <div className="h-48">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['dataMin', 'dataMax']}
                hide 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                  fontSize: "11px",
                }}
                formatter={(value: number, name: string, props: any) => {
                  const { payload } = props;
                  if (!payload) return [value, name];
                  return null;
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  const isBullish = data.close >= data.open;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg">
                      <div className="font-medium text-foreground mb-1">{data.time}</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <span className="text-muted-foreground">Open:</span>
                        <span className="text-foreground">${data.open.toLocaleString()}</span>
                        <span className="text-muted-foreground">High:</span>
                        <span className="text-emerald-400">${data.high.toLocaleString()}</span>
                        <span className="text-muted-foreground">Low:</span>
                        <span className="text-red-400">${data.low.toLocaleString()}</span>
                        <span className="text-muted-foreground">Close:</span>
                        <span className={isBullish ? 'text-emerald-400' : 'text-red-400'}>
                          ${data.close.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-border text-muted-foreground">
                        {data.tickCount} tick{data.tickCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="range"
                shape={<CandlestickShape />}
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
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Waiting for oracle data...
          </div>
        )}
      </div>
    </div>
  );
};

export default CandlestickChart;