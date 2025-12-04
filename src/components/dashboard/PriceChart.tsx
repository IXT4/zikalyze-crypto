import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { time: "12:27 AM", price: 2820.54, volume: 450 },
  { time: "12:41 AM", price: 2812.54, volume: 320 },
  { time: "12:55 AM", price: 2825.23, volume: 520 },
  { time: "01:07 AM", price: 2828.54, volume: 280 },
  { time: "01:26 AM", price: 2826.12, volume: 380 },
  { time: "01:31 AM", price: 2827.89, volume: 420 },
  { time: "01:55 AM", price: 2824.21, volume: 573 },
  { time: "02:11 AM", price: 2830.45, volume: 490 },
  { time: "02:20 AM", price: 2838.67, volume: 610 },
  { time: "02:47 AM", price: 2843.65, volume: 550 },
];

interface PriceChartProps {
  crypto: string;
}

const PriceChart = ({ crypto }: PriceChartProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Price Chart</h3>
        <span className="rounded-lg bg-success/20 px-2 py-1 text-xs font-medium text-success">
          +0.76%
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis
              domain={["dataMin - 10", "dataMax + 10"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(142, 76%, 46%)"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;
