import { useState, useEffect, useRef, useCallback } from "react";
import { usePythPrices, PythPriceData, PYTH_FEED_IDS } from "./usePythPrices";
import { useChainlinkPrices, ChainlinkPriceData, CHAINLINK_FEEDS_ETH } from "./useChainlinkPrices";
import { toast } from "sonner";

// Oracle Cross-Validation Hook
// Compares Pyth and Chainlink prices to detect significant deviations

export interface OracleDeviation {
  symbol: string;
  pythPrice: number;
  chainlinkPrice: number;
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

// Get symbols that exist in both oracles - limit to top assets to reduce API calls
const getCommonSymbols = (): string[] => {
  const pythSymbols = Object.keys(PYTH_FEED_IDS).map(s => s.replace("/USD", ""));
  const chainlinkSymbols = Object.keys(CHAINLINK_FEEDS_ETH).map(s => s.replace("/USD", ""));
  
  // Only monitor top assets that exist in both oracles
  const prioritySymbols = ["BTC", "ETH", "SOL", "LINK", "AAVE", "UNI", "AVAX", "ATOM", "DOT", "LTC"];
  return prioritySymbols.filter(s => pythSymbols.includes(s) && chainlinkSymbols.includes(s));
};

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

  const commonSymbols = getCommonSymbols();
  const alertCooldownRef = useRef<Map<string, number>>(new Map());
  const alertsTriggeredRef = useRef(0);
  const isMountedRef = useRef(true);

  // Connect to both oracles for common symbols
  const pyth = usePythPrices(enabled ? commonSymbols : []);
  const chainlink = useChainlinkPrices(enabled ? commonSymbols : []);

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
    const { symbol, pythPrice, chainlinkPrice, deviationPercent, severity } = deviation;
    
    // Update cooldown
    alertCooldownRef.current.set(symbol, Date.now());
    alertsTriggeredRef.current++;

    // Toast notification based on severity
    const deviationStr = deviationPercent >= 0 ? `+${deviationPercent.toFixed(2)}%` : `${deviationPercent.toFixed(2)}%`;
    
    const message = `${symbol}: Pyth $${pythPrice.toLocaleString()} vs Chainlink $${chainlinkPrice.toLocaleString()} (${deviationStr})`;

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
    if (!pyth.isConnected && !chainlink.isConnected) return;

    const deviations: OracleDeviation[] = [];
    const now = Date.now();

    commonSymbols.forEach(symbol => {
      const pythData = pyth.getPrice(symbol);
      const chainlinkData = chainlink.getPrice(symbol);

      if (pythData && chainlinkData && pythData.price > 0 && chainlinkData.price > 0) {
        // Calculate percentage deviation: (Pyth - Chainlink) / Chainlink * 100
        const deviationPercent = ((pythData.price - chainlinkData.price) / chainlinkData.price) * 100;
        const severity = getSeverity(deviationPercent);

        const deviation: OracleDeviation = {
          symbol,
          pythPrice: pythData.price,
          chainlinkPrice: chainlinkData.price,
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

    setState(prev => ({
      deviations,
      highestDeviation: deviations[0] || null,
      isMonitoring: pyth.isConnected || chainlink.isConnected,
      lastCheck: now,
      symbolsMonitored: deviations.length,
      alertsTriggered: alertsTriggeredRef.current,
    }));

  }, [enabled, pyth.prices, chainlink.prices, pyth.isConnected, chainlink.isConnected, commonSymbols, pyth, chainlink, getSeverity, shouldAlert, triggerAlert]);

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
    chainlinkConnected: chainlink.isConnected,
    getDeviationsAbove,
    getDeviation,
    thresholds: DEVIATION_THRESHOLDS,
    commonSymbols,
  };
};

export { DEVIATION_THRESHOLDS };
