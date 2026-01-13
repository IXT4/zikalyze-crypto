// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 SYNC MANAGER — Handles offline-to-cloud synchronization with E2E encryption
// ═══════════════════════════════════════════════════════════════════════════════
// Syncs local IndexedDB data with Supabase when online
// Analysis history is synced in encrypted form - cloud never sees plaintext
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import * as storage from './clientStorage';
import { isRecordEncrypted } from './e2eAnalysisEncryption';

let syncInProgress = false;
let syncListeners: Array<(status: SyncStatus) => void> = [];

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingOperations: number;
  error: string | null;
}

let currentStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: localStorage.getItem('zikalyze_last_sync'),
  pendingOperations: 0,
  error: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  syncListeners.forEach(l => l(getSyncStatus()));
}

function updateStatus(updates: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  notifyListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncToCloud(): Promise<void> {
  if (syncInProgress || !navigator.onLine) return;
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[SyncManager] User not authenticated, skipping cloud sync');
    return;
  }

  syncInProgress = true;
  updateStatus({ isSyncing: true, error: null });

  try {
    // Get pending operations
    const queue = await storage.getSyncQueue();
    updateStatus({ pendingOperations: queue.length });

    if (queue.length === 0) {
      updateStatus({ 
        isSyncing: false, 
        lastSyncAt: new Date().toISOString(),
      });
      localStorage.setItem('zikalyze_last_sync', new Date().toISOString());
      syncInProgress = false;
      return;
    }

    console.log(`[SyncManager] Processing ${queue.length} pending operations`);

    for (const operation of queue) {
      try {
        await processOperation(operation, user.id);
        if (operation.id) {
          await storage.removeSyncItem(operation.id);
        }
      } catch (err) {
        console.error('[SyncManager] Failed to process operation:', err);
        // Continue with other operations
      }
    }

    const remainingQueue = await storage.getSyncQueue();
    const lastSyncAt = new Date().toISOString();
    localStorage.setItem('zikalyze_last_sync', lastSyncAt);
    
    updateStatus({ 
      isSyncing: false, 
      lastSyncAt,
      pendingOperations: remainingQueue.length,
    });

    console.log('[SyncManager] Sync completed');
  } catch (err) {
    console.error('[SyncManager] Sync failed:', err);
    updateStatus({ 
      isSyncing: false, 
      error: err instanceof Error ? err.message : 'Sync failed',
    });
  } finally {
    syncInProgress = false;
  }
}

async function processOperation(operation: storage.SyncOperation, userId: string): Promise<void> {
  const { type, store, data } = operation;

  switch (store) {
    case storage.STORES.PRICE_ALERTS:
      await syncPriceAlert(type, data, userId);
      break;
    case storage.STORES.ANALYSIS_HISTORY:
      await syncAnalysisHistory(type, data, userId);
      break;
    case storage.STORES.AI_LEARNING:
      await syncAILearning(type, data, userId);
      break;
    default:
      console.warn(`[SyncManager] Unknown store: ${store}`);
  }
}

async function syncPriceAlert(
  type: 'create' | 'update' | 'delete', 
  data: storage.ClientPriceAlert,
  userId: string
): Promise<void> {
  switch (type) {
    case 'create':
      await supabase.from('price_alerts').insert({
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        target_price: data.target_price,
        condition: data.condition,
        current_price_at_creation: data.current_price_at_creation,
        is_triggered: data.is_triggered,
        triggered_at: data.triggered_at,
        user_id: userId,
      });
      break;
    case 'update':
      await supabase.from('price_alerts')
        .update({
          is_triggered: data.is_triggered,
          triggered_at: data.triggered_at,
        })
        .eq('id', data.id)
        .eq('user_id', userId);
      break;
    case 'delete':
      await supabase.from('price_alerts')
        .delete()
        .eq('id', data.id)
        .eq('user_id', userId);
      break;
  }
}

async function syncAnalysisHistory(
  type: 'create' | 'update' | 'delete',
  data: storage.ClientAnalysisRecord,
  userId: string
): Promise<void> {
  // Data should already be encrypted by useAnalysisHistoryClient
  // We verify it's encrypted before sending to cloud
  if (type !== 'delete' && !isRecordEncrypted(data)) {
    console.warn('[SyncManager] Analysis record not encrypted, skipping sync');
    return;
  }

  switch (type) {
    case 'create':
      // analysis_text and bias are already encrypted (E2E prefixed)
      await supabase.from('analysis_history').insert({
        id: data.id,
        symbol: data.symbol,
        price: data.price,
        change_24h: data.change_24h,
        analysis_text: data.analysis_text, // Encrypted
        confidence: data.confidence,
        bias: data.bias, // Encrypted
        user_id: userId,
        was_correct: data.was_correct,
        feedback_at: data.feedback_at,
      });
      console.log('[SyncManager] Synced E2E encrypted analysis to cloud');
      break;
    case 'update':
      await supabase.from('analysis_history')
        .update({
          was_correct: data.was_correct,
          feedback_at: data.feedback_at,
          analysis_text: data.analysis_text, // Keep encrypted
          bias: data.bias, // Keep encrypted
        })
        .eq('id', data.id)
        .eq('user_id', userId);
      break;
    case 'delete':
      await supabase.from('analysis_history')
        .delete()
        .eq('id', data.id)
        .eq('user_id', userId);
      break;
  }
}

