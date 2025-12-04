import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "1", value: 30 },
  { name: "2", value: 50 },
  { name: "3", value: 40 },
  { name: "4", value: 70 },
  { name: "5", value: 60 },
  { name: "6", value: 80 },
  { name: "7", value: 45 },
  { name: "8", value: 55 },
];

const SmartMoneyCard = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Smart Money</h3>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis hide />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index % 2 === 0 ? "hsl(270, 70%, 55%)" : "hsl(217, 91%, 60%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SmartMoneyCard;
