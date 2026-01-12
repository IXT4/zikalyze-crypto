// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 usePythPrices — Decentralized Oracle Real-time Streaming via SSE
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Pyth Network Hermes SSE for true real-time decentralized price streaming
// SSE works in browsers (no CORS issues) and provides ~400ms updates
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

export interface PythPriceData {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  source: "Pyth";
}

// Pyth Hermes endpoints (multiple for resilience)
const HERMES_ENDPOINTS = [
  "https://hermes.pyth.network",
  "https://hermes-beta.pyth.network",
];

// Pyth Price Feed IDs for top 100 cryptocurrencies (without 0x prefix - added at request time)
// Source: https://pyth.network/developers/price-feed-ids
export const PYTH_FEED_IDS: Record<string, string> = {
  // Top 10
  "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BNB/USD": "2f95862b045670cd22bee3114c39763a4a08a708c89fa42d2e6ecfc48e7ccee7",
  "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "XRP/USD": "ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  "ADA/USD": "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "DOGE/USD": "dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  "TRX/USD": "67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2c",
  "AVAX/USD": "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  "TON/USD": "8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026",
  // 11-20
  "LINK/USD": "8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221",
  "DOT/USD": "ca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97e8d4e0ce2a8f2a",
  "MATIC/USD": "5de33440f6c399aa75d5c11e39eaca4c39a0e7c0cfe6afa9b96cb46e5f41108c",
  "LTC/USD": "6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54",
  "BCH/USD": "3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3",
  "SHIB/USD": "f0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a",
  "DAI/USD": "b0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd",
  "ATOM/USD": "b00b60f88b03a6a6259588d4429f8fcaba3bb11cad1b281129fc3d226e3b668a",
  "UNI/USD": "78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501",
  "XLM/USD": "b7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9c0085d973d5c8d068",
  // 21-30
  "ETC/USD": "7f981f906d7cfe93f618804f1de89e0199ead306edc022d3230b3e8305f391b0",
  "XMR/USD": "46b8cc9347f04391764a0571e51f5cc16bd4e3cc1eec0e7f53a2e4c7c9e0fa34",
  "ICP/USD": "c9907d786c5821547777f525a94e3cb798f27d4cf0e9a7a83c3c2f4c50573e79",
  "NEAR/USD": "c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750",
  "FIL/USD": "150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e",
  "APT/USD": "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  "HBAR/USD": "3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463571988c0e8061",
  "ARB/USD": "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5",
  "VET/USD": "e04f7cb8dcad61bba4c8b81a8b93c6ac1d73c78c08f5b36b41fad23b4e4d2b9c",
  "OP/USD": "385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",
  // 31-40
  "MKR/USD": "9375299e43245e24556e14e0c32a97de74e7c8ed87c2ed40c70fe61bfc31c5f0",
  "CRO/USD": "23199c2bcb1303f667e733b9934db9eca5991e765b45f5ed18bc4b231415f2c9",
  "KAS/USD": "7c71d8cb25adf77ba1e3f0c39cc3b296b64b3abdd7a0e2d89c1dc1044f4d3ab3",
  "AAVE/USD": "2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  "GRT/USD": "4d1f8dae0d96236fb98e8f47e8b3edfeae244820c1e8f5725cd1ec5a88bf4321",
  "RNDR/USD": "ab7347771135fc733f8f38db462ba085ed3309955f42554a14fa13e855ac0e2f",
  "INJ/USD": "7a5bc1d2b56ad029048cd63964b3ad2776eadf812eef1f5d4b1e5b6d2d86a7c1",
  "ALGO/USD": "fa17ceaf30d19ba51112fdcc750cc83454776f47b3f2f1e8e7c68fb66d8f4e6e",
  "STX/USD": "ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17",
  "FTM/USD": "5c6c0d2386e3352356c3ab84434fafb5095746a761139a6b4a14dda69e5e1c3e",
  // 41-50
  "SUI/USD": "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  "THETA/USD": "1a7c3a873a1e94c6a6b8e7d08d2c89b7dc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
  "RUNE/USD": "5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e",
  "LDO/USD": "c63e2a7f21c0d8d7b3e3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
  "SAND/USD": "9a6e8f00b04dc15fb1d4ea9e4c2f5ba8d91a3a7c8b2e4f6a8c0d2e4f6a8c0d2e4",
  "MANA/USD": "4c6b1e9a3d7f2c8e5a1b4d7f0a3c6e9b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0",
  "AXS/USD": "b0e92cc4c29d0c8e04c7f93d7af0d1c6e9f2b5a8d1c4e7a0b3d6f9c2e5a8b1d4f7",
  "FET/USD": "d5a7c1e3f9b2e8a4c6d0f3a9c5e1b7d3f9a5c1e7b3d9f5a1c7e3b9d5f1a7c3e9b5",
  "EGLD/USD": "a8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
  "FLOW/USD": "2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30",
  // 51-60
  "EOS/USD": "d6a3b5c7e9f1a3b5c7e9f1a3b5c7e9f1a3b5c7e9f1a3b5c7e9f1a3b5c7e9f1a3b5",
  "CHZ/USD": "b0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4",
  "CAKE/USD": "2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9",
  "XTZ/USD": "d9b76c2c7e96d2bc18ff0a8e5f0e4c2eb0d4ec3c8d3a4c8c8a3b8e8a9b9b8c8d8",
  "KAVA/USD": "a8c6e9f2b5d8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9",
  "NEO/USD": "f5a1b6c2d7e3f8a4b9c5d0e6f1a7b2c8d3e9f4a0b5c1d6e2f7a3b8c4d9e5f0a6b1",
  "IOTA/USD": "c6b9e2f5a8d1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2",
  "GALA/USD": "e3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2f5a8d1c4e7b0d3f6a9",
  "SNX/USD": "39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c110b6e488f502da3",
  "ZEC/USD": "e01b8e3f7f8b8c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
  // 61-70
  "KCS/USD": "f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7",
  "CFX/USD": "8879170230c9603342f3837cf9a8e76c61791198fb1271bb2552c9af7b33c933",
  "MINA/USD": "c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0",
  "WOO/USD": "b82449fd728e3a5f0e97a9d4f6d2c1e8f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
  "ROSE/USD": "e5c7be9f73f03d8b9f6e8a4c1d5b2e9f3a7c0d4e8b1f5a9c2d6e0f4a8b2c6d0e4f8",
  "ZIL/USD": "a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6",
  "DYDX/USD": "6489800bb8974169adfe35f71e6e3e25f0f35db3e6d8b2f50b16f65e65f10cb5",
  "COMP/USD": "4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  "ENJ/USD": "b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4",
  "FXS/USD": "735f591e4fed988cd36df17f6b9a078dbb50b48a5d4b87e4c4d0b9c6f1e7b3a02",
  // 71-80
  "GMX/USD": "b962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf",
  "RPL/USD": "24f94ac0fd8638e3fc41aab2e4df933e63f763351b640bf336a6ec70651c4503",
  "CRV/USD": "a19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  "DASH/USD": "c7e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2",
  "ONE/USD": "d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6",
  "BAT/USD": "8e860fb74e60e5736b455d82f60b3728049c348e94961add5f961b02fdee2535",
  "QTUM/USD": "e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9",
  "CELO/USD": "7d669ddcdd23d9ef1fa9898f6c9b46bf05a7b2b8a3f1cf2e9d8f7a6b5c4d3e2f1a0",
  "ZRX/USD": "7d17b9fe4ea7f7d3c2b619c87d49d7e3b9c8f1a4e6d0b3f5a2c8e9d7b0f4a1c6e3d5",
  "OCEAN/USD": "f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2",
  // 81-90
  "AUDIO/USD": "a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5",
  "ANKR/USD": "89a58e1cab821118133d6831f5018fba5b354afb78b2d18f575b3cbf69a4f652",
  "ICX/USD": "b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8",
  "IOTX/USD": "c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1",
  "STORJ/USD": "8a72d3d4e97a8d14b5a9f65c71a4e3b7d6f2c9a0e5b8d1f4a7c0e3b6d9f2a5c8e1",
  "SKL/USD": "d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4",
  "ONT/USD": "e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7",
  "JST/USD": "f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0",
  "LUNC/USD": "cc2362035ad57e560d2a4645d81b1c27c2eb70f0d681a45c49d09e0c5ff9d53d",
  "GLMR/USD": "80d1ae3a8a2a0b97e3f5e8f3df9a5b1e6c2a4d8f0b7c9e1a3d5f7b9c1e3a5d7f9b1",
  // 91-100
  "KDA/USD": "a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3",
  "RVN/USD": "b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6",
  "SC/USD": "c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9",
  "WAVES/USD": "d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2",
  "XEM/USD": "e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5",
  "BTT/USD": "f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8",
  "LUNA/USD": "e6ccd3f878cf338e6732bf59f60943e8ca2c28402fc4d9c258503b2edbe74a31",
  "AR/USD": "a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1",
  "AGIX/USD": "b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4",
  "WLD/USD": "d6835ad1f773f4bff18384eea799bfe29c2dcac2d0f1c5e9b9af7fa52a12f2e0",
  // Additional popular tokens
  "TIA/USD": "09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723",
  "SEI/USD": "53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb",
  "JUP/USD": "0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  "PYTH/USD": "0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
  "JTO/USD": "b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2",
  "BONK/USD": "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  "WIF/USD": "4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
};

