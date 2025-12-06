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

const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Stablecoins to exclude
const STABLECOINS = [
  "tether", "usd-coin", "dai", "binance-usd", "trueusd", "paxos-standard",
  "usdd", "frax", "gemini-dollar", "paypal-usd", "first-digital-usd",
  "ethena-usde", "usual-usd", "fdusd", "ondo-us-dollar-yield"
];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pricesRef = useRef<CryptoPrice[]>([]);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch top 150 to ensure we get 100 after filtering stablecoins
      const response = await fetch(
        `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }
      
      const data = await response.json();
      
      // Filter out stablecoins and take top 100
      let filtered = data.filter((coin: CryptoPrice) => 
        !STABLECOINS.includes(coin.id)
      );
      
      // Add GoMining token if not in list
      const hasGoMining = filtered.some((c: CryptoPrice) => c.id === "gomining-token");
      if (!hasGoMining) {
        try {
          const gominingRes = await fetch(
            `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=gomining-token&sparkline=false`
          );
          if (gominingRes.ok) {
            const gominingData = await gominingRes.json();
            if (gominingData.length > 0) {
              filtered.push(gominingData[0]);
            }
          }
        } catch (e) {
          console.log("Could not fetch GoMining token");
        }
      }
      
      // Take top 100
      const top100 = filtered.slice(0, 100);
      
      setPrices(top100);
      pricesRef.current = top100;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket for live price updates
  const connectWebSocket = useCallback(() => {
    if (pricesRef.current.length === 0) return;

    // Use CoinGecko's free polling as WebSocket fallback
    // Since CoinGecko doesn't have free WebSocket, we'll use faster polling
    const interval = setInterval(() => {
      if (pricesRef.current.length > 0) {
        const ids = pricesRef.current.map(p => p.id).join(",");
        fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`)
          .then(res => res.json())
          .then(data => {
            setPrices(prev => prev.map(coin => {
              const update = data[coin.id];
              if (update) {
                return {
                  ...coin,
                  current_price: update.usd || coin.current_price,
                  price_change_percentage_24h: update.usd_24h_change || coin.price_change_percentage_24h
                };
              }
              return coin;
            }));
          })
          .catch(() => {});
      }
    }, 10000); // Update every 10 seconds for live feel

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (prices.length > 0) {
      const cleanup = connectWebSocket();
      return cleanup;
    }
  }, [prices.length, connectWebSocket]);

  const getPriceBySymbol = useCallback((symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [prices]);

  const getPriceById = useCallback((id: string): CryptoPrice | undefined => {
    return prices.find((p) => p.id === id);
  }, [prices]);

  return { prices, loading, error, getPriceBySymbol, getPriceById, refetch: fetchPrices };
};

// Extended symbol to ID mapping for top 100 cryptos
export const symbolToId: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  BNB: "binancecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  TRX: "tron",
  TON: "the-open-network",
  LINK: "chainlink",
  SHIB: "shiba-inu",
  DOT: "polkadot",
  BCH: "bitcoin-cash",
  LEO: "leo-token",
  LTC: "litecoin",
  UNI: "uniswap",
  NEAR: "near",
  APT: "aptos",
  PEPE: "pepe",
  ICP: "internet-computer",
  ETC: "ethereum-classic",
  RNDR: "render-token",
  FET: "fetch-ai",
  POL: "matic-network",
  HBAR: "hedera-hashgraph",
  STX: "blockstack",
  IMX: "immutable-x",
  MNT: "mantle",
  CRO: "crypto-com-chain",
  VET: "vechain",
  FIL: "filecoin",
  TAO: "bittensor",
  KAS: "kaspa",
  ARB: "arbitrum",
  ATOM: "cosmos",
  OKB: "okb",
  OP: "optimism",
  INJ: "injective-protocol",
  WIF: "dogwifcoin",
  MKR: "maker",
  GRT: "the-graph",
  THETA: "theta-token",
  XLM: "stellar",
  FTM: "fantom",
  RUNE: "thorchain",
  BONK: "bonk",
  SUI: "sui",
  SEI: "sei-network",
  AAVE: "aave",
  PYTH: "pyth-network",
  FLOKI: "floki",
  JUP: "jupiter",
  ALGO: "algorand",
  TIA: "celestia",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  APE: "apecoin",
  GALA: "gala",
  FLOW: "flow",
  KAVA: "kava",
  XTZ: "tezos",
  EOS: "eos",
  CHZ: "chiliz",
  QNT: "quant-network",
  EGLD: "elrond-erd-2",
  IOTA: "iota",
  LDO: "lido-dao",
  CAKE: "pancakeswap-token",
  NEO: "neo",
  CRV: "curve-dao-token",
  XEC: "ecash",
  MINA: "mina-protocol",
  WLD: "worldcoin-wld",
  BTT: "bittorrent",
  ORDI: "ordinals",
  SNX: "havven",
  ROSE: "oasis-network",
  ZEC: "zcash",
  KCS: "kucoin-shares",
  DYDX: "dydx",
  CFX: "conflux-token",
  BLUR: "blur",
  AKT: "akash-network",
  NEXO: "nexo",
  OSMO: "osmosis",
  RPL: "rocket-pool",
  ZIL: "zilliqa",
  GMT: "stepn",
  ONE: "harmony",
  ENS: "ethereum-name-service",
  COMP: "compound-governance-token",
  HOT: "holotoken",
  AR: "arweave",
  GOMINING: "gomining-token",
};
