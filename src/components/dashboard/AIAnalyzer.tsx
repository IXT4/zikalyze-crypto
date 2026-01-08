import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, Zap, Play, RefreshCw, Activity, Copy, Check } from "lucide-react";
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
const CHARS_PER_FRAME = 8; // Characters to add per animation frame
const FRAME_INTERVAL = 10; // Faster interval for snappy feel

const AIAnalyzer = ({ crypto, price, change, high24h, low24h, volume, marketCap }: AIAnalyzerProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [fullAnalysis, setFullAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const charIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const processingSteps = [
    "Connecting to AI...",
    "Fetching data...",
    "Analyzing patterns...",
    "Generating insights..."
  ];

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);

  // Smooth typewriter effect using requestAnimationFrame
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL) {
        if (charIndexRef.current < fullAnalysis.length) {
          const nextIndex = Math.min(charIndexRef.current + CHARS_PER_FRAME, fullAnalysis.length);
          setDisplayedText(fullAnalysis.slice(0, nextIndex));
          charIndexRef.current = nextIndex;
          lastFrameTimeRef.current = timestamp;
          scrollToBottom();
        }
      }
      
      if (charIndexRef.current < fullAnalysis.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (fullAnalysis.length > charIndexRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fullAnalysis, scrollToBottom]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    setDisplayedText("");
    setFullAnalysis("");
    setProcessingStep(0);
    charIndexRef.current = 0;

    const stepInterval = setInterval(() => {
      setProcessingStep(prev => prev < processingSteps.length - 1 ? prev + 1 : prev);
    }, 600);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ crypto, price, change, high24h, low24h, volume, marketCap }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          throw new Error("Rate limit exceeded");
        }
        if (response.status === 402 || response.status === 503) {
          toast.error("Service temporarily unavailable.");
          throw new Error("Service unavailable");
        }
        throw new Error("Failed to start analysis");
      }

      if (!response.body) throw new Error("No response body");

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
              setFullAnalysis(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
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

  const handleCopy = async () => {
    if (!fullAnalysis) return;
    try {
      await navigator.clipboard.writeText(fullAnalysis);
      setCopied(true);
      toast.success("Analysis copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 overflow-hidden relative">
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
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
              isAnalyzing ? "bg-primary/30 animate-pulse" : "bg-primary/20"
            )}>
              <Brain className={cn("h-5 w-5 text-primary", isAnalyzing && "animate-spin")} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">AI Analysis</h3>
              <span className="text-xs text-muted-foreground">95% Accuracy • ICT Signals</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className={cn(
              "h-4 w-4",
              isAnalyzing ? "text-warning animate-pulse" : hasAnalyzed ? "text-success" : "text-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground">
              {isAnalyzing ? "Analyzing..." : hasAnalyzed ? "Done" : "Ready"}
            </span>
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={cn(
            "w-full h-11 mb-4 font-semibold",
            isAnalyzing ? "bg-primary/50" : "bg-gradient-to-r from-primary to-chart-cyan shadow-lg shadow-primary/20"
          )}
        >
          {isAnalyzing ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing {crypto}...</>
          ) : hasAnalyzed ? (
            <><RefreshCw className="h-4 w-4 mr-2" />Re-Analyze {crypto}</>
          ) : (
            <><Play className="h-4 w-4 mr-2" />Analyze {crypto}</>
          )}
        </Button>

        {/* Analysis Output */}
        <div className="relative">
          {hasAnalyzed && fullAnalysis && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-2 right-2 z-10 h-8 w-8 bg-secondary/80 hover:bg-secondary"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        <div ref={scrollContainerRef} className="min-h-[180px] max-h-[350px] overflow-y-auto p-4 rounded-xl bg-background/50 border border-border/50 scroll-smooth">
          {!hasAnalyzed && !isAnalyzing && !displayedText ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <Brain className="h-10 w-10 text-primary/40 mb-3" />
              <p className="text-muted-foreground text-sm">Click to run AI analysis</p>
            </div>
          ) : isAnalyzing && !displayedText ? (
            <div className="space-y-2">
              {processingSteps.map((step, index) => (
                <div key={step} className={cn(
                  "flex items-center gap-2 transition-opacity",
                  index <= processingStep ? "opacity-100" : "opacity-30"
                )}>
                  <div className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-xs",
                    index < processingStep ? "bg-success text-success-foreground" : 
                    index === processingStep ? "bg-primary animate-pulse" : "bg-secondary"
                  )}>
                    {index < processingStep ? "✓" : index === processingStep ? 
                      <Activity className="h-3 w-3 text-primary-foreground" /> : index + 1}
                  </div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-line text-sm text-foreground leading-relaxed font-mono">
              {displayedText}
              {(isAnalyzing || charIndexRef.current < fullAnalysis.length) && (
                <span className="animate-pulse text-primary">▌</span>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyzer;
