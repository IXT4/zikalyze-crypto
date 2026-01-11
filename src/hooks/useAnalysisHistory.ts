import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export const useAnalysisHistory = (symbol: string) => {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!symbol || !user) {
      setHistory([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data as AnalysisRecord[]) || []);
    } catch (err) {
      console.error("Error fetching analysis history:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, user]);

  const fetchLearningStats = useCallback(async () => {
    if (!symbol || !user) {
      setLearningStats(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ai_learning_stats")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      setLearningStats(data as LearningStats | null);
    } catch (err) {
      console.error("Error fetching learning stats:", err);
    }
  }, [symbol, user]);

  const saveAnalysis = useCallback(async (
    analysisText: string,
    price: number,
    change: number,
    confidence?: number,
    bias?: string
  ): Promise<string | null> => {
    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    try {
      // Round confidence to integer (database column is integer type)
      const roundedConfidence = confidence !== undefined && confidence !== null 
        ? Math.round(confidence) 
        : null;
      
      const { data, error } = await supabase
        .from("analysis_history")
        .insert({
          symbol: symbol.toUpperCase(),
          price,
          change_24h: change,
          analysis_text: analysisText,
          confidence: roundedConfidence,
          bias: bias || null,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Refresh history after saving
      fetchHistory();
      
      return data?.id || null;
    } catch (err) {
      console.error("Error saving analysis:", err);
      return null;
    }
  }, [symbol, fetchHistory, user]);

  const submitFeedback = useCallback(async (id: string, wasCorrect: boolean) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("analysis_history")
        .update({
          was_correct: wasCorrect,
          feedback_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Refresh both history and stats
      await Promise.all([fetchHistory(), fetchLearningStats()]);
      return true;
    } catch (err) {
      console.error("Error submitting feedback:", err);
      return false;
    }
  }, [user, fetchHistory, fetchLearningStats]);

  const deleteAnalysis = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("analysis_history")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      fetchHistory();
      fetchLearningStats();
    } catch (err) {
      console.error("Error deleting analysis:", err);
    }
  }, [user, fetchHistory, fetchLearningStats]);

  const clearAllHistory = useCallback(async () => {
    if (!user || !symbol) return;

    try {
      const { error } = await supabase
        .from("analysis_history")
        .delete()
        .eq("symbol", symbol.toUpperCase())
        .eq("user_id", user.id);

      if (error) throw error;
      setHistory([]);
      setLearningStats(null);
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  }, [user, symbol]);

  useEffect(() => {
    fetchHistory();
    fetchLearningStats();
  }, [fetchHistory, fetchLearningStats]);

  return { 
    history, 
    learningStats,
    loading, 
    saveAnalysis, 
    submitFeedback,
    deleteAnalysis, 
    clearAllHistory, 
    refreshHistory: fetchHistory,
    refreshStats: fetchLearningStats
  };
};
