// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 Client-Side Rate Limiting with ZK Encryption
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side rate limiting using encrypted localStorage
// No server dependencies - all data ZK encrypted
// ═══════════════════════════════════════════════════════════════════════════════

import { zkEncrypt, zkDecrypt } from "@/lib/zkCrypto";

const STORAGE_KEY = "zk_rate_limit_v2";
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

interface RateLimitData {
  attempts: { timestamp: number; success: boolean }[];
}

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  max_attempts: number;
  retry_after: number;
}

function getStorageKey(email: string): string {
  return `${STORAGE_KEY}_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

async function getData(email: string): Promise<RateLimitData> {
  try {
    const raw = localStorage.getItem(getStorageKey(email));
    if (!raw) return { attempts: [] };
    
    // Decrypt the data
    const decrypted = await zkDecrypt(raw);
    if (!decrypted) return { attempts: [] };
    
    return JSON.parse(decrypted);
  } catch {
    return { attempts: [] };
  }
}

async function saveData(email: string, data: RateLimitData): Promise<void> {
  try {
    const encrypted = await zkEncrypt(JSON.stringify(data));
    localStorage.setItem(getStorageKey(email), encrypted);
  } catch {
    // Fallback to plain storage if encryption fails
    localStorage.setItem(getStorageKey(email), JSON.stringify(data));
  }
}

// Clean up old attempts outside the window
function cleanOldAttempts(data: RateLimitData): RateLimitData {
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  
  return {
    attempts: data.attempts.filter(a => a.timestamp > cutoff),
  };
}

// Check if login is allowed
export async function checkRateLimit(email: string): Promise<RateLimitResult> {
  const data = cleanOldAttempts(await getData(email));
  await saveData(email, data);
  
  const failedAttempts = data.attempts.filter(a => !a.success);
  const failedCount = failedAttempts.length;
  
  if (failedCount >= MAX_ATTEMPTS) {
    // Calculate retry_after
    const oldestFailure = failedAttempts[0];
    const windowMs = WINDOW_MINUTES * 60 * 1000;
    const unlockTime = oldestFailure.timestamp + windowMs;
    const retryAfter = Math.max(0, Math.ceil((unlockTime - Date.now()) / 1000));
    
    return {
      allowed: false,
      attempts: failedCount,
      max_attempts: MAX_ATTEMPTS,
      retry_after: retryAfter,
    };
  }
  
  return {
    allowed: true,
    attempts: failedCount,
    max_attempts: MAX_ATTEMPTS,
    retry_after: 0,
  };
}

// Record a login attempt
export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  let data = cleanOldAttempts(await getData(email));
  
  if (success) {
    // Clear failed attempts on success
    data.attempts = data.attempts.filter(a => a.success);
  }
  
  data.attempts.push({
    timestamp: Date.now(),
    success,
  });
  
  await saveData(email, data);
  
  // Auto-cleanup: remove data older than 24 hours
  const dayMs = 24 * 60 * 60 * 1000;
  const dayCutoff = Date.now() - dayMs;
  data.attempts = data.attempts.filter(a => a.timestamp > dayCutoff);
  await saveData(email, data);
}

// Format retry_after for display
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// Get recent login history (for settings page)
export async function getLoginHistory(email: string, limit = 10): Promise<{ timestamp: Date; success: boolean }[]> {
  const data = await getData(email);
  return data.attempts
    .slice(-limit)
    .reverse()
    .map(a => ({
      timestamp: new Date(a.timestamp),
      success: a.success,
    }));
}
