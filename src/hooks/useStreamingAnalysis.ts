// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 useStreamingAnalysis — Real-Time Streaming AI Analysis
// ═══════════════════════════════════════════════════════════════════════════════
// Streams live price data continuously through the AI brain when active
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { runClientSideAnalysis, AnalysisResult } from '@/lib/zikalyze-brain';
import { AnalysisInput, MultiTimeframeInput } from '@/lib/zikalyze-brain/types';

interface StreamingState {
  isStreaming: boolean;
  lastUpdate: number;
  updateCount: number;
  dataPoints: number;
  priceHistory: { price: number; timestamp: number }[];
}

interface StreamingAnalysisReturn {
  analysis: AnalysisResult | null;
  streamingState: StreamingState;
  streamingText: string;
  isStreaming: boolean;
  startStreaming: (input: AnalysisInput) => void;
  stopStreaming: () => void;
  toggleStreaming: (input: AnalysisInput) => void;
}

// How often to process new data (ms)
const ANALYSIS_INTERVAL = 2000; // Re-analyze every 2 seconds
const MAX_PRICE_HISTORY = 60; // Keep last 60 price points

export function useStreamingAnalysis(): StreamingAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    lastUpdate: 0,
    updateCount: 0,
    dataPoints: 0,
    priceHistory: []
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<AnalysisInput | null>(null);
  const priceHistoryRef = useRef<{ price: number; timestamp: number }[]>([]);
  const streamingRef = useRef(false);
  const updateCountRef = useRef(0);
  const charIndexRef = useRef(0);
  const fullTextRef = useRef('');
  const animationFrameRef = useRef<number | null>(null);

  // Typewriter animation for streaming effect
  const animateText = useCallback(() => {
    const CHARS_PER_FRAME = 8;
    const animate = () => {
      if (charIndexRef.current < fullTextRef.current.length) {
        const nextIndex = Math.min(charIndexRef.current + CHARS_PER_FRAME, fullTextRef.current.length);
        setStreamingText(fullTextRef.current.slice(0, nextIndex));
        charIndexRef.current = nextIndex;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Process data through AI brain
  const processData = useCallback((input: AnalysisInput) => {
    if (!streamingRef.current) return;
    
    const now = Date.now();
    updateCountRef.current += 1;
    
    // Add to price history
    priceHistoryRef.current = [
      ...priceHistoryRef.current.slice(-MAX_PRICE_HISTORY + 1),
      { price: input.price, timestamp: now }
    ];
    
    // Calculate real-time metrics from price history
    const history = priceHistoryRef.current;
    const recentPrices = history.slice(-10).map(p => p.price);
    const avgRecentPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const priceVelocity = history.length >= 2 
      ? (history[history.length - 1].price - history[history.length - 2].price) / 
        ((history[history.length - 1].timestamp - history[history.length - 2].timestamp) / 1000)
      : 0;
    
    // Determine real-time micro-trend
    const microTrend = priceVelocity > 0.1 ? 'ACCELERATING_UP' :
                       priceVelocity < -0.1 ? 'ACCELERATING_DOWN' :
                       input.price > avgRecentPrice ? 'DRIFTING_UP' :
                       input.price < avgRecentPrice ? 'DRIFTING_DOWN' : 'CONSOLIDATING';
    
    // Run analysis with streaming context
    const result = runClientSideAnalysis({
      ...input,
      isLiveData: true,
      dataSource: `STREAMING (${updateCountRef.current} updates)`
    });
    
    // Build streaming header with real-time metrics
    const streamHeader = `
┌──────────────────────────────────────────────────┐
│  🔴 LIVE STREAMING ANALYSIS                      │
│  Updates: ${updateCountRef.current.toString().padStart(4)} │ Points: ${history.length.toString().padStart(3)} │ ${new Date().toLocaleTimeString()}  │
└──────────────────────────────────────────────────┘

⚡ REAL-TIME MICRO-TREND: ${microTrend}
📊 Price Velocity: ${priceVelocity >= 0 ? '+' : ''}${priceVelocity.toFixed(4)}/sec
📈 Recent Avg: $${avgRecentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
🎯 Current: $${input.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
${priceVelocity > 0 ? '🟢' : priceVelocity < 0 ? '🔴' : '⚪'} Momentum: ${Math.abs(priceVelocity * 100).toFixed(2)}% per 100s

`;
    
    // Append streaming data to analysis
    const fullAnalysis = streamHeader + result.analysis;
    
    setAnalysis(result);
    fullTextRef.current = fullAnalysis;
    
    // If text is far behind, jump ahead
    if (fullTextRef.current.length - charIndexRef.current > 500) {
      charIndexRef.current = Math.max(0, fullTextRef.current.length - 300);
    }
    
    animateText();
    
    setStreamingState({
      isStreaming: true,
      lastUpdate: now,
      updateCount: updateCountRef.current,
      dataPoints: history.length,
      priceHistory: [...history]
    });
  }, [animateText]);

  // Start streaming
  const startStreaming = useCallback((input: AnalysisInput) => {
    if (streamingRef.current) return;
    
    console.log('[Streaming Analysis] Starting real-time stream...');
    streamingRef.current = true;
    inputRef.current = input;
    updateCountRef.current = 0;
    priceHistoryRef.current = [];
    charIndexRef.current = 0;
    fullTextRef.current = '';
    
    setStreamingState({
      isStreaming: true,
      lastUpdate: Date.now(),
      updateCount: 0,
      dataPoints: 0,
      priceHistory: []
    });
    
    // Initial analysis
    processData(input);
    
    // Set up interval for continuous processing
    intervalRef.current = setInterval(() => {
      if (inputRef.current && streamingRef.current) {
        processData(inputRef.current);
      }
    }, ANALYSIS_INTERVAL);
  }, [processData]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    console.log('[Streaming Analysis] Stopping stream...');
    streamingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setStreamingState(prev => ({
      ...prev,
      isStreaming: false
    }));
  }, []);

  // Toggle streaming
  const toggleStreaming = useCallback((input: AnalysisInput) => {
    if (streamingRef.current) {
      stopStreaming();
    } else {
      startStreaming(input);
    }
  }, [startStreaming, stopStreaming]);

  // Update input reference when new data comes in (called externally)
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    analysis,
    streamingState,
    streamingText,
    isStreaming: streamingState.isStreaming,
    startStreaming,
    stopStreaming,
    toggleStreaming
  };
}

export default useStreamingAnalysis;
