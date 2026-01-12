// ═══════════════════════════════════════════════════════════════════════════════
// 📜 useAnalysisHistory — Re-export from Client-Side Implementation
// ═══════════════════════════════════════════════════════════════════════════════
// This module now uses 100% client-side storage with IndexedDB
// Cloud sync happens automatically when online
// ═══════════════════════════════════════════════════════════════════════════════

export { 
  useAnalysisHistoryClient as useAnalysisHistory, 
  type AnalysisRecord,
  type LearningStats 
} from './useAnalysisHistoryClient';
