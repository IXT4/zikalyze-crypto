// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 Client-Side TOTP Implementation (RFC 6238)
// ═══════════════════════════════════════════════════════════════════════════════
// Fully client-side 2FA using Web Crypto API
// No server dependencies - secrets encrypted locally
// ═══════════════════════════════════════════════════════════════════════════════

import { zkEncrypt, zkDecrypt, zkHash } from "@/lib/zkCrypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STORAGE_KEY = "zk_2fa_data";

interface TwoFAData {
  encryptedSecret: string;
  hashedBackupCodes: string[];
  isEnabled: boolean;
  createdAt: string;
}

// Generate a secure TOTP secret (10 bytes = 16 Base32 chars)
export function generateSecret(): string {
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);
  
  let bits = 0;
  let value = 0;
  let secret = "";
  
  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << 8) | randomBytes[i];
    bits += 8;
    
    while (bits >= 5) {
      bits -= 5;
      secret += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  
  return secret;
}

// Base32 decode
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const length = Math.floor((cleaned.length * 5) / 8);
  const result = new Uint8Array(length);
  
  let buffer = 0;
  let bitsLeft = 0;
  let index = 0;
  
  for (const char of cleaned) {
    const charValue = BASE32_CHARS.indexOf(char);
    if (charValue === -1) continue;
    
    buffer = (buffer << 5) | charValue;
    bitsLeft += 5;
    
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result[index++] = (buffer >> bitsLeft) & 0xff;
    }
  }
  
  return result;
}

// HMAC-SHA1 using Web Crypto API
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// Generate TOTP code
export async function generateTOTP(secret: string, timeStep = 30, digits = 6): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  const key = base32Decode(secret);
  const hmac = await hmacSha1(key, counterBytes);
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

// Verify TOTP token with time window
export async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor(now / timeStep) + i;
    
    const counterBytes = new Uint8Array(8);
    let temp = counter;
    for (let j = 7; j >= 0; j--) {
      counterBytes[j] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }
    
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key, counterBytes);
    
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, "0");
    
    if (otp === token) {
      return true;
    }
  }
  
  return false;
}

// Generate backup codes
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

// Get 2FA data from storage
async function get2FAData(userId: string): Promise<TwoFAData | null> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return null;
    
    const decrypted = await zkDecrypt(raw);
    if (!decrypted) return null;
    
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// Save 2FA data to storage
async function save2FAData(userId: string, data: TwoFAData): Promise<void> {
  const encrypted = await zkEncrypt(JSON.stringify(data));
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, encrypted);
}

// Setup 2FA - returns setup data
export async function setup2FA(userId: string, email: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}> {
  const secret = generateSecret();
  const issuer = "Zikalyze";
  const accountName = email || userId;
  
  const backupCodes = generateBackupCodes(8);
  const hashedBackupCodes = await Promise.all(backupCodes.map(code => zkHash(code.replace(/-/g, "").toUpperCase())));
  
  const encryptedSecret = await zkEncrypt(secret);
  
  // Store but don't enable yet
  await save2FAData(userId, {
    encryptedSecret,
    hashedBackupCodes,
    isEnabled: false,
    createdAt: new Date().toISOString(),
  });
  
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  
  return { secret, qrCodeUrl, backupCodes, otpauthUrl };
}

// Verify and enable 2FA
export async function verifyAndEnable2FA(userId: string, token: string): Promise<boolean> {
  const data = await get2FAData(userId);
  if (!data?.encryptedSecret) return false;
  
  const secret = await zkDecrypt(data.encryptedSecret);
  if (!secret) return false;
  
  const isValid = await verifyTOTP(secret, token);
  if (!isValid) return false;
  
  // Enable 2FA
  data.isEnabled = true;
  await save2FAData(userId, data);
  
  return true;
}

// Validate token
export async function validateToken(userId: string, token: string): Promise<boolean> {
  const data = await get2FAData(userId);
  if (!data?.encryptedSecret || !data.isEnabled) return false;
  
  const secret = await zkDecrypt(data.encryptedSecret);
  if (!secret) return false;
  
  return verifyTOTP(secret, token);
}

// Validate backup code
export async function validateBackupCode(userId: string, code: string): Promise<{ valid: boolean; remainingCodes: number }> {
  const data = await get2FAData(userId);
  if (!data?.hashedBackupCodes || !data.isEnabled) {
    return { valid: false, remainingCodes: 0 };
  }
  
  const hashedCode = await zkHash(code.replace(/-/g, "").toUpperCase());
  const codeIndex = data.hashedBackupCodes.indexOf(hashedCode);
  
  if (codeIndex === -1) {
    return { valid: false, remainingCodes: data.hashedBackupCodes.length };
  }
  
  // Remove used code
  data.hashedBackupCodes.splice(codeIndex, 1);
  await save2FAData(userId, data);
  
  return { valid: true, remainingCodes: data.hashedBackupCodes.length };
}

// Check 2FA status
export async function check2FAStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
  const data = await get2FAData(userId);
  if (!data) {
    return { enabled: false, backupCodesRemaining: 0 };
  }
  
  return {
    enabled: data.isEnabled,
    backupCodesRemaining: data.hashedBackupCodes?.length || 0,
  };
}

// Disable 2FA
export async function disable2FA(userId: string, token: string): Promise<boolean> {
  const isValid = await validateToken(userId, token);
  if (!isValid) return false;
  
  localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  return true;
}
