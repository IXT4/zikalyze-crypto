import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { date: "Jan", open: 4200, close: 4350, high: 4400, low: 4150, volume: 320, bullish: true },
  { date: "Feb", open: 4350, close: 4250, high: 4450, low: 4200, volume: 280, bullish: false },
  { date: "Mar", open: 4250, close: 4500, high: 4550, low: 4200, volume: 450, bullish: true },
  { date: "Apr", open: 4500, close: 4400, high: 4600, low: 4350, volume: 380, bullish: false },
  { date: "May", open: 4400, close: 4550, high: 4600, low: 4380, volume: 420, bullish: true },
  { date: "Jun", open: 4550, close: 4300, high: 4580, low: 4250, volume: 350, bullish: false },
  { date: "Jul", open: 4300, close: 4200, high: 4350, low: 4100, volume: 290, bullish: false },
  { date: "Aug", open: 4200, close: 4450, high: 4500, low: 4180, volume: 480, bullish: true },
  { date: "Sep", open: 4450, close: 4600, high: 4650, low: 4400, volume: 520, bullish: true },
  { date: "Oct", open: 4600, close: 4550, high: 4700, low: 4500, volume: 360, bullish: false },
];

const CandlestickChart = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Candlesticks</h3>
        <div className="flex gap-2">
          <button className="rounded-lg bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Detailed
          </button>
          <button className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground">
            Optimized
          </button>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <YAxis
              domain={["dataMin - 100", "dataMax + 100"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(222, 47%, 18%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
            />
            <Bar dataKey="close" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
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
