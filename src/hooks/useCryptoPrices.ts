import { useState, useEffect, useCallback, useRef } from "react";

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number;
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number;
}

// Stablecoins to exclude
const STABLECOINS = [
  "usdt", "usdc", "busd", "dai", "tusd", "usdp", "usdd", "gusd", 
  "frax", "lusd", "susd", "eurs", "usdj", "fdusd", "pyusd", "eurc",
  "xaut", "paxg", "ustc"
];

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef1 = useRef<WebSocket | null>(null);
  const wsRef2 = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);
  const cryptoListRef = useRef<{ symbol: string; name: string; id: string }[]>([]);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch top 150 from CoinGecko to ensure we get 100 after filtering stablecoins
      const response = await fetch(
        `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from CoinGecko");
      }
      
      const data: CoinGeckoCoin[] = await response.json();
      
      // Filter out stablecoins and take top 100
      const filteredData = data
        .filter(coin => !STABLECOINS.includes(coin.symbol.toLowerCase()))
        .slice(0, 100);
      
      // Store the crypto list for WebSocket connections
      cryptoListRef.current = filteredData.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id
      }));
      
      const cryptoPrices: CryptoPrice[] = filteredData.map((coin, index) => ({
        id: coin.id,
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        current_price: coin.current_price || 0,
        price_change_percentage_24h: coin.price_change_percentage_24h || 0,
        high_24h: coin.high_24h || 0,
        low_24h: coin.low_24h || 0,
        total_volume: coin.total_volume || 0,
        market_cap: coin.market_cap || 0,
        market_cap_rank: index + 1,
      }));
      
      setPrices(cryptoPrices);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (isConnectedRef.current || cryptoListRef.current.length === 0) return;
    isConnectedRef.current = true;

    // Close existing connections
    if (wsRef1.current) wsRef1.current.close();
    if (wsRef2.current) wsRef2.current.close();

    // Build stream list from dynamically fetched cryptos
    const cryptoList = cryptoListRef.current;
    const first50 = cryptoList.slice(0, 50).map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join("/");
    const second50 = cryptoList.slice(50).map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join("/");

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.data) {
          const ticker = message.data;
          const symbol = ticker.s.replace("USDT", "").toLowerCase();
          
          setPrices(prev => prev.map(coin => {
            if (coin.symbol === symbol) {
              return {
                ...coin,
                current_price: parseFloat(ticker.c),
                price_change_percentage_24h: parseFloat(ticker.P),
                high_24h: parseFloat(ticker.h),
                low_24h: parseFloat(ticker.l),
                total_volume: parseFloat(ticker.q),
              };
            }
            return coin;
          }));
        }
      } catch (e) {
        console.error("WebSocket parse error:", e);
      }
    };

    const handleClose = () => {
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    // First WebSocket for coins 1-50
    const ws1 = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${first50}`);
    ws1.onmessage = handleMessage;
    ws1.onerror = () => console.error("WebSocket 1 error");
    ws1.onclose = handleClose;
    wsRef1.current = ws1;

    // Second WebSocket for coins 51-100
    if (second50) {
      const ws2 = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${second50}`);
      ws2.onmessage = handleMessage;
      ws2.onerror = () => console.error("WebSocket 2 error");
      ws2.onclose = () => {};
      wsRef2.current = ws2;
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (prices.length > 0 && !isConnectedRef.current) {
      connectWebSocket();
    }
    
    return () => {
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef1.current) wsRef1.current.close();
      if (wsRef2.current) wsRef2.current.close();
    };
  }, [prices.length, connectWebSocket]);

  const getPriceBySymbol = useCallback((symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [prices]);

  const getPriceById = useCallback((id: string): CryptoPrice | undefined => {
    return prices.find((p) => p.id === id);
  }, [prices]);

  return { prices, loading, error, getPriceBySymbol, getPriceById, refetch: fetchPrices };
};

// Dynamic symbol to ID mapping based on current prices
export const symbolToId: Record<string, string> = {};
