// Service Worker for Push Notifications and Offline Caching
const CACHE_NAME = 'zikalyze-v4';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/offline.html'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
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

  // Professional notification options
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
    requireInteraction: data.urgency === 'critical' || data.urgency === 'high',
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
