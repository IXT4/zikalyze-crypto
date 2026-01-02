import { useState, useEffect, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, Zap, BarChart3, Target, Activity, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AIAnalyzerProps {
  crypto: string;
  price: number;
  change: number;
  high24h?: number;
  low24h?: number;
  volume?: number;
  marketCap?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analyze`;

const AIAnalyzer = ({ crypto, price, change, high24h, low24h, volume, marketCap }: AIAnalyzerProps) => {
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const processingSteps = [
    "Connecting to AI engine...",
    "Fetching market data...",
    "Analyzing smart money flow...",
    "Processing ICT patterns...",
    "Generating analysis..."
  ];

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    setAnalysis("");
    setProcessingStep(0);

    // Simulate step-by-step processing for visual feedback
    const stepInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev < processingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 500);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          crypto, 
          price, 
          change,
          high24h,
          low24h,
          volume,
          marketCap
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          throw new Error("Rate limit exceeded");
        }
        if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
          throw new Error("Payment required");
        }
        throw new Error("Failed to start analysis");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      clearInterval(stepInterval);
      setProcessingStep(processingSteps.length - 1);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setHasAnalyzed(true);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to generate analysis. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  }, [crypto, price, change, high24h, low24h, volume, marketCap]);

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
              <span className="text-xs text-muted-foreground">Powered by Real AI Analysis</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className={cn(
                "h-4 w-4 transition-colors",
                isAnalyzing ? "text-warning animate-pulse" : hasAnalyzed ? "text-success" : "text-muted-foreground"
              )} />
              <span className="text-xs text-muted-foreground">
                {isAnalyzing ? "Analyzing..." : hasAnalyzed ? "Complete" : "Ready"}
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
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 rounded-xl bg-background/50 border border-border/50">
          {!hasAnalyzed && !isAnalyzing && !analysis ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                Click the button above to run AI analysis
              </p>
              <p className="text-muted-foreground/60 text-xs">
                Powered by Advanced AI • ICT & Smart Money Concepts
              </p>
            </div>
          ) : isAnalyzing && !analysis ? (
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
              {analysis}
              {isAnalyzing && <span className="animate-pulse text-primary">▌</span>}
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
