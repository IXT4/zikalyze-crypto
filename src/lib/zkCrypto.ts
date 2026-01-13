// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 ZK-Style Privacy Encryption for Local Data
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Web Crypto API for client-side encryption with derived keys
// No centralized key servers - fully decentralized privacy
// AES-256-GCM encryption with PBKDF2 key derivation
// ═══════════════════════════════════════════════════════════════════════════════

const ZK_SALT = new Uint8Array([90, 75, 45, 83, 65, 76, 84, 45, 50, 48, 50, 54, 45, 90, 75, 65]);
const ZK_VERSION = "v2"; // Version for migration support

// Derive a key from user-specific entropy (fingerprint-like)
async function deriveKey(entropy: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(entropy),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ZK_SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate device-specific entropy (privacy-preserving fingerprint)
function generateEntropy(): string {
  const components = [
    navigator.userAgent.substring(0, 50),
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.width.toString(),
    screen.height.toString(),
    navigator.hardwareConcurrency?.toString() || '4',
  ];
  return components.join('|');
}

// Encrypt data with ZK-style privacy
export async function zkEncrypt(data: string): Promise<string> {
  try {
    const entropy = generateEntropy();
    const key = await deriveKey(entropy);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Base64 encode for storage with version prefix
    return `${ZK_VERSION}:${btoa(String.fromCharCode(...combined))}`;
  } catch (e) {
    console.warn('[ZK] Encryption not available, using plain storage');
    return `PLAIN:${data}`;
  }
}

// Decrypt ZK-encrypted data
export async function zkDecrypt(encryptedData: string): Promise<string | null> {
  try {
    // Handle plain fallback
    if (encryptedData.startsWith('PLAIN:')) {
      return encryptedData.slice(6);
    }
    
    // Handle versioned data
    let base64Data = encryptedData;
    if (encryptedData.startsWith(`${ZK_VERSION}:`)) {
      base64Data = encryptedData.slice(ZK_VERSION.length + 1);
    } else if (encryptedData.includes(':')) {
      // Unknown version - try anyway
      base64Data = encryptedData.split(':').slice(1).join(':');
    }
    
    const entropy = generateEntropy();
    const key = await deriveKey(entropy);
    
    // Decode base64
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    console.warn('[ZK] Decryption failed');
    return null;
  }
}

// Secure localStorage wrapper with ZK encryption
export const zkStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await zkEncrypt(value);
      localStorage.setItem(`zk_${key}`, encrypted);
    } catch {
      // Fallback to plain storage
      localStorage.setItem(key, value);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(`zk_${key}`);
      if (!encrypted) {
        // Try plain key for backwards compatibility
        return localStorage.getItem(key);
      }
      return await zkDecrypt(encrypted);
    } catch {
      return localStorage.getItem(key);
    }
  },
  
  removeItem(key: string): void {
    localStorage.removeItem(`zk_${key}`);
    localStorage.removeItem(key);
  },
};

// Hash function for privacy-preserving identifiers
export async function zkHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data + 'ZK-SALT-2026'));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a privacy-preserving session ID
export async function generatePrivateSessionId(): Promise<string> {
  const entropy = generateEntropy();
  const timestamp = Date.now().toString();
  const random = crypto.getRandomValues(new Uint8Array(16));
  const randomStr = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return zkHash(`${entropy}|${timestamp}|${randomStr}`);
}

// Secure comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Generate cryptographically secure random bytes
export function generateSecureRandom(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Generate a secure random token (hex encoded)
export function generateSecureToken(byteLength = 32): string {
  const bytes = generateSecureRandom(byteLength);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive a key from password (for user-provided secrets)
export async function deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const useSalt = salt || generateSecureRandom(16);
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(useSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  return { key, salt: useSalt };
}

// Encrypt with user-provided password
export async function encryptWithPassword(data: string, password: string): Promise<string> {
  try {
    const { key, salt } = await deriveKeyFromPassword(password);
    const iv = generateSecureRandom(12);
    const encoder = new TextEncoder();
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      encoder.encode(data)
    );
    
    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + (encryptedBuffer as ArrayBuffer).byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    return `PWD:${btoa(String.fromCharCode(...combined))}`;
  } catch (e) {
    console.error('[ZK] Password encryption failed:', e);
    throw new Error('Encryption failed');
  }
}

// Decrypt with user-provided password
export async function decryptWithPassword(encryptedData: string, password: string): Promise<string | null> {
  try {
    if (!encryptedData.startsWith('PWD:')) {
      throw new Error('Invalid encrypted data format');
    }
    
    const base64Data = encryptedData.slice(4);
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const salt = combined.slice(0, 16) as Uint8Array;
    const iv = combined.slice(16, 28) as Uint8Array;
    const ciphertext = combined.slice(28) as Uint8Array;
    
    const { key } = await deriveKeyFromPassword(password, salt);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ciphertext)
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.warn('[ZK] Password decryption failed');
    return null;
  }
}
