// Service Worker for Push Notifications, Offline Caching, and Background AI Learning
const CACHE_NAME = 'zikalyze-v5';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/offline.html',
  '/background-learning-worker.js'
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 Background AI Learning System
// ═══════════════════════════════════════════════════════════════════════════════
const DB_NAME = 'ZikalyzeAIBrain';
const DB_VERSION = 1;
const STORE_NAME = 'learning_data';
const BACKGROUND_LEARNING_INTERVAL = 30000; // 30 seconds when in background
const TOP_CRYPTOS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 'avalanche-2', 'polygon'];

let backgroundLearningActive = false;
let backgroundLearningTimer = null;
let swDB = null;

// Initialize IndexedDB in Service Worker
async function initSWDB() {
  if (swDB) return swDB;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[SW Brain] IndexedDB error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      swDB = request.result;
      console.log('[SW Brain] IndexedDB ready');
      resolve(swDB);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    };
  });
}

// Fetch prices and learn
async function backgroundLearn() {
  console.log('[SW Brain] Background learning cycle...');
  
  try {
    // Fetch live prices
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${TOP_CRYPTOS.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      console.log('[SW Brain] Price fetch failed, will retry...');
      return;
    }
    
    const prices = await response.json();
    const db = await initSWDB();
    const timestamp = Date.now();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    for (const [symbol, priceData] of Object.entries(prices)) {
      // Get existing data
      const getRequest = store.get(symbol);
      
      getRequest.onsuccess = () => {
        let learning = getRequest.result || {
          symbol,
          samplesCollected: 0,
          volatility: 0,
          avgVelocity: 0,
          lastBias: 'NEUTRAL',
          biasChanges: 0,
          priceHistory: [],
          supportLevels: [],
          resistanceLevels: [],
          offlineSamples: 0,
          lastUpdated: timestamp
        };
        
        // Add price point
        learning.priceHistory.push({
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          timestamp
        });
        
        // Keep last 720 samples (6 hours at 30s intervals)
        if (learning.priceHistory.length > 720) {
          learning.priceHistory = learning.priceHistory.slice(-720);
        }
        
        // Calculate metrics
        if (learning.priceHistory.length >= 2) {
          const recentPrices = learning.priceHistory.slice(-10).map(p => p.price);
          const changes = [];
          for (let i = 1; i < recentPrices.length; i++) {
            changes.push(Math.abs((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1] * 100));
          }
          const newVolatility = changes.length > 0 
            ? changes.reduce((a, b) => a + b, 0) / changes.length 
            : 0;
          
          // Exponential smoothing
          learning.volatility = learning.volatility * 0.9 + newVolatility * 0.1;
          
          // Detect trend
          const firstPrice = learning.priceHistory[0].price;
          const lastPrice = learning.priceHistory[learning.priceHistory.length - 1].price;
          const trendPct = ((lastPrice - firstPrice) / firstPrice) * 100;
          
          const newBias = trendPct > 1 ? 'LONG' : trendPct < -1 ? 'SHORT' : 'NEUTRAL';
          if (learning.lastBias !== newBias) {
            learning.biasChanges++;
          }
          learning.lastBias = newBias;
        }
        
        learning.samplesCollected++;
        learning.offlineSamples++;
        learning.lastUpdated = timestamp;
        
        store.put(learning);
      };
    }
    
    console.log(`[SW Brain] Learned from ${Object.keys(prices).length} cryptos. Total cycles: background`);
    
  } catch (e) {
    console.error('[SW Brain] Learning error:', e);
  }
}

// Start background learning
function startBackgroundLearning() {
  if (backgroundLearningActive) return;
  
  backgroundLearningActive = true;
  console.log('[SW Brain] 🧠 Starting background learning...');
  
  // Run immediately
  backgroundLearn();
  
  // Then periodically
  backgroundLearningTimer = setInterval(backgroundLearn, BACKGROUND_LEARNING_INTERVAL);
}

// Stop background learning
function stopBackgroundLearning() {
  if (!backgroundLearningActive) return;
  
  backgroundLearningActive = false;
  if (backgroundLearningTimer) {
    clearInterval(backgroundLearningTimer);
    backgroundLearningTimer = null;
  }
  console.log('[SW Brain] Background learning stopped');
}

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches and start background learning
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Start background AI learning immediately on activation
      startBackgroundLearning();
      return clients.claim();
    })
  );
});

