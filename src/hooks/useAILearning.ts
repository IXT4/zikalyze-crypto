// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 useAILearning — Persistent AI Learning & Adaptation Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Stores and retrieves AI learning data for continuous improvement
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LearnedPatterns {
  trendAccuracy: number;
  avgVelocity: number;
  volatility: number;
  lastBias: 'LONG' | 'SHORT' | 'NEUTRAL';
  biasChanges: number;
  correctPredictions: number;
  totalPredictions: number;
  supportLevels: number[];
  resistanceLevels: number[];
  avgPrice24h: number;
  priceRange24h: number;
  whaleBuyThreshold: number;
  whaleSellThreshold: number;
  exchangeFlowSensitivity: number;
  confidenceAdjustment: number;
  samplesCollected: number;
  learningSessions: number;
}

export interface GlobalLearning {
  avgTrendAccuracy: number;
  avgVolatility: number;
  consensusBias: string;
  accuracyPercentage: number;
  strongSupport: number;
  strongResistance: number;
  contributorCount: number;
}

const DEFAULT_PATTERNS: LearnedPatterns = {
  trendAccuracy: 0,
  avgVelocity: 0,
  volatility: 0,
  lastBias: 'NEUTRAL',
  biasChanges: 0,
  correctPredictions: 0,
  totalPredictions: 0,
  supportLevels: [],
  resistanceLevels: [],
  avgPrice24h: 0,
  priceRange24h: 0,
  whaleBuyThreshold: 60,
  whaleSellThreshold: 40,
  exchangeFlowSensitivity: 0.5,
  confidenceAdjustment: 0,
  samplesCollected: 0,
  learningSessions: 0
};

const STORAGE_KEY = 'zikalyze_ai_learning_v1';
const SAVE_DEBOUNCE_MS = 5000; // Save every 5 seconds max

