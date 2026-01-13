// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 Client-Side Authentication Library with ZK Encryption
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side auth utilities - no server dependencies
// All sensitive data encrypted with AES-256-GCM (ZK-style)
// ═══════════════════════════════════════════════════════════════════════════════

// TOTP 2FA
export {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  setup2FA,
  verifyAndEnable2FA,
  validateToken as validate2FAToken,
  validateBackupCode,
  check2FAStatus,
  disable2FA,
} from "./totp";

// Rate Limiting (with ZK encryption)
export {
  checkRateLimit,
  recordLoginAttempt,
  formatRetryAfter,
  getLoginHistory,
} from "./rateLimit";

// Session Tracking (with ZK encryption)
export {
  registerSession,
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
  clearAllSessions,
  type SessionInfo,
} from "./sessionTracking";

// Push Notifications (with ZK encryption)
export {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  getPushSettings,
  savePushSettings,
  showNotification,
  sendPriceAlertNotification,
  sendWhaleActivityNotification,
  sendSentimentNotification,
  sendVolumeSpikeNotification,
} from "./pushNotifications";
