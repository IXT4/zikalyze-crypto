import { useState, useEffect, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, Zap, BarChart3, Target, Activity, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AIAnalyzerProps {
  crypto: string;
  price: number;
  change: number;
}

const useTypewriter = (text: string, speed: number = 40) => {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayText("");
      setIsComplete(false);
      return;
    }
    
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
  const rsi = 50 + change * 3;
  const macdSignal = change >= 0 ? "bullish crossover" : "bearish crossover";
  const volumeProfile = Math.abs(change) > 3 ? "high" : "moderate";
  
  const analyses = {
    bullish: {
      strong: `🚀 STRONG BULLISH SIGNAL DETECTED for ${crypto}

📊 Technical Analysis:
• RSI: ${rsi.toFixed(1)} (Overbought territory - momentum strong)
• MACD: ${macdSignal} confirmed
• Volume Profile: ${volumeProfile.toUpperCase()} buying pressure

💰 Smart Money Flow:
Institutional accumulation detected at $${(price * 0.97).toFixed(2)}. Large wallet addresses increasing holdings by 12.5% in last 24h.

🎯 ICT Analysis:
• Order Block: Strong support at $${(price * 0.95).toFixed(2)}
• Fair Value Gap: Filled - continuation likely
• Liquidity Pool: Cleared below $${(price * 0.93).toFixed(2)}

📈 Price Targets:
• TP1: $${(price * 1.05).toFixed(2)} (+5%)
• TP2: $${(price * 1.12).toFixed(2)} (+12%)
• Stop Loss: $${(price * 0.94).toFixed(2)} (-6%)

⚡ Signal Strength: ${(85 + Math.random() * 10).toFixed(0)}%
Risk/Reward Ratio: 1:3.2 - FAVORABLE`,

      moderate: `📈 MODERATE BULLISH TREND for ${crypto}

📊 Technical Analysis:
• RSI: ${rsi.toFixed(1)} (Neutral-Bullish zone)
• MACD: Positive momentum building
• Volume: ${volumeProfile} - accumulation phase

💰 Smart Money Indicators:
Order blocks forming at $${(price * 0.97).toFixed(2)}. Whale activity shows net positive inflow.

🎯 ICT Confluence:
• Premium/Discount: Trading in discount zone
• Breaker Block: Bullish confirmation pending
• Optimal Trade Entry: Near $${(price * 0.985).toFixed(2)}

📈 Price Levels:
• Resistance: $${(price * 1.04).toFixed(2)}
• Support: $${(price * 0.96).toFixed(2)}

⚡ Confidence: ${(70 + Math.random() * 15).toFixed(0)}%`,

      weak: `📊 CAUTIOUS BULLISH OUTLOOK for ${crypto}

📊 Technical Overview:
• RSI: ${rsi.toFixed(1)} (Neutral)
• Trend: Slight upward bias within range
• Volume: Below average - consolidation

🔍 Market Structure:
Price ranging between $${(price * 0.97).toFixed(2)} - $${(price * 1.03).toFixed(2)}. Awaiting breakout confirmation.

💡 Recommendation:
Wait for clearer signals. Set alerts at key levels.

⚡ Signal Strength: ${(55 + Math.random() * 15).toFixed(0)}%`,
    },
    bearish: {
      strong: `🔴 STRONG BEARISH SIGNAL for ${crypto}

📊 Technical Analysis:
• RSI: ${rsi.toFixed(1)} (Oversold territory)
• MACD: ${macdSignal} - strong selling
• Volume Profile: ${volumeProfile.toUpperCase()} distribution

💰 Smart Money Flow:
Institutional distribution detected. Large wallets reducing exposure by 8.3% in 24h.

🎯 ICT Analysis:
• Order Block: Resistance at $${(price * 1.03).toFixed(2)}
• Fair Value Gap: Created - may act as resistance
• Liquidity Grab: Executed above $${(price * 1.02).toFixed(2)}

📉 Price Targets:
• TP1: $${(price * 0.95).toFixed(2)} (-5%)
• TP2: $${(price * 0.90).toFixed(2)} (-10%)
• Stop Loss: $${(price * 1.04).toFixed(2)} (+4%)

⚠️ Risk Level: HIGH
Consider hedging existing positions`,

      moderate: `📉 MODERATE BEARISH PRESSURE on ${crypto}

📊 Technical Analysis:
• RSI: ${rsi.toFixed(1)} (Approaching oversold)
• Momentum: Negative but stabilizing
• Volume: Distribution pattern forming

💰 Smart Money Concepts:
Liquidity sweep below $${(price * 0.98).toFixed(2)} completed. Watch for potential reversal signals.

🎯 Key Levels:
• Immediate Resistance: $${(price * 1.02).toFixed(2)}
• Support Zone: $${(price * 0.95).toFixed(2)} - $${(price * 0.97).toFixed(2)}

📊 Confidence: ${(65 + Math.random() * 15).toFixed(0)}%`,

      weak: `⚠️ SLIGHT BEARISH BIAS for ${crypto}

📊 Overview:
Minor pullback of ${change.toFixed(2)}% within broader structure. May represent healthy retracement.

🔍 Watch For:
• Bullish divergence on RSI
• Volume climax at support
• Break above $${(price * 1.015).toFixed(2)}

💡 Action: Monitor, don't panic sell

⚡ Signal Strength: ${(50 + Math.random() * 15).toFixed(0)}%`,
    },
  };

  return analyses[trend][strength];
};

