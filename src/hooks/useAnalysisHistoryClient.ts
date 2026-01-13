// ═══════════════════════════════════════════════════════════════════════════════
// 📜 useAnalysisHistoryClient — Fully Client-Side Analysis History with E2E Encryption
// ═══════════════════════════════════════════════════════════════════════════════
// Runs 100% in the browser with IndexedDB storage and optional cloud sync
// All sensitive analysis data is encrypted before storage
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as storage from '@/lib/clientStorage';
import { queueSync, STORES } from '@/lib/clientStorage';
import { 
  encryptAnalysisRecord, 
  decryptAnalysisRecords,
  decryptAnalysisRecord 
} from '@/lib/e2eAnalysisEncryption';

export interface AnalysisRecord {
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
}

export interface LearningStats {
  symbol: string;
  total_feedback: number;
  correct_predictions: number;
  incorrect_predictions: number;
  accuracy_percentage: number | null;
  avg_confidence_when_correct: number | null;
  avg_confidence_when_incorrect: number | null;
}

export const useAnalysisHistoryClient = (symbol: string) => {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch history from IndexedDB and decrypt
  const fetchHistory = useCallback(async () => {
    if (!symbol) {
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const localHistory = await storage.getAnalysisHistory(symbol, 10);
      // Filter by user if logged in
      const filtered = user
        ? localHistory.filter(r => r.user_id === user.id || r.user_id === null)
        : localHistory.filter(r => r.user_id === null);

      // Decrypt all records
      const decryptedRecords = await decryptAnalysisRecords(filtered);

      setHistory(decryptedRecords.map(r => ({
        id: r.id,
        symbol: r.symbol,
        price: r.price,
        change_24h: r.change_24h,
        analysis_text: r.analysis_text,
        confidence: r.confidence,
        bias: r.bias,
        created_at: r.created_at,
        user_id: r.user_id,
        was_correct: r.was_correct,
        feedback_at: r.feedback_at,
      })));
    } catch (err) {
      console.error('[AnalysisHistory] Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, user]);

  // Calculate learning stats from local data
  const calculateLearningStats = useCallback(async () => {
    if (!symbol) {
      setLearningStats(null);
      return;
    }

    try {
      const allHistory = await storage.getAnalysisHistory(symbol, 100);
      const withFeedback = allHistory.filter(r => r.was_correct !== null);

      if (withFeedback.length === 0) {
        setLearningStats(null);
        return;
      }

      const correct = withFeedback.filter(r => r.was_correct === true);
      const incorrect = withFeedback.filter(r => r.was_correct === false);

      const avgConfidenceCorrect = correct.length > 0
        ? correct.reduce((sum, r) => sum + (r.confidence || 0), 0) / correct.length
        : null;

      const avgConfidenceIncorrect = incorrect.length > 0
        ? incorrect.reduce((sum, r) => sum + (r.confidence || 0), 0) / incorrect.length
        : null;

      setLearningStats({
        symbol: symbol.toUpperCase(),
        total_feedback: withFeedback.length,
        correct_predictions: correct.length,
        incorrect_predictions: incorrect.length,
        accuracy_percentage: (correct.length / withFeedback.length) * 100,
        avg_confidence_when_correct: avgConfidenceCorrect,
        avg_confidence_when_incorrect: avgConfidenceIncorrect,
      });
    } catch (err) {
      console.error('[AnalysisHistory] Error calculating stats:', err);
    }
  }, [symbol]);

  useEffect(() => {
    fetchHistory();
    calculateLearningStats();
  }, [fetchHistory, calculateLearningStats]);

  // Save a new analysis with E2E encryption
  const saveAnalysis = useCallback(async (
    analysisText: string,
    price: number,
    change: number,
    confidence?: number,
    bias?: string
  ): Promise<string | null> => {
    try {
      const roundedConfidence = confidence !== undefined && confidence !== null
        ? Math.round(confidence)
        : null;

      const plaintextRecord: storage.ClientAnalysisRecord = {
        id: storage.generateId(),
        symbol: symbol.toUpperCase(),
        price,
        change_24h: change,
        analysis_text: analysisText,
        confidence: roundedConfidence,
        bias: bias || null,
        created_at: new Date().toISOString(),
        user_id: user?.id || null,
        was_correct: null,
        feedback_at: null,
        synced: false,
      };

      // Encrypt sensitive fields before storage
      const encryptedRecord = await encryptAnalysisRecord(plaintextRecord);
      
      // Save encrypted record to IndexedDB
      await storage.saveAnalysisRecord(encryptedRecord);

      // Queue encrypted data for cloud sync if user is authenticated
      if (user) {
        await queueSync({
          type: 'create',
          store: STORES.ANALYSIS_HISTORY,
          data: encryptedRecord,
        });
      }

      // Refresh history
      await fetchHistory();

      console.log('[AnalysisHistory] Saved E2E encrypted analysis');
      return plaintextRecord.id;
    } catch (err) {
      console.error('[AnalysisHistory] Error saving analysis:', err);
      return null;
    }
  }, [symbol, user, fetchHistory]);

  // Submit feedback for an analysis
  const submitFeedback = useCallback(async (id: string, wasCorrect: boolean): Promise<boolean> => {
    try {
      await storage.updateAnalysisFeedback(id, wasCorrect);

      // Queue for cloud sync if user is authenticated
      if (user) {
        const record = history.find(r => r.id === id);
        if (record) {
          // Re-encrypt the record with updated feedback
          const encryptedRecord = await encryptAnalysisRecord({
            ...record,
            was_correct: wasCorrect,
            feedback_at: new Date().toISOString(),
          });
          
          await queueSync({
            type: 'update',
            store: STORES.ANALYSIS_HISTORY,
            data: encryptedRecord,
          });
        }
      }

      // Refresh both history and stats
      await Promise.all([fetchHistory(), calculateLearningStats()]);
      return true;
    } catch (err) {
      console.error('[AnalysisHistory] Error submitting feedback:', err);
      return false;
    }
  }, [user, history, fetchHistory, calculateLearningStats]);

  // Delete an analysis record
  const deleteAnalysis = useCallback(async (id: string): Promise<void> => {
    try {
      const record = history.find(r => r.id === id);
      
      await storage.deleteAnalysisRecord(id);

      // Queue for cloud sync if user is authenticated
      if (user && record) {
        await queueSync({
          type: 'delete',
          store: STORES.ANALYSIS_HISTORY,
          data: record,
        });
      }

      await fetchHistory();
      await calculateLearningStats();
    } catch (err) {
      console.error('[AnalysisHistory] Error deleting analysis:', err);
    }
  }, [user, history, fetchHistory, calculateLearningStats]);

  // Clear all history for symbol
  const clearAllHistory = useCallback(async (): Promise<void> => {
    if (!symbol) return;

    try {
      const allHistory = await storage.getAnalysisHistory(symbol, 1000);
      
      for (const record of allHistory) {
        await storage.deleteAnalysisRecord(record.id);
        
        if (user) {
          await queueSync({
            type: 'delete',
            store: STORES.ANALYSIS_HISTORY,
            data: record,
          });
        }
      }

      setHistory([]);
      setLearningStats(null);
    } catch (err) {
      console.error('[AnalysisHistory] Error clearing history:', err);
    }
  }, [symbol, user]);

  return {
    history,
    learningStats,
    loading,
    saveAnalysis,
    submitFeedback,
    deleteAnalysis,
    clearAllHistory,
    refreshHistory: fetchHistory,
    refreshStats: calculateLearningStats,
  };
};

// Re-export for backward compatibility
export { useAnalysisHistoryClient as useAnalysisHistory };
