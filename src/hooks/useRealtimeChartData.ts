import { useState, useEffect, useRef, useCallback } from "react";

export interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  positive: boolean;
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const useRealtimeChartData = (symbol: string) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);

  const connectWebSocket = useCallback(() => {
    if (isConnectedRef.current) return;
    
    const wsSymbol = symbol.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${wsSymbol}usdt@kline_1m`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        isConnectedRef.current = true;
        console.log(`Chart WebSocket connected for ${symbol}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.k) {
            const kline = data.k;
            const closePrice = parseFloat(kline.c);
            const openPrice = parseFloat(kline.o);
            const volume = parseFloat(kline.v);
            const closeTime = new Date(kline.T);
            
            const isPositive = closePrice >= openPrice;
            const timeStr = formatTime(closeTime);
            
            // Calculate price change from first data point
            if (lastPriceRef.current === null) {
              lastPriceRef.current = closePrice;
            }
            
            const change = ((closePrice - lastPriceRef.current) / lastPriceRef.current) * 100;
            setPriceChange(change);
            
            setChartData((prev) => {
              const newPoint: ChartDataPoint = {
                time: timeStr,
                price: closePrice,
                volume: volume,
                positive: isPositive,
              };
              
              // Check if we already have this time, update it
              const existingIndex = prev.findIndex(p => p.time === timeStr);
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = newPoint;
                return updated;
              }
              
              // Add new point, keep last 20 points
              const updated = [...prev, newPoint];
              if (updated.length > 20) {
                updated.shift();
                // Update reference price to oldest point
                if (updated.length > 0) {
                  lastPriceRef.current = updated[0].price;
                }
              }
              return updated;
            });
          }
        } catch (e) {
          console.error("Chart WebSocket parse error:", e);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`Chart WebSocket error for ${symbol}:`, error);
      };
      
      ws.onclose = () => {
        isConnectedRef.current = false;
        console.log(`Chart WebSocket closed for ${symbol}`);
        
        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [symbol]);

  // Fetch initial historical data
  const fetchHistoricalData = useCallback(async () => {
    try {
      const wsSymbol = symbol.toUpperCase();
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${wsSymbol}USDT&interval=1m&limit=20`
      );
      
      if (!response.ok) throw new Error("Failed to fetch historical data");
      
      const data = await response.json();
      
      const historicalData: ChartDataPoint[] = data.map((kline: any[]) => {
        const closeTime = new Date(kline[6]);
        const openPrice = parseFloat(kline[1]);
        const closePrice = parseFloat(kline[4]);
        const volume = parseFloat(kline[5]);
        
        return {
          time: formatTime(closeTime),
          price: closePrice,
          volume: volume,
          positive: closePrice >= openPrice,
        };
      });
      
      if (historicalData.length > 0) {
        lastPriceRef.current = historicalData[0].price;
        const latestPrice = historicalData[historicalData.length - 1].price;
        const change = ((latestPrice - historicalData[0].price) / historicalData[0].price) * 100;
        setPriceChange(change);
      }
      
      setChartData(historicalData);
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    }
  }, [symbol]);

  useEffect(() => {
    // Reset state when symbol changes
    setChartData([]);
    lastPriceRef.current = null;
    setPriceChange(0);
    isConnectedRef.current = false;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Fetch historical data first, then connect WebSocket
    fetchHistoricalData().then(() => {
      connectWebSocket();
    });
    
    return () => {
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, fetchHistoricalData, connectWebSocket]);

  return { chartData, priceChange };
};
