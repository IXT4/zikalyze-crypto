// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ZIKALYZE BACKGROUND LEARNING WORKER v3.0 — 100% DECENTRALIZED
// ═══════════════════════════════════════════════════════════════════════════════
// Runs in background, continuously learning from DECENTRALIZED oracle data
// Uses IndexedDB for persistent storage and Pyth/DIA/Redstone for prices
// NO CENTRALIZED APIs (CoinGecko, CoinCap, etc.) - Pure decentralized oracles
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'ZikalyzeAILearning';
const DB_VERSION = 2;
const STORE_NAME = 'learningData';
const LEARNING_INTERVAL = 30000; // 30 seconds

// Decentralized oracle endpoints
const ORACLE_ENDPOINTS = {
  // Pyth Network Hermes (primary - real-time SSE)
  PYTH: 'https://hermes.pyth.network/v2/updates/price/latest',
  // DIA Oracle (secondary)
  DIA: 'https://api.diadata.org/v1/quotation/',
  // Redstone (tertiary)
  REDSTONE: 'https://api.redstone.finance/prices?symbols=',
};

// Pyth feed IDs for common cryptocurrencies
const PYTH_FEED_IDS = {
  'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'XRP': '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  'ADA': '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  'DOGE': '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  'AVAX': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'DOT': '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284f97f6eb485a96a7b8',
  'LINK': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
};

// Top cryptos to track (symbols only)
const TOP_CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK'];

let db = null;
let isLearning = false;
let learningInterval = null;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
      }
    };
  });
}

// Get learning data for a symbol
async function getLearningData(symbol) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(symbol);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Save learning data
async function saveLearningData(data) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get all learning data
async function getAllLearningData() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 🔮 DECENTRALIZED PRICE FETCHING — Pyth → DIA → Redstone fallback
// ════════════════════════════════════════════════════════════════════════════════

