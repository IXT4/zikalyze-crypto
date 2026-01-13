// ═══════════════════════════════════════════════════════════════════════════════
// 📱 Client-Side Session Tracking
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side session management using localStorage
// No server dependencies - all data encrypted locally
// ═══════════════════════════════════════════════════════════════════════════════

import { zkEncrypt, zkDecrypt, zkHash } from "@/lib/zkCrypto";

const STORAGE_KEY = "zk_sessions";
const MAX_SESSIONS = 10;
const SESSION_MAX_AGE_DAYS = 7;

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface SessionData {
  sessions: SessionInfo[];
}

// Parse user agent to readable device info
function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown Device";
  
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  
  // Detect browser
  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari")) {
    browser = "Safari";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }
  
  // Detect OS
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }
  
  return `${browser} on ${os}`;
}

// Get session data from storage
async function getSessionData(userId: string): Promise<SessionData> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return { sessions: [] };
    
    const decrypted = await zkDecrypt(raw);
    if (!decrypted) return { sessions: [] };
    
    return JSON.parse(decrypted);
  } catch {
    return { sessions: [] };
  }
}

// Save session data to storage
async function saveSessionData(userId: string, data: SessionData): Promise<void> {
  const encrypted = await zkEncrypt(JSON.stringify(data));
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, encrypted);
}

// Generate session ID from current environment
async function generateSessionId(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
  ];
  return zkHash(components.join("|"));
}

// Clean up old sessions (older than 7 days)
function cleanOldSessions(sessions: SessionInfo[]): SessionInfo[] {
  const cutoff = Date.now() - (SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  return sessions.filter(s => new Date(s.lastActiveAt).getTime() > cutoff);
}

// Register or update current session
export async function registerSession(userId: string): Promise<void> {
  const sessionId = await generateSessionId();
  const deviceInfo = parseUserAgent(navigator.userAgent);
  const now = new Date().toISOString();
  
  let data = await getSessionData(userId);
  data.sessions = cleanOldSessions(data.sessions);
  
  // Mark all sessions as not current
  data.sessions.forEach(s => (s.isCurrent = false));
  
  // Find existing session
  const existingIndex = data.sessions.findIndex(s => s.id === sessionId);
  
  if (existingIndex >= 0) {
    // Update existing session
    data.sessions[existingIndex].lastActiveAt = now;
    data.sessions[existingIndex].isCurrent = true;
  } else {
    // Add new session
    const newSession: SessionInfo = {
      id: sessionId,
      deviceInfo,
      createdAt: now,
      lastActiveAt: now,
      isCurrent: true,
    };
    
    data.sessions.push(newSession);
    
    // Limit total sessions
    if (data.sessions.length > MAX_SESSIONS) {
      // Remove oldest non-current sessions
      data.sessions = data.sessions
        .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
        .slice(0, MAX_SESSIONS);
    }
  }
  
  await saveSessionData(userId, data);
}

// List all sessions
export async function listSessions(userId: string): Promise<SessionInfo[]> {
  let data = await getSessionData(userId);
  data.sessions = cleanOldSessions(data.sessions);
  await saveSessionData(userId, data);
  
  return data.sessions.sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );
}

// Revoke a session
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const data = await getSessionData(userId);
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) return false;
  if (session.isCurrent) return false; // Can't revoke current session
  
  data.sessions = data.sessions.filter(s => s.id !== sessionId);
  await saveSessionData(userId, data);
  
  return true;
}

// Revoke all sessions except current
export async function revokeAllOtherSessions(userId: string): Promise<void> {
  const data = await getSessionData(userId);
  data.sessions = data.sessions.filter(s => s.isCurrent);
  await saveSessionData(userId, data);
}

// Clear all sessions (for logout)
export function clearAllSessions(userId: string): void {
  localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
}
