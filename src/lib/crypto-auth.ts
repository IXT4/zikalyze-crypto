// Simple 11-character alphanumeric access key authentication

// Generate a random 11-character alphanumeric access key
export function generateAccessKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  const array = new Uint8Array(11);
  window.crypto.getRandomValues(array);
  
  for (let i = 0; i < 11; i++) {
    key += chars[array[i] % chars.length];
  }
  
  return key;
}

// Validate access key format (11 alphanumeric characters)
export function isValidAccessKey(key: string): boolean {
  const cleanKey = key.trim().toUpperCase();
  return /^[A-Z0-9]{11}$/.test(cleanKey);
}

// Format access key for display (e.g., XXX-XXXX-XXXX)
export function formatAccessKey(key: string): string {
  const clean = key.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length !== 11) return key;
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`;
}

// Parse access key (remove formatting)
export function parseAccessKey(formattedKey: string): string {
  return formattedKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}
