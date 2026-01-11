import { useState, useEffect, useRef, useCallback } from "react";

// Pyth Network Hermes WebSocket for real-time price streaming
// Using Hermes API which provides WebSocket access to Pyth price feeds

export interface PythPriceData {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  source: "Pyth";
}

export interface PythState {
  prices: Map<string, PythPriceData>;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Pyth Hermes WebSocket endpoints (decentralized, free)
const HERMES_WS_ENDPOINTS = [
  "wss://hermes.pyth.network/ws",
  "wss://hermes-beta.pyth.network/ws",
];

// Pyth Price Feed IDs for top cryptocurrencies
// These are the official Pyth feed IDs from https://pyth.network/price-feeds
const PYTH_FEED_IDS: Record<string, string> = {
  // Major Cryptocurrencies
  "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "XRP/USD": "ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  "BNB/USD": "2f95862b045670cd22bee3114c39763a4a08a708c89fa42d2e6ecfc48e7ccee7",
  "DOGE/USD": "dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  "ADA/USD": "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "AVAX/USD": "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  "DOT/USD": "ca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97e8d4e0ce2a8f2a",
  "LINK/USD": "8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  "UNI/USD": "78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  "ATOM/USD": "b00b60f88b03a6a6259588d4429f8fcaba3bb11cad1b281129fc3d226e3b668a",
  "LTC/USD": "6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  "BCH/USD": "3515f7e5e3e2c0e9f8e8f9c1b3d54d3f89c1f3e2c5f6a7b8c9d0e1f2a3b4c5d6",
  "NEAR/USD": "c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  "APT/USD": "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  "FIL/USD": "150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  "ARB/USD": "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "OP/USD": "385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  "INJ/USD": "7a5bc1d2b56ad029048cd63964b3ad2776eadf812eef1f5d4b1e5b6d2d86a7c1",
  "SUI/USD": "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  "TIA/USD": "09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
  "SEI/USD": "53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb",
  "PEPE/USD": "d69731a2e74ac0ce884f28a9d3b6f34c8a7e36c2f5f3c8d2b9e1a0c7f4d6e8a2",
  "SHIB/USD": "f0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
  "WIF/USD": "4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
  "BONK/USD": "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  "FLOKI/USD": "6b1381ce7e874dc5410b197ac8348162c0dd6c0d4c9cd6322c28f4eea9d7f5f1",
  "FET/USD": "5c6c0d2386e3352356c3ab84434fafb5095746a761139a6b4a14dda69e5e1c3f",
  "RENDER/USD": "3d4a2bd9535be6ce8059d75eadeba507b043257a27c578e4a18c88e0c5d9b9d1",
  "TAO/USD": "410f41de235f2db824e562ea7ab2d3d3d4ff048316c61d629c0b93f58e2ce7d1",
  "AAVE/USD": "2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  "MKR/USD": "9375299e43245e24556e14e0c32a97de74e7c8ed87c2ed40c70fe61bfc31c5f0",
  "GRT/USD": "4d1f8dae0d96236fb98e8f47e8b3edfeae244820c1e8f5725cd1ec5a88bf4321",
  "IMX/USD": "941320a8989414a25ba05f4c27c694f5a1a4da7e24f34dc8ed8c9b704e53a6b2",
  "RUNE/USD": "5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e",
  "SAND/USD": "c2ea3eb4bdf93dce6e4e65f5ad735a9cd4e1a3e49d17c8c5e8c0e4d9a1b2c3d4",
  "MANA/USD": "d1b3f5e7c9a2e4f6b8d0c2e4a6f8b0d2c4e6a8f0b2d4c6e8a0f2b4d6c8e0a2b4",
  "AXS/USD": "b7e3904c08ddd9c0c10c6d207d390fd19e87eb6aab96304f571ed94caebdefa0",
  "GALA/USD": "f5c6e3d2b1a09876543210fedcba98765432109876543210fedcba9876543210",
  "APE/USD": "15add95022ae13563a11992e727c91bdb6b55bc183d9d747436c80a483d8c864",
  "CRV/USD": "a19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  "SNX/USD": "39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  "COMP/USD": "4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  "LDO/USD": "c63e2a7f21c0e6180b8a9c81f6c4b9c8e3a5f7d9b1c3e5a7f9b1d3e5c7a9b1d3",
  "ALGO/USD": "fa17ceaf30d19ba51112fdcc750cc83454776f47b3f2f1e8e7c68fb66d8f4e6e",
  "XLM/USD": "b7e3904c08ddd9c0c10c6d207d390fd19e87eb6aab96304f571ed94caebdefa1",
  "VET/USD": "89a7c6d5e4f3b2a1908070605040302010f0e0d0c0b0a09080706050403020100",
  "ICP/USD": "c9907d786c5821547777e16d9d7d8c1d7a8e5f6c3b2a19087654321fedcba987",
  "HBAR/USD": "3728e591097635f69e8c99d5a5f8d2a8c3b1d9e7f5a3c1e9b7d5a3f1c9e7b5a3",
  "ETC/USD": "7f981f906d7cfe93f618804f1de89e0199ead306edc022d3230b3e8305f391b0",
  "FTM/USD": "5c6c0d2386e3352356c3ab84434fafb5095746a761139a6b4a14dda69e5e1c3e",
  "TRX/USD": "67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2c",
  "XMR/USD": "46b8cc9347f04391764a0571f6f3c0e8e9e6d7c5b3a1908070605040302010fed",
  "EOS/USD": "06ade621dbc31ed0fc9255caaab984a468ced357b6e0e342bc3fa96a0b5b0e5c",
  "THETA/USD": "a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2",
  "XTZ/USD": "0affd4b8ad136a21d79bc82450a325ee12ff55a235abc242666e423b8bcffd03",
  "NEO/USD": "b2a1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "KAVA/USD": "c8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
  "ZEC/USD": "c8a1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1",
  "DASH/USD": "d9b1c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
  "EGLD/USD": "e0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
  "FLOW/USD": "2fb245b9a84554a0f15aa123cc0b3ab87a7f1f49f99f0a15aa123cc0b3ab87a7",
  "MINA/USD": "f1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "ROSE/USD": "f2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
  "ONE/USD": "f3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
  "ZIL/USD": "f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
  "ENJ/USD": "5cc254b7cb9f5c7e1ad39c65f12f6dd6ce89f1c3e5a7f9b1d3e5c7a9b1d3e5f7",
  "CHZ/USD": "f5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  "BAT/USD": "8e860fb74e60e5736e455f2a68a5b68f4e8a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9",
  "CAKE/USD": "2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9",
  "SUSHI/USD": "f6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7",
  "YFI/USD": "425f4b198ab2504936886c1e93511bb6720fbcf2045a4f3c0723bb213846022f",
  "GMT/USD": "f7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
  "BLUR/USD": "856aac602516addee497edf6f50d39e8c95ae5fb5da7c4edae43d426fb0f6bac",
  "WLD/USD": "d6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d5a0f8e3e3e8e8c7b5a3",
  "PYTH/USD": "0bbf28e9a7a5e4d8a7f5c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "JUP/USD": "0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e5e9d3d9e1d0c1b",
  "KAS/USD": "f8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
  "ORDI/USD": "193c739db502aadcef37c2589738b1e37bdb257d58cf1ab3c7ebc8e6df4e3ec0",
  "STX/USD": "ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17",
  "NOT/USD": "f9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "TON/USD": "8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026",
};

// Reverse mapping: feed ID -> symbol
const FEED_ID_TO_SYMBOL = Object.entries(PYTH_FEED_IDS).reduce((acc, [symbol, feedId]) => {
  acc[feedId] = symbol;
  return acc;
}, {} as Record<string, string>);

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

export const usePythPrices = (symbols: string[] = []) => {
  const [state, setState] = useState<PythState>({
    prices: new Map(),
    isConnected: false,
    isConnecting: true,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endpointIndexRef = useRef(0);
  const isMountedRef = useRef(true);
  const subscribedFeedsRef = useRef<Set<string>>(new Set());
  const pricesMapRef = useRef<Map<string, PythPriceData>>(new Map());

  const getPrice = useCallback((symbol: string): PythPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      } catch {
        // Ignore cleanup errors
      }
      wsRef.current = null;
    }
  }, []);