async function syncAILearning(
  type: 'create' | 'update' | 'delete',
  data: storage.ClientAILearning,
  userId: string
): Promise<void> {
  if (type === 'delete') return; // Don't delete AI learning data

  const dbData = {
    user_id: userId,
    symbol: data.symbol,
    trend_accuracy: data.trendAccuracy,
    avg_velocity: data.avgVelocity,
    volatility: data.volatility,
    last_bias: data.lastBias,
    bias_changes: data.biasChanges,
    correct_predictions: data.correctPredictions,
    total_predictions: data.totalPredictions,
    support_levels: data.supportLevels,
    resistance_levels: data.resistanceLevels,
    avg_price_24h: data.avgPrice24h,
    price_range_24h: data.priceRange24h,
    whale_buy_threshold: data.whaleBuyThreshold,
    whale_sell_threshold: data.whaleSellThreshold,
    exchange_flow_sensitivity: data.exchangeFlowSensitivity,
    confidence_adjustment: data.confidenceAdjustment,
    samples_collected: data.samplesCollected,
    learning_sessions: data.learningSessions,
    last_learning_at: new Date().toISOString(),
  };

  await supabase.from('ai_learning_data')
    .upsert(dbData, { onConflict: 'user_id,symbol' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📥 DOWNLOAD FROM CLOUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function downloadFromCloud(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !navigator.onLine) return;

  console.log('[SyncManager] Downloading data from cloud');

  try {
    // Download price alerts
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id);

    if (alerts) {
      for (const alert of alerts) {
        await storage.savePriceAlert({
          ...alert,
          condition: alert.condition as 'above' | 'below',
          synced: true,
        });
      }
      console.log(`[SyncManager] Downloaded ${alerts.length} alerts`);
    }

    // Download analysis history (last 50) - stored encrypted
    // Records remain encrypted, will be decrypted on-demand when accessed via hook
    const { data: history } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (history) {
      for (const record of history) {
        // Store as-is (encrypted) - decryption happens in useAnalysisHistoryClient
        await storage.saveAnalysisRecord({
          ...record,
          synced: true,
        });
      }
      console.log(`[SyncManager] Downloaded ${history.length} encrypted analysis records`);
    }

    // Download AI learning data
    const { data: learning } = await supabase
      .from('ai_learning_data')
      .select('*')
      .eq('user_id', user.id);

    if (learning) {
      for (const data of learning) {
        await storage.saveAILearning({
          symbol: data.symbol,
          trendAccuracy: data.trend_accuracy || 0,
          avgVelocity: data.avg_velocity || 0,
          volatility: data.volatility || 0,
          lastBias: (data.last_bias as 'LONG' | 'SHORT' | 'NEUTRAL') || 'NEUTRAL',
          biasChanges: data.bias_changes || 0,
          correctPredictions: data.correct_predictions || 0,
          totalPredictions: data.total_predictions || 0,
          supportLevels: (data.support_levels || []).map(Number),
          resistanceLevels: (data.resistance_levels || []).map(Number),
          avgPrice24h: data.avg_price_24h || 0,
          priceRange24h: data.price_range_24h || 0,
          whaleBuyThreshold: data.whale_buy_threshold || 60,
          whaleSellThreshold: data.whale_sell_threshold || 40,
          exchangeFlowSensitivity: data.exchange_flow_sensitivity || 0.5,
          confidenceAdjustment: data.confidence_adjustment || 0,
          samplesCollected: data.samples_collected || 0,
          learningSessions: data.learning_sessions || 0,
          updated_at: data.updated_at || new Date().toISOString(),
        });
      }
      console.log(`[SyncManager] Downloaded ${learning.length} AI learning records`);
    }

  } catch (err) {
    console.error('[SyncManager] Download failed:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 NETWORK EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

function handleOnline() {
  updateStatus({ isOnline: true });
  console.log('[SyncManager] Online - starting sync');
  syncToCloud();
}

function handleOffline() {
  updateStatus({ isOnline: false });
  console.log('[SyncManager] Offline - operations will be queued');
}

// Initialize event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial sync on load if online
  if (navigator.onLine) {
    // Delay initial sync to not block page load
    setTimeout(() => {
      downloadFromCloud().then(() => syncToCloud());
    }, 3000);
  }
}

// Periodic sync every 5 minutes when online
setInterval(() => {
  if (navigator.onLine) {
    syncToCloud();
  }
}, 5 * 60 * 1000);
