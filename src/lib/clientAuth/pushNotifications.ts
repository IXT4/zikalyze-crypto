// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 Client-Side Push Notifications
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side push notification management
// Uses native browser Notification API
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "zk_push_settings";

interface PushSettings {
  enabled: boolean;
  priceAlerts: boolean;
  whaleActivity: boolean;
  sentimentShift: boolean;
  volumeSpike: boolean;
}

const DEFAULT_SETTINGS: PushSettings = {
  enabled: false,
  priceAlerts: true,
  whaleActivity: true,
  sentimentShift: true,
  volumeSpike: true,
};

// Get push settings
export function getPushSettings(userId: string): PushSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save push settings
export function savePushSettings(userId: string, settings: Partial<PushSettings>): void {
  const current = getPushSettings(userId);
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify({ ...current, ...settings }));
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

// Check current permission status
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

// Enable push notifications
export async function enablePushNotifications(userId: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  
  if (granted) {
    savePushSettings(userId, { enabled: true });
    
    // Show confirmation notification
    showNotification({
      title: "Notifications Enabled",
      body: "You'll now receive alerts for price movements and market events.",
      icon: "/pwa-192x192.png",
    });
  }
  
  return granted;
}

// Disable push notifications
export function disablePushNotifications(userId: string): void {
  savePushSettings(userId, { enabled: false });
}

// Show a notification
export function showNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  urgency?: "low" | "medium" | "high" | "critical";
}): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  
  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || "/pwa-192x192.png",
    tag: options.tag || `zk-${Date.now()}`,
    badge: "/pwa-192x192.png",
  });
  if (options.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url!;
      notification.close();
    };
  }
  
  // Auto-close after 10 seconds for non-critical
  if (options.urgency !== "critical") {
    setTimeout(() => notification.close(), 10000);
  }
}

// Send price alert notification
export function sendPriceAlertNotification(
  userId: string,
  symbol: string,
  condition: "above" | "below",
  targetPrice: number,
  currentPrice: number
): void {
  const settings = getPushSettings(userId);
  if (!settings.enabled || !settings.priceAlerts) return;
  
  const emoji = condition === "above" ? "📈" : "📉";
  const direction = condition === "above" ? "risen above" : "dropped below";
  
  showNotification({
    title: `${emoji} ${symbol} Price Alert`,
    body: `${symbol} has ${direction} $${targetPrice.toLocaleString()}. Current: $${currentPrice.toLocaleString()}`,
    tag: `price-${symbol}-${targetPrice}`,
    url: `/#/dashboard?symbol=${symbol}`,
    urgency: "high",
  });
}

// Send whale activity notification
export function sendWhaleActivityNotification(
  userId: string,
  symbol: string,
  type: "buy" | "sell",
  amount: number
): void {
  const settings = getPushSettings(userId);
  if (!settings.enabled || !settings.whaleActivity) return;
  
  const emoji = type === "buy" ? "🐋💚" : "🐋❤️";
  const action = type === "buy" ? "Large buy" : "Large sell";
  
  showNotification({
    title: `${emoji} Whale Activity - ${symbol}`,
    body: `${action} detected: $${amount.toLocaleString()}`,
    tag: `whale-${symbol}-${Date.now()}`,
    url: `/#/dashboard?symbol=${symbol}`,
    urgency: "medium",
  });
}

// Send sentiment shift notification
export function sendSentimentNotification(
  userId: string,
  symbol: string,
  sentiment: "bullish" | "bearish" | "neutral",
  confidence: number
): void {
  const settings = getPushSettings(userId);
  if (!settings.enabled || !settings.sentimentShift) return;
  
  const emoji = sentiment === "bullish" ? "🟢" : sentiment === "bearish" ? "🔴" : "⚪";
  
  showNotification({
    title: `${emoji} Sentiment Shift - ${symbol}`,
    body: `Market sentiment is now ${sentiment.toUpperCase()} (${confidence}% confidence)`,
    tag: `sentiment-${symbol}`,
    url: `/#/dashboard?symbol=${symbol}`,
    urgency: "low",
  });
}

// Send volume spike notification
export function sendVolumeSpikeNotification(
  userId: string,
  symbol: string,
  volumeChange: number
): void {
  const settings = getPushSettings(userId);
  if (!settings.enabled || !settings.volumeSpike) return;
  
  showNotification({
    title: `📊 Volume Spike - ${symbol}`,
    body: `Trading volume increased by ${volumeChange.toFixed(0)}%`,
    tag: `volume-${symbol}`,
    url: `/#/dashboard?symbol=${symbol}`,
    urgency: "medium",
  });
}
