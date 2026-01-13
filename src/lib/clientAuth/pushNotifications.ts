// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 Client-Side Push Notifications with ZK Encryption
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side push notification management
// Uses native browser Notification API with encrypted settings
// ═══════════════════════════════════════════════════════════════════════════════

import { zkEncrypt, zkDecrypt } from "@/lib/zkCrypto";

const STORAGE_KEY = "zk_push_settings_v2";

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

// Get push settings (encrypted)
export async function getPushSettings(userId: string): Promise<PushSettings> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return DEFAULT_SETTINGS;
    
    const decrypted = await zkDecrypt(raw);
    if (!decrypted) return DEFAULT_SETTINGS;
    
    return { ...DEFAULT_SETTINGS, ...JSON.parse(decrypted) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save push settings (encrypted)
export async function savePushSettings(userId: string, settings: Partial<PushSettings>): Promise<void> {
  try {
    const current = await getPushSettings(userId);
    const updated = { ...current, ...settings };
    const encrypted = await zkEncrypt(JSON.stringify(updated));
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, encrypted);
  } catch {
    // Fallback to plain storage
    const current = await getPushSettings(userId);
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify({ ...current, ...settings }));
  }
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
    await savePushSettings(userId, { enabled: true });
    
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
export async function disablePushNotifications(userId: string): Promise<void> {
  await savePushSettings(userId, { enabled: false });
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
export async function sendPriceAlertNotification(
  userId: string,
  symbol: string,
  condition: "above" | "below",
  targetPrice: number,
  currentPrice: number
): Promise<void> {
  const settings = await getPushSettings(userId);
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
export async function sendWhaleActivityNotification(
  userId: string,
  symbol: string,
  type: "buy" | "sell",
  amount: number
): Promise<void> {
  const settings = await getPushSettings(userId);
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
export async function sendSentimentNotification(
  userId: string,
  symbol: string,
  sentiment: "bullish" | "bearish" | "neutral",
  confidence: number
): Promise<void> {
  const settings = await getPushSettings(userId);
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
export async function sendVolumeSpikeNotification(
  userId: string,
  symbol: string,
  volumeChange: number
): Promise<void> {
  const settings = await getPushSettings(userId);
  if (!settings.enabled || !settings.volumeSpike) return;
  
  showNotification({
    title: `📊 Volume Spike - ${symbol}`,
    body: `Trading volume increased by ${volumeChange.toFixed(0)}%`,
    tag: `volume-${symbol}`,
    url: `/#/dashboard?symbol=${symbol}`,
    urgency: "medium",
  });
}
