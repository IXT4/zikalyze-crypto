// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 Zikalyze AI Background Learning Worker
// ═══════════════════════════════════════════════════════════════════════════════
// Runs continuously to learn from market data even when app is closed
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'ZikalyzeAIBrain';
const DB_VERSION = 1;
const STORE_NAME = 'learning_data';
const LEARNING_INTERVAL = 10000; // 10 seconds
const TOP_CRYPTOS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 'avalanche-2', 'polygon'];

let db = null;
let isLearning = false;
let learningIntervalId = null;

// Initialize IndexedDB
function initDB() {
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
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        store.createIndex('samplesCollected', 'samplesCollected', { unique: false });
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
    request.onsuccess = () => resolve(request.result || createDefaultLearning(symbol));
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
    request.onsuccess = () => resolve(request.result);
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
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Create default learning data
function createDefaultLearning(symbol) {
  return {
    symbol,
    samplesCollected: 0,
    volatility: 0,
    avgVelocity: 0,
    trendAccuracy: 50,
    lastBias: 'NEUTRAL',
    biasChanges: 0,
    priceHistory: [],
    supportLevels: [],
    resistanceLevels: [],
    avgPrice24h: 0,
    priceRange24h: 0,
    learningSessions: 0,
    lastUpdated: Date.now(),
    offlineSamples: 0
  };
}

// Fetch live price data
async function fetchPriceData() {
  const prices = {};
  
  try {
    // Try CoinGecko first
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${TOP_CRYPTOS.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (response.ok) {
      const data = await response.json();
      for (const [id, priceData] of Object.entries(data)) {
        prices[id] = {
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0
        };
      }
    }
  } catch (e) {
    console.log('[Background Learning] CoinGecko fetch failed, trying CoinCap...');
    
    // Fallback to CoinCap
    try {
      const coincapIds = {
        'bitcoin': 'bitcoin',
        'ethereum': 'ethereum',
        'solana': 'solana',
        'cardano': 'cardano',
        'polkadot': 'polkadot',
        'chainlink': 'chainlink',
        'avalanche-2': 'avalanche',
        'polygon': 'polygon'
      };
      
      for (const [cgId, ccId] of Object.entries(coincapIds)) {
        try {
          const res = await fetch(`https://api.coincap.io/v2/assets/${ccId}`);
          if (res.ok) {
            const { data } = await res.json();
            prices[cgId] = {
              price: parseFloat(data.priceUsd),
              change24h: parseFloat(data.changePercent24Hr) || 0
            };
          }
        } catch (err) {
          // Continue with next
        }
      }
    } catch (e2) {
      console.log('[Background Learning] All price fetches failed');
    }
  }
  
  return prices;
}

// Calculate learning metrics from price data
function calculateMetrics(priceHistory) {
  if (priceHistory.length < 2) {
    return { volatility: 0, velocity: 0, trend: 'NEUTRAL' };
  }
  
  const prices = priceHistory.map(p => p.price);
  const times = priceHistory.map(p => p.timestamp);
  
  // Volatility: standard deviation of price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push((prices[i] - prices[i - 1]) / prices[i - 1] * 100);
  }
  
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);
  
  // Velocity: price change per second
  const totalTime = (times[times.length - 1] - times[0]) / 1000;
  const totalChange = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  const velocity = totalTime > 0 ? totalChange / totalTime : 0;
  
  // Trend detection
  const recentPrices = prices.slice(-5);
  const oldPrices = prices.slice(0, 5);
  const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length;
  
  let trend = 'NEUTRAL';
  const trendStrength = ((recentAvg - oldAvg) / oldAvg) * 100;
  if (trendStrength > 0.5) trend = 'LONG';
  else if (trendStrength < -0.5) trend = 'SHORT';
  
  return { volatility, velocity, trend, trendStrength };
}

// Detect support/resistance levels
function detectLevels(priceHistory) {
  if (priceHistory.length < 10) return { support: [], resistance: [] };
  
  const prices = priceHistory.map(p => p.price);
  const support = [];
  const resistance = [];
  
  // Find local minima and maxima
  for (let i = 2; i < prices.length - 2; i++) {
    const isLocalMin = prices[i] <= prices[i - 1] && prices[i] <= prices[i - 2] &&
                       prices[i] <= prices[i + 1] && prices[i] <= prices[i + 2];
    const isLocalMax = prices[i] >= prices[i - 1] && prices[i] >= prices[i - 2] &&
                       prices[i] >= prices[i + 1] && prices[i] >= prices[i + 2];
    
    if (isLocalMin) support.push(prices[i]);
    if (isLocalMax) resistance.push(prices[i]);
  }
  
  // Cluster similar levels
  const clusterLevels = (levels) => {
    if (levels.length === 0) return [];
    levels.sort((a, b) => a - b);
    const clusters = [];
    let cluster = [levels[0]];
    
    for (let i = 1; i < levels.length; i++) {
      if ((levels[i] - cluster[cluster.length - 1]) / cluster[0] < 0.02) {
        cluster.push(levels[i]);
      } else {
        clusters.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
        cluster = [levels[i]];
      }
    }
    clusters.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
    
    return clusters.slice(-5); // Keep last 5 levels
  };
  
  return {
    support: clusterLevels(support),
    resistance: clusterLevels(resistance)
  };
}