// Handle messages from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'START_BACKGROUND_LEARNING':
      startBackgroundLearning();
      event.source?.postMessage({ type: 'LEARNING_STATUS', active: true });
      break;
      
    case 'STOP_BACKGROUND_LEARNING':
      stopBackgroundLearning();
      event.source?.postMessage({ type: 'LEARNING_STATUS', active: false });
      break;
      
    case 'GET_OFFLINE_LEARNING':
      // Send accumulated offline learning data to the app
      initSWDB().then(db => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          event.source?.postMessage({ 
            type: 'OFFLINE_LEARNING_DATA', 
            data: request.result || [] 
          });
        };
      }).catch(e => {
        console.error('[SW Brain] Failed to get offline learning:', e);
      });
      break;
      
    case 'SYNC_LEARNING':
      // Merge learning data from app with offline data
      if (data?.symbol && data?.patterns) {
        initSWDB().then(db => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(data.symbol);
          
          request.onsuccess = () => {
            const existing = request.result || {};
            // Merge, keeping higher sample counts and combining histories
            const merged = {
              ...existing,
              ...data.patterns,
              symbol: data.symbol,
              samplesCollected: Math.max(existing.samplesCollected || 0, data.patterns.samplesCollected || 0),
              offlineSamples: existing.offlineSamples || 0
            };
            store.put(merged);
          };
        }).catch(e => {
          console.error('[SW Brain] Failed to sync learning:', e);
        });
      }
      break;
      
    case 'GET_LEARNING_STATUS':
      event.source?.postMessage({ 
        type: 'LEARNING_STATUS', 
        active: backgroundLearningActive,
        interval: BACKGROUND_LEARNING_INTERVAL,
        cryptosTracked: TOP_CRYPTOS.length
      });
      break;
  }
});

// Periodic background sync for learning (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ai-background-learning') {
    console.log('[SW Brain] Periodic sync triggered');
    event.waitUntil(backgroundLearn());
  }
});

// Regular background sync (for syncing with server when back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ai-learning') {
    console.log('[SW Brain] Background sync triggered');
    event.waitUntil(backgroundLearn());
  }
});

// Fetch - network first, fallback to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip API and external requests
  if (request.url.includes('/api/') || 
      request.url.includes('supabase') ||
      request.url.includes('exchangerate-api') ||
      request.url.includes('coingecko') ||
      request.url.includes('coincap') ||
      request.url.includes('binance') ||
      !request.url.startsWith(self.location.origin)) {
    return;
  }

  // For navigation requests, use network-first strategy
  // IMPORTANT: HashRouter uses the hash fragment for routing, so we must
  // always serve the root index.html and let the client-side router handle it
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the index.html for offline support
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Always cache as root URL for HashRouter compatibility
              cache.put('/', responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // For HashRouter: always serve cached root/index.html
          // The hash fragment will be preserved and handled client-side
          return caches.match('/').then((cached) => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  if (request.url.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// Professional notification icons by type
const getNotificationIcon = (type) => {
  const icons = {
    price_alert: '🎯',
    price_surge: '🚀',
    price_drop: '📉',
    sentiment_shift: '📊',
    whale_activity: '🐋',
    volume_spike: '📈'
  };
  return icons[type] || '🔔';
};

// Get badge color based on urgency
const getUrgencyBadge = (urgency) => {
  const badges = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  };
  return badges[urgency] || '#6366f1';
};

// Push notification handling with professional formatting
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = { 
    title: 'Zikalyze Alert', 
    body: 'You have a new notification',
    type: 'price_alert',
    urgency: 'medium'
  };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  // Professional notification options - auto-dismiss after confirmation
  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.ico',
    image: data.image || undefined,
    vibrate: data.urgency === 'critical' 
      ? [200, 100, 200, 100, 200] 
      : data.urgency === 'high'
        ? [200, 100, 200]
        : [200],
    tag: `${data.type || 'alert'}-${data.symbol || 'general'}`,
    renotify: data.urgency === 'critical',
    requireInteraction: false, // Auto-dismiss all notifications
    silent: data.urgency === 'low',
    timestamp: Date.now(),
    data: {
      url: data.url || '/dashboard',
      symbol: data.symbol,
      type: data.type,
      urgency: data.urgency
    },
    actions: [
      { 
        action: 'view', 
        title: data.symbol ? `View ${data.symbol}` : 'View Details'
      },
      { 
        action: 'dismiss', 
        title: 'Dismiss' 
      }
    ]
  };

  // Add additional actions for specific types
  if (data.type === 'price_alert' || data.type === 'price_surge' || data.type === 'price_drop') {
    options.actions = [
      { action: 'view', title: `📊 Analyze ${data.symbol}` },
      { action: 'alerts', title: '🔔 Alerts' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  if (data.type === 'whale_activity') {
    options.actions = [
      { action: 'view', title: '🐋 View On-Chain' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks with smart routing
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  let url = event.notification.data?.url || '/dashboard';
  const symbol = event.notification.data?.symbol;
  const type = event.notification.data?.type;
  
  // Smart routing based on action and type
  if (event.action === 'alerts') {
    url = '/dashboard/alerts';
  } else if (event.action === 'view' && symbol) {
    // Route to appropriate section based on notification type
    if (type === 'whale_activity' || type === 'volume_spike') {
      url = `/dashboard?crypto=${symbol.toLowerCase()}&tab=onchain`;
    } else if (type === 'sentiment_shift') {
      url = `/dashboard?crypto=${symbol.toLowerCase()}&tab=sentiment`;
    } else {
      url = `/dashboard?crypto=${symbol.toLowerCase()}`;
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
