import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Annul", value: 80 },
  { name: "Equation", value: 60 },
  { name: "Discrepancies", value: 90 },
  { name: "Instables", value: 45 },
  { name: "Transfuse", value: 75 },
  { name: "Radiant", value: 55 },
];

const colors = [
  "hsl(270, 70%, 55%)",
  "hsl(217, 91%, 60%)",
  "hsl(186, 100%, 50%)",
  "hsl(142, 76%, 46%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

const PredictiveChart = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Predictive</h3>
        <span className="text-xs text-muted-foreground">Development</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 10 }}
              width={80}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictiveChart;
