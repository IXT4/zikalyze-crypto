// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 Oracle Cross-Validation — WebSocket vs Pyth Comparison
// ═══════════════════════════════════════════════════════════════════════════════
// Compares WebSocket stream prices with Pyth SSE to detect significant deviations
// DIA removed due to persistent 404 errors - now uses WebSocket + Pyth only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";
import { toast } from "sonner";

export interface OracleDeviation {
  symbol: string;
  pythPrice: number;
  diaPrice: number; // Now actually WebSocket price (kept for compatibility)
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

const ALERT_COOLDOWN_MS = 60 * 1000;

// Priority symbols to monitor
const COMMON_SYMBOLS = ["BTC", "ETH", "SOL", "LINK", "AVAX", "ATOM", "DOT", "LTC", "UNI", "XRP", "ADA", "BNB"];

export const useOracleCrossValidation = (
  enabled: boolean = true,
  alertThreshold: keyof typeof DEVIATION_THRESHOLDS = "medium"
) => {
  const [state, setState] = useState<CrossValidationState>({
    deviations: [],
    highestDeviation: null,
    isMonitoring: false,
    lastCheck: null,
    symbolsMonitored: 0,
    alertsTriggered: 0,
  });

  const alertCooldownRef = useRef<Map<string, number>>(new Map());
  const alertsTriggeredRef = useRef(0);
  const isMountedRef = useRef(true);

  // Connect to WebSocket and Pyth
  const { prices: wsPrices, connected: wsConnected, getPrice: wsGetPrice } = useGlobalPriceWebSocket(enabled ? COMMON_SYMBOLS : []);
  const pyth = usePythPrices(enabled ? COMMON_SYMBOLS : []);

  const getSeverity = useCallback((deviationPercent: number): OracleDeviation["severity"] => {
    const absDeviation = Math.abs(deviationPercent);
    if (absDeviation >= DEVIATION_THRESHOLDS.critical) return "critical";
    if (absDeviation >= DEVIATION_THRESHOLDS.high) return "high";
    if (absDeviation >= DEVIATION_THRESHOLDS.medium) return "medium";
    return "low";
  }, []);

  const shouldAlert = useCallback((symbol: string, severity: OracleDeviation["severity"]): boolean => {
    const lastAlert = alertCooldownRef.current.get(symbol);
    if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
      return false;
    }

    const severityOrder = ["low", "medium", "high", "critical"];
    const thresholdIndex = severityOrder.indexOf(alertThreshold);
    const severityIndex = severityOrder.indexOf(severity);
    
    return severityIndex >= thresholdIndex;
  }, [alertThreshold]);

  const triggerAlert = useCallback((deviation: OracleDeviation) => {
    const { symbol, pythPrice, diaPrice, deviationPercent, severity } = deviation;
    
    alertCooldownRef.current.set(symbol, Date.now());
    alertsTriggeredRef.current++;

    const deviationStr = deviationPercent >= 0 ? `+${deviationPercent.toFixed(2)}%` : `${deviationPercent.toFixed(2)}%`;
    const message = `${symbol}: Pyth $${pythPrice.toLocaleString()} vs Stream $${diaPrice.toLocaleString()} (${deviationStr})`;

    switch (severity) {
      case "critical":
        toast.error(`🚨 Critical Price Deviation`, { description: message, duration: 10000 });
        break;
      case "high":
        toast.warning(`⚠️ High Price Deviation`, { description: message, duration: 8000 });
        break;
      case "medium":
        toast.info(`📊 Price Deviation Detected`, { description: message, duration: 6000 });
        break;
      default:
        console.log(`[Oracle] Low deviation for ${symbol}: ${deviationStr}`);
    }
  }, []);

  // Cross-validate WebSocket vs Pyth prices
  useEffect(() => {
    if (!enabled || !isMountedRef.current) return;
    if (!wsConnected && !pyth.isConnected) return;

    const deviations: OracleDeviation[] = [];
    const now = Date.now();

    COMMON_SYMBOLS.forEach(symbol => {
      const pythData = pyth.getPrice(symbol);
      const wsData = wsGetPrice(symbol);

      if (pythData && wsData && pythData.price > 0 && wsData.price > 0) {
        // Compare Pyth vs WebSocket
        const deviationPercent = ((pythData.price - wsData.price) / wsData.price) * 100;
        const severity = getSeverity(deviationPercent);

        const deviation: OracleDeviation = {
          symbol,
          pythPrice: pythData.price,
          diaPrice: wsData.price, // Actually WebSocket price
          deviationPercent,
          timestamp: now,
          severity,
        };

        deviations.push(deviation);

        if (shouldAlert(symbol, severity) && severity !== "low") {
          triggerAlert(deviation);
        }
      }
    });

    deviations.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

    setState({
      deviations,
      highestDeviation: deviations[0] || null,
      isMonitoring: wsConnected || pyth.isConnected,
      lastCheck: now,
      symbolsMonitored: deviations.length,
      alertsTriggered: alertsTriggeredRef.current,
    });
  }, [enabled, wsConnected, pyth.isConnected, wsPrices, pyth.prices, getSeverity, shouldAlert, triggerAlert, wsGetPrice]);

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
    pythConnected: pyth.isConnected,
    diaConnected: wsConnected, // WebSocket now, legacy name kept
    wsConnected,
    getDeviationsAbove,
    getDeviation,
    thresholds: DEVIATION_THRESHOLDS,
    commonSymbols: COMMON_SYMBOLS,
  };
};

export { DEVIATION_THRESHOLDS };
