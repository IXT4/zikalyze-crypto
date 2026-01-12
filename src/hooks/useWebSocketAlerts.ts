// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 useWebSocketAlerts — Real-Time Price Alert Detection via WebSocket
// ═══════════════════════════════════════════════════════════════════════════════
// Monitors the global WebSocket price stream for user-defined alert thresholds
// Uses the singleton useGlobalPriceWebSocket for efficiency
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from "react";
import { usePriceAlerts } from "./usePriceAlerts";
import { useGlobalPriceWebSocket, WebSocketPriceData } from "./useGlobalPriceWebSocket";

interface AlertCheckResult {
  triggered: boolean;
  alertId: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  condition: "above" | "below";
}

export function useWebSocketAlerts(enabledSymbols: string[] = []) {
  const { alerts, checkAlerts: checkDatabaseAlerts } = usePriceAlerts();
  const ws = useGlobalPriceWebSocket(enabledSymbols);
  
  const lastCheckRef = useRef<Map<string, number>>(new Map());
  const alertsCheckedRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  
  // Convert WebSocket prices to the format expected by checkAlerts
  const convertPricesToCheckFormat = useCallback((
    prices: Map<string, WebSocketPriceData>
  ): { symbol: string; current_price: number; price_change_percentage_24h?: number; total_volume?: number }[] => {
    const result: { symbol: string; current_price: number; price_change_percentage_24h?: number; total_volume?: number }[] = [];
    
    prices.forEach((update, symbol) => {
      result.push({
        symbol,
        current_price: update.price,
        price_change_percentage_24h: 0,
        total_volume: 0,
      });
    });
    
    return result;
  }, []);
  
  // Check for instant alert triggers from WebSocket
  const checkInstantAlerts = useCallback((priceUpdate: WebSocketPriceData): AlertCheckResult[] => {
    const results: AlertCheckResult[] = [];
    const symbol = priceUpdate.symbol.toUpperCase();
    const price = priceUpdate.price;
    
    // Check against all active alerts
    for (const alert of alerts) {
      if (alert.symbol.toUpperCase() !== symbol) continue;
      if (alertsCheckedRef.current.has(alert.id)) continue;
      
      let triggered = false;
      
      if (alert.condition === "above" && price >= alert.target_price) {
        triggered = true;
      } else if (alert.condition === "below" && price <= alert.target_price) {
        triggered = true;
      }
      
      if (triggered) {
        alertsCheckedRef.current.add(alert.id);
        results.push({
          triggered: true,
          alertId: alert.id,
          symbol,
          targetPrice: alert.target_price,
          currentPrice: price,
          condition: alert.condition,
        });
      }
    }
    
    return results;
  }, [alerts]);
  
  // Monitor WebSocket prices for alert conditions
  useEffect(() => {
    if (!ws.connected || ws.prices.size === 0) return;
    
    const now = Date.now();
    
    // Throttle checking to every 250ms per symbol
    ws.prices.forEach((update, symbol) => {
      const lastCheck = lastCheckRef.current.get(symbol) || 0;
      if (now - lastCheck < 250) return;
      
      lastCheckRef.current.set(symbol, now);
      
      // Check for instant triggers
      const triggeredAlerts = checkInstantAlerts(update);
      
      // Process triggered alerts (the main checkAlerts handles notifications)
      if (triggeredAlerts.length > 0) {
        console.log(`[WSAlerts] ${triggeredAlerts.length} alerts triggered for ${symbol}`);
      }
    });
    
    // Also run the full database check periodically
    if (mountedRef.current && ws.prices.size > 0) {
      const pricesArray = convertPricesToCheckFormat(ws.prices);
      checkDatabaseAlerts(pricesArray);
    }
  }, [ws.prices, ws.connected, checkInstantAlerts, checkDatabaseAlerts, convertPricesToCheckFormat]);
  
  // Clear checked alerts when alerts list changes
  useEffect(() => {
    const currentAlertIds = new Set(alerts.map(a => a.id));
    
    // Remove checked entries for alerts that no longer exist
    alertsCheckedRef.current.forEach(id => {
      if (!currentAlertIds.has(id)) {
        alertsCheckedRef.current.delete(id);
      }
    });
  }, [alerts]);
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return {
    wsConnected: ws.connected,
    wsTicksPerSecond: ws.ticksPerSecond,
    alertCount: alerts.length,
    pricesTracked: ws.prices.size,
  };
}
