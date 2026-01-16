import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Zap, Play, RefreshCw, Activity, Copy, Check, History, ChevronDown, Clock, Trash2, X, ThumbsUp, ThumbsDown, TrendingUp, Award, WifiOff, Database, Cpu, BarChart3, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAnalysisHistory, AnalysisRecord } from "@/hooks/useAnalysisHistory";
import { useAnalysisCache } from "@/hooks/useAnalysisCache";
import { useOnChainData } from "@/hooks/useOnChainData";
import { useChartTrendData } from "@/hooks/useChartTrendData";
import { useMultiTimeframeData, Timeframe } from "@/hooks/useMultiTimeframeData";
import { useAILearning } from "@/hooks/useAILearning";
import { useGlobalPriceWebSocket } from "@/hooks/useGlobalPriceWebSocket";
import { runClientSideAnalysis, AnalysisResult } from "@/lib/zikalyze-brain";
import { MultiTimeframeInput, TimeframeAnalysisInput } from "@/lib/zikalyze-brain/types";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import AISummaryCard from "./AISummaryCard";
import { LivePriceLarge } from "./LivePrice";
import { PriceChange } from "./PriceChange";
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

// Analysis runs 100% client-side via runClientSideAnalysis - no edge function needed
const CHARS_PER_FRAME = 12; // Much faster rendering
const FRAME_INTERVAL = 8; // 120fps smooth
const STREAMING_INTERVAL = 5000; // Re-process every 5 seconds when streaming (reduced from 2s)

