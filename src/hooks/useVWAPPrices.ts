/**
 * useVWAPPrices Hook
 * 
 * Integrates the VWAP aggregator with the existing price data sources
 * to provide ML-filtered, volume-weighted global prices.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGlobalPriceWebSocket } from './useGlobalPriceWebSocket';
import { useOraclePrices } from './useOraclePrices';
import {
  aggregatePrices,
  createPriceDataPoint,
  calculateDynamicConfidence,
  AggregatedPrice,
  PriceDataPoint,
} from '@/lib/vwap-aggregator';

export interface VWAPPriceData {
  symbol: string;
  price: number;
  confidence: number;
  sourcesUsed: string[];
  outliersFiltered: number;
  method: 'vwap' | 'median' | 'single';
  lastUpdate: number;
}

// DeFiLlama price cache for VWAP integration
const defiLlamaCache = new Map<string, { price: number; timestamp: number }>();

// Estimated volumes by market cap ranking (for VWAP weighting)
const ESTIMATED_VOLUMES: Record<string, number> = {
  btc: 30_000_000_000,
  eth: 15_000_000_000,
  usdt: 50_000_000_000,
  usdc: 10_000_000_000,
  bnb: 1_000_000_000,
  xrp: 2_000_000_000,
  sol: 3_000_000_000,
  ada: 500_000_000,
  doge: 800_000_000,
  trx: 400_000_000,
  avax: 500_000_000,
  link: 400_000_000,
  dot: 300_000_000,
  matic: 400_000_000,
  ltc: 300_000_000,
  uni: 200_000_000,
  atom: 200_000_000,
  xlm: 100_000_000,
  etc: 150_000_000,
  apt: 200_000_000,
};

function getEstimatedVolume(symbol: string): number {
  return ESTIMATED_VOLUMES[symbol.toLowerCase()] || 50_000_000; // Default 50M
}

export function useVWAPPrices() {
  const { prices: wsPrices, connected: wsConnected } = useGlobalPriceWebSocket();
  const { prices: oraclePrices, isLive: oracleConnected } = useOraclePrices();
  
  const [vwapPrices, setVwapPrices] = useState<Map<string, VWAPPriceData>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const throttleIntervalMs = 100; // 100ms throttle for performance

  /**
   * Collect all price data points for a symbol from various sources
   */
  const collectDataPoints = useCallback((symbol: string): PriceDataPoint[] => {
    const lowerSymbol = symbol.toLowerCase();
    const dataPoints: PriceDataPoint[] = [];
    const now = Date.now();
    const estimatedVolume = getEstimatedVolume(lowerSymbol);

    // Source 1: WebSocket (primary real-time)
    const wsData = wsPrices.get(lowerSymbol);
    if (wsData && wsData.price > 0) {
      dataPoints.push(createPriceDataPoint(
        'WebSocket',
        wsData.price,
        estimatedVolume * 0.6, // 60% weight to WebSocket
        wsData.timestamp || now,
        calculateDynamicConfidence('WebSocket', wsData.timestamp || now, true)
      ));
    }

    // Source 2: Oracle prices (Pyth, etc.)
    const oracleData = oraclePrices.get(lowerSymbol);
    if (oracleData && oracleData.price > 0) {
      const sourceWeight = oracleData.source === 'Pyth' ? 0.5 : 0.3;
      dataPoints.push(createPriceDataPoint(
        oracleData.source,
        oracleData.price,
        estimatedVolume * sourceWeight,
        oracleData.lastUpdate || now,
        calculateDynamicConfidence(oracleData.source, oracleData.lastUpdate || now, false)
      ));
    }

    // Source 3: DeFiLlama cache (for gap-filling)
    const llamaData = defiLlamaCache.get(lowerSymbol);
    if (llamaData && llamaData.price > 0) {
      const age = now - llamaData.timestamp;
      // Only use if relatively fresh (< 2 minutes)
      if (age < 120000) {
        dataPoints.push(createPriceDataPoint(
          'DeFiLlama',
          llamaData.price,
          estimatedVolume * 0.2, // Lower weight for cached data
          llamaData.timestamp,
          calculateDynamicConfidence('DeFiLlama', llamaData.timestamp, true)
        ));
      }
    }

    return dataPoints;
  }, [wsPrices, oraclePrices]);

  /**
   * Process all symbols and compute VWAP prices
   */
  const processVWAPPrices = useCallback(() => {
    const now = Date.now();
    
    // Throttle updates
    if (now - lastUpdateRef.current < throttleIntervalMs) {
      return;
    }
    lastUpdateRef.current = now;

    setIsProcessing(true);

    // Collect all unique symbols
    const allSymbols = new Set<string>();
    wsPrices.forEach((_, symbol) => allSymbols.add(symbol.toLowerCase()));
    oraclePrices.forEach((_, symbol) => allSymbols.add(symbol.toLowerCase()));

    const newVwapPrices = new Map<string, VWAPPriceData>();

    allSymbols.forEach(symbol => {
      const dataPoints = collectDataPoints(symbol);
      
      if (dataPoints.length === 0) return;

      const aggregated: AggregatedPrice = aggregatePrices(dataPoints);

      if (aggregated.price > 0) {
        newVwapPrices.set(symbol, {
          symbol,
          price: aggregated.price,
          confidence: aggregated.confidence,
          sourcesUsed: aggregated.sourcesUsed,
          outliersFiltered: aggregated.outliersSilent.length,
          method: aggregated.method,
          lastUpdate: aggregated.timestamp,
        });
      }
    });

    setVwapPrices(newVwapPrices);
    setIsProcessing(false);
  }, [wsPrices, oraclePrices, collectDataPoints]);

  // Update VWAP prices when source prices change
  useEffect(() => {
    processVWAPPrices();
  }, [wsPrices, oraclePrices, processVWAPPrices]);

  /**
   * Get VWAP price for a specific symbol
   */
  const getVWAPPrice = useCallback((symbol: string): VWAPPriceData | null => {
    return vwapPrices.get(symbol.toLowerCase()) || null;
  }, [vwapPrices]);

  /**
   * Update DeFiLlama cache (call this from main price hook)
   */
  const updateDefiLlamaCache = useCallback((symbol: string, price: number) => {
    if (price > 0) {
      defiLlamaCache.set(symbol.toLowerCase(), {
        price,
        timestamp: Date.now(),
      });
    }
  }, []);

  return {
    vwapPrices,
    getVWAPPrice,
    updateDefiLlamaCache,
    isProcessing,
    isConnected: wsConnected || oracleConnected,
    stats: {
      totalSymbols: vwapPrices.size,
      wsConnected,
      oracleConnected,
    },
  };
}

/**
 * Lightweight hook for single symbol VWAP price
 */
export function useVWAPPriceForSymbol(symbol: string) {
  const { getVWAPPrice, isConnected } = useVWAPPrices();
  const [priceData, setPriceData] = useState<VWAPPriceData | null>(null);

  useEffect(() => {
    const data = getVWAPPrice(symbol);
    setPriceData(data);
  }, [symbol, getVWAPPrice]);

  return {
    ...priceData,
    isConnected,
  };
}