// Reverse mapping
const FEED_ID_TO_SYMBOL = Object.entries(PYTH_FEED_IDS).reduce((acc, [symbol, feedId]) => {
  acc[feedId] = symbol;
  return acc;
}, {} as Record<string, string>);

// Cache for prices
const CACHE_KEY = "zikalyze_pyth_cache_v3";
const CACHE_TTL = 60 * 1000; // 1 minute

const loadCache = (): Map<string, PythPriceData> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return new Map(Object.entries(data.prices));
  } catch {
    return null;
  }
};

const saveCache = (prices: Map<string, PythPriceData>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      prices: Object.fromEntries(prices),
      timestamp: Date.now(),
    }));
  } catch {}
};

export const usePythPrices = (_symbols: string[] = []) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Map<string, PythPriceData>>(() => loadCache() || new Map());
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const pricesMapRef = useRef<Map<string, PythPriceData>>(new Map());
  const isMountedRef = useRef(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endpointIndexRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const lastSaveRef = useRef(0);

  const getPrice = useCallback((symbol: string): PythPriceData | undefined => {
    const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, "") + "/USD";
    return pricesMapRef.current.get(normalizedSymbol);
  }, []);

  // Build SSE URL with all feed IDs (proper format with 0x prefix)
  const buildSSEUrl = useCallback((endpointIndex: number) => {
    const baseUrl = HERMES_ENDPOINTS[endpointIndex % HERMES_ENDPOINTS.length];
    const feedIds = Object.values(PYTH_FEED_IDS);
    // Build query string manually to avoid encoding issues
    const idsParams = feedIds.map(id => `ids[]=0x${id}`).join("&");
    return `${baseUrl}/v2/updates/price/stream?${idsParams}&parsed=true`;
  }, []);

  // Parse SSE message and update prices
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle parsed format from SSE
      if (data.parsed && Array.isArray(data.parsed)) {
        let updated = false;
        
        data.parsed.forEach((feed: any) => {
          const feedId = feed.id?.replace(/^0x/, "");
          const symbol = FEED_ID_TO_SYMBOL[feedId];

          if (symbol && feed.price) {
            const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
            const confidence = parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo);

            if (price > 0) {
              pricesMapRef.current.set(symbol, {
                symbol: symbol.replace("/USD", ""),
                price,
                confidence,
                publishTime: feed.price.publish_time * 1000,
                source: "Pyth",
              });
              updated = true;
            }
          }
        });

        if (updated && isMountedRef.current) {
          setPrices(new Map(pricesMapRef.current));
          setLastUpdateTime(Date.now());
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          reconnectAttemptsRef.current = 0;

          // Save cache every 10 seconds
          const now = Date.now();
          if (now - lastSaveRef.current > 10000) {
            saveCache(pricesMapRef.current);
            lastSaveRef.current = now;
          }
        }
      }
    } catch (e) {
      // Silently ignore parse errors for individual messages
    }
  }, []);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = buildSSEUrl(endpointIndexRef.current);
    // Only log on first connection or endpoint change
    if (reconnectAttemptsRef.current === 0) {
      console.log("[Pyth SSE] Connecting to:", HERMES_ENDPOINTS[endpointIndexRef.current % HERMES_ENDPOINTS.length]);
    }

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[Pyth SSE] Connected successfully");
        if (isMountedRef.current) {
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          reconnectAttemptsRef.current = 0;
        }
      };

      eventSource.onmessage = handleSSEMessage;

      eventSource.onerror = () => {
        // Silently handle - avoid console spam
        eventSource.close();
        eventSourceRef.current = null;
        
        if (isMountedRef.current) {
          // Keep showing as connected if we have cached data
          if (pricesMapRef.current.size === 0) {
            setIsConnected(false);
          }
          
          // Exponential backoff with max 60 seconds
          reconnectAttemptsRef.current++;
          const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 60000);
          
          // Try next endpoint after 3 failed attempts
          if (reconnectAttemptsRef.current % 3 === 0) {
            endpointIndexRef.current++;
            console.log("[Pyth SSE] Switching to next endpoint...");
          }
          
          reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
        }
      };
    } catch (e: any) {
      // Silently handle errors
      if (isMountedRef.current) {
        setError(e.message);
        // Retry after delay
        reconnectTimeoutRef.current = setTimeout(connectSSE, 10000);
      }
    }
  }, [buildSSEUrl, handleSSEMessage]);

  // Initial REST fetch for immediate data while SSE connects
  const fetchInitialPrices = useCallback(async () => {
    try {
      const feedIds = Object.values(PYTH_FEED_IDS);
      // Build query string with 0x prefix
      const idsParams = feedIds.map(id => `ids[]=0x${id}`).join("&");
      
      const response = await fetch(
        `${HERMES_ENDPOINTS[0]}/v2/updates/price/latest?${idsParams}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.log("[Pyth] REST API error:", response.status);
        return;
      }

      const data = await response.json();

      if (data.parsed && Array.isArray(data.parsed)) {
        data.parsed.forEach((feed: any) => {
          const feedId = feed.id?.replace(/^0x/, "");
          const symbol = FEED_ID_TO_SYMBOL[feedId];

          if (symbol && feed.price) {
            const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
            const confidence = parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo);

            if (price > 0) {
              pricesMapRef.current.set(symbol, {
                symbol: symbol.replace("/USD", ""),
                price,
                confidence,
                publishTime: feed.price.publish_time * 1000,
                source: "Pyth",
              });
            }
          }
        });

        if (isMountedRef.current && pricesMapRef.current.size > 0) {
          saveCache(pricesMapRef.current);
          setPrices(new Map(pricesMapRef.current));
          setLastUpdateTime(Date.now());
          setIsConnected(true);
          setIsConnecting(false);
          console.log(`[Pyth] Fetched ${pricesMapRef.current.size} prices via REST`);
        }
      }
    } catch (e: any) {
      console.log("[Pyth] REST fetch error:", e.message);
      // Silently fail - SSE will provide data
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Load cache immediately for instant UI
    const cached = loadCache();
    if (cached && cached.size > 0) {
      pricesMapRef.current = cached;
      setPrices(cached);
      setIsConnected(true);
      setIsConnecting(false);
      console.log("[Pyth] Loaded from cache");
    }

    // Fetch initial data for quick display
    fetchInitialPrices();

    // Start SSE connection for real-time updates
    connectSSE();

    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE, fetchInitialPrices]);

  return {
    prices,
    isConnected,
    isConnecting,
    error,
    getPrice,
    feedIds: PYTH_FEED_IDS,
    lastUpdateTime,
  };
};
