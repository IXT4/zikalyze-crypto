import { useState, useEffect, useRef, useCallback } from "react";

// Chainlink Price Feeds as fallback oracle
// Uses public RPC endpoints for decentralized access

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  updatedAt: number;
  roundId: string;
  source: "Chainlink";
}

export interface ChainlinkState {
  prices: Map<string, ChainlinkPriceData>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// Public RPC endpoints (decentralized, no API key required)
const ETH_RPC_ENDPOINTS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum.publicnode.com",
  "https://1rpc.io/eth",
];

const ARBITRUM_RPC_ENDPOINTS = [
  "https://arb1.arbitrum.io/rpc",
  "https://rpc.ankr.com/arbitrum",
  "https://arbitrum.publicnode.com",
];

// Chainlink Price Feed Addresses (Ethereum Mainnet)
// From: https://docs.chain.link/data-feeds/price-feeds/addresses
const CHAINLINK_FEEDS_ETH: Record<string, string> = {
  "BTC/USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  "ETH/USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "LINK/USD": "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  "AAVE/USD": "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  "UNI/USD": "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  "SNX/USD": "0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699",
  "MKR/USD": "0xec1D1B3b0443256cc3860e24a46F108e699cF2Ea",
  "COMP/USD": "0xdbd020CAeF83eFd542f4De03864e8c6C86E8e83C",
  "CRV/USD": "0xCd627aA160A6fA45Eb793D19286F3e3D4f8D99F3",
  "YFI/USD": "0xA027702dbb89fbd58e2903F4A3bCAaB8F8AC4B7F",
  "SUSHI/USD": "0xCc70F09A6CC17553b2E31954cD36E4A2d89501f7",
  "BAL/USD": "0xdF2917806E30300537aEB49A7663062F4d1F2b5F",
  "1INCH/USD": "0xc929ad75B72593967DE83E7F7Cda0493458261D9",
  "MATIC/USD": "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676",
  "SOL/USD": "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  "AVAX/USD": "0xFF3EEb22B22c1D74C8EED5E02f5D6d30a787C1e5",
  "ATOM/USD": "0xDC4BDB458C6361093069Ca2aD30D74cc152EdC75",
  "DOT/USD": "0x1C07AFb8E2B827c5A4739C6d59Ae3A5035f28734",
  "LTC/USD": "0x6AF09DF7563C363B5763b9102712EbeD3b9e859B",
  "BCH/USD": "0x9F0F69428F923D6c95B781F89E165C9b2df9789D",
  "XLM/USD": "0x53f91A5B7A6c411E71A6C8EaCF8C1DC4D15A5D55",
  "EOS/USD": "0x10a43289895eAff840E8d45995BBa89f9115ECEe",
  "XMR/USD": "0xFA66458Cce7Dd15D8650015c4fce4D278271618F",
  "ZEC/USD": "0xd54B033D48d0475f19c5fccf7484E8A981a135ae",
  "DASH/USD": "0xFb0cADFEa136E9E343cfb55B863a6Df8348ab912",
  "XTZ/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB63F",
  "ETC/USD": "0xaEA2808407B7319A31A383B6F8B60f04BCa23cE2",
  "FIL/USD": "0x1A31D42149e82Eb99777f903C08A2E41A00085d3",
  "TRX/USD": "0xacD0D1A29759CC01E8D925371B72cb2b5610EA25",
  "ALGO/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB64F", // Placeholder
  "VET/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB65F", // Placeholder
  "HBAR/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB66F", // Placeholder
  "ICP/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB67F", // Placeholder
  "APT/USD": "0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB68F", // Placeholder
};

// Chainlink Feeds on Arbitrum (faster, cheaper)
const CHAINLINK_FEEDS_ARB: Record<string, string> = {
  "BTC/USD": "0x6ce185860a4963106506C203335A2910D5F2A2FE",
  "ETH/USD": "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
  "LINK/USD": "0x86E53CF1B870786351Da77A57575e79CB55812CB",
  "ARB/USD": "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
  "SOL/USD": "0x24ceA4b8ce57cdA5058b924B9B9987992450590c",
  "AVAX/USD": "0x8bf61728eeDCE2F32c456454d87B5d6eD6150208",
  "MATIC/USD": "0x52099D4523531f678Dfc568a7B1e5038aadcE1d6",
  "AAVE/USD": "0xaD1d5344AaDE45F43E596773Bcc4c423EAbdD034",
  "UNI/USD": "0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720",
  "CRV/USD": "0xaebDA2c976cfd1eE1977Eac079B4382acb849325",
  "GMX/USD": "0xDB98056FecFff59D032aB628337A4887110df3dB",
  "MAGIC/USD": "0x47E55cCec6582838E173f252D08Afd8116c2202d",
  "RDNT/USD": "0x20d0Fcab0ECFD078B036b6CAf1FaC69A6453b352",
  "PENDLE/USD": "0x66853E19d73c0F9301fe099c324A1E9726953C89",
};

