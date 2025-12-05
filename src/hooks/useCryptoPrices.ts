import { useState, useEffect } from "react";

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
}

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const CRYPTO_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "dogecoin",
  "binancecoin",
  "cardano",
  "avalanche-2",
];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(",")}&order=market_cap_desc&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }
      
      const data = await response.json();
      setPrices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getPriceBySymbol = (symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  };

  return { prices, loading, error, getPriceBySymbol, refetch: fetchPrices };
};

export const symbolToId: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  BNB: "binancecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
};
