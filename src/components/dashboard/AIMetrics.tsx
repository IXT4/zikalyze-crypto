import { Brain, Target } from "lucide-react";
import { useMemo } from "react";

interface AIMetricsProps {
  price?: number;
  change?: number;
  high24h?: number;
  low24h?: number;
  volume?: number;
  marketCap?: number;
}

const AIMetrics = ({ price = 0, change = 0, high24h = 0, low24h = 0, volume = 0, marketCap = 0 }: AIMetricsProps) => {
  const metrics = useMemo(() => {
    // Calculate prediction score based on multiple factors
    const volatility = high24h && low24h && price ? ((high24h - low24h) / price) * 100 : 0;
    const momentum = Math.abs(change);
    const volumeToMarketCap = volume && marketCap ? (volume / marketCap) * 100 : 0;
    
    // Prediction score: weighted combination of factors (0-100 scale)
    const trendStrength = Math.min(100, momentum * 5); // Strong trends = higher score
    const liquidityScore = Math.min(100, volumeToMarketCap * 10);
    const volatilityScore = Math.min(100, volatility * 2);
    
    const predictionScore = (
      (trendStrength * 0.4) + 
      (liquidityScore * 0.35) + 
      (volatilityScore * 0.25)
    );
    
    // Prediction accuracy based on how close price is to mid-range (more predictable)
    const midPrice = (high24h + low24h) / 2;
    const priceDeviation = midPrice ? Math.abs(price - midPrice) / midPrice * 100 : 0;
    const predictionAccuracy = Math.max(0, Math.min(100, 85 - priceDeviation * 2));
    
    // Insights volume based on activity and volatility
    const insightsVolume = Math.round(
      (volumeToMarketCap * 500) + 
      (momentum * 100) + 
      (volatility * 50)
    );
    
    // Insight growth rate
    const insightGrowth = Math.min(25, volatility + momentum * 0.5);

    return [
      {
        label: "Predictions",
        value: predictionScore.toFixed(2),
        subLabel: "Prediction Accuracy",
        subValue: `${predictionAccuracy.toFixed(2)}%`,
        icon: Brain,
        trend: change >= 0 ? "up" : "down",
      },
      {
        label: "Correlations/Insights",
        value: insightsVolume.toLocaleString(),
        subLabel: "Insights Volume",
        subValue: `${insightGrowth.toFixed(2)}%`,
        icon: Target,
        trend: "up",
      },
    ];
  }, [price, change, high24h, low24h, volume, marketCap]);

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
              <span className={metric.trend === "up" ? "text-success" : "text-destructive"}>
                {metric.subValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIMetrics;
