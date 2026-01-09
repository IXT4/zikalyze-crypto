import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Zap, Play, RefreshCw, Activity, Copy, Check, History, ChevronDown, Clock, Trash2, X, ThumbsUp, ThumbsDown, TrendingUp, Award, Radio, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAnalysisHistory, AnalysisRecord } from "@/hooks/useAnalysisHistory";
import { useBinanceLivePrice } from "@/hooks/useBinanceLivePrice";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
const CHARS_PER_FRAME = 12; // Much faster rendering
const FRAME_INTERVAL = 8; // 120fps smooth

const AIAnalyzer = ({ crypto, price, change, high24h, low24h, volume, marketCap }: AIAnalyzerProps) => {
  const { t, i18n } = useTranslation();
  const [displayedText, setDisplayedText] = useState("");
  const [fullAnalysis, setFullAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisRecord | null>(null);
  const charIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Binance live price feed
  const livePrice = useBinanceLivePrice(crypto, price);
  
  // Use live data when available, fallback to props
  const currentPrice = livePrice.isLive ? livePrice.price : price;
  const currentChange = livePrice.isLive ? livePrice.change24h : change;
  const currentHigh = livePrice.isLive ? livePrice.high24h : high24h;
  const currentLow = livePrice.isLive ? livePrice.low24h : low24h;
  const currentVolume = livePrice.isLive ? livePrice.volume : volume;
  
  const { history, learningStats, loading: historyLoading, saveAnalysis, submitFeedback, deleteAnalysis, clearAllHistory } = useAnalysisHistory(crypto);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  // Get current language code
  const currentLanguage = i18n.language || 'en';

  const processingSteps = [
    t("analyzer.connecting", "Connecting to AI..."),
    t("analyzer.fetching", "Fetching data..."),
    t("analyzer.analyzing", "Analyzing patterns..."),
    t("analyzer.generating", "Generating insights...")
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
      // Use live Binance data when available
      const analysisPrice = currentPrice;
      const analysisChange = currentChange;
      const analysisHigh = currentHigh;
      const analysisLow = currentLow;
      const analysisVolume = currentVolume;
      
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          crypto, 
          price: analysisPrice, 
          change: analysisChange, 
          high24h: analysisHigh, 
          low24h: analysisLow, 
          volume: analysisVolume, 
          marketCap, 
          language: currentLanguage,
          dataSource: livePrice.isLive ? 'binance-live' : 'coingecko'
        }),
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
      
      // Save to history after successful analysis
      if (fullText.length > 100) {
        // Extract confidence from analysis text
        const confidenceMatch = fullText.match(/Confidence:\s*(\d+)%/);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : undefined;
        
        // Extract bias from analysis - look for Primary Bias or Bias Direction patterns
        let bias: string | undefined;
        const primaryBiasMatch = fullText.match(/Primary Bias:\s*(BULLISH|BEARISH|NEUTRAL)/i);
        if (primaryBiasMatch) {
          const biasText = primaryBiasMatch[1].toUpperCase();
          bias = biasText === 'BULLISH' ? 'LONG' : biasText === 'BEARISH' ? 'SHORT' : 'NEUTRAL';
        } else {
          const biasDirectionMatch = fullText.match(/Bias Direction:\s*[🟢🔴⚪]\s*(BULLISH|BEARISH|NEUTRAL)/i);
          if (biasDirectionMatch) {
            const biasText = biasDirectionMatch[1].toUpperCase();
            bias = biasText === 'BULLISH' ? 'LONG' : biasText === 'BEARISH' ? 'SHORT' : 'NEUTRAL';
          } else {
            // Fallback to looking for LONG/SHORT in executive summary
            const execBiasMatch = fullText.match(/(BULLISH BIAS|BEARISH BIAS|NEUTRAL)/i);
            if (execBiasMatch) {
              const match = execBiasMatch[1].toUpperCase();
              bias = match.includes('BULLISH') ? 'LONG' : match.includes('BEARISH') ? 'SHORT' : 'NEUTRAL';
            }
          }
        }
        
        saveAnalysis(fullText, price, change, confidence, bias);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to generate analysis. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  }, [crypto, currentPrice, currentChange, currentHigh, currentLow, currentVolume, marketCap, currentLanguage, saveAnalysis, t, livePrice.isLive]);

  const handleSelectHistory = (record: AnalysisRecord) => {
    setSelectedHistory(record);
    setDisplayedText(record.analysis_text);
    setFullAnalysis(record.analysis_text);
    charIndexRef.current = record.analysis_text.length;
    setHasAnalyzed(true);
    setShowHistory(false);
    toast.success(`Loaded analysis from ${format(new Date(record.created_at), "MMM d, h:mm a")}`);
  };

  const handleClearAnalysis = async () => {
    setSelectedHistory(null);
    setDisplayedText("");
    setFullAnalysis("");
    setHasAnalyzed(false);
    charIndexRef.current = 0;
    await clearAllHistory();
    toast.success("Analysis history cleared");
  };

  const handleFeedback = async (recordId: string, wasCorrect: boolean) => {
    setFeedbackLoading(recordId);
    const success = await submitFeedback(recordId, wasCorrect);
    setFeedbackLoading(null);
    
    if (success) {
      toast.success(wasCorrect ? "Thanks! Marked as correct prediction 🎯" : "Thanks for the feedback! AI will learn from this.");
    } else {
      toast.error("Failed to submit feedback");
    }
  };

  const sentiment = currentChange >= 0 ? "bullish" : "bearish";

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

  // Calculate displayed accuracy
  const displayedAccuracy = learningStats?.accuracy_percentage ?? 95;

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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Zikalyze AI</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary">v9.0</span>
                {/* Live Price Indicator */}
                <div className={cn(
                  "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium",
                  livePrice.isLive 
                    ? "bg-success/20 text-success" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {livePrice.isLive ? (
                    <>
                      <Radio className="h-3 w-3 animate-pulse" />
                      <span>LIVE</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span>{livePrice.source === 'reconnecting' ? 'RECONNECTING' : 'CONNECTING'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{displayedAccuracy.toFixed(0)}% Accuracy</span>
                {learningStats && learningStats.total_feedback > 0 && (
                  <span className="text-xs text-primary/70">• {learningStats.total_feedback} feedback</span>
                )}
                {livePrice.isLive && (
                  <span className="text-xs text-success/70">• Binance WebSocket</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* History Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", showHistory && "rotate-180")} />
            </Button>
            
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
        </div>

        {/* Live Price Display */}
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-background to-secondary/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold text-foreground">
                {crypto.toUpperCase()}
              </div>
              <div className={cn(
                "text-2xl font-bold tabular-nums",
                currentChange >= 0 ? "text-success" : "text-destructive"
              )}>
                ${currentPrice.toLocaleString(undefined, { 
                  minimumFractionDigits: currentPrice < 1 ? 4 : 2,
                  maximumFractionDigits: currentPrice < 1 ? 6 : 2 
                })}
              </div>
              <div className={cn(
                "text-sm font-medium px-2 py-0.5 rounded",
                currentChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              )}>
                {currentChange >= 0 ? "+" : ""}{currentChange.toFixed(2)}%
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {livePrice.isLive && (
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span>Updated {new Date(livePrice.lastUpdate).toLocaleTimeString()}</span>
                </div>
              )}
              <div className="mt-1">
                24h H: ${currentHigh?.toLocaleString() || '-'} | L: ${currentLow?.toLocaleString() || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Learning Stats Banner */}
        {learningStats && learningStats.total_feedback >= 3 && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-chart-cyan/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Learning Progress</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {learningStats.correct_predictions}/{learningStats.total_feedback} correct
              </span>
            </div>
            <div className="mt-2">
              <Progress 
                value={learningStats.accuracy_percentage || 0} 
                className="h-2"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Accuracy: {learningStats.accuracy_percentage?.toFixed(1) || 0}%</span>
              {learningStats.avg_confidence_when_correct && (
                <span>Avg confidence when correct: {learningStats.avg_confidence_when_correct.toFixed(0)}%</span>
              )}
            </div>
          </div>
        )}

        {/* History Dropdown */}
        {showHistory && (
          <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-border/50 max-h-48 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Previous Analyses</span>
              {(selectedHistory || hasAnalyzed || history.length > 0) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all analysis history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {history.length} saved {history.length === 1 ? 'analysis' : 'analyses'} for {crypto.toUpperCase()}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearAnalysis}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {historyLoading ? (
              <div className="text-center py-2 text-muted-foreground text-sm">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-2 text-muted-foreground text-sm">No previous analyses</div>
            ) : (
              <div className="space-y-2">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className={cn(
                      "group relative w-full text-left p-3 rounded-lg transition-colors hover:bg-background/50 border border-transparent",
                      selectedHistory?.id === record.id && "bg-primary/10 border-primary/30",
                      record.was_correct === true && "border-success/30 bg-success/5",
                      record.was_correct === false && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <button
                      onClick={() => handleSelectHistory(record)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">
                            {format(new Date(record.created_at), "MMM d, h:mm a")}
                          </span>
                          {record.was_correct !== null && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded flex items-center gap-1",
                              record.was_correct ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                            )}>
                              {record.was_correct ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                              {record.was_correct ? "Correct" : "Incorrect"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            record.change_24h >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                          )}>
                            {record.change_24h >= 0 ? "+" : ""}{record.change_24h.toFixed(2)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ${Number(record.price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {record.confidence && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Confidence: {record.confidence}% {record.bias && `• ${record.bias}`}
                        </div>
                      )}
                    </button>
                    
                    {/* Feedback Buttons */}
                    {record.was_correct === null && (
                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground mr-2">Was this prediction correct?</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={feedbackLoading === record.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(record.id, true);
                          }}
                          className="h-6 px-2 text-xs text-success hover:text-success hover:bg-success/10"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={feedbackLoading === record.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(record.id, false);
                          }}
                          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          No
                        </Button>
                        {feedbackLoading === record.id && (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnalysis(record.id);
                        if (selectedHistory?.id === record.id) {
                          setSelectedHistory(null);
                          setDisplayedText("");
                          setFullAnalysis("");
                        }
                        toast.success("Analysis deleted");
                      }}
                      className="absolute right-2 top-3 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      title="Delete this analysis"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          {/* Selected History Indicator */}
          {selectedHistory && (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
              <Clock className="h-3 w-3" />
              <span>Viewing analysis from {format(new Date(selectedHistory.created_at), "MMM d, h:mm a")}</span>
              <span className="text-foreground">@ ${Number(selectedHistory.price).toLocaleString()}</span>
            </div>
          )}
          
          {!hasAnalyzed && !isAnalyzing && !displayedText ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <Brain className="h-10 w-10 text-primary/40 mb-3" />
              <p className="text-muted-foreground text-sm">Click to run AI analysis</p>
              {history.length > 0 && (
                <p className="text-muted-foreground text-xs mt-1">
                  or view {history.length} previous {history.length === 1 ? "analysis" : "analyses"}
                </p>
              )}
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
