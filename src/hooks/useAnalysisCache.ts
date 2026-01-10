import { useState, useCallback } from 'react';

// No caching - always use real-time data
export interface CachedAnalysis {
  symbol: string;
  analysis: string;
  price: number;
  change: number;
  timestamp: number;
  version: string;
}

export function useAnalysisCache(symbol: string) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  // No-op functions - caching disabled for real-time only mode
  const cacheAnalysis = useCallback((analysis: string, price: number, change: number) => {
    // No caching - real-time only
  }, []);

  const useCachedAnalysis = useCallback(() => {
    return null; // No cache
  }, []);

  const clearCache = useCallback(() => {
    // No cache to clear
  }, []);

  const markFreshData = useCallback(() => {
    // Always fresh
  }, []);

  const getCacheAge = useCallback(() => {
    return null;
  }, []);

  return {
    cachedAnalysis: null,
    isOffline,
    isUsingCache: false,
    lastCacheTime: null,
    cacheAnalysis,
    useCachedAnalysis,
    clearCache,
    markFreshData,
    getCacheAge,
    hasCache: false,
  };
}