// Main learning cycle
async function runLearningCycle() {
  console.log('[Background Learning] Running learning cycle...');
  
  try {
    const prices = await fetchPriceData();
    const timestamp = Date.now();
    
    for (const [symbol, priceData] of Object.entries(prices)) {
      const learning = await getLearningData(symbol);
      
      // Add to price history (keep last 360 samples = 1 hour at 10s intervals)
      learning.priceHistory.push({
        price: priceData.price,
        change24h: priceData.change24h,
        timestamp
      });
      
      if (learning.priceHistory.length > 360) {
        learning.priceHistory = learning.priceHistory.slice(-360);
      }
      
      // Calculate metrics
      const metrics = calculateMetrics(learning.priceHistory);
      const levels = detectLevels(learning.priceHistory);
      
      // Update learning data with exponential moving average
      const alpha = 0.1; // Smoothing factor
      learning.volatility = learning.volatility * (1 - alpha) + metrics.volatility * alpha;
      learning.avgVelocity = learning.avgVelocity * (1 - alpha) + Math.abs(metrics.velocity) * alpha;
      
      // Track bias changes
      if (learning.lastBias !== metrics.trend && metrics.trend !== 'NEUTRAL') {
        learning.biasChanges++;
      }
      learning.lastBias = metrics.trend;
      
      // Update support/resistance levels
      for (const level of levels.support) {
        if (!learning.supportLevels.some(l => Math.abs(l - level) / level < 0.01)) {
          learning.supportLevels.push(level);
          if (learning.supportLevels.length > 10) {
            learning.supportLevels = learning.supportLevels.slice(-10);
          }
        }
      }
      
      for (const level of levels.resistance) {
        if (!learning.resistanceLevels.some(l => Math.abs(l - level) / level < 0.01)) {
          learning.resistanceLevels.push(level);
          if (learning.resistanceLevels.length > 10) {
            learning.resistanceLevels = learning.resistanceLevels.slice(-10);
          }
        }
      }
      
      // Calculate 24h metrics from history
      const hour24Ago = timestamp - 24 * 60 * 60 * 1000;
      const recent24h = learning.priceHistory.filter(p => p.timestamp > hour24Ago);
      if (recent24h.length > 0) {
        const prices24h = recent24h.map(p => p.price);
        learning.avgPrice24h = prices24h.reduce((a, b) => a + b, 0) / prices24h.length;
        learning.priceRange24h = Math.max(...prices24h) - Math.min(...prices24h);
      }
      
      // Increment counters
      learning.samplesCollected++;
      learning.offlineSamples++;
      learning.lastUpdated = timestamp;
      
      // Save learning data
      await saveLearningData(learning);
    }
    
    console.log(`[Background Learning] Cycle complete. Learned from ${Object.keys(prices).length} cryptos.`);
    
    // Broadcast update to any open tabs
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'LEARNING_UPDATE',
          timestamp,
          cryptosLearned: Object.keys(prices).length
        });
      });
    });
    
  } catch (e) {
    console.error('[Background Learning] Cycle error:', e);
  }
}

// Start continuous learning
function startLearning() {
  if (isLearning) return;
  
  isLearning = true;
  console.log('[Background Learning] Starting continuous learning...');
  
  // Run immediately
  runLearningCycle();
  
  // Then run every interval
  learningIntervalId = setInterval(runLearningCycle, LEARNING_INTERVAL);
}

// Stop learning
function stopLearning() {
  if (!isLearning) return;
  
  isLearning = false;
  if (learningIntervalId) {
    clearInterval(learningIntervalId);
    learningIntervalId = null;
  }
  console.log('[Background Learning] Stopped learning.');
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, symbol } = event.data;
  
  switch (type) {
    case 'START_LEARNING':
      startLearning();
      break;
      
    case 'STOP_LEARNING':
      stopLearning();
      break;
      
    case 'GET_LEARNING_DATA':
      const data = symbol 
        ? await getLearningData(symbol)
        : await getAllLearningData();
      self.postMessage({ type: 'LEARNING_DATA', data });
      break;
      
    case 'SYNC_LEARNING':
      // Sync with localStorage data from main app
      if (event.data.patterns) {
        const existing = await getLearningData(symbol);
        // Merge, preferring higher sample counts
        if (event.data.patterns.samplesCollected > existing.samplesCollected) {
          await saveLearningData({ ...existing, ...event.data.patterns, symbol });
        }
      }
      break;
      
    case 'GET_STATUS':
      self.postMessage({ 
        type: 'STATUS', 
        isLearning, 
        cryptosTracked: TOP_CRYPTOS.length 
      });
      break;
  }
};

// Auto-start learning when worker loads
initDB().then(() => {
  startLearning();
  console.log('[Background Learning] Worker initialized and learning started.');
});
