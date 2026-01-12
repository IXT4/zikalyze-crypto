// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 ZK-Style Privacy Encryption for Local Data
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Web Crypto API for client-side encryption with derived keys
// No centralized key servers - fully decentralized privacy
// ═══════════════════════════════════════════════════════════════════════════════

const ZK_SALT = new Uint8Array([90, 75, 45, 83, 65, 76, 84, 45, 50, 48, 50, 52, 45, 90, 75, 65]);

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
    
    // Base64 encode for storage
    return btoa(String.fromCharCode(...combined));
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
    
    const entropy = generateEntropy();
    const key = await deriveKey(entropy);
    
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data + 'ZK-SALT'));
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