const AIAnalyzer = ({ crypto, price, change }: AIAnalyzerProps) => {
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const processingSteps = [
    "Scanning market data...",
    "Analyzing smart money flow...",
    "Processing ICT patterns...",
    "Calculating entry points...",
    "Generating report..."
  ];

  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    setAnalysis("");
    setProcessingStep(0);

    // Simulate step-by-step processing
    const stepInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev < processingSteps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 600);

    // Generate analysis after processing
    const timeout = setTimeout(() => {
      const newAnalysis = generateAnalysis(crypto, price, change);
      setAnalysis(newAnalysis);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      clearInterval(stepInterval);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearInterval(stepInterval);
    };
  }, [crypto, price, change]);

  const { displayText, isComplete } = useTypewriter(analysis, 40);

  const sentiment = change >= 0 ? "bullish" : "bearish";
  const confidence = Math.min(95, 60 + Math.abs(change) * 5);
  const rsi = 50 + change * 3;
  const momentum = change >= 0 ? "Positive" : "Negative";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 overflow-hidden relative">
      {/* Animated background gradient */}
      <div className={cn(
        "absolute inset-0 opacity-10 transition-opacity duration-1000",
        isAnalyzing && "opacity-20"
      )}>
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br",
          sentiment === "bullish" ? "from-success/20 to-transparent" : "from-destructive/20 to-transparent"
        )} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500",
              isAnalyzing ? "bg-primary/30 animate-pulse" : "bg-primary/20"
            )}>
              <Brain className={cn(
                "h-6 w-6 text-primary transition-transform duration-500",
                isAnalyzing && "animate-spin"
              )} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Zikalyze AI</h3>
              <span className="text-xs text-muted-foreground">Advanced Market Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className={cn(
                "h-4 w-4 transition-colors",
                isAnalyzing ? "text-warning animate-pulse" : hasAnalyzed ? "text-success" : "text-muted-foreground"
              )} />
              <span className="text-xs text-muted-foreground">
                {isAnalyzing ? "Processing..." : hasAnalyzed ? "Complete" : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="mb-4">
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300",
              isAnalyzing 
                ? "bg-primary/50" 
                : "bg-gradient-to-r from-primary to-chart-cyan hover:from-primary/90 hover:to-chart-cyan/90 shadow-lg shadow-primary/20"
            )}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Analyzing {crypto}...</span>
              </div>
            ) : hasAnalyzed ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                <span>Re-Analyze {crypto}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                <span>Analyze {crypto} Now</span>
              </div>
            )}
          </Button>
        </div>

        {/* Live Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <div className="text-[10px] text-muted-foreground">Price</div>
            <div className="text-sm font-bold text-foreground">${price.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <div className="text-[10px] text-muted-foreground">24h</div>
            <div className={cn(
              "text-sm font-bold",
              change >= 0 ? "text-success" : "text-destructive"
            )}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <div className="text-[10px] text-muted-foreground">RSI</div>
            <div className={cn(
              "text-sm font-bold",
              rsi > 70 ? "text-destructive" : rsi < 30 ? "text-success" : "text-foreground"
            )}>
              {rsi.toFixed(0)}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <div className="text-[10px] text-muted-foreground">Momentum</div>
            <div className={cn(
              "text-sm font-bold",
              change >= 0 ? "text-success" : "text-destructive"
            )}>
              {momentum}
            </div>
          </div>
        </div>

        {/* Processing Steps or Analysis Output */}
        <div className="min-h-[200px] p-4 rounded-xl bg-background/50 border border-border/50 overflow-hidden">
          {!hasAnalyzed && !isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                Click the button above to run AI analysis
              </p>
              <p className="text-muted-foreground/60 text-xs">
                Powered by ICT & Smart Money Concepts
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="space-y-3">
              {processingSteps.map((step, index) => (
                <div 
                  key={step}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-300",
                    index <= processingStep ? "opacity-100" : "opacity-30"
                  )}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                    index < processingStep ? "bg-success" : index === processingStep ? "bg-primary animate-pulse" : "bg-secondary"
                  )}>
                    {index < processingStep ? (
                      <span className="text-xs text-success-foreground">✓</span>
                    ) : index === processingStep ? (
                      <Activity className="h-3 w-3 text-primary-foreground animate-pulse" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm transition-colors",
                    index <= processingStep ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
              {displayText}
              {!isComplete && <span className="animate-pulse text-primary">|</span>}
            </div>
          )}
        </div>

        {/* Bottom Indicators */}
        {hasAnalyzed && (
          <div className="grid grid-cols-4 gap-2 mt-4 animate-fade-in">
            <div className="p-3 rounded-lg bg-secondary/30 text-center border border-border/30">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-chart-cyan" />
              <div className="text-[10px] text-muted-foreground mb-0.5">ICT Signal</div>
              <div className={cn(
                "text-sm font-bold",
                change >= 0 ? "text-success" : "text-destructive"
              )}>
                {change >= 0 ? "LONG" : "SHORT"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-center border border-border/30">
              <Activity className="h-4 w-4 mx-auto mb-1 text-primary" />
              <div className="text-[10px] text-muted-foreground mb-0.5">VWAP</div>
              <div className={cn(
                "text-sm font-bold",
                change >= 0 ? "text-success" : "text-warning"
              )}>
                {change >= 0 ? "Above" : "Below"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-center border border-border/30">
              <Target className="h-4 w-4 mx-auto mb-1 text-warning" />
              <div className="text-[10px] text-muted-foreground mb-0.5">Smart Money</div>
              <div className={cn(
                "text-sm font-bold",
                Math.abs(change) > 3 ? (change >= 0 ? "text-success" : "text-destructive") : "text-warning"
              )}>
                {Math.abs(change) > 3 ? (change >= 0 ? "Buy" : "Sell") : "Hold"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-center border border-border/30">
              <Zap className="h-4 w-4 mx-auto mb-1 text-success" />
              <div className="text-[10px] text-muted-foreground mb-0.5">Confidence</div>
              <div className="text-sm font-bold text-foreground">
                {confidence.toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalyzer;