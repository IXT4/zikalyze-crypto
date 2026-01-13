// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 Client-Side Authentication Library
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side auth utilities - no server dependencies
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

// Rate Limiting
export {
  checkRateLimit,
  recordLoginAttempt,
  formatRetryAfter,
  getLoginHistory,
} from "./rateLimit";

// Session Tracking
export {
  registerSession,
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
  clearAllSessions,
  type SessionInfo,
} from "./sessionTracking";

// Push Notifications
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
