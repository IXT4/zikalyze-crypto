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

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

const BINANCE_API = "https://api.binance.com/api/v3";

// Top 100 crypto symbols (excluding stablecoins) + GoMining
const TOP_CRYPTOS: { symbol: string; name: string; id: string }[] = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", id: "ethereum" },
  { symbol: "BNB", name: "BNB", id: "binancecoin" },
  { symbol: "SOL", name: "Solana", id: "solana" },
  { symbol: "XRP", name: "XRP", id: "ripple" },
  { symbol: "DOGE", name: "Dogecoin", id: "dogecoin" },
  { symbol: "ADA", name: "Cardano", id: "cardano" },
  { symbol: "AVAX", name: "Avalanche", id: "avalanche-2" },
  { symbol: "TRX", name: "TRON", id: "tron" },
  { symbol: "TON", name: "Toncoin", id: "the-open-network" },
  { symbol: "LINK", name: "Chainlink", id: "chainlink" },
  { symbol: "SHIB", name: "Shiba Inu", id: "shiba-inu" },
  { symbol: "DOT", name: "Polkadot", id: "polkadot" },
  { symbol: "BCH", name: "Bitcoin Cash", id: "bitcoin-cash" },
  { symbol: "LTC", name: "Litecoin", id: "litecoin" },
  { symbol: "UNI", name: "Uniswap", id: "uniswap" },
  { symbol: "NEAR", name: "NEAR Protocol", id: "near" },
  { symbol: "APT", name: "Aptos", id: "aptos" },
  { symbol: "PEPE", name: "Pepe", id: "pepe" },
  { symbol: "ICP", name: "Internet Computer", id: "internet-computer" },
  { symbol: "ETC", name: "Ethereum Classic", id: "ethereum-classic" },
  { symbol: "RNDR", name: "Render", id: "render-token" },
  { symbol: "FET", name: "Fetch.ai", id: "fetch-ai" },
  { symbol: "POL", name: "Polygon", id: "matic-network" },
  { symbol: "HBAR", name: "Hedera", id: "hedera-hashgraph" },
  { symbol: "STX", name: "Stacks", id: "blockstack" },
  { symbol: "IMX", name: "Immutable", id: "immutable-x" },
  { symbol: "MNT", name: "Mantle", id: "mantle" },
  { symbol: "CRO", name: "Cronos", id: "crypto-com-chain" },
  { symbol: "VET", name: "VeChain", id: "vechain" },
  { symbol: "FIL", name: "Filecoin", id: "filecoin" },
  { symbol: "TAO", name: "Bittensor", id: "bittensor" },
  { symbol: "KAS", name: "Kaspa", id: "kaspa" },
  { symbol: "ARB", name: "Arbitrum", id: "arbitrum" },
  { symbol: "ATOM", name: "Cosmos", id: "cosmos" },
  { symbol: "OP", name: "Optimism", id: "optimism" },
  { symbol: "INJ", name: "Injective", id: "injective-protocol" },
  { symbol: "WIF", name: "dogwifhat", id: "dogwifcoin" },
  { symbol: "MKR", name: "Maker", id: "maker" },
  { symbol: "GRT", name: "The Graph", id: "the-graph" },
  { symbol: "THETA", name: "Theta Network", id: "theta-token" },
  { symbol: "XLM", name: "Stellar", id: "stellar" },
  { symbol: "FTM", name: "Fantom", id: "fantom" },
  { symbol: "RUNE", name: "THORChain", id: "thorchain" },
  { symbol: "BONK", name: "Bonk", id: "bonk" },
  { symbol: "SUI", name: "Sui", id: "sui" },
  { symbol: "SEI", name: "Sei", id: "sei-network" },
  { symbol: "AAVE", name: "Aave", id: "aave" },
  { symbol: "PYTH", name: "Pyth Network", id: "pyth-network" },
  { symbol: "FLOKI", name: "FLOKI", id: "floki" },
  { symbol: "JUP", name: "Jupiter", id: "jupiter" },
  { symbol: "ALGO", name: "Algorand", id: "algorand" },
  { symbol: "TIA", name: "Celestia", id: "celestia" },
  { symbol: "SAND", name: "The Sandbox", id: "the-sandbox" },
  { symbol: "MANA", name: "Decentraland", id: "decentraland" },
  { symbol: "AXS", name: "Axie Infinity", id: "axie-infinity" },
  { symbol: "APE", name: "ApeCoin", id: "apecoin" },
  { symbol: "GALA", name: "Gala", id: "gala" },
  { symbol: "FLOW", name: "Flow", id: "flow" },
  { symbol: "KAVA", name: "Kava", id: "kava" },
  { symbol: "XTZ", name: "Tezos", id: "tezos" },
  { symbol: "EOS", name: "EOS", id: "eos" },
  { symbol: "CHZ", name: "Chiliz", id: "chiliz" },
  { symbol: "QNT", name: "Quant", id: "quant-network" },
  { symbol: "EGLD", name: "MultiversX", id: "elrond-erd-2" },
  { symbol: "IOTA", name: "IOTA", id: "iota" },
  { symbol: "LDO", name: "Lido DAO", id: "lido-dao" },
  { symbol: "CAKE", name: "PancakeSwap", id: "pancakeswap-token" },
  { symbol: "NEO", name: "NEO", id: "neo" },
  { symbol: "CRV", name: "Curve DAO", id: "curve-dao-token" },
  { symbol: "XEC", name: "eCash", id: "ecash" },
  { symbol: "MINA", name: "Mina", id: "mina-protocol" },
  { symbol: "WLD", name: "Worldcoin", id: "worldcoin-wld" },
  { symbol: "ORDI", name: "ORDI", id: "ordinals" },
  { symbol: "SNX", name: "Synthetix", id: "havven" },
  { symbol: "ROSE", name: "Oasis Network", id: "oasis-network" },
  { symbol: "ZEC", name: "Zcash", id: "zcash" },
  { symbol: "DYDX", name: "dYdX", id: "dydx" },
  { symbol: "CFX", name: "Conflux", id: "conflux-token" },
  { symbol: "BLUR", name: "Blur", id: "blur" },
  { symbol: "AKT", name: "Akash Network", id: "akash-network" },
  { symbol: "OSMO", name: "Osmosis", id: "osmosis" },
  { symbol: "RPL", name: "Rocket Pool", id: "rocket-pool" },
  { symbol: "ZIL", name: "Zilliqa", id: "zilliqa" },
  { symbol: "GMT", name: "STEPN", id: "stepn" },
  { symbol: "ONE", name: "Harmony", id: "harmony" },
  { symbol: "ENS", name: "Ethereum Name Service", id: "ethereum-name-service" },
  { symbol: "COMP", name: "Compound", id: "compound-governance-token" },
  { symbol: "HOT", name: "Holo", id: "holotoken" },
  { symbol: "AR", name: "Arweave", id: "arweave" },
  { symbol: "ENJ", name: "Enjin Coin", id: "enjincoin" },
  { symbol: "MASK", name: "Mask Network", id: "mask-network" },
  { symbol: "1INCH", name: "1inch", id: "1inch" },
  { symbol: "CELO", name: "Celo", id: "celo" },
  { symbol: "ANKR", name: "Ankr", id: "ankr" },
  { symbol: "SKL", name: "SKALE", id: "skale" },
  { symbol: "BAT", name: "Basic Attention Token", id: "basic-attention-token" },
  { symbol: "OCEAN", name: "Ocean Protocol", id: "ocean-protocol" },
  { symbol: "STORJ", name: "Storj", id: "storj" },
  { symbol: "COTI", name: "COTI", id: "coti" },
  { symbol: "GOMINING", name: "GoMining", id: "gomining-token" },
];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch 24hr ticker data from Binance
      const response = await fetch(`${BINANCE_API}/ticker/24hr`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices from Binance");
      }
      
      const data: BinanceTicker[] = await response.json();
      
      // Filter for USDT pairs and map to our format
      const usdtPairs = data.filter(ticker => ticker.symbol.endsWith("USDT"));
      
      const cryptoPrices: CryptoPrice[] = TOP_CRYPTOS.map((crypto, index) => {
        const ticker = usdtPairs.find(t => t.symbol === `${crypto.symbol}USDT`);
        
        if (ticker) {
          return {
            id: crypto.id,
            symbol: crypto.symbol.toLowerCase(),
            name: crypto.name,
            current_price: parseFloat(ticker.lastPrice),
            price_change_percentage_24h: parseFloat(ticker.priceChangePercent),
            high_24h: parseFloat(ticker.highPrice),
            low_24h: parseFloat(ticker.lowPrice),
            total_volume: parseFloat(ticker.quoteVolume),
            market_cap: parseFloat(ticker.quoteVolume) * 10, // Approximate
            market_cap_rank: index + 1,
          };
        }
        
        return null;
      }).filter((p): p is CryptoPrice => p !== null);
      
      setPrices(cryptoPrices);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket for real-time price updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const streams = TOP_CRYPTOS.slice(0, 50).map(c => `${c.symbol.toLowerCase()}usdt@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (event) => {
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
              };
            }
            return coin;
          }));
        }
      } catch (e) {
        console.error("WebSocket parse error:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (prices.length > 0) {
          connectWebSocket();
        }
      }, 5000);
    };

    wsRef.current = ws;
  }, [prices.length]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (prices.length > 0) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [prices.length > 0]);

  const getPriceBySymbol = useCallback((symbol: string): CryptoPrice | undefined => {
    return prices.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [prices]);

  const getPriceById = useCallback((id: string): CryptoPrice | undefined => {
    return prices.find((p) => p.id === id);
  }, [prices]);

  return { prices, loading, error, getPriceBySymbol, getPriceById, refetch: fetchPrices };
};

// Extended symbol to ID mapping for top 100 cryptos
export const symbolToId: Record<string, string> = Object.fromEntries(
  TOP_CRYPTOS.map(c => [c.symbol, c.id])
);
