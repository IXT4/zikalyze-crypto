import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Category A", value: 40, color: "hsl(270, 70%, 55%)" },
  { name: "Category B", value: 30, color: "hsl(217, 91%, 60%)" },
  { name: "Category C", value: 20, color: "hsl(186, 100%, 50%)" },
  { name: "Category D", value: 10, color: "hsl(142, 76%, 46%)" },
];

const DonutChart = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Indicative</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DonutChart;
