import { Brain, TrendingUp, Target, Zap } from "lucide-react";

const metrics = [
  {
    label: "Predictions",
    value: "44.28",
    subLabel: "Prediction Accuracy",
    subValue: "2.13%",
    icon: Brain,
    trend: "up",
  },
  {
    label: "Correlations/Insights",
    value: "2,595",
    subLabel: "Insights Volume",
    subValue: "4.10%",
    icon: Target,
    trend: "up",
  },
];

const AIMetrics = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">AI Generated</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <metric.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{metric.label}</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{metric.value}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{metric.subLabel}</span>
              <span className="text-success">{metric.subValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIMetrics;
