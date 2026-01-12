// ═══════════════════════════════════════════════════════════════════════════════
// 📦 CLIENT-SIDE STORAGE SYSTEM — IndexedDB + LocalStorage Hybrid
// ═══════════════════════════════════════════════════════════════════════════════
// Provides offline-first data persistence with optional cloud sync
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'ZikalyzeDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  PRICE_ALERTS: 'priceAlerts',
  ANALYSIS_HISTORY: 'analysisHistory',
  AI_LEARNING: 'aiLearning',
  PRICE_CACHE: 'priceCache',
  OHLC_DATA: 'ohlcData',
  USER_SETTINGS: 'userSettings',
  SYNC_QUEUE: 'syncQueue',
} as const;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️ DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ClientStorage] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[ClientStorage] IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Price Alerts Store
      if (!db.objectStoreNames.contains(STORES.PRICE_ALERTS)) {
        const alertStore = db.createObjectStore(STORES.PRICE_ALERTS, { keyPath: 'id' });
        alertStore.createIndex('symbol', 'symbol', { unique: false });
        alertStore.createIndex('is_triggered', 'is_triggered', { unique: false });
        alertStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Analysis History Store
      if (!db.objectStoreNames.contains(STORES.ANALYSIS_HISTORY)) {
        const historyStore = db.createObjectStore(STORES.ANALYSIS_HISTORY, { keyPath: 'id' });
        historyStore.createIndex('symbol', 'symbol', { unique: false });
        historyStore.createIndex('created_at', 'created_at', { unique: false });
        historyStore.createIndex('user_id', 'user_id', { unique: false });
      }

      // AI Learning Store
      if (!db.objectStoreNames.contains(STORES.AI_LEARNING)) {
        const learningStore = db.createObjectStore(STORES.AI_LEARNING, { keyPath: 'symbol' });
        learningStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Price Cache Store
      if (!db.objectStoreNames.contains(STORES.PRICE_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.PRICE_CACHE, { keyPath: 'symbol' });
        cacheStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // OHLC Data Store
      if (!db.objectStoreNames.contains(STORES.OHLC_DATA)) {
        const ohlcStore = db.createObjectStore(STORES.OHLC_DATA, { keyPath: 'key' });
        ohlcStore.createIndex('symbol', 'symbol', { unique: false });
        ohlcStore.createIndex('interval', 'interval', { unique: false });
      }

      // User Settings Store
      if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) {
        db.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'key' });
      }

      // Sync Queue Store (for offline operations to sync when online)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      console.log('[ClientStorage] Database schema created/upgraded');
    };
  });

  return dbInitPromise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ GENERIC CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllByIndex<T>(
  storeName: string, 
  indexName: string, 
  value: IDBValidKey
): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clear(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function count(storeName: string): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 SYNC QUEUE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncOperation {
  id?: number;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  created_at: string;
}

export async function queueSync(operation: Omit<SyncOperation, 'id' | 'created_at'>): Promise<void> {
  await put(STORES.SYNC_QUEUE, {
    ...operation,
    created_at: new Date().toISOString(),
  });
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  return getAll<SyncOperation>(STORES.SYNC_QUEUE);
}

export async function clearSyncQueue(): Promise<void> {
  return clear(STORES.SYNC_QUEUE);
}

export async function removeSyncItem(id: number): Promise<void> {
  return remove(STORES.SYNC_QUEUE, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SPECIALIZED DATA OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Price Alerts
export interface ClientPriceAlert {
  id: string;
  symbol: string;
  name: string;
  target_price: number;
  condition: 'above' | 'below';
  current_price_at_creation: number;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  user_id: string | null;
  synced: boolean;
}

export async function savePriceAlert(alert: ClientPriceAlert): Promise<void> {
  return put(STORES.PRICE_ALERTS, alert);
}

export async function getPriceAlerts(onlyActive = true): Promise<ClientPriceAlert[]> {
  const all = await getAll<ClientPriceAlert>(STORES.PRICE_ALERTS);
  if (onlyActive) {
    return all.filter(a => !a.is_triggered).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  return all.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function deletePriceAlert(id: string): Promise<void> {
  return remove(STORES.PRICE_ALERTS, id);
}

export async function markAlertTriggered(id: string): Promise<void> {
  const alert = await get<ClientPriceAlert>(STORES.PRICE_ALERTS, id);
  if (alert) {
    alert.is_triggered = true;
    alert.triggered_at = new Date().toISOString();
    await put(STORES.PRICE_ALERTS, alert);
  }
}

// Analysis History
export interface ClientAnalysisRecord {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  analysis_text: string;
  confidence: number | null;
  bias: string | null;
  created_at: string;
  user_id: string | null;
  was_correct: boolean | null;
  feedback_at: string | null;
  synced: boolean;
}

export async function saveAnalysisRecord(record: ClientAnalysisRecord): Promise<void> {
  return put(STORES.ANALYSIS_HISTORY, record);
}

export async function getAnalysisHistory(symbol: string, limit = 10): Promise<ClientAnalysisRecord[]> {
  const all = await getAllByIndex<ClientAnalysisRecord>(STORES.ANALYSIS_HISTORY, 'symbol', symbol.toUpperCase());
  return all
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function deleteAnalysisRecord(id: string): Promise<void> {
  return remove(STORES.ANALYSIS_HISTORY, id);
}

export async function updateAnalysisFeedback(id: string, wasCorrect: boolean): Promise<void> {
  const record = await get<ClientAnalysisRecord>(STORES.ANALYSIS_HISTORY, id);
  if (record) {
    record.was_correct = wasCorrect;
    record.feedback_at = new Date().toISOString();
    await put(STORES.ANALYSIS_HISTORY, record);
  }
}

// AI Learning Data
export interface ClientAILearning {
  symbol: string;
  trendAccuracy: number;
  avgVelocity: number;
  volatility: number;
  lastBias: 'LONG' | 'SHORT' | 'NEUTRAL';
  biasChanges: number;
  correctPredictions: number;
  totalPredictions: number;
  supportLevels: number[];
  resistanceLevels: number[];
  avgPrice24h: number;
  priceRange24h: number;
  whaleBuyThreshold: number;
  whaleSellThreshold: number;
  exchangeFlowSensitivity: number;
  confidenceAdjustment: number;
  samplesCollected: number;
  learningSessions: number;
  updated_at: string;
}

export async function saveAILearning(data: ClientAILearning): Promise<void> {
  return put(STORES.AI_LEARNING, { ...data, updated_at: new Date().toISOString() });
}

export async function getAILearning(symbol: string): Promise<ClientAILearning | undefined> {
  return get<ClientAILearning>(STORES.AI_LEARNING, symbol);
}

export async function getAllAILearning(): Promise<ClientAILearning[]> {
  return getAll<ClientAILearning>(STORES.AI_LEARNING);
}

// Price Cache
export interface ClientPriceCache {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  marketCap: number;
  updated_at: string;
}

export async function savePriceCache(data: ClientPriceCache): Promise<void> {
  return put(STORES.PRICE_CACHE, data);
}

export async function getPriceCache(symbol: string): Promise<ClientPriceCache | undefined> {
  return get<ClientPriceCache>(STORES.PRICE_CACHE, symbol);
}

export async function getAllPriceCache(): Promise<ClientPriceCache[]> {
  return getAll<ClientPriceCache>(STORES.PRICE_CACHE);
}

// OHLC Data
export interface ClientOHLCData {
  key: string; // `${symbol}_${interval}`
  symbol: string;
  interval: string;
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  updated_at: string;
}

export async function saveOHLCData(data: ClientOHLCData): Promise<void> {
  return put(STORES.OHLC_DATA, data);
}

export async function getOHLCData(symbol: string, interval: string): Promise<ClientOHLCData | undefined> {
  return get<ClientOHLCData>(STORES.OHLC_DATA, `${symbol}_${interval}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

// Initialize database on module load
initDB().catch(console.error);
