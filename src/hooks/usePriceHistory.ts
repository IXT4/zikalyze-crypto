import { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalPriceWebSocket } from "./useGlobalPriceWebSocket";

const MAX_HISTORY_POINTS = 20;
const MIN_UPDATE_INTERVAL = 2000; // 2 seconds between history points

interface PriceHistoryData {
  [symbol: string]: number[];
}

// Singleton storage for price history
const globalPriceHistory: PriceHistoryData = {};
const lastUpdateTime: { [symbol: string]: number } = {};

export function usePriceHistory(symbols: string[]) {
  const [history, setHistory] = useState<PriceHistoryData>({});
  const { prices, connected } = useGlobalPriceWebSocket(symbols);
  const initializedRef = useRef(false);
  
  // Initialize history for symbols
  useEffect(() => {
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      if (!globalPriceHistory[upperSymbol]) {
        globalPriceHistory[upperSymbol] = [];
        lastUpdateTime[upperSymbol] = 0;
      }
    });
    
    if (!initializedRef.current) {
      setHistory({ ...globalPriceHistory });
      initializedRef.current = true;
    }
  }, [symbols]);
  
  // Update history when prices change
  useEffect(() => {
    if (!connected) return;
    
    const now = Date.now();
    let hasUpdates = false;
    
    prices.forEach((priceData, symbol) => {
      const upperSymbol = symbol.toUpperCase();
      
      // Skip if not in our symbols list
      if (!symbols.map(s => s.toUpperCase()).includes(upperSymbol)) return;
      
      // Initialize if needed
      if (!globalPriceHistory[upperSymbol]) {
        globalPriceHistory[upperSymbol] = [];
        lastUpdateTime[upperSymbol] = 0;
      }
      
      // Only add point if enough time has passed
      if (now - lastUpdateTime[upperSymbol] >= MIN_UPDATE_INTERVAL) {
        const historyArray = globalPriceHistory[upperSymbol];
        const lastPrice = historyArray[historyArray.length - 1];
        
        // Only add if price changed
        if (lastPrice === undefined || Math.abs(priceData.price - lastPrice) > 0.0001) {
          historyArray.push(priceData.price);
          
          // Trim to max points
          if (historyArray.length > MAX_HISTORY_POINTS) {
            historyArray.shift();
          }
          
          lastUpdateTime[upperSymbol] = now;
          hasUpdates = true;
        }
      }
    });
    
    if (hasUpdates) {
      setHistory({ ...globalPriceHistory });
    }
  }, [prices, connected, symbols]);
  
  const getHistory = useCallback((symbol: string): number[] => {
    return globalPriceHistory[symbol.toUpperCase()] || [];
  }, [history]);
  
  return { history, getHistory };
}