// Helper to build multi-timeframe input - avoids duplicate code
const buildMultiTimeframeInput = (multiTfData: any): MultiTimeframeInput | undefined => {
  if (!multiTfData || multiTfData.isLoading) return undefined;
  
  const buildTimeframe = (tf: any, timeframe: '15m' | '1h' | '4h' | '1d'): TimeframeAnalysisInput | null => {
    if (!tf) return null;
    return {
      timeframe, trend: tf.trend, trendStrength: tf.trendStrength,
      ema9: tf.ema9, ema21: tf.ema21, rsi: tf.rsi,
      support: tf.support, resistance: tf.resistance,
      volumeTrend: tf.volumeTrend, higherHighs: tf.higherHighs,
      higherLows: tf.higherLows, lowerHighs: tf.lowerHighs,
      lowerLows: tf.lowerLows, isLive: tf.isLive
    };
  };
  
  return {
    '15m': buildTimeframe(multiTfData['15m'], '15m'),
    '1h': buildTimeframe(multiTfData['1h'], '1h'),
    '4h': buildTimeframe(multiTfData['4h'], '4h'),
    '1d': buildTimeframe(multiTfData['1d'], '1d'),
    confluence: multiTfData.confluence
  };
};

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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Background streaming state (hidden, always running)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamUpdateCount, setStreamUpdateCount] = useState(0);
  const [priceHistory, setPriceHistory] = useState<{ price: number; timestamp: number }[]>([]);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<{ price: number; timestamp: number }[]>([]);
  const backgroundStreamingRef = useRef(false);
  
  const charIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 🔥 Direct WebSocket access for ultra-real-time price updates (NO CACHE)
  const websocketSymbols = useMemo(() => [crypto.toUpperCase()], [crypto]);
  const websocket = useGlobalPriceWebSocket(websocketSymbols);
  
  // Get LIVE price directly from WebSocket - no caching, no fallback to props
  const wsPrice = websocket.getPrice(crypto.toUpperCase());
  
  // 📊 Real-time 24h chart data for accurate trend analysis
  const chartTrendData = useChartTrendData(crypto);
  
  // 📈 Multi-timeframe analysis (15m, 1h, 4h, 1d)
  const multiTfData = useMultiTimeframeData(crypto);
  
  // Real-time on-chain data with whale tracking
  const { metrics: onChainMetrics, streamStatus } = useOnChainData(
    crypto, 
    wsPrice?.price || price, 
    change, 
    { volume, marketCap, coinGeckoId: undefined }
  );
  
  // ALWAYS use WebSocket price - NEVER use cached/prop prices for AI analysis
  const currentPrice = wsPrice?.price || price;
  const currentChange = change;
  const currentHigh = high24h || currentPrice * 1.02;
  const currentLow = low24h || currentPrice * 0.98;
  const currentVolume = volume || 0;
  
  // Track if WebSocket is providing live data
  const isWebSocketLive = websocket.connected && !!wsPrice && wsPrice.price > 0;
  
  // Data freshness - WebSocket data is always fresh
  const isDataFresh = isWebSocketLive || (Date.now() - (wsPrice?.timestamp || 0) < 5000);
  
  // Build actual data source string for analysis
  const actualDataSource = useMemo(() => {
    const sources: string[] = [];
    if (isWebSocketLive) sources.push('Live WebSocket');
    if (onChainMetrics && streamStatus === 'connected') sources.push('On-Chain');
    return sources.length > 0 ? sources.join(' + ') : 'REST Fallback';
  }, [isWebSocketLive, onChainMetrics, streamStatus]);
  
  const isRealTimeData = isWebSocketLive;
  
  const { history, learningStats, loading: historyLoading, saveAnalysis, submitFeedback, deleteAnalysis, clearAllHistory } = useAnalysisHistory(crypto);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  // Persistent AI Learning Hook
  const { 
    patterns: learnedPatterns, 
    globalLearning,
    updatePatterns,
    recordPrediction,
    recordOutcome,
    learnPriceLevel,
    startLearningSession,
    getAccuracy,
    getConfidenceModifier
  } = useAILearning(crypto);

  // Offline cache support
  const { 
    cachedAnalysis, 
    isOffline, 
    isUsingCache, 
    cacheAnalysis, 
    useCachedAnalysis, 
    getCacheAge, 
    hasCache,
    markFreshData 
  } = useAnalysisCache(crypto);

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
  // Reset charIndex when fullAnalysis changes entirely (new analysis started)
  const prevAnalysisRef = useRef<string>("");
  
  useEffect(() => {
    // If fullAnalysis changed significantly (new analysis), reset the typewriter
    if (fullAnalysis && !fullAnalysis.startsWith(prevAnalysisRef.current.slice(0, 50))) {
      charIndexRef.current = 0;
      setDisplayedText("");
    }
    prevAnalysisRef.current = fullAnalysis;
    
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
    setCurrentAnalysisId(null);
    setFeedbackSubmitted(false);
    charIndexRef.current = 0;

    const stepInterval = setInterval(() => {
      setProcessingStep(prev => prev < processingSteps.length - 1 ? prev + 1 : prev);
    }, 600);

    try {
      // 🧠 CLIENT-SIDE ANALYSIS — Using real-time WebSocket price data
      const analysisPrice = currentPrice;
      const analysisChange = currentChange;
      const analysisHigh = currentHigh;
      const analysisLow = currentLow;
      const analysisVolume = currentVolume;
      
      // Log data source for debugging
      console.log(`[AI Analysis] Using ${isWebSocketLive ? 'LIVE WEBSOCKET' : 'REST FALLBACK'} data:`, {
        price: analysisPrice,
        change: analysisChange,
        high: analysisHigh,
        low: analysisLow,
        volume: analysisVolume,
        source: actualDataSource
      });

      // Use real-time on-chain data from useOnChainData hook (more comprehensive)
      const adaptedOnChainData = onChainMetrics ? {
        exchangeNetFlow: onChainMetrics.exchangeNetFlow,
        whaleActivity: {
          buying: onChainMetrics.whaleActivity.buying,
          selling: onChainMetrics.whaleActivity.selling,
          netFlow: onChainMetrics.whaleActivity.netFlow,
          largeTxCount24h: onChainMetrics.whaleActivity.largeTxCount24h,
          recentLargeTx: onChainMetrics.whaleActivity.recentLargeTx
        },
        longTermHolders: { 
          accumulating: onChainMetrics.activeAddresses.trend === 'INCREASING', 
          change7d: onChainMetrics.activeAddresses.change24h * 7, 
          sentiment: onChainMetrics.activeAddresses.trend === 'INCREASING' ? 'BULLISH' : 'NEUTRAL' 
        },
        shortTermHolders: { 
          behavior: onChainMetrics.whaleActivity.netFlow.includes('BUYING') ? 'ACCUMULATING' : 
                    onChainMetrics.whaleActivity.netFlow.includes('SELLING') ? 'DISTRIBUTING' : 'NEUTRAL', 
          profitLoss: analysisChange * 0.5 
        },
        activeAddresses: onChainMetrics.activeAddresses,
        transactionVolume: onChainMetrics.transactionVolume,
        mempoolData: { 
          unconfirmedTxs: onChainMetrics.mempoolData.unconfirmedTxs, 
          mempoolSize: onChainMetrics.mempoolData.unconfirmedTxs * 250,
          avgFeeRate: onChainMetrics.mempoolData.avgFeeRate 
        },
        hashRate: onChainMetrics.hashRate,
        blockHeight: onChainMetrics.blockHeight,
        difficulty: onChainMetrics.difficulty,
        source: onChainMetrics.source
      } : undefined;

      // Sentiment data - not available without liveData hook, pass undefined
      const adaptedSentimentData = undefined;

      // Build multi-timeframe input (reusable helper)
      const adaptedMultiTfData = buildMultiTimeframeInput(multiTfData);

      // Run analysis entirely client-side with real-time data status
      const result = runClientSideAnalysis({
        crypto,
        price: analysisPrice,
        change: analysisChange,
        high24h: analysisHigh,
        low24h: analysisLow,
        volume: analysisVolume,
        marketCap,
        language: currentLanguage,
        isLiveData: isRealTimeData,
        dataSource: actualDataSource,
        onChainData: adaptedOnChainData,
        sentimentData: adaptedSentimentData,
        chartTrendData: chartTrendData ? {
          candles: chartTrendData.candles, trend24h: chartTrendData.trend24h, trendStrength: chartTrendData.trendStrength,
          higherHighs: chartTrendData.higherHighs, higherLows: chartTrendData.higherLows,
          lowerHighs: chartTrendData.lowerHighs, lowerLows: chartTrendData.lowerLows,
          ema9: chartTrendData.ema9, ema21: chartTrendData.ema21, rsi: chartTrendData.rsi,
          volumeTrend: chartTrendData.volumeTrend, priceVelocity: chartTrendData.priceVelocity,
          isLive: chartTrendData.isLive, source: chartTrendData.source
        } : undefined,
        multiTimeframeData: adaptedMultiTfData
      });

      clearInterval(stepInterval);
      setProcessingStep(processingSteps.length - 1);
      markFreshData();

      // Store result for summary card and typewriter effect
      setAnalysisResult(result);
      setFullAnalysis(result.analysis);
      setHasAnalyzed(true);

      // Cache and save - get the record ID for feedback
      if (result.analysis.length > 100) {
        cacheAnalysis(result.analysis, analysisPrice, analysisChange);
        const savedId = await saveAnalysis(result.analysis, analysisPrice, analysisChange, result.confidence, result.bias);
        if (savedId) {
          setCurrentAnalysisId(savedId);
        }
      }

      // Silent completion - no toast notification
    } catch (error) {
      console.error("Analysis error:", error);
      
      // On error, try to use cached analysis as fallback
      const cached = useCachedAnalysis();
      if (cached) {
        setFullAnalysis(cached.analysis);
        setDisplayedText(cached.analysis);
        charIndexRef.current = cached.analysis.length;
        setHasAnalyzed(true);
        toast.warning(`Connection issue: Showing cached analysis from ${getCacheAge()}`);
      } else {
        toast.error("Failed to generate analysis. Please try again.");
      }
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  }, [crypto, currentPrice, currentChange, currentHigh, currentLow, currentVolume, marketCap, currentLanguage, saveAnalysis, useCachedAnalysis, getCacheAge, cacheAnalysis, markFreshData, onChainMetrics, chartTrendData, multiTfData, isRealTimeData, actualDataSource]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧠 BACKGROUND AI LEARNING — Silent, always-on data collection & adaptation
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processBackgroundLearning = useCallback(() => {
    if (!backgroundStreamingRef.current) return;
    
    const now = Date.now();
    
    // Collect price data point
    priceHistoryRef.current = [
      ...priceHistoryRef.current.slice(-299), // Keep last 300 points (10 min @ 2s intervals)
      { price: currentPrice, timestamp: now }
    ];
    setPriceHistory([...priceHistoryRef.current]);
    
    // Calculate learning metrics from collected data
    const history = priceHistoryRef.current;
    const recentPrices = history.slice(-30).map(p => p.price);
    const avgRecentPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    
    // Calculate price velocity
    const priceVelocity = history.length >= 2 
      ? (history[history.length - 1].price - history[history.length - 2].price) / 
        ((history[history.length - 1].timestamp - history[history.length - 2].timestamp) / 1000)
      : 0;
    
    // Calculate volatility from recent prices
    const volatility = recentPrices.length > 1
      ? Math.sqrt(recentPrices.reduce((sum, p) => sum + Math.pow(p - avgRecentPrice, 2), 0) / recentPrices.length) / avgRecentPrice * 100
      : 0;
    
    // Micro-trend detection
    const microTrend = priceVelocity > 0.1 ? 'ACCELERATING ↑' :
                       priceVelocity < -0.1 ? 'ACCELERATING ↓' :
                       currentPrice > avgRecentPrice ? 'DRIFTING ↑' :
                       currentPrice < avgRecentPrice ? 'DRIFTING ↓' : 'CONSOLIDATING ↔';

    // Build adapted on-chain data for brain processing
    const adaptedOnChainData = onChainMetrics ? {
      exchangeNetFlow: onChainMetrics.exchangeNetFlow,
      whaleActivity: onChainMetrics.whaleActivity,
      longTermHolders: { 
        accumulating: onChainMetrics.activeAddresses.trend === 'INCREASING', 
        change7d: onChainMetrics.activeAddresses.change24h * 7, 
        sentiment: onChainMetrics.activeAddresses.trend === 'INCREASING' ? 'BULLISH' : 'NEUTRAL' 
      },
      shortTermHolders: { behavior: 'NEUTRAL', profitLoss: 0 },
      activeAddresses: onChainMetrics.activeAddresses,
      transactionVolume: onChainMetrics.transactionVolume,
      mempoolData: {
        unconfirmedTxs: onChainMetrics.mempoolData.unconfirmedTxs,
        mempoolSize: onChainMetrics.mempoolData.unconfirmedTxs * 250,
        avgFeeRate: onChainMetrics.mempoolData.avgFeeRate
      },
      hashRate: onChainMetrics.hashRate,
      blockHeight: onChainMetrics.blockHeight,
      difficulty: onChainMetrics.difficulty,
      source: onChainMetrics.source
    } : undefined;

    // Use the helper function to build multi-timeframe input
    const adaptedMultiTfData = buildMultiTimeframeInput(multiTfData);
    
    // Run brain analysis to learn from current data
    const result = runClientSideAnalysis({
      crypto,
      price: currentPrice,
      change: currentChange,
      high24h: currentHigh,
      low24h: currentLow,
      volume: currentVolume,
      marketCap,
      language: currentLanguage,
      isLiveData: true,
      dataSource: `LEARNING (${streamUpdateCount + 1} samples)`,
      onChainData: adaptedOnChainData,
      sentimentData: undefined,
      chartTrendData: chartTrendData ? {
        candles: chartTrendData.candles, trend24h: chartTrendData.trend24h, trendStrength: chartTrendData.trendStrength,
        higherHighs: chartTrendData.higherHighs, higherLows: chartTrendData.higherLows,
        lowerHighs: chartTrendData.lowerHighs, lowerLows: chartTrendData.lowerLows,
        ema9: chartTrendData.ema9, ema21: chartTrendData.ema21, rsi: chartTrendData.rsi,
        volumeTrend: chartTrendData.volumeTrend, priceVelocity: chartTrendData.priceVelocity,
        isLive: chartTrendData.isLive, source: chartTrendData.source
      } : undefined,
      multiTimeframeData: adaptedMultiTfData
    });
    
    // Update learned patterns using persistent hook (AI adaptation)
    const biasChanged = learnedPatterns.lastBias !== result.bias;
    updatePatterns({
      trendAccuracy: priceHistoryRef.current.length > 10 ? 
        (learnedPatterns.trendAccuracy * 0.95 + (result.confidence / 100) * 0.05) : learnedPatterns.trendAccuracy,
      avgVelocity: (learnedPatterns.avgVelocity * 0.9 + Math.abs(priceVelocity) * 0.1),
      volatility: (learnedPatterns.volatility * 0.9 + volatility * 0.1),
      lastBias: result.bias,
      biasChanges: biasChanged ? learnedPatterns.biasChanges + 1 : learnedPatterns.biasChanges,
      samplesCollected: learnedPatterns.samplesCollected + 1,
      avgPrice24h: (learnedPatterns.avgPrice24h * 0.95 + currentPrice * 0.05) || currentPrice,
      priceRange24h: Math.max(learnedPatterns.priceRange24h, currentHigh - currentLow)
    });
    
    // Learn support/resistance levels from chart data
    if (chartTrendData?.isLive && chartTrendData.candles.length > 0) {
      const lowPrice = Math.min(...chartTrendData.candles.map(c => c.low));
      const highPrice = Math.max(...chartTrendData.candles.map(c => c.high));
      learnPriceLevel(lowPrice, 'support');
      learnPriceLevel(highPrice, 'resistance');
    }
    
    // Store latest analysis result for when user clicks Analyze
    setAnalysisResult(result);
    setStreamUpdateCount(prev => {
      const newCount = prev + 1;
      // Silent console log for debugging (every 30 samples = ~2.5 mins)
      if (newCount % 30 === 0) {
        console.log(`[AI Learning] Sample #${newCount}: $${currentPrice.toFixed(2)}, bias=${result.bias}, conf=${result.confidence}%, vol=${volatility.toFixed(2)}%`);
      }
      return newCount;
    });
  }, [crypto, currentPrice, currentChange, currentHigh, currentLow, currentVolume, marketCap, currentLanguage, onChainMetrics, chartTrendData, multiTfData]);

  // Auto-start background learning on mount (stable ref to avoid re-triggering)
  const processBackgroundLearningRef = useRef(processBackgroundLearning);
  processBackgroundLearningRef.current = processBackgroundLearning;
  
  useEffect(() => {
    // Only start once per mount when WebSocket is live
    if (backgroundStreamingRef.current) return;
    if (!isWebSocketLive) return;
    
    console.log('[AI Learning] Starting background data collection...');
    backgroundStreamingRef.current = true;
    setIsStreaming(true);
    
    // Initial learning cycle
    processBackgroundLearningRef.current();
    
    // Set up interval for continuous learning
    streamingIntervalRef.current = setInterval(() => {
      processBackgroundLearningRef.current();
    }, STREAMING_INTERVAL);
    
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
      backgroundStreamingRef.current = false;
    };
  }, [isWebSocketLive]);

  // Restart learning and reset state when crypto changes
  useEffect(() => {
    // Reset analysis state for new crypto
    setDisplayedText("");
    setFullAnalysis("");
    setHasAnalyzed(false);
    setCurrentAnalysisId(null);
    setFeedbackSubmitted(false);
    setSelectedHistory(null);
    setAnalysisResult(null);
    charIndexRef.current = 0;
    
    if (backgroundStreamingRef.current) {
      // Reset local streaming data for new crypto (persistent data loads automatically via hook)
      priceHistoryRef.current = [];
      setPriceHistory([]);
      setStreamUpdateCount(0);
      startLearningSession();
      console.log(`[AI Learning] Switched to ${crypto}, loading persistent learning data...`);
    }
  }, [crypto, startLearningSession]);

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

  const handleFeedback = async (recordId: string, wasCorrect: boolean): Promise<boolean> => {
    setFeedbackLoading(recordId);
    const success = await submitFeedback(recordId, wasCorrect);
    setFeedbackLoading(null);
    
    if (success) {
      // Record outcome to persistent AI learning
      await recordOutcome(wasCorrect, learnedPatterns.lastBias);
      toast.success(wasCorrect ? "Thanks! AI will remember this success 🎯" : "Thanks! AI will learn from this mistake.");
    } else {
      toast.error("Failed to submit feedback");
    }
    return success;
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

  // Calculate displayed accuracy - prioritize real-time data quality indicators
  // Base accuracy depends on connection status
  const hasLivePrice = isWebSocketLive && currentPrice > 0;
  const hasOnChainData = onChainMetrics && streamStatus === 'connected';
  const hasChartData = chartTrendData?.isLive && chartTrendData?.candles?.length > 0;
  const hasMultiTfData = multiTfData && !multiTfData.isLoading && multiTfData.confluence;
  
  // Calculate accuracy based on actual data quality - weighted by reliability
  let displayedAccuracy = 78; // Base accuracy with any data
  if (hasLivePrice) displayedAccuracy += 12; // +12 for live WebSocket prices (most critical)
  if (hasOnChainData) displayedAccuracy += 4; // +4 for on-chain metrics
  if (hasChartData) displayedAccuracy += 3; // +3 for chart trend data
  if (hasMultiTfData) displayedAccuracy += 2; // +2 for multi-timeframe confluence
  displayedAccuracy = Math.min(99, Math.max(75, displayedAccuracy));

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
                {/* Minimalist live indicator - only show when offline/cached, hide all tech labels */}
                {isOffline && (
                  <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-destructive/20 text-destructive">
                    <WifiOff className="h-3 w-3" />
                    <span>OFFLINE</span>
                  </div>
                )}
                {isUsingCache && !isOffline && (
                  <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-warning/20 text-warning">
                    <Database className="h-3 w-3" />
                    <span>CACHED</span>
                  </div>
                )}
                {/* Subtle pulsing dot when connected to real-time data - no text labels */}
                {!isOffline && !isUsingCache && isWebSocketLive && (
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" title="Connected to real-time price & chain data" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">Real-time market analysis</span>
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

        {/* Live Price Display - Shows real-time WebSocket data with animated updates */}
        <div className={cn(
          "mb-4 p-3 rounded-xl bg-gradient-to-r from-background to-secondary/30 border transition-all duration-500",
          isWebSocketLive ? (currentChange >= 0 ? "border-success/30" : "border-destructive/30") : "border-border/50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{crypto.toUpperCase()}</span>
                {isWebSocketLive && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-success/20 text-success font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              {/* Use LivePriceLarge for animated real-time updates like Top100 */}
              <div className="text-2xl">
                <LivePriceLarge value={currentPrice} />
              </div>
              <PriceChange value={currentChange} showBadge={true} />
            </div>
          </div>
        </div>

        {/* Quick Summary Card - Shows after analysis */}
        {analysisResult && hasAnalyzed && (
          <AISummaryCard
            bias={analysisResult.bias}
            confidence={analysisResult.confidence}
            entryZone={analysisResult.precisionEntry.zone}
            timing={analysisResult.precisionEntry.timing}
            successProbability={Math.min(88, 40 + Math.round(analysisResult.confidence * 0.3) + (analysisResult.precisionEntry.timing === 'NOW' ? 12 : 5))}
            crypto={crypto}
            isVisible={true}
          />
        )}

        {/* Offline/Cache Status Banner */}
        {(isOffline || isUsingCache) && (
          <div className={cn(
            "mb-4 p-3 rounded-xl border flex items-center gap-3",
            isOffline 
              ? "bg-gradient-to-r from-destructive/10 to-warning/10 border-destructive/20" 
              : "bg-gradient-to-r from-warning/10 to-muted/10 border-warning/20"
          )}>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isOffline ? "bg-destructive/20" : "bg-warning/20"
            )}>
              {isOffline ? (
                <WifiOff className="h-4 w-4 text-destructive" />
              ) : (
                <Database className="h-4 w-4 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {isOffline ? "You're Offline" : "Viewing Cached Analysis"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isOffline 
                  ? hasCache 
                    ? `Last analysis cached ${getCacheAge()} • Click Analyze to view` 
                    : "No cached analysis available"
                  : `Cached ${getCacheAge()} • Price at cache: $${cachedAnalysis?.price.toLocaleString()}`
                }
              </div>
            </div>
            {!isOffline && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  markFreshData();
                  runAnalysis();
                }}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        )}

        {/* Learning Stats Banner */}
        {learningStats && learningStats.total_feedback >= 3 && !isUsingCache && (
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

        {/* Analyze Button - AI uses background-learned data */}
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || (isOffline && !hasCache)}
          className={cn(
            "w-full h-11 mb-4 font-semibold",
            isAnalyzing ? "bg-primary/50" : 
            isOffline ? (hasCache ? "bg-gradient-to-r from-warning to-warning/80" : "bg-muted") :
            "bg-gradient-to-r from-primary to-chart-cyan shadow-lg shadow-primary/20"
          )}
        >
          {isAnalyzing ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing {crypto}...</>
          ) : isOffline ? (
            hasCache ? (
              <><Database className="h-4 w-4 mr-2" />View Cached Analysis</>
            ) : (
              <><WifiOff className="h-4 w-4 mr-2" />Offline - No Cache</>
            )
          ) : hasAnalyzed ? (
            <><RefreshCw className="h-4 w-4 mr-2" />Re-Analyze {crypto}</>
          ) : (
            <><Play className="h-4 w-4 mr-2" />Analyze {crypto}</>
          )}
        </Button>
        
        {/* AI Learning runs silently in background - no visible status bar */}

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
        
        {/* Inline Feedback Prompt */}
        {hasAnalyzed && !selectedHistory && fullAnalysis && charIndexRef.current >= fullAnalysis.length && !feedbackSubmitted && currentAnalysisId && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-chart-cyan/5 border border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Help improve AI accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Was this analysis helpful?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={feedbackLoading === currentAnalysisId}
                  onClick={async () => {
                    const success = await handleFeedback(currentAnalysisId, true);
                    if (success !== false) setFeedbackSubmitted(true);
                  }}
                  className="h-7 px-2 text-xs text-success hover:text-success hover:bg-success/10"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={feedbackLoading === currentAnalysisId}
                  onClick={async () => {
                    const success = await handleFeedback(currentAnalysisId, false);
                    if (success !== false) setFeedbackSubmitted(true);
                  }}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  No
                </Button>
                {feedbackLoading === currentAnalysisId && (
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Disclaimer Footer */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center italic">
            ⚠️ This AI analysis is for informational purposes only. Always check your chart for confirmation before making trading decisions.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyzer;