// ABI for Chainlink Aggregator V3 (minimal)
const AGGREGATOR_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
];

// Simple JSON-RPC call helper
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.result;
}

// Encode function call data
function encodeLatestRoundData(): string {
  // latestRoundData() selector
  return "0xfeaf968c";
}

// Decode latestRoundData response
function decodeLatestRoundData(data: string): {
  roundId: string;
  answer: bigint;
  updatedAt: number;
} {
  // Remove 0x prefix
  const hex = data.slice(2);
  
  // Decode uint80, int256, uint256, uint256, uint80
  const roundId = BigInt("0x" + hex.slice(0, 64)).toString();
  const answer = BigInt("0x" + hex.slice(64, 128));
  const updatedAt = Number(BigInt("0x" + hex.slice(192, 256)));
  
  return { roundId, answer, updatedAt };
}

const REFRESH_INTERVAL = 10000; // 10 seconds - Chainlink updates every ~27 seconds on mainnet

export const useChainlinkPrices = (symbols: string[] = []) => {
  const [state, setState] = useState<ChainlinkState>({
    prices: new Map(),
    isConnected: false,
    isLoading: true,
    error: null,
  });

  const pricesMapRef = useRef<Map<string, ChainlinkPriceData>>(new Map());
  const rpcIndexRef = useRef({ eth: 0, arb: 0 });
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getPrice = useCallback((symbol: string): ChainlinkPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  const fetchPrice = useCallback(async (
    symbol: string,
    feedAddress: string,
    isArbitrum: boolean
  ): Promise<ChainlinkPriceData | null> => {
    const endpoints = isArbitrum ? ARBITRUM_RPC_ENDPOINTS : ETH_RPC_ENDPOINTS;
    const indexKey = isArbitrum ? "arb" : "eth";
    
    for (let attempt = 0; attempt < endpoints.length; attempt++) {
      const rpcIndex = (rpcIndexRef.current[indexKey] + attempt) % endpoints.length;
      const rpcUrl = endpoints[rpcIndex];
      
      try {
        const data = await ethCall(rpcUrl, feedAddress, encodeLatestRoundData());
        const decoded = decodeLatestRoundData(data);
        
        // Most Chainlink feeds use 8 decimals
        const price = Number(decoded.answer) / 1e8;
        
        if (price > 0) {
          rpcIndexRef.current[indexKey] = rpcIndex; // Remember working endpoint
          
          return {
            symbol: symbol.replace("/USD", ""),
            price,
            updatedAt: decoded.updatedAt * 1000,
            roundId: decoded.roundId,
            source: "Chainlink",
          };
        }
      } catch (e) {
        console.log(`[Chainlink] ${symbol} failed on ${rpcUrl}:`, e);
        continue;
      }
    }
    
    return null;
  }, []);

  const fetchAllPrices = useCallback(async () => {
    if (!isMountedRef.current) return;

    const symbolsToFetch = symbols.length > 0
      ? symbols.map(s => s.toUpperCase().replace(/USD$/, "") + "/USD")
      : [...Object.keys(CHAINLINK_FEEDS_ETH), ...Object.keys(CHAINLINK_FEEDS_ARB)];

    const uniqueSymbols = [...new Set(symbolsToFetch)];
    const results: ChainlinkPriceData[] = [];

    // Batch fetch with concurrency limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueSymbols.length; i += BATCH_SIZE) {
      const batch = uniqueSymbols.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (symbol) => {
        // Try Arbitrum first (faster, cheaper), then Ethereum
        if (CHAINLINK_FEEDS_ARB[symbol]) {
          const result = await fetchPrice(symbol, CHAINLINK_FEEDS_ARB[symbol], true);
          if (result) return result;
        }
        
        if (CHAINLINK_FEEDS_ETH[symbol]) {
          return fetchPrice(symbol, CHAINLINK_FEEDS_ETH[symbol], false);
        }
        
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
          pricesMapRef.current.set(result.symbol + "/USD", result);
        }
      });
    }

    if (isMountedRef.current) {
      setState({
        prices: new Map(pricesMapRef.current),
        isConnected: results.length > 0,
        isLoading: false,
        error: results.length === 0 ? "No prices fetched" : null,
      });
    }

    console.log(`[Chainlink] Fetched ${results.length}/${uniqueSymbols.length} prices`);
  }, [symbols, fetchPrice]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchAllPrices();

    // Set up refresh interval for real-time-ish updates
    refreshIntervalRef.current = setInterval(fetchAllPrices, REFRESH_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAllPrices]);

  return {
    prices: state.prices,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    getPrice,
    refresh: fetchAllPrices,
    feedsEth: CHAINLINK_FEEDS_ETH,
    feedsArb: CHAINLINK_FEEDS_ARB,
  };
};

export { CHAINLINK_FEEDS_ETH, CHAINLINK_FEEDS_ARB };
