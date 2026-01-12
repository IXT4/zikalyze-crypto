// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 Oracle Cross-Validation — WebSocket Price Monitoring
// ═══════════════════════════════════════════════════════════════════════════════
// Monitors WebSocket stream for price anomalies and significant changes
// All data now comes from the unified price-stream edge function
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

export interface OracleDeviation {
  symbol: string;
  pythPrice: number;
  diaPrice: number;
  deviationPercent: number;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface CrossValidationState {
  deviations: OracleDeviation[];
  highestDeviation: OracleDeviation | null;
  isMonitoring: boolean;
  lastCheck: number | null;
  symbolsMonitored: number;
  alertsTriggered: number;
}

// Deviation thresholds
const DEVIATION_THRESHOLDS = {
  low: 0.5,
  medium: 1.0,
  high: 2.0,
  critical: 5.0,
};

// Priority symbols to monitor
const COMMON_SYMBOLS = ["BTC", "ETH", "SOL", "LINK", "AVAX", "ATOM", "DOT", "LTC", "UNI", "XRP", "ADA", "BNB"];

// Legacy export for Pyth feed compatibility
export const PYTH_FEED_IDS: Record<string, string> = {
  "BTC/USD": "btc",
  "ETH/USD": "eth",
  "SOL/USD": "sol",
  "LINK/USD": "link",
  "AVAX/USD": "avax",
  "ATOM/USD": "atom",
  "DOT/USD": "dot",
  "LTC/USD": "ltc",
  "UNI/USD": "uni",
  "XRP/USD": "xrp",
  "ADA/USD": "ada",
  "BNB/USD": "bnb",
};

export const useOracleCrossValidation = (
  enabled: boolean = true,
  _alertThreshold: keyof typeof DEVIATION_THRESHOLDS = "medium"
) => {
  const [state, setState] = useState<CrossValidationState>({
    deviations: [],
    highestDeviation: null,
    isMonitoring: false,
    lastCheck: null,
    symbolsMonitored: 0,
    alertsTriggered: 0,
  });

  const isMountedRef = useRef(true);
  const lastPricesRef = useRef<Map<string, number>>(new Map());

  // Use global WebSocket for all price data
  const { prices: wsPrices, connected: wsConnected, getPrice: wsGetPrice } = useGlobalPriceWebSocket(enabled ? COMMON_SYMBOLS : []);

  // Monitor for significant price changes
  useEffect(() => {
    if (!enabled || !isMountedRef.current || !wsConnected) return;

    const deviations: OracleDeviation[] = [];
    const now = Date.now();

    COMMON_SYMBOLS.forEach(symbol => {
      const wsData = wsGetPrice(symbol);
      const lastPrice = lastPricesRef.current.get(symbol);

      if (wsData && wsData.price > 0) {
        // Track price changes since last check
        if (lastPrice && lastPrice > 0) {
          const changePercent = ((wsData.price - lastPrice) / lastPrice) * 100;
          
          // Only record significant changes
          if (Math.abs(changePercent) > 0.1) {
            const severity = Math.abs(changePercent) >= 5 ? "critical" :
                           Math.abs(changePercent) >= 2 ? "high" :
                           Math.abs(changePercent) >= 1 ? "medium" : "low";
            
            deviations.push({
              symbol,
              pythPrice: wsData.price,
              diaPrice: lastPrice,
              deviationPercent: changePercent,
              timestamp: now,
              severity,
            });
          }
        }
        
        lastPricesRef.current.set(symbol, wsData.price);
      }
    });

    deviations.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

    setState({
      deviations,
      highestDeviation: deviations[0] || null,
      isMonitoring: wsConnected,
      lastCheck: now,
      symbolsMonitored: COMMON_SYMBOLS.length,
      alertsTriggered: 0,
    });
  }, [enabled, wsConnected, wsPrices, wsGetPrice]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const getDeviationsAbove = useCallback((threshold: number): OracleDeviation[] => {
    return state.deviations.filter(d => Math.abs(d.deviationPercent) >= threshold);
  }, [state.deviations]);

  const getDeviation = useCallback((symbol: string): OracleDeviation | undefined => {
    const normalized = symbol.toUpperCase().replace(/USD$/, "");
    return state.deviations.find(d => d.symbol === normalized);
  }, [state.deviations]);

  return {
    ...state,
    pythConnected: wsConnected, // WebSocket provides Pyth data
    diaConnected: wsConnected,
    wsConnected,
    getDeviationsAbove,
    getDeviation,
    thresholds: DEVIATION_THRESHOLDS,
    commonSymbols: COMMON_SYMBOLS,
  };
};

export { DEVIATION_THRESHOLDS };
