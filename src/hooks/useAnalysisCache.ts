import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY_PREFIX = 'zikalyze_analysis_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedAnalysis {
  symbol: string;
  analysis: string;
  price: number;
  change: number;
  timestamp: number;
  version: string;
}

interface AnalysisCacheState {
  cachedAnalysis: CachedAnalysis | null;
  isOffline: boolean;
  isUsingCache: boolean;
  lastCacheTime: Date | null;
}

export function useAnalysisCache(symbol: string) {
  const [state, setState] = useState<AnalysisCacheState>({
    cachedAnalysis: null,
    isOffline: !navigator.onLine,
    isUsingCache: false,
    lastCacheTime: null,
  });

  const cacheKey = `${CACHE_KEY_PREFIX}${symbol.toUpperCase()}`;

  // Load cached analysis on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: CachedAnalysis = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (within 24 hours)
        if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
          setState(prev => ({
            ...prev,
            cachedAnalysis: parsed,
            lastCacheTime: new Date(parsed.timestamp),
          }));
        } else {
          // Clear expired cache
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error loading cached analysis:', error);
    }
  }, [cacheKey]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save analysis to cache
  const cacheAnalysis = useCallback((analysis: string, price: number, change: number) => {
    const cacheData: CachedAnalysis = {
      symbol: symbol.toUpperCase(),
      analysis,
      price,
      change,
      timestamp: Date.now(),
      version: 'v10.0',
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setState(prev => ({
        ...prev,
        cachedAnalysis: cacheData,
        lastCacheTime: new Date(cacheData.timestamp),
        isUsingCache: false,
      }));
      console.log(`📦 Analysis cached for ${symbol}`);
    } catch (error) {
      console.error('Error caching analysis:', error);
    }
  }, [cacheKey, symbol]);

  // Get cached analysis (mark as using cache)
  const useCachedAnalysis = useCallback(() => {
    if (state.cachedAnalysis) {
      setState(prev => ({ ...prev, isUsingCache: true }));
      return state.cachedAnalysis;
    }
    return null;
  }, [state.cachedAnalysis]);

  // Clear cache for this symbol
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
      setState(prev => ({
        ...prev,
        cachedAnalysis: null,
        lastCacheTime: null,
        isUsingCache: false,
      }));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [cacheKey]);

  // Mark as no longer using cache (fresh data received)
  const markFreshData = useCallback(() => {
    setState(prev => ({ ...prev, isUsingCache: false }));
  }, []);

  // Get time since last cache
  const getCacheAge = useCallback(() => {
    if (!state.lastCacheTime) return null;
    
    const ageMs = Date.now() - state.lastCacheTime.getTime();
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  }, [state.lastCacheTime]);

  return {
    cachedAnalysis: state.cachedAnalysis,
    isOffline: state.isOffline,
    isUsingCache: state.isUsingCache,
    lastCacheTime: state.lastCacheTime,
    cacheAnalysis,
    useCachedAnalysis,
    clearCache,
    markFreshData,
    getCacheAge,
    hasCache: !!state.cachedAnalysis,
  };
}
