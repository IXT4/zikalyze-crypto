import { Brain, TrendingUp } from "lucide-react";
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
    // Calculate volatility as percentage of price range
    const priceRange = high24h - low24h;
    const volatility = price > 0 ? (priceRange / price) * 100 : 0;
    
    // Position within 24h range (0 = at low, 100 = at high)
    const rangePosition = priceRange > 0 ? ((price - low24h) / priceRange) * 100 : 50;
    
    // Volume to market cap ratio (liquidity indicator)
    const volumeRatio = marketCap > 0 ? (volume / marketCap) * 100 : 0;
    
    // RSI-like indicator based on current position and change
    const momentumStrength = Math.abs(change);
    const isBullish = change >= 0;
    
    // Prediction score: combines trend strength, volatility, and market activity
    // Higher scores indicate stronger trading signals
    const trendScore = Math.min(50, momentumStrength * 8);
    const activityScore = Math.min(30, volumeRatio * 15);
    const positionScore = isBullish ? (rangePosition / 100) * 20 : ((100 - rangePosition) / 100) * 20;
    
    const predictions = trendScore + activityScore + positionScore;
    
    // Confidence: based on consistency of signals
    // Higher when price action aligns with volume and position
    const signalAlignment = isBullish && rangePosition > 50 ? 1.2 : 
                           !isBullish && rangePosition < 50 ? 1.2 : 0.8;
    const baseConfidence = 1500 + (volumeRatio * 200) + (momentumStrength * 80);
    const confidence = Math.round(baseConfidence * signalAlignment);
    
    // Change percentages based on real-time momentum
    const predictionChange = Math.abs(change * 0.42).toFixed(2);
    const confidenceChange = Math.abs(volumeRatio * 2 + momentumStrength * 0.5).toFixed(2);

    return {
      predictions: predictions.toFixed(2),
      predictionChange,
      confidence: confidence.toLocaleString(),
      confidenceChange,
      predictionTrend: isBullish ? "up" : "down",
      confidenceTrend: volumeRatio > 0.5 ? "up" : "down",
    };
  }, [price, change, high24h, low24h, volume, marketCap]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">AI Generated</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Brain className="h-4 w-4 text-primary" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Predictions */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Predictions</span>
          <div className="text-3xl font-bold text-foreground">{metrics.predictions}</div>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-3 w-3 ${metrics.predictionTrend === "up" ? "text-success" : "text-destructive rotate-180"}`} />
            <span className={`text-sm ${metrics.predictionTrend === "up" ? "text-success" : "text-destructive"}`}>
              {metrics.predictionChange}%
            </span>
          </div>
        </div>
        
        {/* Confidence */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <div className="text-3xl font-bold text-success">{metrics.confidence}</div>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-3 w-3 ${metrics.confidenceTrend === "up" ? "text-success" : "text-destructive rotate-180"}`} />
            <span className={`text-sm ${metrics.confidenceTrend === "up" ? "text-success" : "text-destructive"}`}>
              {metrics.confidenceChange}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMetrics;