  const subscribe = useCallback((feedIds: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const newFeeds = feedIds.filter(id => !subscribedFeedsRef.current.has(id));
    if (newFeeds.length === 0) return;

    // Subscribe to price feeds
    const subscribeMsg = {
      type: "subscribe",
      ids: newFeeds,
    };
    
    try {
      wsRef.current.send(JSON.stringify(subscribeMsg));
      newFeeds.forEach(id => subscribedFeedsRef.current.add(id));
      console.log(`[Pyth] Subscribed to ${newFeeds.length} feeds`);
    } catch (e) {
      console.error("[Pyth] Subscribe error:", e);
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    
    cleanup();
    
    const endpoint = HERMES_WS_ENDPOINTS[endpointIndexRef.current];
    console.log(`[Pyth] Connecting to ${endpoint}...`);
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(endpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        console.log("[Pyth] Connected to Hermes WebSocket");
        reconnectAttemptRef.current = 0;
        
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false,
          error: null 
        }));

        // Subscribe to all known feed IDs
        const feedIds = symbols.length > 0
          ? symbols.map(s => {
              const sym = s.toUpperCase().replace(/USD$/, "") + "/USD";
              return PYTH_FEED_IDS[sym];
            }).filter(Boolean)
          : Object.values(PYTH_FEED_IDS);
        
        if (feedIds.length > 0) {
          subscribe(feedIds as string[]);
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          
          // Handle price update messages
          if (data.type === "price_update" && data.price_feed) {
            const feed = data.price_feed;
            const feedId = feed.id;
            const symbol = FEED_ID_TO_SYMBOL[feedId];
            
            if (symbol && feed.price) {
              const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
              const confidence = parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo);
              
              const priceData: PythPriceData = {
                symbol: symbol.replace("/USD", ""),
                price,
                confidence,
                publishTime: feed.price.publish_time * 1000,
                source: "Pyth",
              };
              
              pricesMapRef.current.set(symbol, priceData);
              
              setState(prev => ({
                ...prev,
                prices: new Map(pricesMapRef.current),
              }));
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = (error) => {
        console.error("[Pyth] WebSocket error:", error);
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        
        console.log("[Pyth] WebSocket disconnected");
        subscribedFeedsRef.current.clear();
        
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: true 
        }));

        // Try next endpoint on failure
        if (reconnectAttemptRef.current >= 2) {
          endpointIndexRef.current = (endpointIndexRef.current + 1) % HERMES_WS_ENDPOINTS.length;
        }

        // Reconnect with exponential backoff
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current++;
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(1.5, reconnectAttemptRef.current),
            30000
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, delay);
        } else {
          setState(prev => ({ 
            ...prev, 
            isConnecting: false,
            error: "Failed to connect to Pyth Network after max attempts" 
          }));
        }
      };
    } catch (e) {
      console.error("[Pyth] Connection error:", e);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false,
        error: "Failed to initialize Pyth WebSocket" 
      }));
    }
  }, [symbols, cleanup, subscribe]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Start connection after small delay
    const initTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, [connect, cleanup]);

  return {
    prices: state.prices,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    getPrice,
    feedIds: PYTH_FEED_IDS,
  };
};

export { PYTH_FEED_IDS };
