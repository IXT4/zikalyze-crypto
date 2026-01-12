import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PYTH_FEED_IDS } from "./usePythPrices";
import { useDIAPrices } from "./useDIAPrices";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 Oracle Cross-Validation — 100% Decentralized
// ═══════════════════════════════════════════════════════════════════════════════
// Compares Pyth and DIA oracle prices to detect significant deviations
// Both oracles are decentralized — no centralized exchange data
// ═══════════════════════════════════════════════════════════════════════════════

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
  low: 0.5,      // 0.5% - normal market variance
  medium: 1.0,   // 1.0% - noteworthy
  high: 2.0,     // 2.0% - significant
  critical: 5.0, // 5.0% - potential arbitrage or data issue
};

// Alert cooldown per symbol (prevent spam)
const ALERT_COOLDOWN_MS = 60 * 1000; // 1 minute

// DIA supported symbols (from useDIAPrices)
const DIA_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "DOT", "LINK", "UNI", "ATOM", "LTC", "MATIC", "TRX", "TON"];

// Get symbols that exist in both oracles - limit to top assets
const COMMON_SYMBOLS: string[] = (() => {
  const pythSymbols = Object.keys(PYTH_FEED_IDS).map(s => s.replace("/USD", ""));
  // Priority symbols that exist in both Pyth and DIA
  const prioritySymbols = ["BTC", "ETH", "SOL", "LINK", "AVAX", "ATOM", "DOT", "LTC", "UNI"];
  return prioritySymbols.filter(s => pythSymbols.includes(s) && DIA_SYMBOLS.includes(s));
})();

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

  // Connect to both decentralized oracles
  const pyth = usePythPrices(enabled ? COMMON_SYMBOLS : []);
  const dia = useDIAPrices();

  const getSeverity = useCallback((deviationPercent: number): OracleDeviation["severity"] => {
    const absDeviation = Math.abs(deviationPercent);
    if (absDeviation >= DEVIATION_THRESHOLDS.critical) return "critical";
    if (absDeviation >= DEVIATION_THRESHOLDS.high) return "high";
    if (absDeviation >= DEVIATION_THRESHOLDS.medium) return "medium";
    return "low";
  }, []);

  const shouldAlert = useCallback((symbol: string, severity: OracleDeviation["severity"]): boolean => {
    // Check cooldown
    const lastAlert = alertCooldownRef.current.get(symbol);
    if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
      return false;
    }

    // Check if severity meets threshold
    const severityOrder = ["low", "medium", "high", "critical"];
    const thresholdIndex = severityOrder.indexOf(alertThreshold);
    const severityIndex = severityOrder.indexOf(severity);
    
    return severityIndex >= thresholdIndex;
  }, [alertThreshold]);

  const triggerAlert = useCallback((deviation: OracleDeviation) => {
    const { symbol, pythPrice, diaPrice, deviationPercent, severity } = deviation;
    
    // Update cooldown
    alertCooldownRef.current.set(symbol, Date.now());
    alertsTriggeredRef.current++;

    // Toast notification based on severity
    const deviationStr = deviationPercent >= 0 ? `+${deviationPercent.toFixed(2)}%` : `${deviationPercent.toFixed(2)}%`;
    
    const message = `${symbol}: Pyth $${pythPrice.toLocaleString()} vs DIA $${diaPrice.toLocaleString()} (${deviationStr})`;

    switch (severity) {
      case "critical":
        toast.error(`🚨 Critical Oracle Deviation`, {
          description: message,
          duration: 10000,
        });
        break;
      case "high":
        toast.warning(`⚠️ High Oracle Deviation`, {
          description: message,
          duration: 8000,
        });
        break;
      case "medium":
        toast.info(`📊 Oracle Deviation Detected`, {
          description: message,
          duration: 6000,
        });
        break;
      default:
        // Low severity - no toast, just log
        console.log(`[Oracle] Low deviation for ${symbol}: ${deviationStr}`);
    }
  }, []);

  // Cross-validate prices whenever either oracle updates
  useEffect(() => {
    if (!enabled || !isMountedRef.current) return;
    if (!pyth.isConnected && !dia.isConnected) return;

    const deviations: OracleDeviation[] = [];
    const now = Date.now();

    COMMON_SYMBOLS.forEach(symbol => {
      const pythData = pyth.getPrice(symbol);
      const diaData = dia.getPrice(symbol);

      if (pythData && diaData && pythData.price > 0 && diaData.price > 0) {
        // Calculate percentage deviation: (Pyth - DIA) / DIA * 100
        const deviationPercent = ((pythData.price - diaData.price) / diaData.price) * 100;
        const severity = getSeverity(deviationPercent);

        const deviation: OracleDeviation = {
          symbol,
          pythPrice: pythData.price,
          diaPrice: diaData.price,
          deviationPercent,
          timestamp: now,
          severity,
        };

        deviations.push(deviation);

        // Trigger alert if needed
        if (shouldAlert(symbol, severity) && severity !== "low") {
          triggerAlert(deviation);
        }
      }
    });

    // Sort by absolute deviation (highest first)
    deviations.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

    setState({
      deviations,
      highestDeviation: deviations[0] || null,
      isMonitoring: pyth.isConnected || dia.isConnected,
      lastCheck: now,
      symbolsMonitored: deviations.length,
      alertsTriggered: alertsTriggeredRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pyth.isConnected, dia.isConnected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Get deviations above a certain threshold
  const getDeviationsAbove = useCallback((threshold: number): OracleDeviation[] => {
    return state.deviations.filter(d => Math.abs(d.deviationPercent) >= threshold);
  }, [state.deviations]);

  // Get deviation for a specific symbol
  const getDeviation = useCallback((symbol: string): OracleDeviation | undefined => {
    const normalized = symbol.toUpperCase().replace(/USD$/, "");
    return state.deviations.find(d => d.symbol === normalized);
  }, [state.deviations]);

  return {
    ...state,
    pythConnected: pyth.isConnected,
    diaConnected: dia.isConnected,
    getDeviationsAbove,
    getDeviation,
    thresholds: DEVIATION_THRESHOLDS,
    commonSymbols: COMMON_SYMBOLS,
  };
};

export { DEVIATION_THRESHOLDS };
