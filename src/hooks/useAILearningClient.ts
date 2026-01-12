// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 useAILearningClient — Fully Client-Side AI Learning System
// ═══════════════════════════════════════════════════════════════════════════════
// Runs 100% in the browser with IndexedDB storage and optional cloud sync
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as storage from '@/lib/clientStorage';
import { queueSync, STORES } from '@/lib/clientStorage';

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
  learningSessions: 0,
};

const SAVE_DEBOUNCE_MS = 2000;

export function useAILearningClient(symbol: string) {
  const [patterns, setPatterns] = useState<LearnedPatterns>(DEFAULT_PATTERNS);
  const [globalLearning, setGlobalLearning] = useState<GlobalLearning | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const patternsRef = useRef(patterns);

  // Keep ref in sync
  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  // Load patterns from IndexedDB
  const loadPatterns = useCallback(async () => {
    if (!symbol) return;

    setIsLoading(true);
    try {
      const savedData = await storage.getAILearning(symbol);
      
      if (savedData) {
        const loadedPatterns: LearnedPatterns = {
          trendAccuracy: savedData.trendAccuracy || 0,
          avgVelocity: savedData.avgVelocity || 0,
          volatility: savedData.volatility || 0,
          lastBias: savedData.lastBias || 'NEUTRAL',
          biasChanges: savedData.biasChanges || 0,
          correctPredictions: savedData.correctPredictions || 0,
          totalPredictions: savedData.totalPredictions || 0,
          supportLevels: savedData.supportLevels || [],
          resistanceLevels: savedData.resistanceLevels || [],
          avgPrice24h: savedData.avgPrice24h || 0,
          priceRange24h: savedData.priceRange24h || 0,
          whaleBuyThreshold: savedData.whaleBuyThreshold || 60,
          whaleSellThreshold: savedData.whaleSellThreshold || 40,
          exchangeFlowSensitivity: savedData.exchangeFlowSensitivity || 0.5,
          confidenceAdjustment: savedData.confidenceAdjustment || 0,
          samplesCollected: savedData.samplesCollected || 0,
          learningSessions: savedData.learningSessions || 0,
        };
        setPatterns(loadedPatterns);
        console.log(`[AI Learning] Loaded ${symbol}:`, loadedPatterns.samplesCollected, 'samples');
      } else {
        setPatterns(DEFAULT_PATTERNS);
      }
    } catch (err) {
      console.error('[AI Learning] Error loading patterns:', err);
      setPatterns(DEFAULT_PATTERNS);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  // Calculate global learning from all symbols
  const loadGlobalLearning = useCallback(async () => {
    try {
      const allLearning = await storage.getAllAILearning();
      
      if (allLearning.length === 0) {
        setGlobalLearning(null);
        return;
      }

      // Aggregate stats across all symbols
      const avgTrendAccuracy = allLearning.reduce((sum, d) => sum + d.trendAccuracy, 0) / allLearning.length;
      const avgVolatility = allLearning.reduce((sum, d) => sum + d.volatility, 0) / allLearning.length;
      
      // Count biases
      const biasCounts = { LONG: 0, SHORT: 0, NEUTRAL: 0 };
      allLearning.forEach(d => {
        biasCounts[d.lastBias] = (biasCounts[d.lastBias] || 0) + 1;
      });
      const consensusBias = Object.entries(biasCounts).sort((a, b) => b[1] - a[1])[0][0];
      
      // Calculate accuracy
      const totalPredictions = allLearning.reduce((sum, d) => sum + d.totalPredictions, 0);
      const correctPredictions = allLearning.reduce((sum, d) => sum + d.correctPredictions, 0);
      const accuracyPercentage = totalPredictions > 0 
        ? (correctPredictions / totalPredictions) * 100 
        : 0;

      // Find strongest support/resistance
      const allSupport = allLearning.flatMap(d => d.supportLevels);
      const allResistance = allLearning.flatMap(d => d.resistanceLevels);
      const strongSupport = allSupport.length > 0 
        ? allSupport.reduce((a, b) => a + b, 0) / allSupport.length 
        : 0;
      const strongResistance = allResistance.length > 0 
        ? allResistance.reduce((a, b) => a + b, 0) / allResistance.length 
        : 0;

      setGlobalLearning({
        avgTrendAccuracy,
        avgVolatility,
        consensusBias,
        accuracyPercentage,
        strongSupport,
        strongResistance,
        contributorCount: allLearning.length,
      });
    } catch (err) {
      console.error('[AI Learning] Error loading global learning:', err);
    }
  }, []);

  useEffect(() => {
    loadPatterns();
    loadGlobalLearning();
  }, [loadPatterns, loadGlobalLearning]);

  // Save patterns (debounced)
  const savePatterns = useCallback(async (newPatterns: LearnedPatterns) => {
    if (!symbol) return;

    const serialized = JSON.stringify(newPatterns);
    if (serialized === lastSavedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave: storage.ClientAILearning = {
          symbol,
          ...newPatterns,
          updated_at: new Date().toISOString(),
        };

        await storage.saveAILearning(dataToSave);
        lastSavedRef.current = serialized;

        // Queue for cloud sync if user is authenticated
        if (user) {
          await queueSync({
            type: 'update',
            store: STORES.AI_LEARNING,
            data: dataToSave,
          });
        }

        console.log(`[AI Learning] Saved ${symbol}:`, newPatterns.samplesCollected, 'samples');
      } catch (err) {
        console.error('[AI Learning] Error saving patterns:', err);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [symbol, user]);

  // Update patterns
  const updatePatterns = useCallback((updates: Partial<LearnedPatterns>) => {
    setPatterns(prev => {
      const updated = { ...prev, ...updates };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Record a prediction
  const recordPrediction = useCallback((bias: 'LONG' | 'SHORT' | 'NEUTRAL', _confidence: number) => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        totalPredictions: prev.totalPredictions + 1,
        lastBias: bias,
        biasChanges: prev.lastBias !== bias ? prev.biasChanges + 1 : prev.biasChanges,
      };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Record prediction outcome
  const recordOutcome = useCallback(async (wasCorrect: boolean, _bias: 'LONG' | 'SHORT' | 'NEUTRAL') => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        correctPredictions: wasCorrect ? prev.correctPredictions + 1 : prev.correctPredictions,
        confidenceAdjustment: wasCorrect
          ? Math.min(10, prev.confidenceAdjustment + 0.5)
          : Math.max(-10, prev.confidenceAdjustment - 1),
      };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Learn price levels
  const learnPriceLevel = useCallback((price: number, type: 'support' | 'resistance') => {
    setPatterns(prev => {
      const levels = type === 'support' ? prev.supportLevels : prev.resistanceLevels;
      
      const isDuplicate = levels.some(l => Math.abs(l - price) / price < 0.01);
      if (isDuplicate) return prev;

      const newLevels = [...levels, price].slice(-10);

      const updated = type === 'support'
        ? { ...prev, supportLevels: newLevels }
        : { ...prev, resistanceLevels: newLevels };

      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  // Start learning session
  const startLearningSession = useCallback(() => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        learningSessions: prev.learningSessions + 1,
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

  // Get confidence modifier
  const getConfidenceModifier = useCallback(() => {
    let modifier = patterns.confidenceAdjustment;

    if (globalLearning && globalLearning.contributorCount > 5) {
      const globalInfluence = globalLearning.accuracyPercentage > 60 ? 2 : -1;
      modifier += globalInfluence * 0.3;
    }

    return Math.max(-15, Math.min(15, modifier));
  }, [patterns.confidenceAdjustment, globalLearning]);

  // Learn from price data
  const learnFromPrice = useCallback((price: number, change: number, volatility: number) => {
    setPatterns(prev => {
      const updated = {
        ...prev,
        samplesCollected: prev.samplesCollected + 1,
        avgPrice24h: prev.samplesCollected > 0
          ? (prev.avgPrice24h * prev.samplesCollected + price) / (prev.samplesCollected + 1)
          : price,
        volatility: prev.samplesCollected > 0
          ? (prev.volatility * 0.95 + volatility * 0.05)
          : volatility,
        avgVelocity: prev.samplesCollected > 0
          ? (prev.avgVelocity * 0.9 + Math.abs(change) * 0.1)
          : Math.abs(change),
      };
      savePatterns(updated);
      return updated;
    });
  }, [savePatterns]);

  return {
    patterns,
    globalLearning,
    isLoading,
    updatePatterns,
    recordPrediction,
    recordOutcome,
    learnPriceLevel,
    startLearningSession,
    learnFromPrice,
    getAccuracy,
    getConfidenceModifier,
  };
}

// Re-export for backward compatibility
export { useAILearningClient as useAILearning };
