// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 E2E ENCRYPTION FOR ANALYSIS HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
// Encrypts sensitive analysis data before storage (local & cloud)
// Decrypts on retrieval - keys never leave the client
// ═══════════════════════════════════════════════════════════════════════════════

import { zkEncrypt, zkDecrypt, zkHash, generateSecureRandom } from './zkCrypto';

// Fields that contain sensitive analysis content
const ENCRYPTED_FIELDS = ['analysis_text', 'bias'] as const;

// Marker prefix for encrypted data identification
const E2E_PREFIX = 'E2E:';

export interface EncryptedAnalysisRecord {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  analysis_text: string; // Will be encrypted
  confidence: number | null;
  bias: string | null; // Will be encrypted
  created_at: string;
  user_id: string | null;
  was_correct: boolean | null;
  feedback_at: string | null;
  _encrypted?: boolean; // Internal flag
  _checksum?: string; // Integrity verification
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 ENCRYPTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encrypts sensitive fields in an analysis record
 * Non-sensitive fields (price, timestamps) remain in plaintext for querying
 */
export async function encryptAnalysisRecord<T extends Partial<EncryptedAnalysisRecord>>(
  record: T
): Promise<T> {
  const encrypted = { ...record };

  // Encrypt analysis_text if present
  if (encrypted.analysis_text && !encrypted.analysis_text.startsWith(E2E_PREFIX)) {
    try {
      const encryptedText = await zkEncrypt(encrypted.analysis_text);
      encrypted.analysis_text = `${E2E_PREFIX}${encryptedText}`;
    } catch (e) {
      console.warn('[E2E] Failed to encrypt analysis_text:', e);
    }
  }

  // Encrypt bias if present
  if (encrypted.bias && !encrypted.bias.startsWith(E2E_PREFIX)) {
    try {
      const encryptedBias = await zkEncrypt(encrypted.bias);
      encrypted.bias = `${E2E_PREFIX}${encryptedBias}`;
    } catch (e) {
      console.warn('[E2E] Failed to encrypt bias:', e);
    }
  }

  // Generate checksum for integrity
  if (encrypted.analysis_text) {
    encrypted._checksum = await generateChecksum(encrypted.id || '', encrypted.analysis_text);
  }

  encrypted._encrypted = true;
  return encrypted;
}

/**
 * Decrypts sensitive fields in an analysis record
 * Returns original plaintext record
 */
export async function decryptAnalysisRecord<T extends Partial<EncryptedAnalysisRecord>>(
  record: T
): Promise<T> {
  const decrypted = { ...record };

  // Decrypt analysis_text if encrypted
  if (decrypted.analysis_text?.startsWith(E2E_PREFIX)) {
    try {
      const encryptedData = decrypted.analysis_text.slice(E2E_PREFIX.length);
      const plaintext = await zkDecrypt(encryptedData);
      if (plaintext) {
        decrypted.analysis_text = plaintext;
      } else {
        console.warn('[E2E] Decryption returned null for analysis_text');
        decrypted.analysis_text = '[Decryption failed - data may be from another device]';
      }
    } catch (e) {
      console.warn('[E2E] Failed to decrypt analysis_text:', e);
      decrypted.analysis_text = '[Encrypted content - unable to decrypt]';
    }
  }

  // Decrypt bias if encrypted
  if (decrypted.bias?.startsWith(E2E_PREFIX)) {
    try {
      const encryptedData = decrypted.bias.slice(E2E_PREFIX.length);
      const plaintext = await zkDecrypt(encryptedData);
      if (plaintext) {
        decrypted.bias = plaintext;
      } else {
        decrypted.bias = null;
      }
    } catch (e) {
      console.warn('[E2E] Failed to decrypt bias:', e);
      decrypted.bias = null;
    }
  }

  delete decrypted._encrypted;
  delete decrypted._checksum;
  return decrypted;
}

/**
 * Decrypt multiple records in parallel
 */
export async function decryptAnalysisRecords<T extends Partial<EncryptedAnalysisRecord>>(
  records: T[]
): Promise<T[]> {
  return Promise.all(records.map(r => decryptAnalysisRecord(r)));
}

/**
 * Check if a record is encrypted
 */
export function isRecordEncrypted(record: Partial<EncryptedAnalysisRecord>): boolean {
  return !!(
    record._encrypted || 
    record.analysis_text?.startsWith(E2E_PREFIX) ||
    record.bias?.startsWith(E2E_PREFIX)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔏 INTEGRITY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a checksum for integrity verification
 */
async function generateChecksum(id: string, content: string): Promise<string> {
  const combined = `${id}:${content}`;
  const hash = await zkHash(combined);
  return hash.substring(0, 16); // Short hash for storage efficiency
}

/**
 * Verify record integrity
 */
export async function verifyRecordIntegrity(
  record: EncryptedAnalysisRecord
): Promise<boolean> {
  if (!record._checksum || !record.analysis_text) {
    return true; // No checksum = legacy data, assume valid
  }
  
  const expectedChecksum = await generateChecksum(record.id, record.analysis_text);
  return expectedChecksum === record._checksum;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 MIGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Migrate a plaintext record to encrypted format
 */
export async function migrateToEncrypted<T extends Partial<EncryptedAnalysisRecord>>(
  record: T
): Promise<T> {
  if (isRecordEncrypted(record)) {
    return record; // Already encrypted
  }
  return encryptAnalysisRecord(record);
}

/**
 * Batch migrate records
 */
export async function batchMigrateToEncrypted<T extends Partial<EncryptedAnalysisRecord>>(
  records: T[]
): Promise<T[]> {
  return Promise.all(records.map(r => migrateToEncrypted(r)));
}
