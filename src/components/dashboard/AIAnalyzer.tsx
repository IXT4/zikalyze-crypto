import { useState, useEffect } from "react";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAnalyzerProps {
  crypto: string;
  price: number;
  change: number;
}

const useTypewriter = (text: string, speed: number = 40) => {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayText, isComplete };
};

const generateAnalysis = (crypto: string, price: number, change: number) => {
  const trend = change >= 0 ? "bullish" : "bearish";
  const strength = Math.abs(change) > 5 ? "strong" : Math.abs(change) > 2 ? "moderate" : "weak";
  
  const analyses = {
    bullish: {
      strong: `🚀 STRONG BULLISH SIGNAL DETECTED for ${crypto}. Smart money flow indicates institutional accumulation at current levels. ICT analysis shows price breaking above key liquidity zones with +${change.toFixed(2)}% momentum. VWAP deviation suggests continuation potential. Recommended: Consider long positions with tight stop-loss below recent swing low. Risk/Reward ratio favorable at 1:3.`,
      moderate: `📈 MODERATE BULLISH TREND for ${crypto}. Market structure remains constructive with +${change.toFixed(2)}% gain. Smart money concepts indicate fair value gap fill in progress. Order blocks suggest support building at $${(price * 0.95).toFixed(2)}. VWAP analysis shows price trading above institutional averages. Watch for breakout confirmation above $${(price * 1.02).toFixed(2)}.`,
      weak: `📊 CAUTIOUS BULLISH OUTLOOK for ${crypto}. Price showing minor strength at +${change.toFixed(2)}%. ICT methodology indicates ranging market with slight upward bias. Liquidity pools forming both above and below current price. Smart money flow neutral to slightly positive. Recommended: Wait for clearer directional signals before entering positions.`,
    },
    bearish: {
      strong: `🔴 STRONG BEARISH SIGNAL for ${crypto}. Significant selling pressure detected with ${change.toFixed(2)}% decline. Smart money distribution pattern confirmed. ICT analysis reveals price breaking below key order blocks. VWAP indicates institutional selling. High probability of continuation to $${(price * 0.92).toFixed(2)} support. Consider hedging or reducing exposure.`,
      moderate: `📉 MODERATE BEARISH PRESSURE on ${crypto}. Market showing weakness at ${change.toFixed(2)}%. Smart money concepts indicate liquidity grab below recent lows. Fair value gaps forming overhead may act as resistance. VWAP deviation suggests mean reversion potential. Key support at $${(price * 0.97).toFixed(2)}. Caution advised for new long positions.`,
      weak: `⚠️ SLIGHT BEARISH BIAS for ${crypto}. Minor pullback of ${change.toFixed(2)}% detected. ICT analysis shows consolidation within higher timeframe structure. Smart money flow inconclusive. This may represent healthy retracement rather than trend reversal. Monitor for bullish divergence signals. Key level to watch: $${(price * 0.98).toFixed(2)}.`,
    },
  };

  return analyses[trend][strength];
};

const AIAnalyzer = ({ crypto, price, change }: AIAnalyzerProps) => {
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setIsAnalyzing(true);
    const newAnalysis = generateAnalysis(crypto, price, change);
    
    // Simulate AI processing delay
    const timeout = setTimeout(() => {
      setAnalysis(newAnalysis);
      setIsAnalyzing(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [crypto, price, change]);

  const { displayText, isComplete } = useTypewriter(analysis, 40); // Speed 2.5 = ~40ms per character

  const sentiment = change >= 0 ? "bullish" : "bearish";
  const confidence = Math.min(95, 60 + Math.abs(change) * 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI Analyzer</h3>
            <span className="text-xs text-muted-foreground">Hybrid ICT & Smart Money Analysis</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className={cn("h-4 w-4", isAnalyzing ? "text-warning animate-pulse" : "text-success")} />
          <span className="text-xs text-muted-foreground">
            {isAnalyzing ? "Analyzing..." : "Live"}
          </span>
        </div>
      </div>

      {/* Sentiment Indicator */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-secondary/50">
        <div className="flex items-center gap-2">
          {sentiment === "bullish" ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          <span className={cn(
            "font-semibold capitalize",
            sentiment === "bullish" ? "text-success" : "text-destructive"
          )}>
            {sentiment}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="text-foreground font-medium">{confidence.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                sentiment === "bullish" ? "bg-success" : "bg-destructive"
              )}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Analysis Output */}
      <div className="min-h-[150px] p-4 rounded-xl bg-background/50 border border-border/50">
        {isAnalyzing ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm">Processing market data...</span>
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed">
            {displayText}
            {!isComplete && <span className="animate-pulse">|</span>}
          </p>
        )}
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="p-3 rounded-lg bg-secondary/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">ICT Signal</div>
          <div className={cn(
            "text-sm font-semibold",
            change >= 0 ? "text-success" : "text-destructive"
          )}>
            {change >= 0 ? "BUY" : "SELL"}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">VWAP</div>
          <div className={cn(
            "text-sm font-semibold",
            change >= 0 ? "text-success" : "text-warning"
          )}>
            {change >= 0 ? "Above" : "Below"}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 text-center">
          <div className="text-xs text-muted-foreground mb-1">Smart Money</div>
          <div className={cn(
            "text-sm font-semibold",
            Math.abs(change) > 3 ? (change >= 0 ? "text-success" : "text-destructive") : "text-warning"
          )}>
            {Math.abs(change) > 3 ? (change >= 0 ? "Accumulate" : "Distribute") : "Neutral"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyzer;