export function useAILearning(symbol: string) {
  const [patterns, setPatterns] = useState<LearnedPatterns>(DEFAULT_PATTERNS);
  const [globalLearning, setGlobalLearning] = useState<GlobalLearning | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const patternsRef = useRef(patterns);
  
  // Keep ref in sync
  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Load patterns on mount/symbol change
  useEffect(() => {
    loadPatterns();
    loadGlobalLearning();
  }, [symbol, userId]);

  // Load from localStorage first, then from DB
  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    
    // 1. Try localStorage first (fastest)
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${symbol}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPatterns({ ...DEFAULT_PATTERNS, ...parsed });
        console.log(`[AI Learning] Loaded ${symbol} from localStorage:`, parsed.samplesCollected, 'samples');
      }
    } catch (e) {
      console.warn('[AI Learning] localStorage load failed:', e);
    }
    
    // 2. If user is logged in, load from DB (authoritative)
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('ai_learning_data')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', symbol)
          .maybeSingle();
        
        if (data && !error) {
          const dbPatterns: LearnedPatterns = {
            trendAccuracy: Number(data.trend_accuracy) || 0,
            avgVelocity: Number(data.avg_velocity) || 0,
            volatility: Number(data.volatility) || 0,
            lastBias: (data.last_bias as 'LONG' | 'SHORT' | 'NEUTRAL') || 'NEUTRAL',
            biasChanges: data.bias_changes || 0,
            correctPredictions: data.correct_predictions || 0,
            totalPredictions: data.total_predictions || 0,
            supportLevels: (data.support_levels || []).map(Number),
            resistanceLevels: (data.resistance_levels || []).map(Number),
            avgPrice24h: Number(data.avg_price_24h) || 0,
            priceRange24h: Number(data.price_range_24h) || 0,
            whaleBuyThreshold: Number(data.whale_buy_threshold) || 60,
            whaleSellThreshold: Number(data.whale_sell_threshold) || 40,
            exchangeFlowSensitivity: Number(data.exchange_flow_sensitivity) || 0.5,
            confidenceAdjustment: Number(data.confidence_adjustment) || 0,
            samplesCollected: data.samples_collected || 0,
            learningSessions: data.learning_sessions || 0
          };
          setPatterns(dbPatterns);
          // Sync to localStorage
          localStorage.setItem(`${STORAGE_KEY}_${symbol}`, JSON.stringify(dbPatterns));
          console.log(`[AI Learning] Loaded ${symbol} from DB:`, dbPatterns.samplesCollected, 'samples');
        }
      } catch (e) {
        console.warn('[AI Learning] DB load failed:', e);
      }
    }
    
    setIsLoading(false);
  }, [symbol, userId]);

  // Load global learning data
  const loadGlobalLearning = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_global_learning')
        .select('*')
        .eq('symbol', symbol)
        .maybeSingle();
      
      if (data && !error) {
        setGlobalLearning({
          avgTrendAccuracy: Number(data.avg_trend_accuracy) || 0,
          avgVolatility: Number(data.avg_volatility) || 0,
          consensusBias: data.consensus_bias || 'NEUTRAL',
          accuracyPercentage: Number(data.accuracy_percentage) || 0,
          strongSupport: Number(data.strong_support) || 0,
          strongResistance: Number(data.strong_resistance) || 0,
          contributorCount: data.contributor_count || 0
        });
      }
    } catch (e) {
      console.warn('[AI Learning] Global learning load failed:', e);
    }
  }, [symbol]);

  // Save patterns (debounced)
  const savePatterns = useCallback(async (newPatterns: LearnedPatterns) => {
    const serialized = JSON.stringify(newPatterns);
    
    // Skip if nothing changed
    if (serialized === lastSavedRef.current) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      // 1. Always save to localStorage (instant)
      try {
        localStorage.setItem(`${STORAGE_KEY}_${symbol}`, serialized);
        lastSavedRef.current = serialized;
      } catch (e) {
        console.warn('[AI Learning] localStorage save failed:', e);
      }
      
      // 2. Save to DB if user is logged in
      if (userId) {
        try {
          const dbData = {
            user_id: userId,
            symbol,
            trend_accuracy: newPatterns.trendAccuracy,
            avg_velocity: newPatterns.avgVelocity,
            volatility: newPatterns.volatility,
            last_bias: newPatterns.lastBias,
            bias_changes: newPatterns.biasChanges,
            correct_predictions: newPatterns.correctPredictions,
            total_predictions: newPatterns.totalPredictions,
            support_levels: newPatterns.supportLevels,
            resistance_levels: newPatterns.resistanceLevels,
            avg_price_24h: newPatterns.avgPrice24h,
            price_range_24h: newPatterns.priceRange24h,
            whale_buy_threshold: newPatterns.whaleBuyThreshold,
            whale_sell_threshold: newPatterns.whaleSellThreshold,
            exchange_flow_sensitivity: newPatterns.exchangeFlowSensitivity,
            confidence_adjustment: newPatterns.confidenceAdjustment,
            samples_collected: newPatterns.samplesCollected,
            learning_sessions: newPatterns.learningSessions,
            last_learning_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('ai_learning_data')
            .upsert(dbData, { onConflict: 'user_id,symbol' });
          
          if (error) {
            console.warn('[AI Learning] DB save failed:', error);
          } else {
            console.log(`[AI Learning] Saved ${symbol} to DB:`, newPatterns.samplesCollected, 'samples');
          }
        } catch (e) {
          console.warn('[AI Learning] DB save error:', e);
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, [symbol, userId]);

  // Update patterns with new learning
  const updatePatterns = useCallback((updates: Partial<LearnedPatterns>) => {
    setPatterns(prev => {
      const updated = { ...prev, ...updates };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Record a prediction for accuracy tracking
  const recordPrediction = useCallback((bias: 'LONG' | 'SHORT' | 'NEUTRAL', confidence: number) => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        totalPredictions: prev.totalPredictions + 1,
        lastBias: bias,
        biasChanges: prev.lastBias !== bias ? prev.biasChanges + 1 : prev.biasChanges
      };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Record prediction outcome (from user feedback)
  const recordOutcome = useCallback(async (wasCorrect: boolean, bias: 'LONG' | 'SHORT' | 'NEUTRAL') => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        correctPredictions: wasCorrect ? prev.correctPredictions + 1 : prev.correctPredictions,
        // Adjust confidence based on outcome
        confidenceAdjustment: wasCorrect 
          ? Math.min(10, prev.confidenceAdjustment + 0.5)  // Boost if correct
          : Math.max(-10, prev.confidenceAdjustment - 1)   // Penalize if wrong
      };
      savePatterns(updated);
      return updated;
    });
    
    // Contribute to global learning
    if (userId) {
      try {
        await supabase.rpc('contribute_to_global_learning', {
          p_symbol: symbol,
          p_trend_accuracy: patternsRef.current.trendAccuracy,
          p_volatility: patternsRef.current.volatility,
          p_bias: bias,
          p_was_correct: wasCorrect
        });
      } catch (e) {
        console.warn('[AI Learning] Global contribution failed:', e);
      }
    }
  }, [symbol, userId, savePatterns]);

  // Add price level to memory
  const learnPriceLevel = useCallback((price: number, type: 'support' | 'resistance') => {
    setPatterns(prev => {
      const levels = type === 'support' ? prev.supportLevels : prev.resistanceLevels;
      
      // Only add if significantly different from existing levels (>1% difference)
      const isDuplicate = levels.some(l => Math.abs(l - price) / price < 0.01);
      if (isDuplicate) return prev;
      
      // Keep last 10 levels
      const newLevels = [...levels, price].slice(-10);
      
      const updated = type === 'support'
        ? { ...prev, supportLevels: newLevels }
        : { ...prev, resistanceLevels: newLevels };
      
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Increment learning session
  const startLearningSession = useCallback(() => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        learningSessions: prev.learningSessions + 1
      };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Get accuracy percentage
  const getAccuracy = useCallback(() => {
    if (patterns.totalPredictions === 0) return null;
    return (patterns.correctPredictions / patterns.totalPredictions) * 100;
  }, [patterns.correctPredictions, patterns.totalPredictions]);

  // Get confidence modifier based on learning
  const getConfidenceModifier = useCallback(() => {
    // Combine personal learning with global wisdom
    let modifier = patterns.confidenceAdjustment;
    
    if (globalLearning && globalLearning.contributorCount > 10) {
      // Weight global accuracy into confidence
      const globalAccuracyBonus = (globalLearning.accuracyPercentage - 50) / 10;
      modifier += globalAccuracyBonus * 0.3; // 30% weight to global
    }
    
    return Math.max(-15, Math.min(15, modifier));
  }, [patterns.confidenceAdjustment, globalLearning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Force save on unmount
        const serialized = JSON.stringify(patternsRef.current);
        localStorage.setItem(`${STORAGE_KEY}_${symbol}`, serialized);
      }
    };
  }, [symbol]);

  return {
    patterns,
    globalLearning,
    isLoading,
    updatePatterns,
    recordPrediction,
    recordOutcome,
    learnPriceLevel,
    startLearningSession,
    getAccuracy,
    getConfidenceModifier
  };
}

export default useAILearning;