async function fetchFromPyth() {
  const prices = {};
  const feedIds = Object.values(PYTH_FEED_IDS);
  
  try {
    const url = `${ORACLE_ENDPOINTS.PYTH}?ids[]=${feedIds.join('&ids[]=')}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (!response.ok) throw new Error('Pyth fetch failed');
    
    const data = await response.json();
    
    if (data.parsed) {
      for (const item of data.parsed) {
        const symbol = Object.entries(PYTH_FEED_IDS).find(([_, id]) => id === item.id)?.[0];
        if (symbol && item.price) {
          const price = parseFloat(item.price.price) * Math.pow(10, item.price.expo);
          prices[symbol] = { price, source: 'Pyth' };
        }
      }
    }
    
    console.log('[Background Learning] Pyth prices fetched:', Object.keys(prices).length);
  } catch (e) {
    console.log('[Background Learning] Pyth fetch failed:', e.message);
  }
  
  return prices;
}

async function fetchFromDIA() {
  const prices = {};
  
  for (const symbol of TOP_CRYPTOS) {
    try {
      const response = await fetch(`${ORACLE_ENDPOINTS.DIA}${symbol}`, { 
        signal: AbortSignal.timeout(3000) 
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.Price) {
          prices[symbol] = { price: data.Price, source: 'DIA' };
        }
      }
    } catch (e) {
      // Continue with next symbol
    }
  }
  
  console.log('[Background Learning] DIA prices fetched:', Object.keys(prices).length);
  return prices;
}

async function fetchFromRedstone() {
  const prices = {};
  
  try {
    const symbols = TOP_CRYPTOS.join(',');
    const response = await fetch(`${ORACLE_ENDPOINTS.REDSTONE}${symbols}&provider=redstone-primary-prod`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      for (const [symbol, info] of Object.entries(data)) {
        if (info && info.value) {
          prices[symbol] = { price: info.value, source: 'Redstone' };
        }
      }
    }
    
    console.log('[Background Learning] Redstone prices fetched:', Object.keys(prices).length);
  } catch (e) {
    console.log('[Background Learning] Redstone fetch failed:', e.message);
  }
  
  return prices;
}

// Fetch prices with oracle fallback (Pyth → DIA → Redstone)
async function fetchDecentralizedPrices() {
  // Try Pyth first (primary decentralized oracle)
  let prices = await fetchFromPyth();
  
  // Fill missing with DIA
  if (Object.keys(prices).length < TOP_CRYPTOS.length) {
    const diaPrices = await fetchFromDIA();
    for (const [symbol, data] of Object.entries(diaPrices)) {
      if (!prices[symbol]) {
        prices[symbol] = data;
      }
    }
  }
  
  // Fill remaining with Redstone
  if (Object.keys(prices).length < TOP_CRYPTOS.length) {
    const redstonePrices = await fetchFromRedstone();
    for (const [symbol, data] of Object.entries(redstonePrices)) {
      if (!prices[symbol]) {
        prices[symbol] = data;
      }
    }
  }
  
  return prices;
}

// Calculate learning metrics from price data
function calculateMetrics(priceHistory) {
  if (priceHistory.length < 2) {
    return { volatility: 0, velocity: 0, trend: 'NEUTRAL' };
  }
  
  // Calculate volatility (standard deviation of price changes)
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const change = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
    changes.push(change);
  }
  
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);
  
  // Calculate velocity (rate of change)
  const velocity = (priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / 
                   (priceHistory[priceHistory.length - 1].timestamp - priceHistory[0].timestamp);
  
  // Determine trend
  let trend = 'NEUTRAL';
  const recentChange = (priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price * 100;
  if (recentChange > 2) trend = 'BULLISH';
  else if (recentChange < -2) trend = 'BEARISH';
  
  return { volatility, velocity, trend };
}

// Detect support and resistance levels
function detectLevels(priceHistory) {
  if (priceHistory.length < 5) {
    return { support: [], resistance: [] };
  }
  
  const prices = priceHistory.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  
  // Simple level detection based on price clustering
  const levels = { support: [], resistance: [] };
  
  // Support at recent lows
  const recentMin = Math.min(...prices.slice(-5));
  levels.support.push(recentMin);
  levels.support.push(min);
  
  // Resistance at recent highs  
  const recentMax = Math.max(...prices.slice(-5));
  levels.resistance.push(recentMax);
  levels.resistance.push(max);
  
  return levels;
}

// Main learning cycle
async function runLearningCycle() {
  if (!db) await initDB();
  
  try {
    // Fetch prices from decentralized oracles
    const prices = await fetchDecentralizedPrices();
    
    if (Object.keys(prices).length === 0) {
      console.log('[Background Learning] No prices fetched, skipping cycle');
      return;
    }
    
    const now = Date.now();
    
    // Process each symbol
    for (const [symbol, priceData] of Object.entries(prices)) {
      try {
        let existing = await getLearningData(symbol);
        
        if (!existing) {
          existing = {
            symbol,
            priceHistory: [],
            metrics: { volatility: 0, velocity: 0, trend: 'NEUTRAL' },
            levels: { support: [], resistance: [] },
            predictions: { total: 0, correct: 0 },
            lastUpdate: now,
            source: 'decentralized-oracles'
          };
        }
        
        // Add new price point
        existing.priceHistory.push({
          price: priceData.price,
          timestamp: now,
          source: priceData.source
        });
        
        // Keep only last 100 data points
        if (existing.priceHistory.length > 100) {
          existing.priceHistory = existing.priceHistory.slice(-100);
        }
        
        // Calculate new metrics
        existing.metrics = calculateMetrics(existing.priceHistory);
        
        // Detect levels
        existing.levels = detectLevels(existing.priceHistory);
        
        // Update metadata
        existing.lastUpdate = now;
        existing.source = 'decentralized-oracles';
        
        // Save updated data
        await saveLearningData(existing);
        
      } catch (symbolError) {
        console.error(`[Background Learning] Error processing ${symbol}:`, symbolError);
      }
    }
    
    // Broadcast update to main thread
    self.postMessage({
      type: 'learning_update',
      data: {
        symbolsProcessed: Object.keys(prices).length,
        timestamp: now,
        source: 'decentralized-oracles'
      }
    });
    
    console.log(`[Background Learning] Cycle complete: ${Object.keys(prices).length} symbols from decentralized oracles`);
    
  } catch (error) {
    console.error('[Background Learning] Cycle error:', error);
    self.postMessage({
      type: 'learning_error',
      error: error.message
    });
  }
}

// Start continuous learning
function startLearning() {
  if (isLearning) return;
  
  isLearning = true;
  console.log('[Background Learning] Starting decentralized learning...');
  
  // Run immediately
  runLearningCycle();
  
  // Then run on interval
  learningInterval = setInterval(runLearningCycle, LEARNING_INTERVAL);
  
  self.postMessage({ type: 'learning_started' });
}

// Stop learning
function stopLearning() {
  if (!isLearning) return;
  
  isLearning = false;
  if (learningInterval) {
    clearInterval(learningInterval);
    learningInterval = null;
  }
  
  console.log('[Background Learning] Stopped');
  self.postMessage({ type: 'learning_stopped' });
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'start':
      startLearning();
      break;
      
    case 'stop':
      stopLearning();
      break;
      
    case 'get_data':
      try {
        const symbol = data?.symbol;
        if (symbol) {
          const learningData = await getLearningData(symbol);
          self.postMessage({ type: 'data_response', data: learningData });
        } else {
          const allData = await getAllLearningData();
          self.postMessage({ type: 'data_response', data: allData });
        }
      } catch (error) {
        self.postMessage({ type: 'data_error', error: error.message });
      }
      break;
      
    case 'sync':
      // Manual sync with provided data
      if (data?.symbol && data?.learningData) {
        try {
          await saveLearningData({ symbol: data.symbol, ...data.learningData });
          self.postMessage({ type: 'sync_complete', symbol: data.symbol });
        } catch (error) {
          self.postMessage({ type: 'sync_error', error: error.message });
        }
      }
      break;
      
    case 'status':
      self.postMessage({
        type: 'status_response',
        data: {
          isLearning,
          lastCycle: Date.now(),
          source: 'decentralized-oracles (Pyth/DIA/Redstone)'
        }
      });
      break;
      
    default:
      console.log('[Background Learning] Unknown message type:', type);
  }
};

// Initialize DB on worker start
initDB().then(() => {
  console.log('[Background Learning] Worker initialized with decentralized oracle support');
}).catch(console.error);
