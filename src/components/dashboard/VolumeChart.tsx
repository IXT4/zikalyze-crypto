import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { time: "12:41 AM", volume: 320, positive: false },
  { time: "12:55 AM", volume: 520, positive: true },
  { time: "01:07 AM", volume: 280, positive: false },
  { time: "01:26 AM", volume: 380, positive: true },
  { time: "01:31 AM", volume: 420, positive: false },
  { time: "01:55 AM", volume: 573, positive: true },
  { time: "02:11 AM", volume: 490, positive: true },
  { time: "02:20 AM", volume: 610, positive: true },
  { time: "02:47 AM", volume: 550, positive: true },
];

const VolumeChart = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Volume</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="time"
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
              formatter={(value: number) => [`$${value}K`, "Volume"]}
            />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.positive ? "hsl(142, 76%, 46%)" : "hsl(0, 84%, 60%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;
